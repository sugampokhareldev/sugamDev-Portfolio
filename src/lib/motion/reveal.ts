/**
 * REVEAL + TRACE + the chromatic split.
 *
 * Note what is NOT here: paragraphs. Body text is a 1 on the intensity budget,
 * which means it does not animate at all. Only headings, rules, and figures
 * are given an entrance.
 */
import { whenInView } from './core'

/*
 * These mirror --reveal-d and --split-in-d in motion.css. They are duplicated
 * rather than read back from the computed style because the reveal is
 * scheduled before the first line has been painted, when a getComputedStyle
 * call would both cost a layout and, on the group's first frame, return the
 * pre-transition value. Keep the two in step.
 */
const REVEAL_D = 820
/**
 * The entry split is a different event from the hover pulse and is timed
 * differently. The pulse answers a pointer, so it has to be instant; the entry
 * one has to be SEEN, and at 200ms — fired after the line had already landed —
 * it was over before the eye arrived. It is now slower, it opens while the
 * line is still rising, and it converges after: the reveal and the register
 * resolving read as one movement instead of a reveal followed by a flicker.
 */
const SPLIT_IN_D = 620
/** How far before the line lands the channels start to open. */
const SPLIT_LEAD = 200
/** Per-line offset within a group. Also written to --d for the CSS delay. */
const STAGGER = 90

/** Per-mark offset inside one line. Wider for the entry, so a long line
 *  converges across itself rather than all at once. */
const MARK_STAGGER = { pulse: 60, in: 90 } as const

/**
 * Fires the channel split on every .reg inside an element.
 * `mode` picks which of the two above it is.
 */
export function split(host: HTMLElement, delay = 0, mode: 'pulse' | 'in' = 'pulse') {
  const cls = mode === 'in' ? 'reg-split--in' : 'reg-split'
  const marks = host.querySelectorAll<HTMLElement>('.reg')
  marks.forEach((mark, i) => {
    setTimeout(() => {
      mark.classList.remove('reg-split', 'reg-split--in')
      // Force a reflow so the animation restarts when the class is re-added.
      void mark.offsetWidth
      mark.classList.add(cls)
    }, delay + i * MARK_STAGGER[mode])
  })
}

export function initReveal() {
  // Heading lines: clip-reveal, staggered, then a single chromatic split once
  // the line has arrived. The split is 200ms and never repeats on its own.
  const groups = document.querySelectorAll<HTMLElement>('[data-reveal-group]')

  whenInView(groups, (group) => {
    const base = Number(group.dataset.delay ?? 0)
    const lines = [...group.querySelectorAll<HTMLElement>('.rv')]

    lines.forEach((line, i) => {
      line.style.setProperty('--d', `${base + i * STAGGER}ms`)
      line.classList.add('is-in')
    })

    // Each line splits when THAT line lands, not when the group is roughly
    // done. A single group-wide split fired at an average of the line delays,
    // which put the flash before the last line had finished rising — the
    // effect read as a stray glitch rather than as the line snapping clean.
    lines.forEach((line, i) => {
      setTimeout(
        () => split(line, 0, 'in'),
        Math.max(0, base + i * STAGGER + REVEAL_D - SPLIT_LEAD),
      )
    })

    // The whole group is clean once the LAST line has risen and its own split
    // has resolved. Anything earlier cuts the final reveal transition short.
    const settle =
      base + (lines.length - 1) * STAGGER + REVEAL_D - SPLIT_LEAD + SPLIT_IN_D

    setTimeout(() => {
      // Hand the lines to direct control so pointer/scroll offsets stop being
      // routed through the 820ms reveal curve and start tracking the input.
      // This also releases the clip (see .rv.is-live in motion.css), which is
      // why it must not run before the reveal has actually finished.
      const mode = group.dataset.revealGroup === 'soft' ? 'is-soft' : 'is-live'
      lines.forEach((line) => line.classList.add(mode))

      // Sections whose resting interaction only makes sense once the entrance
      // is over announce themselves here rather than guessing at a timeout.
      const settled = group.dataset.settle
      if (settled) document.documentElement.classList.add(settled)
    }, settle)
  })

  // Rules and bars draw along their own length.
  const traces = document.querySelectorAll<HTMLElement>('[data-fam="trace"][data-axis="x"]')
  whenInView(traces, (el) => el.classList.add('is-in'))

  // The single highlighted phrase in About.
  const marked = document.querySelectorAll<HTMLElement>('.about__statement em')
  whenInView(marked, (el) => el.classList.add('is-in'))

  // Figures carry real values, so they are worth an entrance.
  const fills = document.querySelectorAll<HTMLElement>('.pass__fill')
  whenInView(fills, (el) => el.classList.add('is-inview'))

  // A brief split when a project plate is hovered — a pulse, not a state.
  // Leaving the channels apart while the pointer rests would be a permanent
  // glitch effect, which is exactly what makes this look cheap.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll<HTMLElement>('.plate').forEach((plate) => {
      plate.addEventListener('mouseenter', () => split(plate))
    })
  }
}
