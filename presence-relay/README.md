# Presence relay

Discord publishes online status **only** as Gateway events — a WebSocket a bot
holds open. There is no REST endpoint for it at any scope, so the portfolio's
serverless function, which lives for a few hundred milliseconds, structurally
cannot read it.

This process holds that socket. It watches one account and answers
`GET /presence`. The portfolio's own `/api/discord/profile` fetches it
server-side and merges the result, so the browser still talks to one endpoint.

Zero dependencies — Node 22 ships `WebSocket` natively.

## What it needs

**1. Enable the Presence intent.** Developer Portal → your application → Bot →
Privileged Gateway Intents → **Presence Intent** → on. Without it the Gateway
closes with `4014` and this exits with that message rather than looping.

**2. Put the bot in a server you are in.** Sharing a guild is Discord's
precondition for seeing presence at all — it is the same reason Lanyard asks
you to join theirs. Developer Portal → OAuth2 → URL Generator → scope `bot`,
no permissions, open the URL and add it to any server you are a member of. It
reads no messages and sends nothing.

**3. Deploy it.** Anywhere that runs a process continuously — Railway, Fly,
Render, a VPS. Not Vercel: functions cannot hold a socket open, which is the
whole reason this is separate.

```
DISCORD_BOT_TOKEN=...   # the same token the portfolio uses
DISCORD_USER_ID=826337984700743710
```

`PORT` is supplied by the host. `ALLOWED_ORIGIN` is only needed if you ever
have the browser read this directly; the portfolio reads it server-side.

**4. Point the portfolio at it.** In Vercel:

```
DISCORD_PRESENCE_URL=https://your-relay.up.railway.app/presence
```

Redeploy. Until that variable is set the portfolio ignores this service
entirely and the card renders exactly as it does without it.

## Endpoints

| Route | Returns |
| --- | --- |
| `/presence` | `{ status, activity, connected, since }` — `status` is `online`/`idle`/`dnd`/`offline`, or `null` before the first snapshot |
| `/` | Health check: 200 while the Gateway is connected, 503 otherwise |

`status` is `null` rather than `offline` until the first snapshot arrives, so
the portfolio can tell "not known yet" from "known to be offline" and show
nothing rather than guessing.

## Notes

- Reconnects with exponential backoff to 60s. Discord rate limits identify
  attempts, and a tight retry loop is how a token gets temporarily banned.
- A missed heartbeat ACK forces a reconnect: the socket can stay open while
  silently delivering nothing.
- Fatal close codes (bad token, disallowed intents) exit instead of retrying,
  because no amount of retrying fixes a wrong configuration.
