/**
 * ARRIVAL EDITS — the welcome screen's music library, cut down to size.
 *
 * `art-masters/audio-playlist/` holds full-length source recordings: 304 MB,
 * one of which is 78 minutes of film audio. That is a library, not a web
 * asset, which is why it lives in `art-masters/` — outside the deployed
 * `public/` directory — like every other master in this project. The welcome
 * screen plays ONE randomly chosen track for the few seconds somebody spends
 * on it, so shipping complete songs would push 300 MB through the deploy to
 * play forty seconds of it.
 *
 * This cuts a 45-second edit from each source into `public/audio/arrival/` —
 * the same length, codec and bitrate as the six edits that were already
 * hand-made (AAC 96k, 48kHz), so the generated set is indistinguishable from
 * them. ~550 KB each, ~14 MB for the whole library.
 *
 * Sources are READ ONLY. Nothing here deletes or rewrites them, so a track
 * whose edit lands badly is re-cut by changing its `start` below and running
 * this again — the master it came from is still sitting there.
 *
 *   node scripts/build-arrival-edits.mjs          # only what is missing
 *   node scripts/build-arrival-edits.mjs --force  # re-cut everything
 *
 * It also writes src/data/arrival-playlist.generated.ts, so the playlist the
 * site reads is derived from the files that actually exist rather than being a
 * second hand-maintained list that can drift from the folder.
 */
import { execFile } from 'node:child_process'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SOURCE_DIR = path.join(ROOT, 'art-masters', 'audio-playlist')
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'arrival')
const PUBLIC_PREFIX = '/audio/arrival'
const GENERATED = path.join(ROOT, 'src', 'data', 'arrival-playlist.generated.ts')

/** Length of every edit, in seconds. Matches the six that already existed. */
const EDIT_S = 45
/** Fades, so an edit neither slams in nor stops mid-bar. */
const FADE_S = 1.8

/**
 * THE LIBRARY.
 *
 * `title` and `detail` are the two lines the player draws, so `detail` is the
 * artist — the filenames carry YouTube furniture ("Official Music Video",
 * "Audio") that has no business on the card, and several of them name the song
 * without naming who made it.
 *
 * `start` is where the edit begins, in seconds. Left out it defaults to a
 * third of the way in, which lands on the chorus of most pop records; it is
 * set explicitly where that heuristic misses. `slug` is the output filename,
 * and the six pre-existing edits keep their exact slugs so nothing that
 * already references them breaks.
 */
const LIBRARY = [
  { file: '505.mp3', slug: '505', title: '505', detail: 'Arctic Monkeys', start: 95 },
  { file: 'apocalypse.mp3', slug: 'apocalypse', title: 'Apocalypse', detail: 'Cigarettes After Sex', start: 72 },
  { file: 'sparks.mp3', slug: 'sparks', title: 'Sparks', detail: 'Coldplay', start: 60 },
  { file: 'instant-crush.mp3', slug: 'instant-crush', title: 'Instant Crush', detail: 'Daft Punk', start: 88 },
  { file: 'sextape.mp3', slug: 'sextape', title: 'Sextape', detail: 'Deftones', start: 70 },
  { file: 'mockingbird.mp3', slug: 'mockingbird', title: 'Mockingbird', detail: 'Eminem', start: 62 },
  { file: 'exit-music-for-a-film.mp3', slug: 'exit-music', title: 'Exit Music (For a Film)', detail: 'Radiohead', start: 150 },
  { file: 'pink-white.mp3', slug: 'pink-white', title: 'Pink + White', detail: 'Frank Ocean', start: 55 },
  { file: 'shinunoga-e-wa.mp3', slug: 'shinunoga-e-wa', title: 'Shinunoga E-Wa', detail: 'Fujii Kaze', start: 48 },
  { file: 'on-melancholy-hill.mp3', slug: 'melancholy-hill', title: 'On Melancholy Hill', detail: 'Gorillaz', start: 60 },
  { file: 'november-rain.mp3', slug: 'november-rain', title: 'November Rain', detail: "Guns N' Roses", start: 130 },
  { file: 'flashing-lights.mp3', slug: 'flashing-lights', title: 'Flashing Lights', detail: 'Kanye West', start: 58 },
  { file: 'midnight-city.mp3', slug: 'midnight-city', title: 'Midnight City', detail: 'M83', start: 52 },
  { file: 'nothing-else-matters.mp3', slug: 'nothing-else-matters', title: 'Nothing Else Matters', detail: 'Metallica', start: 118 },
  { file: 'human-nature.mp3', slug: 'human-nature', title: 'Human Nature', detail: 'Michael Jackson', start: 62 },
  { file: 'nandemonaiya-movie-ver.mp3', slug: 'nandemonaiya', title: 'Nandemonaiya', detail: 'RADWIMPS', start: 80 },
  { file: 'love-of-my-life.mp3', slug: 'love-of-my-life', title: 'Love of My Life', detail: 'Queen', start: 40 },
  { file: 'suzume.mp3', slug: 'suzume', title: 'Suzume', detail: 'RADWIMPS feat. Toaka', start: 55 },
  { file: 'shadow-of-the-day.mp3', slug: 'shadow-of-the-day', title: 'Shadow of the Day', detail: 'Linkin Park', start: 62 },
  { file: 'space-song.mp3', slug: 'space-song', title: 'Space Song', detail: 'Beach House', start: 70 },
  { file: 'borderline.mp3', slug: 'borderline', title: 'Borderline', detail: 'Tame Impala', start: 60 },
  { file: 'something.mp3', slug: 'something', title: 'Something', detail: 'The Beatles', start: 40 },
  { file: 'reflections.mp3', slug: 'reflections', title: 'Reflections', detail: 'The Neighbourhood', start: 58 },
  { file: 'after-hours.mp3', slug: 'after-hours', title: 'After Hours', detail: 'The Weeknd', start: 190 },
  { file: 'call-out-my-name.mp3', slug: 'call-out-my-name', title: 'Call Out My Name', detail: 'The Weeknd', start: 62 },
  { file: 'astrothunder.mp3', slug: 'astrothunder', title: 'Astrothunder', detail: 'Travis Scott', start: 42 },
]

