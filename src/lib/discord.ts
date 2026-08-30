/**
 * DISCORD OAUTH — server side only.
 *
 * Nothing in this module may be imported from a component that ships to the
 * browser. It reads the client secret and mints access tokens; the only thing
 * that ever crosses to the client is the sanitized shape at the bottom of this
 * file, which contains no token of any kind.
 *
 * WHOSE PROFILE, AND WHY THAT DECIDES THE DESIGN
 *
 * The welcome screen shows ONE person: the owner of this portfolio. It is not
 * a login — no visitor ever authenticates, and there is no per-visitor session
 * to keep. So the usual OAuth arrangement (authorize on each visit, hold a
 * token in that visitor's cookie) is the wrong shape entirely: it would ask
 * every stranger to hand over their Discord account in order to look at
 * somebody else's face.
 *
 * What actually happens is a one-time grant. The owner visits /api/discord/login
 * once, approves the `identify` scope, and Discord returns a REFRESH token —
 * long-lived, and the only credential the site needs from then on. That token
 * goes into the deploy environment as DISCORD_REFRESH_TOKEN, and every
 * subsequent request to /api/discord/profile trades it for a short-lived access
 * token, reads /users/@me, and returns the display-safe fields.
 *
 * The refresh token is a rotating credential: Discord issues a NEW one on every
 * refresh and the old one stops working. A serverless function cannot write
 * back to its own environment, so the freshly issued token is held in the
 * module-scope cache below for as long as the instance lives, and the one in
 * the environment is the fallback for a cold start. Discord accepts the
 * environment's original for a long time, which is what makes this work — but
 * it is also why `refreshed` is surfaced on the status endpoint: if refreshes
 * ever start failing, the fix is to re-run /api/discord/login.
 *
 * A bot token is supported as a simpler alternative and is tried first when
 * present. It never expires, never rotates, and reads the same public fields
 * through /users/{id} — for a single fixed profile it is strictly less moving
 * parts than OAuth. OAuth remains the default because it proves the account is
 * actually the owner's rather than any id somebody typed in.
 */
import { gate } from '../data/site'

const API = 'https://discord.com/api/v10'

/** How long a fetched profile is served before Discord is asked again. Avatars
 *  change a few times a year; a per-request round trip would add latency to
 *  every page load to catch that. */
const CACHE_MS = 5 * 60 * 1000

/** Access tokens last an hour. Refreshing a minute early avoids racing the
 *  expiry on a request that arrives just as it lapses. */
const TOKEN_SKEW_MS = 60 * 1000

/** The server tag Discord shows beside a display name. `identity_enabled` is
 *  what the account's own setting controls, so a tag is only carried here when
 *  the owner is actually displaying it. */
export type ServerTag = {
  text: string
  badgeUrl: string | null
}

export type PublicProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  /** The frame that sits over the avatar. Shipped separately from the avatar
   *  because it is a separate image that overlays it, not a variant of it. */
  decorationUrl: string | null
  bannerUrl: string | null
  accentColor: number | null
  bio: string | null
  serverTag: ServerTag | null
}

export type ProfileSource = 'oauth' | 'bot'

type Env = Record<string, string | undefined>

/**
 * Astro exposes server env through import.meta.env; the Vercel runtime also
 * populates process.env, and a value set in the Vercel dashboard arrives only
 * through the latter. Reading both means the same code works in `astro dev`
 * with a .env file and in a deployed function.
 */
function env(name: string): string | undefined {
  const meta = (import.meta.env as Env)[name]
  if (meta && meta.trim()) return meta.trim()
  const proc = typeof process !== 'undefined' ? process.env?.[name] : undefined
  return proc && proc.trim() ? proc.trim() : undefined
}

export type OAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/** The OAuth app. Null when it has not been configured, which every caller
 *  treats as "fall back to the local portrait" rather than as an error. */
