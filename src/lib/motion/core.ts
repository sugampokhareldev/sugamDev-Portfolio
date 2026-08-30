/**
 * Motion runtime — shared plumbing.
 *
 * Two schedulers, deliberately separate:
 *
 *   onScroll  runs on scroll/resize, rAF-throttled. Everything that reads
 *             layout lives here, so layout reads happen once per frame at
 *             most instead of once per listener.
 *
 *   onFrame   a continuous rAF, started only when something actually needs
 *             per-frame interpolation (the cursor lerp). Nothing else should
 *             use it — a continuously running loop that reads layout is how
 *             a portfolio ends up janky.
 */

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Progress of an element through the viewport, 0 before it enters, 1 after. */
export const throughView = (rect: DOMRect) =>
  clamp((innerHeight - rect.top) / (innerHeight + rect.height))

/** How centred an element is: 1 at the middle of the viewport, 0 at the edges. */
export const centredness = (rect: DOMRect) => {
  const mid = rect.top + rect.height / 2
  return clamp(1 - Math.abs(mid - innerHeight / 2) / (innerHeight / 2))
}

type Task = () => void

const scrollTasks = new Set<Task>()
let scrollQueued = false

const runScroll = () => {
  scrollQueued = false
  scrollTasks.forEach((fn) => fn())
}

const queueScroll = () => {
  if (scrollQueued) return
  scrollQueued = true
  requestAnimationFrame(runScroll)
}

export function onScroll(fn: Task) {
  scrollTasks.add(fn)
  fn()
}

export function startScroll() {
  addEventListener('scroll', queueScroll, { passive: true })
  addEventListener('resize', queueScroll, { passive: true })
  queueScroll()
}

const frameTasks = new Set<Task>()
let frameRunning = false

const frameLoop = () => {
  frameTasks.forEach((fn) => fn())
  if (frameTasks.size) requestAnimationFrame(frameLoop)
  else frameRunning = false
}

export function onFrame(fn: Task) {
  frameTasks.add(fn)
  if (!frameRunning) {
    frameRunning = true
    requestAnimationFrame(frameLoop)
  }
}

/** Shared observer for one-shot entrance work. */
export function whenInView(
  targets: Iterable<Element>,
  enter: (el: HTMLElement) => void,
  options: IntersectionObserverInit = { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }
) {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      enter(entry.target as HTMLElement)
      obs.unobserve(entry.target)
    })
  }, options)
  for (const t of targets) io.observe(t)
  return io
}
