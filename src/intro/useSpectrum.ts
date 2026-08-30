import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

// THE METER — four bars driven by the actual audio, not by a guess.
//
// What this replaces: the bars used to toggle between four hardcoded heights
// on the film's 86.75 BPM beat grid. That is accurate for exactly one track —
// the clip's own loop, which the grid was measured from — and meaningless for
// every other song in the playlist, which has its own tempo the page knows
// nothing about. It also could not follow a song's dynamics at all: same four
// heights on every hit, whether the track was a piano intro or a chorus.
//
// So this taps the element with a Web Audio AnalyserNode and reads the real
// spectrum each frame. Four bars, four frequency bands, low to high.
//
// TWO THINGS THAT WILL SILENCE THE PAGE IF YOU GET THEM WRONG:
//
//   1. createMediaElementSource() REROUTES the element. Once called, the audio
//      no longer goes to the speakers by itself — it goes wherever the graph
//      sends it. Forget to connect to destination, or build the graph on a
//      SUSPENDED context, and playback goes silent with no error. So the graph
//      is only ever built once the context is confirmed running, and the
//      analyser is wired to the destination in the same breath.
//
//   2. It can only be called ONCE per element, ever. Hence the ref: the graph
//      outlives track changes, which is fine, because it follows the element
//      rather than the source file.
//
// Falls back silently: no AudioContext, a context that will not start, or a
// browser that refuses — the meter keeps its beat-grid behaviour and the audio
// keeps playing. Never trade sound for a visualisation.

/** 256 → 128 bins ≈ 172Hz each at 44.1k. Enough for four bands, cheap. */
const FFT_SIZE = 256

/** Bin ranges per bar, low to high — roughly bass / low-mid / high-mid / air.
 *  Spaced logarithmically, because pitch is. */
const BANDS: Array<[number, number]> = [
  [1, 3],
  [4, 10],
  [11, 30],
  [31, 70],
]

/**
 * PER-BAND GAIN — pink-noise compensation, measured not guessed.
 *
 * Music falls off roughly 6dB per octave, so the raw bands are nowhere near
 * each other in level. Sampled off this playlist, band peaks came out:
 *
 *   bass 0.67   low-mid 0.40   high-mid 0.20   air 0.21
 *
 * Ungained, that is one tall bar and three stubs. These scale each band so a
 * loud passage puts it near the top of its travel, which is what makes four
 * bars readable as four bands rather than as one slope. The SIGNAL is real —
 * this only decides how much of the bar each band's own dynamic range uses.
 *
 * Bass is trimmed rather than boosted: at 1.3 it sat at 0.79-0.86 on every
 * track, pinned near the ceiling with nowhere to travel. There is always bass.
 */
const BAND_GAIN = [1.05, 2.1, 4, 4.4]

/**
 * THE DECIBEL WINDOW, and why the defaults are wrong here.
 *
 * getByteFrequencyData maps [minDecibels, maxDecibels] onto 0-255. The
 * defaults are -100 and -30 — and a commercially mastered track sits well
 * above -30dBFS across most of the spectrum, so every band pins at 255 and
 * all four bars sit at full height doing nothing. Measured on this playlist
 * with the defaults: bars never dropped below 0.82.
 *
 * Opening the ceiling to -14 gives loud material somewhere to go, and lifting
 * the floor to -78 stops room noise and tape hiss from holding the bars off
 * the bottom during quiet passages.
 */
const MIN_DB = -78
const MAX_DB = -14

/** Bars sit at this fraction when silent. */
const REST = 0.14

/** Rise instantly, fall gently — an instant fall reads as flicker. */
const DECAY_PER_FRAME = 0.055

type Graph = {
  ctx: AudioContext
  analyser: AnalyserNode
  data: Uint8Array
}

export function useSpectrum(
  audioRef: RefObject<HTMLAudioElement | null>,
  barsRef: RefObject<HTMLElement | null>,
  active: boolean
) {
  const graphRef = useRef<Graph | null>(null)
  const peaksRef = useRef<number[]>([REST, REST, REST, REST])
  const failedRef = useRef(false)

  useEffect(() => {
    const host = barsRef.current
    const audio = audioRef.current
    if (!active || !host || !audio || failedRef.current) return

    let raf = 0
    let stopped = false

    const bars = Array.from(host.querySelectorAll('i'))
    if (!bars.length) return

    const clear = () => {
      host.classList.remove('is-live')
      for (const bar of bars) bar.style.transform = ''
    }

    const build = async (): Promise<Graph | null> => {
      if (graphRef.current) return graphRef.current

      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null

      const ctx = new Ctor()
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {
          /* Autoplay policy. Handled below. */
        }
      }

      // The critical guard: never route a live element through a context that
      // is not running, or the track goes silent.
      if (ctx.state !== 'running') {
        try {
          await ctx.close()
        } catch {
          /* Nothing to do. */
        }
        return null
      }

      try {
        const source = ctx.createMediaElementSource(audio)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = FFT_SIZE
        analyser.minDecibels = MIN_DB
        analyser.maxDecibels = MAX_DB
        // Some smoothing in the node, the rest in the decay below.
        analyser.smoothingTimeConstant = 0.72
        source.connect(analyser)
        analyser.connect(ctx.destination)

        graphRef.current = {
          ctx,
          analyser,
          data: new Uint8Array(analyser.frequencyBinCount),
        }
        return graphRef.current
      } catch {
        // Already tapped, or blocked. Give up permanently rather than retry in
        // a loop — and leave the audio alone.
        failedRef.current = true
        try {
          await ctx.close()
        } catch {
          /* Nothing to do. */
        }
        return null
      }
    }

    const frame = (graph: Graph) => {
      if (stopped) return

      // Hidden tabs do not paint, so this would be pure heat.
      if (document.hidden) {
        raf = requestAnimationFrame(() => frame(graph))
        return
      }

      graph.analyser.getByteFrequencyData(graph.data)

      for (let i = 0; i < BANDS.length && i < bars.length; i++) {
        const [from, to] = BANDS[i]
        let sum = 0
        let n = 0
        for (let b = from; b <= to && b < graph.data.length; b++) {
          sum += graph.data[b]
          n++
        }

        const level = n ? Math.min(1, (sum / n / 255) * BAND_GAIN[i]) : 0
        const target = REST + level * (1 - REST)

        // Attack immediately, release slowly.
        const peak = peaksRef.current[i]
        peaksRef.current[i] = target > peak ? target : Math.max(target, peak - DECAY_PER_FRAME)

        bars[i].style.transform = `scaleY(${peaksRef.current[i].toFixed(3)})`
      }

      raf = requestAnimationFrame(() => frame(graph))
    }

    build().then((graph) => {
      if (!graph || stopped) return
      host.classList.add('is-live')
      raf = requestAnimationFrame(() => frame(graph))
    })

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      clear()
    }
  }, [active, audioRef, barsRef])

  // The context is deliberately NOT closed between tracks — closing it would
  // tear down the element's only route to the speakers. It dies with the page.
}