export function oauthConfig(origin: string): OAuthConfig | null {
  const clientId = env('DISCORD_CLIENT_ID')
  const clientSecret = env('DISCORD_CLIENT_SECRET')
  if (!clientId || !clientSecret) return null

  // The redirect URI must match Discord's registered value BYTE FOR BYTE.
  // Deriving it from the request origin keeps localhost, previews and
  // production working from one setting, but the override exists because a
  // proxy can rewrite the origin out from under the function.
  const redirectUri = env('DISCORD_REDIRECT_URI') ?? `${origin}/api/discord/callback`
  return { clientId, clientSecret, redirectUri }
}

export function botToken(): string | undefined {
  return env('DISCORD_BOT_TOKEN')
}

export function envRefreshToken(): string | undefined {
  return env('DISCORD_REFRESH_TOKEN')
}

/** The Discord account this portfolio belongs to. The callback refuses any
 *  other account, so a stranger who finds the login URL cannot replace the
 *  face on the front page with their own. */
export const OWNER_ID = gate.discordId

// ---- Token cache --------------------------------------------------------
// Module scope, so it is shared by every request an instance serves and lost
// on a cold start — which is correct for both values. The access token is
// short-lived anyway, and the refresh token falls back to the environment.

let accessToken: { value: string; expiresAt: number } | null = null
let rotatedRefresh: string | null = null

export function currentRefreshToken(): string | undefined {
  return rotatedRefresh ?? envRefreshToken()
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

async function tokenRequest(
  config: OAuthConfig,
  body: Record<string, string>
): Promise<TokenResponse> {
  const response = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  })

  if (!response.ok) {
    // Discord's error body names the actual problem (bad redirect_uri, expired
    // grant, wrong secret). Passing it through is what makes this debuggable;
    // it describes the request, not the credential.
    const detail = await response.text().catch(() => '')
    throw new Error(`discord token ${response.status}: ${detail.slice(0, 300)}`)
  }

  return (await response.json()) as TokenResponse
}

/** Trades the one-time authorization code for tokens. Used only by the
 *  callback route, once, by the owner. */
export async function exchangeCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
  return tokenRequest(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  })
}

/** A live access token, refreshed at most once per hour per instance. */
async function accessTokenFor(config: OAuthConfig): Promise<string> {
  if (accessToken && Date.now() < accessToken.expiresAt - TOKEN_SKEW_MS) {
    return accessToken.value
  }

  const refresh = currentRefreshToken()
  if (!refresh) throw new Error('no refresh token: run /api/discord/login once')

  const token = await tokenRequest(config, {
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })

  // Discord rotates the refresh token on every use. Keeping the new one is not
  // optional — the previous one is now dead for this instance.
  if (token.refresh_token) rotatedRefresh = token.refresh_token
  accessToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  }
  return accessToken.value
}

// ---- Reading the user ---------------------------------------------------

/** Discord's raw user object, narrowed to the fields this site draws. */
type DiscordUser = {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
  banner?: string | null
  accent_color?: number | null
  bio?: string | null
  /** Both of these are `identify`-scope fields, so they arrive on the same
   *  request as the name and the avatar — no extra call, no extra permission. */
  avatar_decoration_data?: { asset: string; sku_id?: string } | null
  primary_guild?: {
    identity_guild_id?: string | null
    identity_enabled?: boolean | null
    tag?: string | null
    badge?: string | null
  } | null
}

/** Animated avatars and banners are hashed with an `a_` prefix and are only
 *  animated as .gif; everything else is served as .webp. Asking for the wrong
 *  extension returns a still frame, which is why this branches. */
function cdn(kind: 'avatars' | 'banners', id: string, hash: string, size = 256): string {
  const ext = hash.startsWith('a_') ? 'gif' : 'webp'
  return `https://cdn.discordapp.com/${kind}/${id}/${hash}.${ext}?size=${size}`
}

