// Turns a generated master PNG into the responsive, shippable set.
// Run: node scripts/optimise-art.mjs <source.png> <output-basename>
//
// Generated masters are 2688px and several megabytes; nothing on the site
// displays them at that size. This produces AVIF and WebP at three widths so
// the browser can pick, and keeps the master out of the build entirely.

import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const [, , src, base] = process.argv

if (!src || !base) {
  console.error('usage: node scripts/optimise-art.mjs <source.png> <output-basename>')
  process.exit(1)
}

const OUT_DIR = join('public', 'art')
const WIDTHS = [1920, 1280, 720]

await mkdir(OUT_DIR, { recursive: true })

const kb = async (p) => Math.round((await stat(p)).size / 1024)

console.log(`source ${src} — ${await kb(src)} KB`)

for (const width of WIDTHS) {
  const pipeline = sharp(src).resize({ width, withoutEnlargement: true })

  const avif = join(OUT_DIR, `${base}-${width}.avif`)
  await pipeline.clone().avif({ quality: 52, effort: 6 }).toFile(avif)
  console.log(`  ${base}-${width}.avif  ${await kb(avif)} KB`)

  const webp = join(OUT_DIR, `${base}-${width}.webp`)
  await pipeline.clone().webp({ quality: 74 }).toFile(webp)
  console.log(`  ${base}-${width}.webp  ${await kb(webp)} KB`)
}

// A tiny blurred placeholder, inlined as a data URI so the gate has something
// on screen before the full artwork arrives.
const lqip = await sharp(src).resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer()
console.log(`\nLQIP data URI (${lqip.length} bytes):`)
console.log(`data:image/webp;base64,${lqip.toString('base64')}`)
