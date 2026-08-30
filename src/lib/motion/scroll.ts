/**
 * Everything scroll-linked: SNAP (nav), STRETCH (headings), DRIFT
 * (atmosphere), TRACE (progress, journey route) and the section handoff.
 *
 * All of it runs inside a single rAF-throttled pass so layout is read once
 * per frame rather than once per feature.
 */
import { clamp, centredness, onScroll, startScroll } from './core'

export function initScroll() {
  const header = document.querySelector<HTMLElement>('[data-header]')
  const rail = document.querySelector<HTMLElement>('[data-rail]')
  const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')]
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-route-link]')]
  const plates = [...document.querySelectorAll<HTMLElement>('[data-plate]')]

  const hero = document.querySelector<HTMLElement>('.hero')
  const heroTitle = document.querySelector<HTMLElement>('.hero__title')

  const drifters = [...document.querySelectorAll<HTMLElement>('[data-fam="drift"]')]
  const stretchers = [...document.querySelectorAll<HTMLElement>('[data-fam="stretch"]')]

  const handoff = document.querySelector<HTMLElement>('[data-handoff]')
  const handoffStage = handoff?.querySelector<HTMLElement>('.handoff__stage')
  const handoffPlate = handoff?.querySelector<HTMLElement>('.handoff__plate')
  const handoffTitle = handoff?.querySelector<HTMLElement>('.handoff__title')
  const handoffRoute = handoff?.querySelector<SVGPathElement>('.is-route')
  const handoffNode = handoff?.querySelector<SVGGElement>('[data-handoff-node]')

  const journey = document.querySelector<HTMLElement>('.journey')
  const journeyDraw = journey?.querySelector<HTMLElement>('.journey__route')
  const eras = [...document.querySelectorAll<HTMLElement>('.era')]

  // The handoff is not a chapter of its own - it is the way into Journey - so
  // the nav and the readout have to be told which chapter it belongs to.
  const journeyChapter = chapters.find((chapter) => chapter.id === 'journey')

  /* The reading line. One constant, used by every "what am I looking at now"
     decision below, so the nav, the section readout, the journey rail and the
     era states can never disagree about where you are on the page. */
  const READING_LINE = 0.55

  /* How much of the curve is drawn on the approach, before the stage pins.
     The approach is one viewport tall and the pinned phase is longer, so this
     is deliberately less than half. */
  const ENTRY_SHARE = 0.34

  const hudPct = document.querySelector<HTMLElement>('[data-hud-pct]')
  const hudReel = document.querySelector<HTMLElement>('[data-hud-reel]')
  const hudTotal = document.querySelector<HTMLElement>('[data-hud-total]')

  if (hudTotal) hudTotal.textContent = String(chapters.length).padStart(2, '0')

  /*
   * The curve is drawn in PIXEL SPACE rather than from a fixed viewBox.
   *
   * It has one job: to arrive on the journey rail. The rail's x is the page
   * gutter, which is a clamp() on the viewport width, so no constant in a
   * 1000x600 viewBox can land on it - the shipped path ended at 70% of the
   * width while the rail sat at 66px, and the two were simply two unrelated
   * lines. So the geometry is measured and the path written to match.
   *
   * Shape: the rule runs in from the left, holds, then peels off in a single
   * cubic that arrives at the rail travelling straight down. The end tangent
   * is vertical because both control points share the rail's x - that is what
   * makes the join read as one continuous line rather than as a curve that
   * happens to touch a bar.
   */
  const curve = handoff?.querySelector<SVGSVGElement>('.handoff__curve')
  const curvePaths = [...(curve?.querySelectorAll<SVGPathElement>('path') ?? [])]

  const layoutCurve = () => {
    if (!curve || !curvePaths.length) return

    const box = curve.getBoundingClientRect()
    const w = box.width
    const h = box.height
    if (w < 2 || h < 2) return

    // Where the rail actually is, in the curve's own coordinate space. Below
    // the journey breakpoint the rail is not drawn, so fall back to the
    // section's own gutter.
    const railBox = journeyDraw?.getBoundingClientRect()
    const gutter = journey ? parseFloat(getComputedStyle(journey).paddingLeft) : 0
    // The rail's CENTRE, not its left edge: an SVG stroke is centred on its
    // path, so aiming at the edge left the two lines one pixel out of true and
    // the join read as a notch.
    const railX = railBox && railBox.width > 0
      ? railBox.left + railBox.width / 2 - box.left
      : gutter

    /*
     * The rule runs in BELOW the title, not through it. A constant fraction of
     * the stage cannot know that: the title is display type that wraps to two
     * lines at some widths and three at others, and at 0.5 the line was drawn
     * straight across the middle of the word it was supposed to be introducing.
     * So the title is measured and the line placed under it, with the bounds
     * keeping it inside the stage on very short and very tall viewports.
     */
    const titleBox = handoffTitle?.getBoundingClientRect()
    const entry = titleBox
      ? clamp(titleBox.bottom - box.top + 64, h * 0.42, h * 0.8)
      : h * 0.58
    const hold = w * 0.42          // how far it travels before it turns
    const lead = w * 0.16          // how long it keeps going into the turn
    const drop = h * 0.34          // where it commits to the descent

    const d = [
      `M0 ${entry.toFixed(1)}`,
      `H${hold.toFixed(1)}`,
      `C${(hold + lead).toFixed(1)} ${entry.toFixed(1)},`,
      `${railX.toFixed(1)} ${(entry + drop).toFixed(1)},`,
      `${railX.toFixed(1)} ${h.toFixed(1)}`,
    ].join(' ')

    curve.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`)
    curvePaths.forEach((path) => path.setAttribute('d', d))

    // The dash length has to be re-measured whenever the path is rewritten,
    // or the stroke draws to the wrong extent at the new size.
    if (handoffRoute) {
      routeLen = handoffRoute.getTotalLength()
      handoffRoute.style.setProperty('--len', `${routeLen}`)
    }

    // The two curve labels are placed from the SAME measurements the path is
    // written from, rather than from a second set of constants in CSS that
    // would have to be kept in step with these by hand.
    handoffStage?.style.setProperty('--entry-y', `${entry.toFixed(1)}px`)
    handoffStage?.style.setProperty('--rail-x', `${railX.toFixed(1)}px`)
  }

  /* Measured in layoutCurve, read every frame by the node. */
  let routeLen = 0

  layoutCurve()
  addEventListener('resize', layoutCurve, { passive: true })

  let lastSection = ''
  let crossTimer = 0

  onScroll(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    const total = max > 0 ? clamp(scrollY / max) : 0

    /* ---- TRACE: top progress bar -------------------------------------- */
    header?.style.setProperty('--progress', `${total}`)
    header?.classList.toggle('is-scrolled', scrollY > 24)

    /* ---- the handoff ---------------------------------------------------
     *
     * Scrubbed first, because the section decision and the ground inversion
     * both depend on how far it has got: once the dark plate has covered the
     * top of the viewport you are, to every reader, already in Journey.
     *
     *   entry      the line starts the moment the stage is visible   TRACE
     *   0.00-0.92  and keeps travelling, continuously                TRACE
     *   0.08-0.40  the dark ground rises behind it                   REVEAL
     *   0.36-0.52  the title arrives, as the ground lands            REVEAL
     *
     * TWO progressions, because the stage is on screen for longer than it is
     * pinned. `p` is the pinned phase: it cannot start until the section's top
     * reaches y=0, by which point the stage has already been in view for a
     * whole viewport height. Driving the draw from `p` alone therefore left the
     * line invisible through all of that, and then started it - the line did
     * not appear gradually, it appeared. `enter` covers the approach, so the
     * line is already being drawn while the section rises into view.
     *
     * The stage is sticky, so during the pinned phase the screen does not
     * scroll: whatever is not animating is frozen. That is why the draw spans
     * almost the whole of `p` rather than finishing early - past that point
     * every value would be pinned at 1 and the remaining scroll would move
     * nothing at all.
     */
    let wipe = 0

    if (handoff && handoffPlate) {
      const rect = handoff.getBoundingClientRect()
      const travel = Math.max(1, rect.height - innerHeight)
      const p = clamp(-rect.top / travel)

      // 0 when the section's top is at the bottom of the viewport, 1 when it
      // reaches the top - the approach, before anything is pinned.
      const enter = clamp((innerHeight - rect.top) / innerHeight)

      // The two phases meet at exactly ENTRY_SHARE: enter hands over at 1, and
      // p takes it from 0, so there is no step where they join.
      const draw = enter < 1
        ? enter * ENTRY_SHARE
        : ENTRY_SHARE + clamp(p / 0.92) * (1 - ENTRY_SHARE)

      // The ground and the title are brought as early as they can go: the
      // title is cream, so it cannot arrive before the ground it is read on,
      // and the ground cannot start before the line has something drawn. That
      // ordering is what sets the floor here - any earlier and the heading
      // appears on the light sheet, invisible.
      wipe = clamp((p - 0.08) / 0.32)
      const title = clamp((p - 0.36) / 0.16)

      handoffRoute?.style.setProperty('--draw', `${draw}`)

      // The node rides the head of the stroke. One getPointAtLength per frame
      // against an already-measured length; it fades out at both ends so it
      // does not sit as a dot on a line that is not moving.
      if (handoffNode && handoffRoute && routeLen > 0) {
        const head = handoffRoute.getPointAtLength(routeLen * draw)
        handoffNode.setAttribute('transform', `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)})`)
        const lead = clamp(draw / 0.06) * clamp((1 - draw) / 0.06)
        handoffNode.style.setProperty('--node-in', `${lead.toFixed(3)}`)
      }
      handoffPlate.style.clipPath = `inset(${((1 - wipe) * 100).toFixed(2)}% 0 0 0)`
      handoffTitle?.style.setProperty('--title-in', `${title}`)
    }

    // Is the handoff's dark ground the thing behind the nav right now? The
    // plate is clipped rather than moved, so its own rect is no help - the
    // visible top edge has to be derived from the wipe.
    let handoffOnTop = false
    if (handoffStage) {
      const stage = handoffStage.getBoundingClientRect()
      const groundTop = stage.top + (1 - wipe) * stage.height
      handoffOnTop = groundTop <= 40 && stage.bottom > 40
    }

    /* ---- which section are we in -------------------------------------- */
    let current = chapters[0]
    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top <= innerHeight * READING_LINE) current = chapter
    })
    // Once the ground has risen, the stage is showing the Journey heading -
    // leaving the nav on Capabilities while that heading fills the screen was
    // the most visible mistiming on the page.
    if (handoffOnTop && journeyChapter) current = journeyChapter
    const currentId = current?.id ?? ''

    if (currentId !== lastSection) {
      lastSection = currentId

      // SNAP: the underline travels to the new item rather than fading out
      // and back in somewhere else.
      links.forEach((link) => link.classList.toggle('is-active', link.hash === `#${currentId}`))
      const active = links.find((link) => link.hash === `#${currentId}`)
      if (active && rail) {
        rail.style.setProperty('--ux', `${active.offsetLeft}px`)
        rail.style.setProperty('--uw', `${active.offsetWidth}`)
      }

      // The progress bar acknowledges the crossing, briefly. Fast scrolling
      // crosses several sections inside 320ms, and without cancelling the
      // previous timer the first one to fire clears a flash that belongs to a
      // later crossing.
      header?.classList.add('is-crossing')
      clearTimeout(crossTimer)
      crossTimer = window.setTimeout(() => header?.classList.remove('is-crossing'), 320)

      // SNAP: the section index rolls to the new number.
      const index = chapters.indexOf(current!)
      if (hudReel && index >= 0) hudReel.style.setProperty('--n', `${index}`)
    }

    if (hudPct) hudPct.textContent = String(Math.round(total * 100)).padStart(3, '0')

    /* ---- ground inversion --------------------------------------------- */
    const onPlate = plates.some((plate) => {
      const rect = plate.getBoundingClientRect()
      return rect.top <= 40 && rect.bottom > 40
    })
    // Including the handoff here is what stops the nav from sitting as a pale
    // island on the dark ground for the length of the wipe.
    document.body.classList.toggle('on-plate', onPlate || handoffOnTop)

    /* ---- hero: the lines come apart ------------------------------------ */
    if (hero && heroTitle) {
      const rect = hero.getBoundingClientRect()
      const out = clamp(-rect.top / (innerHeight * 0.9))
      heroTitle.style.setProperty('--sep', `${out}`)
    }

    /* ---- DRIFT: background moves slower than the page ------------------ */
    drifters.forEach((el) => {
      const host = el.parentElement
      if (!host) return
      const rect = host.getBoundingClientRect()
      const rate = Number(el.dataset.rate ?? 0.25)
      // Distance of the host from the viewport middle, scaled down by rate.
      const offset = (innerHeight / 2 - (rect.top + rect.height / 2)) * rate
      el.style.setProperty('--dy', `${offset.toFixed(1)}px`)
    })

    /* ---- STRETCH: display type widens as it crosses the middle -------- */
    stretchers.forEach((el) => {
      const c = centredness(el.getBoundingClientRect())
      const base = Number(el.dataset.base ?? 112)
      const gain = Number(el.dataset.gain ?? 8)
      el.style.setProperty('--w', `${(base + c * gain).toFixed(1)}%`)
    })

    /* ---- journey: the route draws as you read --------------------------
     *
     * Measured against the SAME reading line the era states use, and against
     * the rail's OWN box - which now starts at the section's top edge, where
     * the handoff curve hands over, rather than at the first era. Measuring
     * one box and filling another is what put the head of the line an era
     * behind the markers it was supposed to be lighting.
     */
    if (journeyDraw) {
      const rect = journeyDraw.getBoundingClientRect()
      const read = clamp((innerHeight * READING_LINE - rect.top) / Math.max(1, rect.height))
      journeyDraw.style.setProperty('--draw', `${read}`)
    }

    // Past / current / still ahead. The states are the real reading position,
    // so the section reports progress instead of decorating it.
    let currentEra = -1
    eras.forEach((era, i) => {
      if (era.getBoundingClientRect().top <= innerHeight * READING_LINE) currentEra = i
    })
    eras.forEach((era, i) => {
      era.dataset.state = i < currentEra ? 'past' : i === currentEra ? 'current' : 'future'
    })
  })

  startScroll()
}
