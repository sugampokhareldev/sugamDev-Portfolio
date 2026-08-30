/**
 * Capabilities row interaction — the most interactive part of the page (7 on
 * the intensity budget).
 *
 * One hover drives five coordinated changes: the row opens, its title steps
 * across and widens, the tags spread, the group's own name appears behind it,
 * and every other row dims. Driven by a single class on the row plus one on
 * the list, so it is one state change rather than five effects.
 */
export function initRows() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const list = document.querySelector<HTMLElement>('.caps__list')
  if (!list) return

  const rows = [...list.querySelectorAll<HTMLElement>('.cap')]

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      list.classList.add('is-hovering')
      rows.forEach((other) => other.classList.toggle('is-hot', other === row))
    })
  })

  list.addEventListener('mouseleave', () => {
    list.classList.remove('is-hovering')
    rows.forEach((row) => row.classList.remove('is-hot'))
  })
}
