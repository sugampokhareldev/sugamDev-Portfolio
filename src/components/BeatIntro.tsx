import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { gate, profile, socials } from '../data/site'
import { BEAT, BG, TRANSITION, nextTransitionPoint, reachedTarget } from '../intro/cues'
import { useGateAudio } from '../intro/useGateAudio'
import { useDiscordOAuth } from '../intro/useDiscordOAuth'
import { useSpectrum } from '../intro/useSpectrum'
import './beat-intro.css'

// BEAT INTRO — a cinematic layer above the already-rendered portfolio.
//
// ONE CLIP, looping natively. The last frame is byte-identical to the first, so
// `video.loop = true` runs it forever with no seam, no seeking and no frame
// callback policing it.
//
// THE VIDEO IS THE CLOCK. ENTER does not transition. It ARMS, and the exit
// STARTS on the next BEAT — the footage is a montage cut to its own music at
// ~86.75 BPM, so the hand-off beginning on that beat is in time with the edit
// rather than landing at random inside it. Worst case wait is one beat, 0.69s.
//
// From that beat the layer dissolves out over ~1.5 beats: copy away first,
// then the image settles and fades off the portfolio underneath. Only opacity
// and transform animate, so nothing about the exit touches layout.
//
// Frame timing comes from requestVideoFrameCallback + metadata.mediaTime where
// available, rAF only as a fallback.

type Phase = 'loading' | 'idle' | 'armed' | 'exiting' | 'done'

/** Initials, for when no avatar file has been dropped in. */
const INITIALS = profile.name
  .split(' ')
  .map((w) => w[0])
  .join('')
  .slice(0, 2)
  .toUpperCase()

const DISCORD_PROFILE_ENDPOINT = import.meta.env.PUBLIC_DISCORD_PROFILE_ENDPOINT?.trim()
const NEPAL_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kathmandu',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** m:ss. The loop is 16.8s, so this reads 0:00-0:16 and is honest about it
 *  rather than dressing a loop up as a five-minute single. */
function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Fixed, not random-at-runtime: server and client must render the same DOM or
// hydration mismatches, and a mote field that reshuffles on every reload is
// noise anyway. Hand-spread across the width so no two fall in a column.
const MOTES = [
  { x: 59, size: 3.3, dur: 23.9, delay: 17.2, drift: 25, warm: false },
  { x: 77, size: 1.8, dur: 23.1, delay: 10.5, drift: 67, warm: false },
  { x: 14, size: 2.4, dur: 13.1, delay: 11.9, drift: 87, warm: false },
  { x: 78, size: 3.6, dur: 25.5, delay: 14.4, drift: 67, warm: false },
  { x: 81, size: 1.4, dur: 18.9, delay: 1.3, drift: -42, warm: false },
  { x: 78, size: 1.5, dur: 18.0, delay: 9.7, drift: -40, warm: false },
  { x: 83, size: 2.0, dur: 11.1, delay: 1.9, drift: 77, warm: true },
  { x: 72, size: 3.6, dur: 23.6, delay: 15.6, drift: -10, warm: false },
  { x: 67, size: 2.0, dur: 12.1, delay: 16.9, drift: 12, warm: true },
  { x: 39, size: 2.3, dur: 25.4, delay: 18.6, drift: -90, warm: true },
  { x: 8, size: 2.4, dur: 25.7, delay: 8.7, drift: -72, warm: false },
  { x: 27, size: 3.1, dur: 15.0, delay: 1.9, drift: -5, warm: true },
  { x: 54, size: 3.1, dur: 12.8, delay: 5.4, drift: -65, warm: true },
  { x: 61, size: 3.2, dur: 13.7, delay: 12.3, drift: 24, warm: false },
  { x: 95, size: 3.1, dur: 17.3, delay: 8.4, drift: 11, warm: false },
  { x: 29, size: 1.4, dur: 24.0, delay: 21.4, drift: 61, warm: false },
  { x: 4, size: 1.9, dur: 16.9, delay: 18.8, drift: 74, warm: false },
  { x: 7, size: 3.6, dur: 14.2, delay: 5.7, drift: 66, warm: false },
  { x: 39, size: 2.2, dur: 12.1, delay: 4.6, drift: 72, warm: true },
  { x: 78, size: 2.2, dur: 20.3, delay: 2.8, drift: 60, warm: false },
] as const

