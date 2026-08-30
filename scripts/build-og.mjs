// Builds the social share card from the site's own tokens, so the preview
// people see in Slack/X/LinkedIn is the same registration language as the
// page itself. Run: node scripts/build-og.mjs
//
// Rendered through sharp rather than a headless browser: no display needed,
// no font downloads, and the output is deterministic in CI.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const W = 1200
const H = 630

// Mirrors src/styles/tokens.css. Kept literal because the SVG is rasterised
// outside the browser, where CSS custom properties do not resolve.
const SHEET = '#e7e7e2'
const INK = '#131317'
const CYAN = '#0a8fd0'
const MAGENTA = '#e0007a'
const MAGENTA_INK = '#b8005f'
const INK_MUTED = '#6b6b6e'

// Archivo is not installed on the build machine, so the card asks for the
// nearest wide grotesque the OS actually has and falls back to plain sans.
// Sizes are chosen to hold up in the small Slack/X unfurl, not just full bleed.
const DISPLAY = "'Archivo', 'Helvetica Neue', Arial, sans-serif"
const MONO = "'Courier New', monospace"

// The halftone the hero sits on, at a density that survives being scaled down.
const halftone = () => {
  const dots = []
  for (let y = 30; y < H; y += 26) {
    for (let x = 30; x < W; x += 26) {
      dots.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="${INK}" fill-opacity="0.08"/>`)
    }
  }
  return dots.join('')
}

// Corner registration marks — the same crosshairs that frame the live page.
const marks = () => {
  const m = (x, y) =>
    `<g stroke="${INK}" stroke-opacity="0.45" stroke-width="1.5">
       <line x1="${x - 13}" y1="${y}" x2="${x + 13}" y2="${y}"/>
       <line x1="${x}" y1="${y - 13}" x2="${x}" y2="${y + 13}"/>
     </g>`
  return [m(44, 44), m(W - 44, 44), m(44, H - 44), m(W - 44, H - 44)].join('')
}

/**
 * The wordmark, printed as three passes.
 *
 * librsvg has no mix-blend-mode, so the channels cannot multiply the way they
 * do in the browser. Drawing cyan and magenta offset underneath an opaque
 * black still produces the fringe, which is the part that reads at unfurl
 * size — the blend would only have affected the overlap.
 */
const registered = (text, x, y, size) => {
  const base = `font-family="${DISPLAY}" font-size="${size}" font-weight="800" letter-spacing="-2"`
  return `
    <text x="${x - 5}" y="${y - 2}" ${base} fill="${CYAN}">${text}</text>
    <text x="${x + 5}" y="${y + 2}" ${base} fill="${MAGENTA}">${text}</text>
    <text x="${x}" y="${y}" ${base} fill="${INK}">${text}</text>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SHEET}"/>
  ${halftone()}
  ${marks()}

  <text x="88" y="150" font-family="${MONO}" font-size="19" letter-spacing="4"
        fill="${INK_MUTED}">SUGAM POKHAREL / FULL-STACK PRODUCT BUILDER / NEPAL</text>

  ${registered('WHAT LOOKS COMPLETE', 88, 285, 78)}
  ${registered("USUALLY ISN'T.", 88, 370, 78)}

  <!-- The proof strip, to the same 42/58 scale as the page. -->
  <g>
    <rect x="88" y="438" width="429" height="46" fill="${CYAN}"/>
    <rect x="517" y="438" width="592" height="46" fill="${MAGENTA}"/>
    <rect x="88" y="438" width="1021" height="46" fill="none" stroke="${INK}" stroke-width="1.5"/>
    <text x="108" y="468" font-family="${MONO}" font-size="19" letter-spacing="2" fill="${INK}">42% SEEN</text>
    <text x="537" y="468" font-family="${MONO}" font-size="19" letter-spacing="2" fill="#ffffff">58% HIDDEN</text>
  </g>

  <text x="88" y="536" font-family="${MONO}" font-size="17" letter-spacing="1.5"
        fill="${MAGENTA_INK}">ONE ACCOUNT, ONE HIDDEN REEL — THE FIRST PASS CALLED THE LEFT BAR THE WHOLE PICTURE.</text>

  <text x="${W - 88}" y="150" text-anchor="end" font-family="${MONO}" font-size="18"
        letter-spacing="2" fill="${INK_MUTED}">sugampokhareldev</text>
</svg>`

await mkdir(new URL('../public/', import.meta.url), { recursive: true })

const out = new URL('../public/og.png', import.meta.url)
await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(out.pathname.slice(1))

console.log('wrote public/og.png  (1200x630)')
