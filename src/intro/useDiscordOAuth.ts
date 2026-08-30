import { useEffect, useState } from 'react'

/**
 * The client half of the Discord integration.
 *
 * It reads ONE endpoint, /api/discord/profile, which is served by this site's
 * own function and returns nothing but display-safe fields. The client secret,
 * the refresh token and the access token all stay on the server; see
 * src/lib/discord.ts for why the flow is shaped that way.
 *
 * Failure is a first-class outcome here, not an exception. Before anyone has
 * connected an account the endpoint answers 503 by design, and on a pure
 * static host the route does not exist at all — both leave `profile` null and
 * the welcome screen keeps the local portrait. Nothing is logged and nothing
 * is retried, because there is nothing wrong.
 */
export type DiscordOAuthProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  /** Overlay frame for the avatar, when the account has one equipped. */
  decorationUrl?: string | null
  bannerUrl?: string | null
  accentColor?: number | null
  bio?: string | null
  /** The server tag shown beside the name, when one is being displayed. */
  serverTag?: { text: string; badgeUrl: string | null } | null
}

/** The site's own route. Overridable for the case where the profile function
 *  is hosted separately from the pages — the portfolio does not need to know
 *  where it lives, only what shape comes back. */
const DEFAULT_ENDPOINT = '/api/discord/profile'

function isProfile(value: unknown): value is DiscordOAuthProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  return (
    typeof profile.id === 'string' &&
    typeof profile.username === 'string' &&
    typeof profile.displayName === 'string' &&
    (typeof profile.avatarUrl === 'string' || profile.avatarUrl === null)
  )
}

export function useDiscordOAuth(
  endpoint: string | undefined,
  enabled = true
): DiscordOAuthProfile | null {
  const [profile, setProfile] = useState<DiscordOAuthProfile | null>(null)

  useEffect(() => {
    if (!enabled) return

    const url = endpoint?.trim() || DEFAULT_ENDPOINT
    const controller = new AbortController()

    fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Same-origin by default, so the browser sends nothing it would not send
      // for the page itself; a cross-origin override still carries no cookies.
      credentials: 'same-origin',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const candidate = body?.profile ?? body
        if (isProfile(candidate)) setProfile(candidate)
      })
      .catch(() => {
        // The local portrait is the deliberate fallback while OAuth is
        // unconfigured, unavailable, or refreshing.
      })

    return () => controller.abort()
  }, [endpoint, enabled])

  return profile
}
