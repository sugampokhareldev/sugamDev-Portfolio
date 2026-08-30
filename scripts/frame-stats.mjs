// Emits per-frame change data as JSON, for the frame-picker tool.
// Run: node scripts/frame-stats.mjs [maxFrame] > frames.json

import sharp from 'sharp'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SRC = process.env.SRC ?? 'art-masters/0826-4k-master.mp4'
const MAX = Number(process.argv[2] ?? 47)

const dir = await mkdtemp(join(tmpdir(), 'stats-'))

try {
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-i', SRC,
    '-vf', `select='lte(n\\,${MAX})',scale=192:-1,format=gray`,
    '-vsync', '0',
    join(dir, 'f%03d.png'),
  ])

  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
  const px = []
  for (const f of files) {
    const { data } = await sharp(join(dir, f)).raw().toBuffer({ resolveWithObject: true })
    px.push(data)
  }

  const diff = (a, b) => {
    let s = 0
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
    return +(s / a.length).toFixed(2)
  }

  // deltaFromPrev: how much this frame changed from the one before it.
  // A run of near-zero values is a held frame (anime on 2s/3s).
  const frames = px.map((p, i) => ({
    f: i,
    d: i === 0 ? 0 : diff(px[i - 1], p),
  }))

  // Full reset-cost matrix is O(n^2) but n is small, and it lets the tool show
  // the true cost of any in/out pair without another round trip.
  const matrix = px.map((a) => px.map((b) => diff(a, b)))

  process.stdout.write(JSON.stringify({ frames, matrix }))
} finally {
  await rm(dir, { recursive: true, force: true })
}
