/**
 * GET /api/discord/callback
 *
 * Where Discord returns the owner after they approve the grant. It does three
 * things and then gets out of the way:
 *
 *   1. Checks the `state` against the cookie /login set, so a code delivered
 *      by anyone other than the person who started the flow is refused.
 *   2. Exchanges the code for tokens and reads the account behind them. If it
 *      is not the owner's account the whole thing is rejected — otherwise any
 *      stranger who found this URL could put their own face on the front page.
 *   3. Primes the in-memory cache and hands the owner the refresh token to put
 *      in their deploy environment, once.
 *
 * WHY THE TOKEN IS SHOWN ON SCREEN. A serverless function cannot write to its
 * own environment, so the long-lived credential has to reach the environment
 * through a human. This page is the only place it is ever rendered: it is
 * reachable only by the owner's own browser, in a flow only they can start,
 * and the response is marked no-store so nothing caches it. Everything served
 * to actual visitors goes through /api/discord/profile, which has no access to
 * it.
 */
import type { APIRoute } from 'astro'
import {
  OWNER_ID,
  exchangeCode,
  json,
  oauthConfig,
  primeCache,
  readAuthorizedUser,
} from '../../../lib/discord'
import { STATE_COOKIE } from './login'

export const prerender = false

/** Text is escaped before it goes anywhere near the page. The display name in
 *  particular is attacker-controlled in the general case — it is whatever the
 *  authorizing Discord account calls itself. */
function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:2rem;
         background:#000004; color:#e8e8ee;
         font:400 15px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif }
  main { width:min(46rem,100%) }
  h1 { font-size:1.25rem; letter-spacing:-0.01em; margin:0 0 .25rem }
  p { color:#a0a0ae; margin:.5rem 0 }
  code, pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px }
  pre { background:#101018; border:1px solid #26263a; border-radius:12px;
        padding:1rem; overflow-x:auto; user-select:all; margin:1rem 0 }
  ol { color:#a0a0ae; padding-left:1.2rem } li { margin:.4rem 0 }
  .warn { border-left:2px solid #d9534f; padding-left:.9rem; color:#e0a5a3 }
  a { color:#8ab4ff }
</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // The success page contains a credential. Nothing may keep a copy.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Referrer-Policy': 'no-referrer',
      },
    }
  )
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const config = oauthConfig(url.origin)
  if (!config) {
    return json({ error: 'discord oauth is not configured' }, { status: 503 })
  }

  // Discord reports a refusal here rather than by failing the redirect.
  const denied = url.searchParams.get('error')
  if (denied) {
    return page(
      'Not connected',
      `<h1>Not connected</h1><p>Discord returned <code>${esc(denied)}</code>. Nothing was changed.</p>
       <p><a href="/api/discord/login">Try again</a></p>`,
      400
    )
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expected = cookies.get(STATE_COOKIE)?.value

  // The cookie is single-use whatever happens next, so a failed attempt cannot
  // be replayed against a state that is still sitting in the browser.
  cookies.delete(STATE_COOKIE, { path: '/api/discord' })

  if (!code || !state || !expected || state !== expected) {
    return page(
      'Rejected',
      `<h1>Rejected</h1><p class="warn">The <code>state</code> did not match the one this site issued, so
       this response was not started from here. No token was exchanged.</p>
       <p><a href="/api/discord/login">Start again</a></p>`,
      400
    )
  }

  let profile
  let refresh: string | undefined

  try {
    const token = await exchangeCode(config, code)
    refresh = token.refresh_token
    profile = await readAuthorizedUser(token.access_token)
  } catch (error) {
    return page(
      'Exchange failed',
      `<h1>Exchange failed</h1><pre>${esc((error as Error).message)}</pre>
       <p>The usual cause is a <code>redirect_uri</code> that does not match the one registered on the
       Discord application exactly. This site is sending:</p>
       <pre>${esc(config.redirectUri)}</pre>`,
      502
    )
  }

  if (profile.id !== OWNER_ID) {
    return page(
      'Wrong account',
      `<h1>Wrong account</h1>
       <p class="warn">You authorized as <strong>${esc(profile.displayName)}</strong>
       (<code>${esc(profile.id)}</code>), but this portfolio belongs to
       <code>${esc(OWNER_ID)}</code>. Nothing was stored.</p>
       <p>If this site's owner really is that account, change <code>gate.discordId</code>
       in <code>src/data/site.ts</code>.</p>`,
      403
    )
  }

  // The running instance can serve the real profile immediately; the env var
  // below is what survives a cold start.
  primeCache(profile, refresh)

  return page(
    'Discord connected',
    `<h1>Connected as ${esc(profile.displayName)}</h1>
     <p>@${esc(profile.username)} — the welcome screen is already reading this profile.</p>
     <p class="warn"><strong>One step left.</strong> This function cannot write to its own
     environment, so the refresh token below has to be put there by hand. It is shown once,
     on this page only. Treat it like a password.</p>
     <pre>DISCORD_REFRESH_TOKEN=${esc(refresh ?? '(none returned)')}</pre>
     <ol>
       <li>Add it to your deploy environment (Vercel → Settings → Environment Variables),
           and to your local <code>.env</code> if you want it in <code>astro dev</code>.</li>
       <li>Redeploy, so the functions pick it up.</li>
       <li>Close this tab. Re-run <a href="/api/discord/login">/api/discord/login</a> any time
           you need a new one.</li>
     </ol>
     <p><a href="/">← Back to the site</a></p>`
  )
}
