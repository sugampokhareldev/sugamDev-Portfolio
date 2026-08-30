# Asset manifest

The portfolio uses a deliberately small production asset set. Typography,
registration effects, data figures and interface geometry stay in CSS or
markup; the character and cinematic beats use compressed production media.
Source renders and unused experiments live in `art-masters/`, outside the
deployed `public/` directory.

| Asset | Location | Purpose |
| --- | --- | --- |
| Registration channels | `Reg.astro`, `.reg` in `global.css` | The signature: one line of text printed as a cyan pass, a magenta pass, and the black they make in register |
| Corner registration marks | `Header.astro`, `.sheet-marks` | Press-sheet frame; inverts over the dark sections via `body.on-plate` |
| Halftone ground | `.hero::before` | Sheet texture, a CSS radial-gradient dot grid |
| Proof strip | `Hero.astro`, `.proof` | The 42/58 split, drawn to scale from the View Counter finding |
| Tool rack | `WorkIndex.astro`, `.rack` | 53 cells, generated from the real `Tools` reading — not a fixed drawing |
| Two-pass bars | `WorkIndex.astro`, `.passes` | Anonymous pass against reconciled total |
| Share card | `public/og.png` | Built by `node scripts/build-og.mjs` from the same token values |
| Character plate | `public/character.webp` | The arrival character, one still. Frame 56 of the clip in `public/` — the pose turned toward the headline. The section deliberately has no cursor tracking or playback: re-cut the still rather than reintroducing motion |
| Arrival film | `public/video/bg-*.{webm,mp4}` | Responsive sources for the optional cinematic entry gate |
| Arrival music | `public/audio/arrival/*-arrival.m4a` | 26 forty-five-second edits, one per record. The welcome screen picks one at random on every load. Built by `npm run audio:arrival` from the masters in `art-masters/audio-playlist/` (304 MB, never deployed); the playlist itself is generated into `src/data/arrival-playlist.generated.ts` |
| About scene | `public/video/about-scroll.mp4` | The working-to-wave sequence scrubbed inside the pinned opening |

## Fonts

Three families, from Google Fonts (`Base.astro`):

- **Archivo** — display, requested *with its width axis* (`wdth 75..125`). The
  headlines are set wide via `font-variation-settings`. Dropping the axis from
  the URL silently collapses every heading to normal width.
- **Geist** — body.
- **Geist Mono** — labels, readings, and anything that is data.

## Colour

Two process inks on a press sheet, defined in `src/styles/tokens.css`. They are
flat channels: never gradient them, never tint them.

`--magenta` is a *fill* value and fails contrast as small text, so
`--magenta-ink` exists for type. Run `node scripts/contrast-check.mjs` after
touching any ink — it asserts every pairing the stylesheet actually uses and
lists the rejected ones so they do not get "fixed" back.

## Real project captures

The project plates intentionally contain no UI screenshots because no verified
captures exist in `public/work`. When captures are supplied they must be direct
images of the real products: no device mockups, browser chrome, or generated
dashboards.

## Entry sequence

The video and audio in `public/` remain attached exclusively to the `BeatIntro`
entry sequence, which is not part of this design system.

Music is the one asset here with a build step. `art-masters/audio-playlist/`
holds the full-length recordings and stays out of `public/` like every other
master — serving 304 MB of complete songs to play forty seconds of one would be
the single largest thing on the site by two orders of magnitude. Instead
`scripts/build-arrival-edits.mjs` cuts a 45-second edit from each (AAC 96k,
~550 KB, 14 MB for all 26) and writes the playlist the site reads:

```
npm run audio:arrival           # cut anything missing
npm run audio:arrival -- --force  # re-cut everything
```

To add a record: put it in `art-masters/audio-playlist/`, add a row to the
script's `LIBRARY` table with its title, artist and a `start` offset, and run
the script. `src/data/arrival-playlist.generated.ts` is written by it and must
not be edited by hand.
