// Injects the forge artwork into the standalone preview as a data URI.
// The Artifact CSP blocks external hosts, so a shareable preview has to carry
// its own image rather than link to one.

import { readFile, writeFile } from 'node:fs/promises'

const [, , tplPath, outPath, ...assets] = process.argv

if (!tplPath || !outPath) {
  console.error(
    'usage: node scripts/build-preview.mjs <template.html> <out.html> [PLACEHOLDER=path ...]'
  )
  process.exit(1)
}

const MIME = {
  avif: 'image/avif',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

let out = await readFile(tplPath, 'utf8')

for (const pair of assets) {
  const eq = pair.indexOf('=')
  const token = pair.slice(0, eq)
  const path = pair.slice(eq + 1)

  if (!out.includes(token)) {
    console.error(`template has no ${token} placeholder`)
    process.exit(1)
  }

  // .json is injected as raw text, not a data URI — the frame-picker embeds
  // its statistics directly rather than fetching them.
  if (path.endsWith('.json')) {
    const text = await readFile(path, 'utf8')
    out = out.replaceAll(token, text)
    console.log(`${token.padEnd(16)} ${Math.round(Buffer.byteLength(text) / 1024)} KB raw JSON`)
    continue
  }

  const buf = await readFile(path)
  const ext = path.split('.').pop().toLowerCase()
  const dataUri = `data:${MIME[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')}`
  out = out.replaceAll(token, dataUri)

  console.log(
    `${token.padEnd(16)} ${Math.round(buf.length / 1024)} KB -> data URI ${Math.round(dataUri.length / 1024)} KB`
  )
}

await writeFile(outPath, out)
console.log(`wrote ${outPath} (${Math.round(Buffer.byteLength(out) / 1024)} KB)`)
