// INTRO CUE CONFIGURATION — the single place timings live.
//
// The landing screen is one looping background clip. There is no separate idle
// window and no attack clip: the footage runs continuously, and ENTER cuts the
// page to the portfolio ON THE BEAT.
//
// Everything here is expressed in SECONDS, not frames. The clip was authored at
// 60fps and ships at 30fps, and expressing cues in seconds means the transcode
// frame rate is irrelevant — `mediaTime` is seconds either way.

/** Background clip, measured off the master. */
export const BG = {
  DURATION_S: 16.766,

  /**
   * The clip is a TRUE loop — the last frame is byte-identical to the first
   * (measured seam 0.00 on the master, 0.56 on the shipped transcode; anything
   * under ~8 is imperceptible). So it loops natively with `video.loop = true`:
   * no seeking, no crossfade, no frame callback policing it.
   */
  NATIVE_LOOP: true,

  /** Muted so it can autoplay. The audio track ships separately for an
   *  optional sound toggle — see BG_AUDIO. */
  MUTED: true,
} as const

export const BG_AUDIO = {
  webm: '/video/bg-audio.webm',
  m4a: '/video/bg-audio.m4a',
} as const

/**
 * THE BEAT GRID — the reason the transition blends.
 *
 * The second half of the clip is a montage cut to the music: 18 scene changes,
 * evenly spaced 41.5 frames apart at 60fps. Fitting a grid to them gives
 * origin 0.1s, period 0.691667s — about 86.75 BPM.
 *
 * Verified against the detected cuts: 0.1 + 0.691667 x 10 = 7.0167s, which is
 * the first cut exactly; x 23 = 16.008s, which is the last.
 *
 * ENTER does not transition immediately. It ARMS, and the cut fires on the next
 * beat. Because the footage itself changes shot on that beat, the page cutting
 * at the same instant reads as part of the edit rather than as a page
 * transition. Worst-case wait is one beat — 0.69s — anywhere in the clip.
 */
export const BEAT = {
  ORIGIN_S: 0.1,
  PERIOD_S: 0.691667,
  get BPM() {
    return 60 / this.PERIOD_S
  },
} as const

/** Time of the next beat at or after `t`. */
export function nextBeat(t: number): number {
  const n = Math.ceil((t - BEAT.ORIGIN_S) / BEAT.PERIOD_S)
  return BEAT.ORIGIN_S + n * BEAT.PERIOD_S
}

/** Seconds until the next beat from `t`. */
export function timeToNextBeat(t: number): number {
  return nextBeat(t) - t
}

/**
 * Detected hard scene changes, in seconds. Kept for reference and for anyone
 * retuning: these are what the grid above was fitted to. The first ~7s of the
 * clip is one continuous shot, which is why the grid is extrapolated backwards
 * rather than taken only from these.
 */
export const SCENE_CUTS_S = [
  7.017, 7.733, 8.433, 9.117, 9.8, 10.483, 11.183, 11.867, 12.567, 13.25,
  13.933, 14.633, 15.3, 16.0,
] as const

/**
 * Near-black moments, in seconds. An alternative to a beat cut if a softer
 * hand-off is ever wanted — a transition through black is the most invisible
 * of all. Measured average luminance 15-28 out of 255.
 */
export const DARK_POINTS_S = [
  { from: 0.0, to: 0.33 },
  { from: 4.58, to: 5.08 },
  { from: 16.42, to: 16.766 },
] as const

/**
 * THE TRANSITION — a dissolve, timed to the beat.
 *
 * The cue is still the music: ENTER arms, and the exit STARTS on the next
 * beat (or on the next real picture cut, when one is closer — see
 * `nextTransitionPoint`). What changed is what happens after that instant.
 * Instead of unmounting on a single frame, the layer leaves over about one
 * and a half beats: the copy lifts away first, the image pushes in and
 * settles toward the page ground, and the whole layer dissolves off the
 * portfolio that has been rendered underneath the entire time.
 *
 * Durations are expressed as multiples of the beat period rather than as
 * round web numbers, so the exit keeps time with the montage instead of
 * running at some duration the footage knows nothing about.
 */
