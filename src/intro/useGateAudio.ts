import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { gate, playlist } from '../data/site'
import { BG_AUDIO } from './cues'

// THE SOUND — a playlist whose first track is the film itself.
//
// TRACK 1 IS SPECIAL and everything else follows from that. It is the same
// recording the montage was cut to, shipped separately because a video that
// autoplays with sound does not autoplay at all. So while it is playing, the
// player and the picture share ONE timeline: seek the bar and the film moves
// with it, and a 180ms drift is corrected because a montage out of sync with
// its own music is worse than silence. It loops, like the film.
//
// EVERY OTHER TRACK IS ORDINARY. It has its own timeline, the bar scrubs only
// the audio, the film carries on looping underneath, and when it ends the
// playlist advances. Pretending those tracks share the film's clock would mean
// scrubbing someone's song to move a video it has nothing to do with.
//
// Add tracks by dropping files in /public/audio/ and listing them in
// site.ts — see `playlist` there. With none listed this behaves exactly as it
// did when there was only ever one track.

const DRIFT_TOLERANCE_S = 0.18

/** Restarting is the friendlier read of "previous" once a track is underway. */
const PREV_RESTARTS_AFTER_S = 3
const LAST_ARRIVAL_TRACK = 'sugam:last-arrival-track'

export type PlayerTrack = {
  title: string
  detail: string
  sources: { src: string; type: string }[]
  /** Only true for track 1: shares the film's timeline. */
  isFilm: boolean
}

const FILM_TRACK: PlayerTrack = {
  title: gate.audio.title,
  detail: gate.audio.detail,
  sources: [
    { src: BG_AUDIO.webm, type: 'audio/webm' },
    { src: BG_AUDIO.m4a, type: 'audio/mp4' },
  ],
  isFilm: true,
}

const TRACKS: PlayerTrack[] = [
  FILM_TRACK,
  ...playlist.map((t) => ({
    title: t.title,
    detail: t.detail,
    // Type left to the extension; the browser sniffs the container anyway and
    // a wrong guess here would exclude a file that plays perfectly well.
    sources: [{ src: t.src, type: '' }],
    isFilm: false,
  })),
]

export type GateAudio = {
  ready: boolean
  playing: boolean
  current: number
  duration: number
  track: PlayerTrack
  index: number
  count: number
  hasPlaylist: boolean
  play: () => Promise<boolean>
  toggle: () => void
  next: () => void
  prev: () => void
  restart: () => void
  seek: (seconds: number) => void
  fadeOut: (ms: number) => void
  audioRef: RefObject<HTMLAudioElement | null>
}

/** First source this browser admits to being able to play. */
function pickSource(track: PlayerTrack, el: HTMLAudioElement): string {
  const playable = track.sources.find((s) => !s.type || el.canPlayType(s.type) !== '')
  return (playable ?? track.sources[0]).src
}

