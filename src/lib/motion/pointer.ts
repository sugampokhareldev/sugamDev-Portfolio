/**
 * Pointer-driven work: the registration cursor and the original hero's tiny
 * nudge. Contact deliberately does not subscribe to pointer position.
 *
 * All of it is gated on a fine pointer. On touch there is no hover to return
 * from, so these either do nothing or actively look broken.
 */
import { lerp, onFrame } from './core'

const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches
let started = false

/** What the cursor says over each kind of target. */
const LABELS: Array<[string, string]> = [
  ['[data-cursor="view"]', 'view'],
  ['a[target="_blank"]', 'open'],
  ['a[href^="mailto:"]', 'mail'],
  ['[data-cursor="explore"]', 'explore'],
]

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], [data-cursor]'

/** Ring diameter when it is following the pointer rather than locked on. */
const FREE_SIZE = 34

/**
 * Above this, a target is too big to wear as a cursor.
 *
 * Locking onto a full-width nav bar or a page-sized card would park the ring
 * hundreds of pixels from the hand and outline something the visitor can
 * already see the edges of. Buttons, icons, links and tiles sit well under
 * this; layout containers that merely happen to be clickable do not.
 */
const LOCK_MAX = { w: 260, h: 150 }

/** Breathing room around a locked target, so the ring frames it rather than
 *  tracing its exact border and reading as a focus outline. */
const LOCK_PAD = 8

/**
 * Smoothing. The ring catches up in a couple of frames when it is chasing the
 * pointer, and noticeably faster once it has a target to sit on — a lock that
 * eases in slowly reads as lag rather than as a decision.
 */
const EASE_FREE = 0.22
const EASE_LOCK = 0.34

/** The lock survives a few frames of nothing under the pointer. Without this,
 *  dragging across a one-pixel gap between two nav links makes the ring dive
 *  back to the pointer and out again — a flicker, not a transition. */
const LOCK_GRACE_MS = 90

type Box = { x: number; y: number; w: number; h: number; r: number }

/** The radius the element actually renders with, so a pill locks as a pill and
 *  a square tile as a square. Falls back to a circle for anything unparseable
 *  (percentages, multi-value shorthands, `border-radius: 50%`). */
function radiusOf(el: Element, box: { w: number; h: number }): number {
  const raw = getComputedStyle(el).borderTopLeftRadius
  const px = Number.parseFloat(raw)
  if (!Number.isFinite(px)) return 999
  if (raw.endsWith('%')) return (px / 100) * Math.min(box.w, box.h)
  // A radius already at half the short side is a pill; keep it one as the ring
  // grows past the element.
  return px >= Math.min(box.w, box.h) / 2 - 0.5 ? 999 : px + LOCK_PAD
}

function boxFor(el: Element): Box | null {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  if (rect.width > LOCK_MAX.w || rect.height > LOCK_MAX.h) return null

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    w: rect.width + LOCK_PAD * 2,
    h: rect.height + LOCK_PAD * 2,
    r: radiusOf(el, { w: rect.width, h: rect.height }),
  }
}

export function initPointer() {
  if (!FINE || started) return
  started = true

  const cursor = document.querySelector<HTMLElement>('[data-cursor-root]')
  const label = cursor?.querySelector<HTMLElement>('.cursor__label')

  const hero = document.querySelector<HTMLElement>('.hero')
  const heroTitle = document.querySelector<HTMLElement>('.hero__title')

  let mx = 0
  let my = 0

  // Ring state, interpolated toward whatever the target below currently is.
  let rx = 0
  let ry = 0
  let rw = FREE_SIZE
  let rh = FREE_SIZE
  let rr = 999

  let locked: Element | null = null
  let lostAt = 0

  document.documentElement.classList.add('cursor-ready')

  addEventListener(
    'pointermove',
    (event) => {
      mx = event.clientX
      my = event.clientY
      cursor?.classList.add('is-visible')

      /* ---- hero: 3px, no more ---------------------------------------- */
      if (hero && heroTitle) {
        const rect = hero.getBoundingClientRect()
        if (rect.bottom > 0 && rect.top < innerHeight) {
          heroTitle.style.setProperty('--px', `${((mx / innerWidth) * 2 - 1).toFixed(3)}`)
          heroTitle.style.setProperty('--py', `${((my / innerHeight) * 2 - 1).toFixed(3)}`)
        }
      }

      if (!cursor) return

      /* ---- what is under the pointer ---------------------------------- */
      const target = event.target as Element | null
      const hit = target?.closest(INTERACTIVE) ?? null

      if (hit) {
        locked = hit
      } else if (locked) {
        // Start the grace window rather than releasing immediately.
        if (!lostAt) lostAt = performance.now()
        if (performance.now() - lostAt > LOCK_GRACE_MS) locked = null
      }
      if (hit) lostAt = 0

      /* ---- label ------------------------------------------------------ */
      if (label) {
        const named = target && LABELS.find(([sel]) => target.closest(sel))
        if (named) {
          label.textContent = named[1]
          cursor.classList.add('has-label')
        } else {
          cursor.classList.remove('has-label')
        }
      }
    },
    { passive: true }
  )

  // A target can leave under a stationary pointer — a menu closing, a section
  // scrolling away. Without this the ring stays locked to a box that is no
  // longer there.
  addEventListener('scroll', () => { if (locked && !locked.isConnected) locked = null }, {
    passive: true,
  })

  addEventListener('pointerdown', () => cursor?.classList.add('is-pressed'), { passive: true })
  addEventListener('pointerup', () => cursor?.classList.remove('is-pressed'), { passive: true })
  addEventListener('pointercancel', () => cursor?.classList.remove('is-pressed'), { passive: true })

  // Leaving the window entirely: hide rather than leave a cursor stranded at
  // the last edge position.
  addEventListener('pointerleave', () => cursor?.classList.remove('is-visible'), { passive: true })

  /* ---- the cursor itself --------------------------------------------- */
  if (!cursor) return

  const ring = cursor.querySelector<HTMLElement>('.cursor__ring')

  onFrame(() => {
    // The dot is not smoothed at all. It is the click target's stand-in and it
    // has to be exactly where the pointer is.
    cursor.style.setProperty('--dx', `${mx}px`)
    cursor.style.setProperty('--dy', `${my}px`)

    // The lock is re-measured every frame rather than cached, so the ring
    // follows a target that is itself moving, scrolling or animating.
    const box = locked?.isConnected ? boxFor(locked) : null
    if (locked && !box) locked = null

    const ease = box ? EASE_LOCK : EASE_FREE
    rx = lerp(rx, box ? box.x : mx, ease)
    ry = lerp(ry, box ? box.y : my, ease)
    rw = lerp(rw, box ? box.w : FREE_SIZE, ease)
    rh = lerp(rh, box ? box.h : FREE_SIZE, ease)
    // 999 is the pill sentinel, so interpolating toward it would crawl a real
    // radius up through nonsense values. Snap between the two instead.
    rr = box ? (box.r >= 999 ? 999 : lerp(rr >= 999 ? box.r : rr, box.r, ease)) : 999

    cursor.classList.toggle('is-locked', Boolean(box))

    if (ring) {
      ring.style.setProperty('--rx', `${rx.toFixed(1)}px`)
      ring.style.setProperty('--ry', `${ry.toFixed(1)}px`)
      ring.style.setProperty('--rw', `${rw.toFixed(1)}px`)
      ring.style.setProperty('--rh', `${rh.toFixed(1)}px`)
      ring.style.setProperty('--rr', rr >= 999 ? '999px' : `${rr.toFixed(1)}px`)
    }
  })
}
