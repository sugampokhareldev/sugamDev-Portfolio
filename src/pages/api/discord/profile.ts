/**
 * GET /api/discord/profile
 *
 * The public half of the Discord integration and the ONLY part the browser
 * talks to. It returns the owner's display-safe profile — id, handle, display
 * name, avatar, banner, accent colour, bio — and never a token of any kind.
 *
 * 503 is a normal, expected answer here, not a fault: it is what comes back
 * before anyone has connected an account. The welcome screen treats it as
 * "keep the local portrait", so an unconfigured deploy renders exactly as it
 * did before this endpoint existed.
 */
import type { APIRoute } from 'astro'
import { fetchOwnerProfile, json } from '../../../lib/discord'

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  try {
    const { profile, source, maxAge } = await fetchOwnerProfile(url.origin)

    return json(
      { profile, source },
      {
        headers: {
          // Cached at the edge as well as in the function, so a burst of
          // visitors is one request to Discord rather than one each.
          // stale-while-revalidate keeps the last good copy on screen while a
          // new one is fetched behind it.
          'Cache-Control': `public, max-age=60, s-maxage=${maxAge}, stale-while-revalidate=86400`,
        },
      }
    )
  } catch (error) {
    return json(
      { profile: null, reason: (error as Error).message },
      {
        status: 503,
        // Never cache the unconfigured state: the moment the owner connects an
        // account, the next request must see it.
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
