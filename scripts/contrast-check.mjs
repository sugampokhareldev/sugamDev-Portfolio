/**
 * Contrast audit for the REGISTRATION palette.
 *
 * Run with `node scripts/contrast-check.mjs` after changing any ink value in
 * src/styles/tokens.css. Every pairing that carries text has to clear 4.5:1,
 * or 3:1 if it is only ever set at large display sizes.
 */
const lin = (c) => {
  c /= 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const cr = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const over = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)))

const sheet = hex('#e7e7e2')
const ink = hex('#131317')
const cyan = hex('#0a8fd0')
const mag = hex('#e0007a')
const white = [255, 255, 255]

let failures = 0
const t = (name, v, large = false) => {
  const min = large ? 3 : 4.5
  const ok = v >= min
  if (!ok) failures++
  console.log(name.padEnd(34), v.toFixed(2), ok ? 'PASS' : 'FAIL')
}

// Only the pairings the stylesheet actually uses are asserted here. The
// rejected alternatives are listed underneath as a record of why the tokens
// look the way they do.

console.log('--- text on sheet ---')
t('--ink body            on sheet', cr(ink, sheet))
t('--ink-70 body         on sheet', cr(over(ink, sheet, 0.7), sheet))
t('--ink-muted labels    on sheet', cr(over(ink, sheet, 0.64), sheet))
t('--magenta-ink accents on sheet', cr(hex('#b8005f'), sheet))

console.log('--- swatch labels ---')
t('--ink label  on cyan fill', cr(ink, cyan))
t('white label  on magenta fill', cr(white, mag))

console.log('--- text on plate ---')
t('--sheet body          on plate', cr(sheet, ink))
t('--sheet-70 body       on plate', cr(over(sheet, ink, 0.7), ink))
t('--sheet-muted labels  on plate', cr(over(sheet, ink, 0.64), ink))
t('--cyan accents        on plate', cr(cyan, ink))

console.log('\n--- rejected, kept here so the tokens are not "fixed" back ---')
const note = (n, v) => console.log(' ', n.padEnd(32), v.toFixed(2), '<- below 4.5')
note('--ink @0.5 on sheet', cr(over(ink, sheet, 0.5), sheet))
note('full --magenta text on sheet', cr(mag, sheet))
note('white label on cyan fill', cr(white, cyan))
note('full --magenta text on plate', cr(mag, ink))

console.log(failures === 0 ? '\nAll pairings pass.' : `\n${failures} pairing(s) below threshold.`)
