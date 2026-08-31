/**
 * PRESENCE RELAY — the one thing a serverless function cannot do.
 *
 * Discord publishes online status ONLY as Gateway events: a WebSocket that a
 * bot holds open, receiving PRESENCE_UPDATE for members of guilds it shares
 * with the user. There is no REST endpoint for it — not on the user object,
 * not on the guild member object, not at any OAuth scope. So the portfolio's
 * /api/discord/profile function, which lives and dies in a few hundred
 * milliseconds, structurally cannot learn it.
 *
 * This process exists to hold that socket. It does one job: watch one
 * account's presence and answer GET /presence with the current value. The
 * portfolio's own function fetches it server-side and merges it into the
 * profile, so the browser still talks to exactly one endpoint and knows
 * nothing about this service.
 *
 * WHAT IT IS NOT. It is not a bot in the usual sense — it reads no messages,
 * sends nothing, and needs no permissions. It joins a server only because
 * sharing a guild is Discord's precondition for seeing presence at all.
 *
 * Zero dependencies: Node 22 ships WebSocket natively.
 *
 *   DISCORD_BOT_TOKEN   required, the same token the portfolio uses
 *   DISCORD_USER_ID     required, whose presence to watch
 *   PORT                provided by the host
 *   ALLOWED_ORIGIN      optional CORS origin; omit if only the server reads it
 */
import { createServer } from 'node:http'

const TOKEN = process.env.DISCORD_BOT_TOKEN?.trim()
const USER_ID = process.env.DISCORD_USER_ID?.trim()
const PORT = Number(process.env.PORT) || 8080
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN?.trim()

if (!TOKEN || !USER_ID) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_USER_ID are both required')
  process.exit(1)
}

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json'

/**
 * GUILDS (1 << 0) is what delivers GUILD_CREATE, and GUILD_CREATE is what
 * carries the INITIAL presence snapshot — without it this would know nothing
 * until the account next changed status, which could be hours.
 *
 * GUILD_PRESENCES (1 << 8) is the stream of changes after that. It is a
 * PRIVILEGED intent: it must be switched on at
 * Developer Portal → Bot → Privileged Gateway Intents → Presence Intent, or
 * the Gateway closes the connection with 4014 and this will say so below.
 */
const INTENTS = (1 << 0) | (1 << 8)

const OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
}

/** Close codes Discord will never accept a retry for. Reconnecting on these
 *  is an infinite loop against a wrong configuration, so it stops instead. */
const FATAL = {
  4004: 'authentication failed — DISCORD_BOT_TOKEN is wrong',
  4013: 'invalid intents',
  4014: 'disallowed intents — enable the PRESENCE INTENT in the Developer Portal',
}

/** The whole state this service keeps. `status` is null until the first
 *  snapshot arrives, which is what lets the portfolio tell "not known yet"
 *  from "known to be offline". */
const state = {
  status: null,
  activity: null,
  since: null,
  connected: false,
  lastEvent: null,
}

let ws = null
let heartbeat = null
let lastSeq = null
let acked = true
let backoff = 1000

function send(payload) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(payload))
}

/** Discord's own presence shape, reduced to the two things worth showing. */
function record(presence, source) {
  if (!presence || presence.user?.id !== USER_ID) return

  const status = presence.status ?? 'offline'
  // Custom status (type 4) puts the text in `state`, not `name`. Everything
  // else — playing, listening, watching — is named by `name`.
  const custom = presence.activities?.find((a) => a.type === 4)
  const other = presence.activities?.find((a) => a.type !== 4)

  state.status = status
  state.activity = custom?.state?.trim() || other?.name?.trim() || null
  state.since = Date.now()
  state.lastEvent = source
}

function connect() {
  ws = new WebSocket(GATEWAY)

  ws.addEventListener('open', () => {
    console.log('gateway: connected')
  })

  ws.addEventListener('message', (event) => {
    let packet
    try {
      packet = JSON.parse(event.data)
    } catch {
      return
    }

    if (packet.s !== null && packet.s !== undefined) lastSeq = packet.s

    switch (packet.op) {
      case OP.HELLO: {
        const interval = packet.d.heartbeat_interval
        acked = true
        clearInterval(heartbeat)
        heartbeat = setInterval(() => {
          // A missed ACK means the connection is a zombie: it looks open and
          // delivers nothing. Tear it down rather than sitting on a socket
          // that will never produce another event.
          if (!acked) {
            console.warn('gateway: no heartbeat ack, reconnecting')
            ws.close(4000)
            return
          }
          acked = false
          send({ op: OP.HEARTBEAT, d: lastSeq })
        }, interval)

        send({
          op: OP.IDENTIFY,
          d: {
            token: TOKEN,
            intents: INTENTS,
            properties: { os: 'linux', browser: 'presence-relay', device: 'presence-relay' },
          },
        })
        break
      }

      case OP.HEARTBEAT:
        send({ op: OP.HEARTBEAT, d: lastSeq })
        break

      case OP.HEARTBEAT_ACK:
        acked = true
        break

      case OP.INVALID_SESSION:
      case OP.RECONNECT:
        console.warn(`gateway: op ${packet.op}, reconnecting`)
        ws.close(4000)
        break

      case OP.DISPATCH: {
        if (packet.t === 'READY') {
          state.connected = true
          backoff = 1000
          console.log(`gateway: ready as ${packet.d.user?.username}`)
        }

        // The initial snapshot. Without this the relay knows nothing until the
        // account next changes status.
        if (packet.t === 'GUILD_CREATE') {
          for (const presence of packet.d.presences ?? []) {
            record(presence, `GUILD_CREATE ${packet.d.name ?? packet.d.id}`)
          }
        }

        if (packet.t === 'PRESENCE_UPDATE') record(packet.d, 'PRESENCE_UPDATE')
        break
      }
    }
  })

  ws.addEventListener('close', (event) => {
    state.connected = false
    clearInterval(heartbeat)

    const fatal = FATAL[event.code]
    if (fatal) {
      console.error(`gateway: ${event.code} — ${fatal}`)
      process.exit(1)
    }

    // Exponential backoff, capped. Discord rate limits identify attempts, and
    // a tight reconnect loop against a transient outage is how a bot token
    // gets temporarily banned from the Gateway.
    const wait = backoff
    backoff = Math.min(backoff * 2, 60000)
    console.warn(`gateway: closed ${event.code}, retrying in ${wait}ms`)
    setTimeout(connect, wait)
  })

  ws.addEventListener('error', () => {
    // 'close' always follows; reconnecting here too would double up.
  })
}

createServer((req, res) => {
  if (ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)

  if (req.url?.startsWith('/presence')) {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      // Presence is the one thing here that is genuinely live. Caching it
      // would defeat the entire purpose of holding a socket open for it.
      'Cache-Control': 'no-store',
    })
    res.end(
      JSON.stringify({
        status: state.status,
        activity: state.activity,
        connected: state.connected,
        since: state.since,
      })
    )
    return
  }

  // Health check, for the host's uptime probe.
  res.writeHead(state.connected ? 200 : 503, { 'Content-Type': 'text/plain' })
  res.end(state.connected ? 'ok' : 'gateway not connected')
}).listen(PORT, () => console.log(`presence relay on :${PORT}`))

connect()