export const TRANSITION = {
  STYLE: 'dissolve' as const,

  /** The copy goes first — a third of a beat — so the frame is clean before
   *  the image starts to move. Overlapping them muddles both. */
  COPY_OUT_MS: Math.round(BEAT.PERIOD_S * 1000 * 0.34),

  /** Beat to unmount. One and a half beats: long enough to read as a
   *  dissolve, short enough that nobody waits for their own click. */
  EXIT_MS: Math.round(BEAT.PERIOD_S * 1000 * 1.5),

  /** Reduced motion still gets a hand-off rather than a jump cut, just a
   *  plain opacity fade with nothing moving. */
  EXIT_REDUCED_MS: 220,

  /**
   * Prefer a real picture cut over a bare beat when one is close.
   *
   * Capped at ONE BEAT. In the montage the cuts land on beats anyway, so this
   * loses nothing there — and it stops a distant cut from making someone wait.
   * At 1.5s the worst wait measured 1342ms, nearly two beats; at one beat it
   * is 692ms. In the opening 7s (a single continuous shot, no cuts) this falls
   * back to the beat.
   */
  PREFER_SCENE_CUT_WITHIN_S: 0.6917,

  /** Guard against a stalled decoder: leave anyway rather than stranding the
   *  visitor on a dead button. Never hit in normal playback. */
  MAX_WAIT_S: 0.95,
} as const

/**
 * When to cut, given the current playback time.
 *
 * Picks whichever comes first: the next real picture cut, or the next beat.
 * In the montage the cuts land on beats, so that resolves to the cut; in the
 * opening 7s (one continuous shot) it resolves to the beat. Because the target
 * can never be later than the next beat, the wait is bounded by one beat.
 */
export function nextTransitionPoint(t: number): { at: number; onSceneCut: boolean } {
  const beat = nextBeat(t)
  const cut = SCENE_CUTS_S.find((c) => c > t + 0.01)

  // Tolerance, because the fitted grid and the measured cuts drift apart by up
  // to ~35ms — cut 8.433 sits just after beat 8.400, for instance. Where they
  // disagree the CUT is the truth; the grid is only a fit to it. 30ms was too
  // tight and lost 27 of 330 montage clicks to the beat.
  if (cut !== undefined && cut <= beat + 0.06) {
    return { at: cut, onSceneCut: true }
  }
  return { at: beat, onSceneCut: false }
}

/**
 * Has playback reached the armed target?
 *
 * A CROSSING test, not a proximity window. The earlier version fired only when
 * playback landed within 25ms of the target — but the cut timestamps do not sit
 * on the 30fps frame grid, so a frame could step straight over a cut (0.033s
 * away, just outside the window), miss it, and roll on to the next one. Worst
 * observed wait was 1342ms, nearly two beats.
 *
 * Testing for "at or past the target" cannot miss: the first frame on or after
 * it fires, whatever the frame rate.
 */
export function reachedTarget(mediaTime: number, target: number): boolean {
  return mediaTime >= target - 0.008
}

/** Background sources, widest first. 1280 covers most laptops; 1920 only for
 *  genuinely large screens, because this clip is 16.8s and the bytes add up. */
export const BG_SOURCES = [
  { src: '/video/bg-1920.webm', type: 'video/webm', minWidth: 1600 },
  { src: '/video/bg-1920.mp4', type: 'video/mp4', minWidth: 1600 },
  { src: '/video/bg-1280.webm', type: 'video/webm', minWidth: 0 },
  { src: '/video/bg-1280.mp4', type: 'video/mp4', minWidth: 0 },
] as const

export const VIDEO_ASPECT = 16 / 9