/**
 * Deliberately not in the library: 78 minutes of film audio that happens to
 * sit in the music folder. Named rather than silently skipped, so it is clear
 * this was a decision and not an oversight.
 */
const NOT_MUSIC = new Set(['Slender Man - The Movie.mp3'])

async function durationOf(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    file,
  ])
  const seconds = Number.parseFloat(stdout.trim())
  return Number.isFinite(seconds) ? seconds : 0
}

/** A third of the way in lands on the chorus of most records; never so late
 *  that the edit would run off the end of a short one. */
function defaultStart(duration) {
  return Math.max(0, Math.min(duration * 0.33, duration - EDIT_S - 2))
}

async function cut(entry, out) {
  const source = path.join(SOURCE_DIR, entry.file)
  const duration = await durationOf(source)
  if (!duration) throw new Error('unreadable duration')

  const start = Math.max(0, Math.min(entry.start ?? defaultStart(duration), Math.max(0, duration - 8)))
  const length = Math.min(EDIT_S, Math.max(6, duration - start))

  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    // Seek BEFORE -i so ffmpeg jumps rather than decoding from zero. On a
    // seven-minute source that is the difference between instant and slow.
    '-ss', String(start),
    '-t', String(length),
    '-i', source,
    '-vn',
    // Fades are relative to the trimmed stream, so the out-fade is placed
    // from the clip's own length, not the source's.
    '-af', `afade=t=in:st=0:d=${FADE_S},afade=t=out:st=${(length - FADE_S).toFixed(2)}:d=${FADE_S}`,
    '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart',
    out,
  ])

  return { start, length }
}

async function main() {
  const force = process.argv.includes('--force')

  await mkdir(OUT_DIR, { recursive: true })
  const present = new Set(await readdir(SOURCE_DIR))
  const existing = new Set(await readdir(OUT_DIR))

  for (const file of NOT_MUSIC) {
    if (present.has(file)) console.log(`skip   ${file} — not music`)
  }

  const known = new Set([...LIBRARY.map((e) => e.file), ...NOT_MUSIC])
  for (const file of present) {
    if (/-arrival\.m4a$/.test(file) || known.has(file)) continue
    if (/\.(mp3|m4a|wav|flac|ogg|opus|webm)$/i.test(file)) {
      console.log(`note   ${file} — in the folder but not in LIBRARY; add it there to include it`)
    }
  }

  const built = []
  let bytes = 0

  for (const entry of LIBRARY) {
    const name = `${entry.slug}-arrival.m4a`
    const out = path.join(OUT_DIR, name)

    if (!present.has(entry.file)) {
      console.log(`miss   ${entry.file} — source not found, skipping`)
      continue
    }

    try {
      if (!force && existing.has(name)) {
        console.log(`keep   ${name}`)
      } else {
        const { start, length } = await cut(entry, out)
        console.log(`cut    ${name}  ${start.toFixed(0)}s +${length.toFixed(0)}s`)
      }
      bytes += (await stat(out)).size
      built.push({ ...entry, src: `${PUBLIC_PREFIX}/${name}` })
    } catch (error) {
      console.log(`fail   ${name} — ${error.message.split('\n')[0]}`)
    }
  }

  const body = built
    .map(
      (t) =>
        `  { title: ${JSON.stringify(t.title)}, detail: ${JSON.stringify(t.detail)}, src: ${JSON.stringify(t.src)} },`
    )
    .join('\n')

  await writeFile(
    GENERATED,
    `// GENERATED by scripts/build-arrival-edits.mjs — do not edit by hand.\n` +
      `//\n` +
      `// One 45-second edit per source recording in public/audio/arrival/. Re-run\n` +
      `// the script after adding a track to its LIBRARY table:\n` +
      `//\n` +
      `//   node scripts/build-arrival-edits.mjs\n` +
      `//\n` +
      `// Editing this file directly is pointless: the next run overwrites it.\n\n` +
      `import type { Track } from './site'\n\n` +
      `export const arrivalEdits: Track[] = [\n${body}\n]\n`,
    'utf8'
  )

  console.log(
    `\n${built.length} edits, ${(bytes / 1024 / 1024).toFixed(1)} MB total ` +
      `→ src/data/arrival-playlist.generated.ts`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
