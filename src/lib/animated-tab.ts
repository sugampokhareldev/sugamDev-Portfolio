// THE TAB — the one piece of this site that is visible when the site is not.
//
// Two animations, both cheap, both on the same clock as everything else:
//
//   FAVICON  a comet head sweeping one full turn per BEAT (0.691667s, the
//            86.75 BPM the montage is cut to). Drawn into a 32px canvas and
//            handed to the <link> as a data URL.
//
//   TITLE    the name typed out, held, cleared, then the role — the biolink
//            convention, slowed down to something that does not thrash the
//            tab strip.
//
// COST. The favicon redraw is a 32x32 canvas plus a PNG encode, at 10fps.
// That is genuinely small, but it is not free, so it stops dead when the tab
// is hidden: background timers are clamped to 1s anyway, which would only
// produce a stuttering icon at full price. Reduced motion turns both off and
// leaves the served title and the static favicon exactly as they are.

import { BEAT } from '../intro/cues'

const SIZE = 32
const FPS = 10

// Sampled from the footage, same as the tokens — see DESIGN.md.
const GROUND = '#050b16'
const SIGNAL = '#f0a24b'
const TRAIL = 'rgba(240, 162, 75, 0.28)'

type Frame = { stop: () => void }

function animateFavicon(): Frame {
  // If the document has no icon link, the browser is falling back to
  // /favicon.ico implicitly. Appending an href-less <link rel="icon"> in that
  // case does not just fail to animate — it OVERRIDES the implicit fallback
  // with nothing, and the tab loses its icon entirely for as long as the
  // animation is paused (a hidden tab, or reduced motion). So the new link
  // starts life pointing at the served icon.
  const FALLBACK = '/favicon.svg'
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.href = FALLBACK
    document.head.appendChild(link)
  }

  // Put the served favicon back on the way out, so a stopped animation never
  // leaves the tab holding a half-drawn frame.
  const original = link.getAttribute('href') ?? FALLBACK

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return { stop: () => {} }

  const mid = SIZE / 2
  const radius = mid - 5
  const t0 = performance.now()
  let timer = 0

  const draw = () => {
    const turn = (((performance.now() - t0) / 1000) % BEAT.PERIOD_S) / BEAT.PERIOD_S
    const angle = turn * Math.PI * 2 - Math.PI / 2

    ctx.clearRect(0, 0, SIZE, SIZE)

    // Ground, rounded so it reads as a tile rather than a sticker.
    ctx.fillStyle = GROUND
    ctx.beginPath()
    ctx.roundRect(0, 0, SIZE, SIZE, 7)
    ctx.fill()

    // The orbit it travels on.
    ctx.strokeStyle = TRAIL
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(mid, mid, radius, 0, Math.PI * 2)
    ctx.stroke()

    // The trailing arc, brightest at the head.
    const trail = ctx.createLinearGradient(0, 0, SIZE, SIZE)
    trail.addColorStop(0, 'rgba(240, 162, 75, 0)')
    trail.addColorStop(1, SIGNAL)
    ctx.strokeStyle = trail
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(mid, mid, radius, angle - 1.5, angle)
    ctx.stroke()

    // The head.
    ctx.fillStyle = SIGNAL
    ctx.beginPath()
    ctx.arc(mid + Math.cos(angle) * radius, mid + Math.sin(angle) * radius, 3.2, 0, Math.PI * 2)
    ctx.fill()

    link.href = canvas.toDataURL('image/png')
  }

  const start = () => {
    if (timer) return
    timer = window.setInterval(draw, 1000 / FPS)
    draw()
  }

  const pause = () => {
    window.clearInterval(timer)
    timer = 0
  }

  const onVis = () => (document.hidden ? pause() : start())
  document.addEventListener('visibilitychange', onVis)
  onVis()

  return {
    stop: () => {
      pause()
      document.removeEventListener('visibilitychange', onVis)
      if (original) link.href = original
    },
  }
}

function animateTitle(lines: string[]): Frame {
  const served = document.title
  let line = 0
  let char = 0
  let erasing = false
  let timer = 0

  const step = () => {
    const text = lines[line]

    if (!erasing) {
      char++
      document.title = text.slice(0, char)
      if (char >= text.length) {
        erasing = true
        timer = window.setTimeout(step, 2400)
        return
      }
      timer = window.setTimeout(step, 90)
      return
    }

    char--
    document.title = text.slice(0, char)
    if (char <= 0) {
      erasing = false
      line = (line + 1) % lines.length
      timer = window.setTimeout(step, 420)
      return
    }
    timer = window.setTimeout(step, 40)
  }

  step()

  return {
    stop: () => {
      window.clearTimeout(timer)
      document.title = served
    },
  }
}

export function startAnimatedTab(lines: string[]) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // roundRect is the only modern API used here; on anything without it the
  // tab keeps the served favicon rather than throwing during the first draw.
  const supported = typeof CanvasRenderingContext2D !== 'undefined' &&
    typeof CanvasRenderingContext2D.prototype.roundRect === 'function'

  const frames: Frame[] = []
  if (supported) frames.push(animateFavicon())
  if (lines.length) frames.push(animateTitle(lines))

  window.addEventListener('pagehide', () => frames.forEach((f) => f.stop()), { once: true })
}
