// Finds the smoothest loop-back point for the idle clip.
//
// The idle loop jumps from its last frame back to its first. The size of that
// jump is what reads as a tic. Rather than guess a range, this measures the
// actual pixel difference between frame LOOP_START and every candidate end
// frame, and reports which one resets most invisibly.
//
// Run: node scripts/find-loop-point.mjs [maxFrame]

import sharp from 'sharp'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SRC = process.env.SRC ?? 'art-masters/0826-4k-master.mp4'
const MAX = Number(process.argv[2] ?? 24)
const START = 0

const dir = await mkdtemp(join(tmpdir(), 'loop-'))

try {
  // Small greyscale frames: we care about structural difference, not colour,
  // and the video is rendered monochrome anyway.
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-i', SRC,
    '-vf', `select='lte(n\\,${MAX})',scale=192:-1,format=gray`,
    '-vsync', '0',
    join(dir, 'f%03d.png'),
  ])

  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
  const pixels = []
  for (const f of files) {
    const { data } = await sharp(join(dir, f)).raw().toBuffer({ resolveWithObject: true })
    pixels.push(data)
  }

  const base = pixels[START]
  const diff = (a, b) => {
    let sum = 0
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
    return sum / a.length
  }

  // First: consecutive differences. If the clip is lower-framerate content in
  // a 60fps container, this alternates between near-zero and large — which
  // changes what "smooth" can even mean here.
  console.log('consecutive frame differences (n -> n+1):\n')
  let nearDupes = 0
  for (let n = 0; n < pixels.length - 1; n++) {
    const d = diff(pixels[n], pixels[n + 1])
    if (d < 3) nearDupes++
    console.log(
      `  ${String(n).padStart(2)} -> ${String(n + 1).padStart(2)}   ${d.toFixed(2).padStart(6)}  ${'#'.repeat(Math.round(d * 2))}`
    )
  }
  console.log(
    `\n  near-duplicate pairs (diff < 3): ${nearDupes} of ${pixels.length - 1}` +
      (nearDupes > (pixels.length - 1) * 0.35
        ? '  <-- looks like lower-framerate content in a 60fps container'
        : '')
  )

  // Reset cost: a loop ending at LOOP_END shows frame LOOP_END-1 last, then
  // jumps back to LOOP_START. That jump is the tic.
  console.log(`\nreset cost — last frame shown vs frame ${START}:\n`)

  const rows = []
  for (let n = 2; n <= pixels.length - 1; n++) {
    rows.push({ loopEnd: n, d: diff(base, pixels[n - 1]) })
  }

  for (const r of rows) {
    const bar = '#'.repeat(Math.round(r.d * 2))
    console.log(
      `  LOOP_END ${String(r.loopEnd).padStart(2)}  (0..${String(r.loopEnd - 1).padStart(2)})  reset ${r.d.toFixed(2).padStart(6)}  ${bar}`
    )
  }

  // Only consider loops long enough to actually read as motion.
  const viable = rows.filter((r) => r.loopEnd >= 6)
  viable.sort((a, b) => a.d - b.d)

  console.log('\nsmoothest viable loops (>= 6 frames):')
  for (const r of viable.slice(0, 5)) {
    console.log(`  LOOP_END: ${r.loopEnd}  (frames 0..${r.loopEnd - 1}, ${(r.loopEnd / 60).toFixed(3)}s)  diff ${r.d.toFixed(2)}`)
  }
} finally {
  await rm(dir, { recursive: true, force: true })
}
