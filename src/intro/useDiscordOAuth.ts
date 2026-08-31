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

export type DiscordOAuthState = {
  profile: DiscordOAuthProfile | null
  /**
   * Whether the answer is in — successfully or not.
   *
   * This is what stops the card showing the local portrait for a moment and
   * then replacing it with the real face. The page is prerendered, so the
   * fallback is in the HTML before any script runs; without a flag for "we
   * have not asked yet", `profile === null` is indistinguishable from
   * "Discord said no" and the card has to commit to the fallback immediately.
   *
   * It goes true on success, on failure, and on the deadline below — so a
   * caller waiting for it can never wait forever.
   */
  settled: boolean
}

/**
 * How long the card may stay blank waiting for Discord.
 *
 * The request is same-origin JSON off the edge cache and normally lands in
 * tens of milliseconds. This exists for the case where it does not: a hung
 * request must degrade to the local portrait, not hide the identity behind a
 * hole in the card indefinitely.
 */
const SETTLE_DEADLINE_MS = 1500

export function useDiscordOAuth(
  endpoint: string | undefined,
  enabled = true
): DiscordOAuthState {
  const [profile, setProfile] = useState<DiscordOAuthProfile | null>(null)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    // Disabled means nothing will ever arrive, so nothing should be waiting on
    // it either — settle immediately rather than holding the card back.
    if (!enabled) {
      setSettled(true)
      return
    }

    const url = endpoint?.trim() || DEFAULT_ENDPOINT
    const controller = new AbortController()
    let done = false

    const settle = () => {
      if (done) return
      done = true
      setSettled(true)
    }

    const deadline = window.setTimeout(settle, SETTLE_DEADLINE_MS)

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
      .finally(settle)

    return () => {
      window.clearTimeout(deadline)
      controller.abort()
    }
  }, [endpoint, enabled])

  return { profile, settled }
}
