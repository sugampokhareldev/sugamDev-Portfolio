/**
 * Motion orchestrator.
 *
 * Order matters: `motion-ready` has to land before any reveal target is
 * observed, or the first section is measured while still in its resting state
 * and never animates.
 *
 * Under prefers-reduced-motion none of this initialises. The CSS already
 * resolves every family to its finished state, so the page is complete and
 * static rather than half-animated.
 */
import { reduced } from './core'
import { initReveal } from './reveal'
import { initScroll } from './scroll'
import { initPointer } from './pointer'
import { initRows } from './rows'

export function startMotion() {
  if (reduced) {
    // The nav is held back by the entry sequence, which does not run here.
    document.documentElement.classList.add('is-entered')
    return
  }

  document.documentElement.classList.add('motion-ready')

  initReveal()
  initScroll()
  initPointer()
  initRows()
}
