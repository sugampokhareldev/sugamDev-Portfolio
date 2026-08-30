/**
 * GET /api/discord/login
 *
 * Starts the one-time OAuth grant. The owner opens this once, approves the
 * `identify` scope, and Discord sends them back to /api/discord/callback with
 * a code. Visitors never come here — the front page does not link to it.
 *
 * `identify` is the whole scope list. It reads the public profile and nothing
 * else: no email, no guilds, no messages, no ability to act as the account.
 */
import type { APIRoute } from 'astro'
import { json, oauthConfig } from '../../../lib/discord'

export const prerender = false

/** CSRF state. Signed into an httpOnly cookie and compared on return, so a
 *  code delivered by anyone other than the person who started the flow is
 *  rejected. Ten minutes is plenty for a consent screen. */
const STATE_COOKIE = 'discord_oauth_state'
const STATE_MAX_AGE = 600

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const config = oauthConfig(url.origin)
  if (!config) {
    return json(
      {
        error: 'discord oauth is not configured',
        missing: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
        help: 'Create an application at https://discord.com/developers/applications, then set these in your environment. See DISCORD_OAUTH.md.',
      },
      { status: 503 }
    )
  }

  const state = crypto.randomUUID()
  cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    // Discord redirects back over https in production; over http on localhost,
    // where a Secure cookie would simply never be sent back.
    secure: url.protocol === 'https:',
    path: '/api/discord',
    maxAge: STATE_MAX_AGE,
  })

  const authorize = new URL('https://discord.com/oauth2/authorize')
  authorize.searchParams.set('client_id', config.clientId)
  authorize.searchParams.set('redirect_uri', config.redirectUri)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('scope', 'identify')
  authorize.searchParams.set('state', state)
  // Always show the consent screen. Re-running this is how a rotated refresh
  // token is replaced, and a silent redirect would hand back the same dead
  // grant without ever saying so.
  authorize.searchParams.set('prompt', 'consent')

  return redirect(authorize.toString(), 302)
}

export { STATE_COOKIE }