function sanitize(user: DiscordUser): PublicProfile {
  const guild = user.primary_guild
  // A tag is only shown when the account is actually displaying one. Discord
  // keeps the last chosen guild on the object with identity_enabled false once
  // the setting is turned off, so reading `tag` alone would resurrect a badge
  // the owner has deliberately hidden.
  const serverTag =
    guild?.identity_enabled && guild.tag
      ? {
          text: guild.tag,
          badgeUrl:
            guild.badge && guild.identity_guild_id
              ? `https://cdn.discordapp.com/guild-tag-badges/${guild.identity_guild_id}/${guild.badge}.png?size=48`
              : null,
        }
      : null

  return {
    id: user.id,
    username: user.username,
    decorationUrl: user.avatar_decoration_data?.asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=160`
      : null,
    serverTag,
    // `global_name` is the display name Discord shows now; `username` is the
    // handle beneath it. Older accounts have no global_name at all.
    displayName: user.global_name?.trim() || user.username,
    avatarUrl: user.avatar ? cdn('avatars', user.id, user.avatar) : null,
    bannerUrl: user.banner ? cdn('banners', user.id, user.banner, 600) : null,
    accentColor: typeof user.accent_color === 'number' ? user.accent_color : null,
    bio: user.bio?.trim() || null,
  }
}

async function readUser(url: string, authorization: string): Promise<PublicProfile> {
  const response = await fetch(url, { headers: { Authorization: authorization } })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`discord user ${response.status}: ${detail.slice(0, 200)}`)
  }
  return sanitize((await response.json()) as DiscordUser)
}

/** The account behind an access token. Used by the callback to prove the
 *  person who just authorized is the owner. */
export function readAuthorizedUser(token: string): Promise<PublicProfile> {
  return readUser(`${API}/users/@me`, `Bearer ${token}`)
}

// ---- The cached public profile ------------------------------------------

let cached: { profile: PublicProfile; source: ProfileSource; at: number } | null = null

export type ProfileResult = {
  profile: PublicProfile
  source: ProfileSource
  /** Seconds until the cached copy is considered stale, for Cache-Control. */
  maxAge: number
}

/**
 * The owner's profile, from whichever credential is configured.
 *
 * A bot token is tried first because it cannot expire and cannot rotate, so
 * when one is present it is the more reliable of the two. OAuth is the
 * fallback and the documented default.
 *
 * Throws when nothing is configured or both paths fail; the route turns that
 * into a 503 and the client keeps its local portrait.
 */
export async function fetchOwnerProfile(origin: string): Promise<ProfileResult> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return {
      profile: cached.profile,
      source: cached.source,
      maxAge: Math.ceil((CACHE_MS - (Date.now() - cached.at)) / 1000),
    }
  }

  const errors: string[] = []

  const bot = botToken()
  if (bot) {
    try {
      const profile = await readUser(`${API}/users/${OWNER_ID}`, `Bot ${bot}`)
      cached = { profile, source: 'bot', at: Date.now() }
      return { profile, source: 'bot', maxAge: CACHE_MS / 1000 }
    } catch (error) {
      errors.push(String((error as Error).message))
    }
  }

  const config = oauthConfig(origin)
  if (config && currentRefreshToken()) {
    try {
      const token = await accessTokenFor(config)
      const profile = await readAuthorizedUser(token)
      cached = { profile, source: 'oauth', at: Date.now() }
      return { profile, source: 'oauth', maxAge: CACHE_MS / 1000 }
    } catch (error) {
      // A failed refresh usually means the grant was revoked. Drop the access
      // token so the next request retries rather than serving a stale error.
      accessToken = null
      errors.push(String((error as Error).message))
    }
  }

  // A stale profile beats no profile: if Discord is down, keep drawing the
  // face the site was drawing a minute ago.
  if (cached) {
    return { profile: cached.profile, source: cached.source, maxAge: 30 }
  }

  throw new Error(
    errors.length
      ? errors.join('; ')
      : 'discord is not configured: set DISCORD_BOT_TOKEN, or DISCORD_CLIENT_ID/SECRET and run /api/discord/login'
  )
}

/** Called by the callback route once the owner has authorized, so the very
 *  first page load after connecting already has the real profile. */
export function primeCache(profile: PublicProfile, refreshToken?: string): void {
  cached = { profile, source: 'oauth', at: Date.now() }
  if (refreshToken) rotatedRefresh = refreshToken
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  })
}