export default function BeatIntro() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [ready, setReady] = useState(false)
  const [reduced, setReduced] = useState(false)
  // Drives className. Must be state, not classList.add(): React rewrites
  // className on every render and would clobber an imperatively added class.
  const [pulse, setPulse] = useState(false)
  const [nepalTime, setNepalTime] = useState('--:--:--')
  // Keep a monogram fallback in case the configured portrait ever fails.
  const [avatarOk, setAvatarOk] = useState(true)

  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLImageElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)

  const phaseRef = useRef<Phase>('loading')
  const finishedRef = useRef(false)
  const pumpRef = useRef<(() => void) | null>(null)
  const lastBeatRef = useRef(-1)
  // Target time locked in when ENTER is pressed, so it cannot drift.
  const targetRef = useRef<number | null>(null)
  const prevMediaRef = useRef(0)
  // Read inside stable callbacks, which must not close over stale state.
  const reducedRef = useRef(false)
  const exitTimerRef = useRef<number | null>(null)

  // The Discord profile, from OAuth and from nowhere else.
  //
  // WHAT THIS CARD CANNOT SAY, AND WHY. OAuth's `identify` scope returns
  // identity: name, handle, avatar, banner, accent colour. It does not return
  // presence — Discord publishes no API for online state, current game or
  // Spotify at all. So there is no status dot here and no "listening to"
  // line, because there is no fact behind either one. A dot that is always
  // green is not a status indicator, it is a decoration pretending to be one,
  // and this page does not print figures it cannot check.
  //
  // What OAuth gives that presence never did is the banner and the accent
  // colour, which are the account's own art direction. The card uses them.
  const discord = useDiscordOAuth(DISCORD_PROFILE_ENDPOINT, phase !== 'done')

  /* Discord stores the accent as a 24-bit integer. Rendered at low alpha as a
     wash behind the card, so a profile with a colour set brings it along and
     one without falls back to the card's own surface. */
  const accent =
    typeof discord?.accentColor === 'number'
      ? `#${discord.accentColor.toString(16).padStart(6, '0')}`
      : null

  const sound = useGateAudio(videoRef, phase !== 'done')

  // Real spectrum on the meter whenever something is actually playing. When
  // nothing is, the bars fall back to the beat-grid tick below — which is
  // honest, because the grid is only known for the film's own track.
  useSpectrum(sound.audioRef, barsRef, sound.playing && phase !== 'done')
  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // ---- Starting the music ------------------------------------------------
  //
  // Browsers reject audible autoplay before the visitor interacts with the
  // page. So: try immediately, which succeeds for anyone whose browser already
  // trusts this origin, and otherwise start on their first ordinary gesture.
  //
  // THIS RUNS EXACTLY ONCE, and the ref is the whole reason it works.
  //
  // The earlier version keyed off `sound.playing` and re-armed itself whenever
  // that went false — which is precisely what pressing PAUSE does. Pausing set
  // playing to false, this effect woke up, saw silence, and called play()
  // again within the same tick. The pause button appeared dead; so did mute,
  // because the exclusion below only guarded the gesture LISTENER and never
  // the immediate play() beside it. The controls were fine. This was undoing
  // them.
  //
  // Once the unlock is resolved — the track started, or the visitor made a
  // gesture — this is finished forever, and from then on the only thing that
  // starts or stops the music is the visitor.
  const autoStartRef = useRef(false)

  useEffect(() => {
    if (!sound.ready || autoStartRef.current || phase === 'done') return

    let listening = true
    const settle = () => {
      if (!listening) return
      listening = false
      autoStartRef.current = true
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }

    const onGesture = (event: Event) => {
      // A click on the sound controls is the visitor taking charge, so the
      // unlock is over either way — but it must not ALSO trigger a play here,
      // or their first press of mute would turn the music on.
      const onControl = (event.target as Element | null)?.closest('[data-sound-control]')
      settle()
      if (!onControl) void sound.play()
    }

    void sound.play().then((started) => {
      if (started) settle()
    })
    window.addEventListener('pointerdown', onGesture, true)
    window.addEventListener('keydown', onGesture, true)

    // Only detaches the listeners; the ref is deliberately left set, because
    // "the visitor has taken control" is not something a re-render undoes.
    return () => {
      listening = false
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
  }, [phase, sound.ready, sound.play])

  // The avatar starts loading while the HTML parses, so when the file is
  // missing it has ALREADY errored by the time React hydrates — onError never
  // fires and the card shows a broken image rather than the monogram. Re-check
  // the element on mount: complete with a zero natural width means it failed.
  useEffect(() => {
    const img = avatarRef.current
    if (img && img.complete && img.naturalWidth === 0) setAvatarOk(false)
  }, [])

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = m
    setReduced(m)
  }, [])

  useEffect(() => {
    const updateClock = () => setNepalTime(NEPAL_CLOCK.format(new Date()))
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  // ---- Teardown ---------------------------------------------------------
  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }

    const v = videoRef.current
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }

    // The fade-out ramp normally finishes before this runs. It cannot be
    // relied on to: requestAnimationFrame is suspended in a hidden tab, so a
    // visitor who clicks ENTER and switches away would come back to a layer
    // that is gone and a ramp that never completed. Stopping the track here
    // makes the fade an improvement on silence rather than the only thing
    // producing it.
    soundRef.current.audioRef.current?.pause()

    document.body.classList.remove('intro-locked')
    phaseRef.current = 'done'
    setPhase('done')

    // Nothing to reveal on the way out: the portfolio has been rendered and
    // revealed behind this layer the whole time, so the dissolve uncovers a
    // finished page rather than animating one in.
  }, [])

  // ---- The exit ---------------------------------------------------------
  // Starts on the beat, runs on the compositor. The class does the work — see
  // the .intro--exiting keyframes in beat-intro.css — and this timer only
  // decides when the layer stops existing. Kept a hair longer than the
  // animation so the unmount happens on an already-invisible layer and can
  // never clip the last frames of the fade.
  const fire = useCallback(() => {
    const p = phaseRef.current
    if (p === 'exiting' || p === 'done') return

    // Scroll stays locked until the layer is actually gone, so the page cannot
    // jump underneath a half-faded intro.
    phaseRef.current = 'exiting'
    setPhase('exiting')
    setPulse(false)

    const ms = reducedRef.current
      ? TRANSITION.EXIT_REDUCED_MS
      : TRANSITION.EXIT_MS

    // The music goes with the picture, over the same window.
    soundRef.current.fadeOut(ms)
    exitTimerRef.current = window.setTimeout(finish, ms + 40)
  }, [finish])

  // Never leave a pending unmount behind if the tree goes away first.
  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current)
    },
    []
  )

  // ---- Frame loop -------------------------------------------------------
  useEffect(() => {
    const v = videoRef.current
    if (!v || reduced) return

    let cancelled = false
    let id = 0

    const onFrame = (mediaTime: number) => {
      if (cancelled) return
      const p = phaseRef.current

      // Beat indicator on the ENTER rule, so the page visibly listens to the
      // music before you ever click it.
      prevMediaRef.current = mediaTime

      const beatIndex = Math.floor((mediaTime - BEAT.ORIGIN_S) / BEAT.PERIOD_S)
      if (beatIndex !== lastBeatRef.current) {
        lastBeatRef.current = beatIndex
        if (p === 'idle' || p === 'armed') {
          setPulse(true)
          window.setTimeout(() => setPulse(false), 110)
        }
      }

      if (p !== 'armed') return

      // The target was locked in at arm time. Fire on the first frame at or
      // past it — a crossing test, so a frame can never step over the cut.
      const target = targetRef.current
      if (target === null) return

      // The clip loops; if it wrapped before reaching the target, cut at the
      // seam. The seam is itself a hard cut (and the darkest point in the
      // clip), so it is a perfectly good place to land.
      if (mediaTime < prevMediaRef.current - 0.5) {
        fire()
        return
      }
      if (reachedTarget(mediaTime, target)) fire()
    }

    const hasVFC =
      typeof (v as HTMLVideoElement & { requestVideoFrameCallback?: unknown })
        .requestVideoFrameCallback === 'function'

    if (hasVFC) {
      const step = (_n: number, meta: { mediaTime: number }) => {
        onFrame(meta.mediaTime)
        if (!cancelled) id = v.requestVideoFrameCallback(step)
      }
      pumpRef.current = () => {
        if (!cancelled) id = v.requestVideoFrameCallback(step)
      }
      pumpRef.current()
    } else {
      const step = () => {
        onFrame(v.currentTime)
        if (!cancelled) id = requestAnimationFrame(step)
      }
      pumpRef.current = () => {}
      id = requestAnimationFrame(step)
    }

    return () => {
      cancelled = true
      pumpRef.current = null
      if (hasVFC) v.cancelVideoFrameCallback?.(id)
      else cancelAnimationFrame(id)
    }
  }, [reduced, fire])

  // ---- Readiness --------------------------------------------------------
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    if (reduced) {
      setReady(true)
      phaseRef.current = 'idle'
      setPhase('idle')
      return
    }

    const onReady = () => {
      // Idempotent: fires from several events plus a poll.
      if (phaseRef.current !== 'loading') return
      if (v.readyState < 4) return

      setReady(true)
      phaseRef.current = 'idle'
      setPhase('idle')

      if (BG.NATIVE_LOOP) v.loop = true
      v.play().catch(() => {})
      pumpRef.current?.()
    }

    // `canplaythrough` is skipped outright by some browsers and throttled in
    // background tabs; gating on it alone can leave ENTER disabled forever on a
    // fully buffered video. Listen broadly and poll as a safety net.
    const EVENTS = ['loadeddata', 'canplay', 'canplaythrough', 'progress', 'suspend'] as const
    for (const e of EVENTS) v.addEventListener(e, onReady)
    const poll = window.setInterval(() => {
      if (phaseRef.current !== 'loading') {
        window.clearInterval(poll)
        return
      }
      onReady()
    }, 200)

    onReady()
    document.body.classList.add('intro-locked')

    return () => {
      for (const e of EVENTS) v.removeEventListener(e, onReady)
      window.clearInterval(poll)
    }
  }, [reduced])

  // ---- Stall recovery ---------------------------------------------------
  // A 16.8s clip is big enough that playback can outrun the buffer: readyState
  // drops to 2, the video pauses itself, the background freezes and — because
  // frames stop arriving — the beat clock stops with it. Browsers do not always
  // resume on their own. Watch for the stall and restart when data returns.
  useEffect(() => {
    const v = videoRef.current
    if (!v || reduced) return

    const resume = () => {
      const p = phaseRef.current
      if (p !== 'idle' && p !== 'armed') return
      if (!v.paused) return
      v.play().catch(() => {})
      pumpRef.current?.()
    }

    const EVENTS = ['canplay', 'canplaythrough', 'playing', 'waiting', 'stalled', 'suspend'] as const
    for (const e of EVENTS) v.addEventListener(e, resume)

    // Belt and braces: some stalls emit no event at all.
    const watchdog = window.setInterval(resume, 500)

    return () => {
      for (const e of EVENTS) v.removeEventListener(e, resume)
      window.clearInterval(watchdog)
    }
  }, [reduced])

  // ---- Tab visibility ---------------------------------------------------
  // requestVideoFrameCallback does not fire in a hidden tab, so an armed
  // transition would sit there forever. Pump it back on return.
  useEffect(() => {
    if (reduced) return
    const v = videoRef.current

    const onVis = () => {
      const p = phaseRef.current
      if (p === 'done' || !v) return
      if (document.hidden) return
      if (v.paused) v.play().catch(() => {})
      pumpRef.current?.()
    }

    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reduced])

  // ---- Scrubbing --------------------------------------------------------
  // Pointer anywhere on the bar seeks; arrow keys step a beat at a time,
  // because on this track a beat is the unit that means something.
  const onScrub = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      soundRef.current.seek(ratio * (soundRef.current.duration || BG.DURATION_S))
      el.focus()
    },
    []
  )

  const onScrubKey = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === 'ArrowRight' ? BEAT.PERIOD_S : e.key === 'ArrowLeft' ? -BEAT.PERIOD_S : 0
    if (!step) return
    e.preventDefault()
    soundRef.current.seek(soundRef.current.current + step)
  }, [])

  // ---- Enter ------------------------------------------------------------
  const onEnter = useCallback(() => {
    if (phaseRef.current !== 'idle' || !ready) return

    if (reduced) {
      // Same hand-off, minus the wait for a beat and minus the movement.
      fire()
      return
    }

    // Arm only. Lock the target now so it cannot drift as playback advances.
    const v = videoRef.current
    targetRef.current = v ? nextTransitionPoint(v.currentTime).at : null
    phaseRef.current = 'armed'
    setPhase('armed')

    // Guard against a stalled decoder: if no beat arrives, cut anyway rather
    // than leaving the visitor stuck on a dead button.
    window.setTimeout(() => {
      if (phaseRef.current === 'armed') fire()
    }, TRANSITION.MAX_WAIT_S * 1000)
  }, [ready, reduced, fire])

  if (phase === 'done') return null

  return (
    <div
      ref={rootRef}
      className={`intro intro--${phase}`}
      role="presentation"
      style={
        {
          '--intro-exit-ms': `${reduced ? TRANSITION.EXIT_REDUCED_MS : TRANSITION.EXIT_MS}ms`,
          '--intro-copy-out-ms': `${TRANSITION.COPY_OUT_MS}ms`,
        } as CSSProperties
      }
    >
      <video
        ref={videoRef}
        className="intro__video"
        muted={BG.MUTED}
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      >
        <source src="/video/bg-1920.webm" type="video/webm" media="(min-width: 1600px)" />
        <source src="/video/bg-1920.mp4" type="video/mp4" media="(min-width: 1600px)" />
        <source src="/video/bg-1280.webm" type="video/webm" />
        <source src="/video/bg-1280.mp4" type="video/mp4" />
      </video>

      <div className="intro__scrim" aria-hidden="true" />

      {/* Drifting motes. The reference for this layout used falling petals;
          over a night sky with a comet in it, embers carry the same idea
          without arriving from a different picture. Pure CSS, transform and
          opacity only, and gone entirely under reduced motion. */}
      {!reduced && (
        <div className="motes" aria-hidden="true">
          {MOTES.map((m, i) => (
            <span
              key={i}
              className="motes__m"
              style={
                {
                  '--x': `${m.x}%`,
                  '--size': `${m.size}px`,
                  '--dur': `${m.dur}s`,
                  '--delay': `${m.delay}s`,
                  '--drift': `${m.drift}px`,
                  '--warm': m.warm ? 1 : 0,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* The film's own soundtrack. Muted video + separate track is the only
          combination browsers will autoplay, so the sound is opt-in by
          design rather than by policy. */}
      {/* No <source> children and no `loop`: both are set by useGateAudio,
          which picks the playable source for the current track and loops only
          the film's own one. */}
      <audio ref={sound.audioRef} preload="auto" aria-hidden="true" />

      <button
        className={`gate-sound${sound.playing ? ' is-on' : ''}`}
        type="button"
        data-sound-control
        onClick={sound.toggle}
        disabled={!sound.ready}
        aria-pressed={sound.playing}
        aria-label={sound.playing ? 'Mute the soundtrack' : 'Play the soundtrack'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
          {sound.playing ? (
            <>
              <path d="M15.6 8.6a4.4 4.4 0 0 1 0 6.8" />
              <path d="M18.2 6a8 8 0 0 1 0 12" />
            </>
          ) : (
            <path d="m16.2 9.5 5 5m0-5-5 5" />
          )}
        </svg>
      </button>

      <div className="intro__copy" ref={copyRef}>
        {/* ---- The card ---- */}
        <div className="gate">
          {/* Live Discord avatar first, the local file second, initials last.
              The Discord one is keyed on its URL so React swaps the element
              rather than mutating src on a loaded image — otherwise the old
              face lingers for a frame when the account changes it. */}
          <div className="gate__avatar">
            {discord?.avatarUrl ? (
              <img
                key={discord.avatarUrl}
                src={discord.avatarUrl}
                alt=""
                width={96}
                height={96}
              />
            ) : avatarOk ? (
              <img
                ref={avatarRef}
                src={gate.avatar}
                alt=""
                width={96}
                height={96}
                onError={() => setAvatarOk(false)}
              />
            ) : (
              <span className="display gate__monogram" aria-hidden="true">
                {INITIALS}
              </span>
            )}

          </div>

          <h1 className="display gate__name">{discord?.displayName ?? profile.name}</h1>
          {discord && <p className="data gate__handle">@{discord.username}</p>}
          <p className="gate__tagline">{gate.tagline}</p>

          <p className="data gate__place">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            <span>{profile.location}</span>
            <i aria-hidden="true" />
            {/* The clock alone. Naming the offset as well was saying the same
                thing twice — the place is already on the line, and a reader
                who wants the arithmetic can do it from the time. */}
            <time dateTime={nepalTime === '--:--:--' ? undefined : nepalTime}>{nepalTime}</time>
          </p>

          {/* The Discord account, as Discord itself renders it: banner, accent
              colour, avatar, display name, handle. Before the OAuth endpoint
              is connected this is the local portrait and the site's own name,
              which is the same card with the same shape — not an empty box
              waiting to be filled, and not a notice to the visitor about a
              credential that is the owner's problem. */}
          <div
            className={`presence${discord ? '' : ' presence--local'}`}
            aria-live="polite"
            style={
              {
                ...(accent ? { '--accent': accent } : null),
                ...(discord?.bannerUrl ? { '--banner': `url("${discord.bannerUrl}")` } : null),
              } as CSSProperties
            }
          >
            {discord?.bannerUrl && <span className="presence__banner" aria-hidden="true" />}

            <span className="presence__avatar">
              <img src={discord?.avatarUrl ?? gate.avatar} alt="" width={56} height={56} />
            </span>

            <span className="presence__body">
              <span className="presence__who">
                <strong>{discord?.displayName ?? profile.name}</strong>
              </span>
              {/* The handle only exists once Discord has answered. Nothing
                  stands in for it: the two candidates — the location and the
                  tagline — are both already on the lines directly above, and
                  a chip that repeats the card it sits in is worse than a chip
                  with one line in it. */}
              {discord && <span className="presence__handle">@{discord.username}</span>}
              {/* The bio, when the account has one. No fallback sentence: an
                  empty line is better than a line invented to fill it. */}
              {discord?.bio && <span className="presence__line">{discord.bio}</span>}
            </span>
          </div>

          <ul className="gate__socials">
            {socials.map((sc) => (
              <li key={sc.label}>
                <a
                  href={sc.href}
                  aria-label={sc.label}
                  title={sc.label}
                  target={sc.href.startsWith('http') ? '_blank' : undefined}
                  rel={sc.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {/* evenodd, because the Instagram, Spotify, Discord and
                        envelope marks are all drawn as nested subpaths that
                        need to carve holes rather than fill over each other. */}
                    <path d={sc.icon} fillRule="evenodd" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <button
            className={`intro__enter${pulse ? ' is-beat' : ''}`}
            type="button"
            onClick={onEnter}
            disabled={!ready || phase !== 'idle'}
          >
            <span className="data">
              {!ready
                ? 'Loading'
                : phase === 'idle'
                  ? 'Enter'
                  : 'On the beat'}
            </span>
            <span className="intro__enter-rule" aria-hidden="true" />
          </button>
        </div>

        {/* ---- The player ----
            Not a widget bolted on: this is the clip's own audio, on the clip's
            own timeline, so the bar is the film's position and seeking it
            moves the picture too. */}
        <div className="player">
          <div
            ref={barsRef}
            /* No class of its own. `is-live` is added by useSpectrum while
               there is real audio to read, and removed — along with the inline
               transforms — the moment there is not, which drops the bars back
               to the resting height in CSS. A paused meter is a still meter. */
            className="player__art"
            aria-hidden="true"
          >
            <i /><i /><i /><i />
          </div>

          <div className="player__body">
            <p className="player__title">
              {sound.track.title}
              <span className="data player__detail">{sound.track.detail}</span>
              {sound.hasPlaylist && (
                <span className="data player__count">
                  {sound.index + 1}/{sound.count}
                </span>
              )}
            </p>

            <div className="player__row">
              <span className="data player__time">{fmt(sound.current)}</span>

              <div
                className="player__bar"
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(sound.duration || BG.DURATION_S)}
                aria-valuetext={`${fmt(sound.current)} of ${sound.track.title}`}
                aria-valuenow={Math.round(sound.current)}
                onPointerDown={onScrub}
                onKeyDown={onScrubKey}
              >
                <span
                  className="player__fill"
                  style={{
                    transform: `scaleX(${
                      (sound.current / (sound.duration || BG.DURATION_S)) || 0
                    })`,
                  }}
                />
              </div>

              <span className="data player__time">
                {fmt(sound.duration || BG.DURATION_S)}
              </span>

              <div className="player__controls">
                <button
                  type="button"
                  data-sound-control
                  onClick={sound.hasPlaylist ? sound.prev : sound.restart}
                  aria-label={
                    sound.hasPlaylist ? 'Previous track' : 'Back to the start of the loop'
                  }
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 6v12M18 6.5v11l-8.5-5.5L18 6.5Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  data-sound-control
                  onClick={sound.toggle}
                  disabled={!sound.ready}
                  aria-label={sound.playing ? 'Pause' : 'Play'}
                >
                  {sound.playing ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 5.5v13M15 5.5v13" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.5 5.5v13L18.5 12 7.5 5.5Z" />
                    </svg>
                  )}
                </button>

                {/* Only with somewhere to skip to. A permanently dead next
                    button is worse than no next button. */}
                {sound.hasPlaylist && (
                  <button type="button" data-sound-control onClick={sound.next} aria-label="Next track">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17 6v12M6 6.5v11l8.5-5.5L6 6.5Z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