export function useGateAudio(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): GateAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [index, setIndex] = useState(0)

  const track = TRACKS[index] ?? FILM_TRACK
  const playingRef = useRef(false)
  const trackRef = useRef(track)
  trackRef.current = track

  // Pick a different arrival edit on every visit/refresh. The film loop is
  // kept as the manual first track; randomized arrivals come from the compact
  // curated edits. Remembering the title prevents an immediate repeat even
  // when Math.random lands on the same slot twice.
  useEffect(() => {
    if (TRACKS.length <= 1) return

    const last = sessionStorage.getItem(LAST_ARRIVAL_TRACK)
    const candidates = TRACKS
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .slice(1)
      .filter(({ candidate }) => candidate.title !== last)
    const pool = candidates.length ? candidates : TRACKS
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .slice(1)
    const choice = pool[Math.floor(Math.random() * pool.length)]

    sessionStorage.setItem(LAST_ARRIVAL_TRACK, choice.candidate.title)
    setIndex(choice.candidateIndex)
  }, [])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  // ---- Loading the current track ---------------------------------------
  // Imperative rather than <source> children: swapping children and calling
  // load() is the same work with more moving parts, and this way the choice
  // of source is made once, here, against the element that will play it.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const wasPlaying = playingRef.current
    setReady(false)
    setDuration(0)

    a.src = pickSource(track, a)
    a.loop = track.isFilm
    a.load()

    if (!wasPlaying) return

    // DO NOT call play() in the same tick as load().
    //
    // load() tears down and restarts the resource selection algorithm, which
    // ABORTS any play() already in flight — the promise rejects with
    // AbortError ("interrupted by a new load request"), the catch below marks
    // the player paused, and skipping to the next track silently stops the
    // music instead of playing it. It fails on every skip, not intermittently.
    //
    // So wait until the new track can actually start. readyState >= 3 means
    // it already can, and there will be no further canplay to wait for.
    const start = () => {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    }

    if (a.readyState >= 3) {
      start()
      return
    }

    a.addEventListener('canplay', start, { once: true })
    return () => a.removeEventListener('canplay', start)
  }, [track])

  // ---- Metadata --------------------------------------------------------
  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration)
        setReady(true)
      }
    }

    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('canplay', onMeta)
    onMeta()

    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('canplay', onMeta)
    }
  }, [index])

  // ---- Advancing -------------------------------------------------------
  // The film track loops and never ends; the rest hand over to the next one,
  // wrapping at the end of the list.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onEnded = () => setIndex((i) => (i + 1) % TRACKS.length)
    a.addEventListener('ended', onEnded)
    return () => a.removeEventListener('ended', onEnded)
  }, [])

  // ---- Clock -----------------------------------------------------------
  // On the film track the PICTURE is the clock, so the bar tracks the loop
  // even with the sound off and the readout is never stopped at 0:00. On any
  // other track the audio is the only clock there is.
  //
  // 200ms, not a frame loop: this drives a text readout and a bar with a
  // 200ms linear transition on it. The frame-accurate work is the beat clock
  // in BeatIntro, which does not go through state at all.
  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      const v = videoRef.current
      const a = audioRef.current
      const t = trackRef.current

      if (!t.isFilm) {
        if (a) setCurrent(a.currentTime)
        return
      }

      if (!v) return
      setCurrent(v.currentTime)

      // Correct drift rather than re-seeking every tick — a seek on a playing
      // element is audible, so it has to be worth doing. Skips the correction
      // near the loop seam, where the two elements wrap microseconds apart and
      // "drift" is only the wrap.
      if (a && playingRef.current && !a.paused && duration > 0) {
        const delta = Math.abs(a.currentTime - v.currentTime)
        if (delta > DRIFT_TOLERANCE_S && delta < duration - 0.5) {
          a.currentTime = v.currentTime
        }
      }
    }

    const id = window.setInterval(tick, 200)
    tick()
    return () => window.clearInterval(id)
  }, [enabled, duration, videoRef])

  // ---- Controls --------------------------------------------------------
  const play = useCallback(async (): Promise<boolean> => {
    const a = audioRef.current
    const v = videoRef.current
    if (!a) return false

    if (!a.paused) return true

    // On the film track, join the picture where it already is, not at zero.
    if (v && trackRef.current.isFilm) a.currentTime = v.currentTime
    a.volume = 1

    try {
      await a.play()
      setPlaying(true)
      return true
    } catch {
      setPlaying(false)
      return false
    }
  }, [videoRef])

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a) return

    if (a.paused) {
      void play()
    } else {
      a.pause()
      setPlaying(false)
    }
  }, [play])

  const seek = useCallback(
    (seconds: number) => {
      const a = audioRef.current
      const v = videoRef.current
      const d = duration || (a ? a.duration : 0)
      if (!d || !Number.isFinite(d)) return

      const t = Math.max(0, Math.min(seconds, d - 0.05))
      if (a) a.currentTime = t
      // The film and its own track are one recording, so they move together.
      // Any other track moves alone.
      if (v && trackRef.current.isFilm) v.currentTime = t
      setCurrent(t)
    },
    [duration, videoRef]
  )

  const restart = useCallback(() => seek(0), [seek])

  const next = useCallback(() => setIndex((i) => (i + 1) % TRACKS.length), [])

  const prev = useCallback(() => {
    const a = audioRef.current
    // The convention every music player uses: once a track is underway,
    // "previous" means "start this one again".
    if (a && a.currentTime > PREV_RESTARTS_AFTER_S) {
      seek(0)
      return
    }
    setIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length)
  }, [seek])

  // ---- Leaving ---------------------------------------------------------
  // The music belongs to the intro layer, so it leaves with it. A hard stop
  // under a 1-second dissolve is the one thing that would give the cut away,
  // so the volume ramps down across the same window the picture fades over.
  const fadeOut = useCallback((ms: number) => {
    const a = audioRef.current
    if (!a || a.paused) return

    const from = a.volume
    const t0 = performance.now()

    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms)
      a.volume = from * (1 - p)
      if (p < 1) {
        requestAnimationFrame(step)
        return
      }
      a.pause()
      a.volume = from
    }

    requestAnimationFrame(step)
  }, [])

  return {
    ready,
    playing,
    current,
    duration,
    track,
    index,
    count: TRACKS.length,
    hasPlaylist: TRACKS.length > 1,
    play,
    toggle,
    next,
    prev,
    restart,
    seek,
    fadeOut,
    audioRef,
  }
}

export { BG_AUDIO }
