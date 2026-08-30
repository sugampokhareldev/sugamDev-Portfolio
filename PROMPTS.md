# Generation prompts

Every image on this site is generated from a prompt recorded here, so any asset
can be reproduced or re-cut without guesswork. Follow the house rules at the
bottom when writing a new one.

---

## `forge-hall` — entry gate backdrop

**Tool:** Higgsfield
**Model:** `recraft_v4_1`
**Parameters:**

| Param | Value | Why |
| --- | --- | --- |
| `model_type` | `standard` | expressive/painterly, not the flat `utility` look |
| `resolution` | `2k` | master is downsampled to 1920 max; 2k gives headroom to re-crop |
| `aspect_ratio` | `16:9` | full-bleed backdrop |
| `colors` | `#0B0A09 #131110 #2A2624 #F2621A #5BA8C9 #BDB6B0` | **the important one** — locks output to the INSTRUMENT tokens so artwork and interface are one colour system |
| `count` | `3` | generate a set, choose one |

### Prompt

```
A vast dark foundry hall interior, painterly cinematic concept art, no text
anywhere. A single thin vertical thread of molten metal glows bright orange as
it pours from high above down onto a heavy anvil block in the middle distance,
casting warm light onto the stone floor and throwing long shadows. Rows of dark
anvil forms and heavy machinery recede symmetrically into deep shadow on both
sides. Steel gantries, catwalks and structural beams cross the upper third.
Thick atmospheric haze, drifting smoke, faint embers, volumetric light. The
upper centre and lower centre of the frame are deliberately dark and empty.
Cool steel blue-teal shadows contrast against the single warm orange light
source. Visible brush texture, film grain, muted restrained palette, heavy
industrial mood. Completely free of any lettering, captions, subtitles,
watermarks, signatures, numbers, symbols, logos, people, faces, figures,
creatures, animals, dragons, or weapons.
```

### Why each clause is there

| Clause | Job |
| --- | --- |
| "no text anywhere" + the closing exclusion list | Five earlier attempts on `soul_location` baked garbled subtitle text into the frame. State it twice — opening and closing. |
| "single thin vertical thread… onto a heavy anvil" | Gives the frame one clear focal event, so it is a picture of something rather than a texture. |
| "recede symmetrically into deep shadow on both sides" | Dark left and right edges for the vignette to sit in. |
| "upper centre and lower centre deliberately dark and empty" | **Reserves the space the identity plate occupies.** Without this the artwork's bright centre fights the text. |
| "cool steel blue-teal shadows against the single warm orange" | Forces the two-colour system the tokens already use. |
| "visible brush texture, film grain" | Keeps it painterly. Without it the model drifts to plastic 3D render. |

### Regenerating

```bash
node scripts/optimise-art.mjs art-masters/<new>.png forge-hall
```

---

## House rules for any new prompt

Per the brief's §17, a prompt must specify **subject, composition, material,
lighting, perspective, background, visual hierarchy, texture, mood, intended
website usage, aspect ratio, transparency, and what must not appear.**

**Always name the negative space.** The single most useful clause in the prompt
above is the one reserving the centre of the frame. Interface sits on these
images; art that ignores that is art you cannot use.

**Always carry the standing exclusion list:**

```
no person, face, figure, character, anime style, creature, dragon, animal,
weapon, neon, magenta, cyberpunk city, circuit board, glowing screen, hologram,
chrome sphere, floating 3D blob, text, lettering, logo, watermark, signature,
lens flare starburst
```

**Always pass `colors`.** Palette-locking is the difference between artwork that
belongs to the site and a stock image sitting on it.

**Never bake text into an image.** All copy is HTML.

**Model choice:**

| Need | Model |
| --- | --- |
| Palette-locked illustration | `recraft_v4_1` (only model here taking a `colors` array) |
| Environment / location plate | `soul_location` — **warning:** bakes in fake subtitle text |
| 4K, or diagrams | `nano_banana_pro` |

**No video.** All motion is built in the frontend — see `src/components/ForgeBackdrop.tsx`.


---

# Video prompts — the intro clips

The intro needs exactly **two** clips. Everything else is drawn in code.

| Clip | Role | Usable length |
| --- | --- | --- |
| `idle` | Loops forever on the landing screen | 10s generated, whole thing loops |
| `attack` | Plays once on ENTER; the blade cuts the page | 10s generated, ~2s of it used |

## Non-negotiable constraints

These are not style preferences. Each one comes from a clip that had to be
thrown away, measured with `scripts/frame-stats.mjs`.

**1. LOCKED CAMERA. No push-in, no zoom, no dolly, no handheld.**
Two earlier clips were unusable because the camera drifted continuously — a
loop of any useful length visibly zoomed and then snapped back. Say "locked-off
camera, static frame" explicitly, in every prompt. This is the single most
important line.

**2. ONE CONTINUOUS SHOT. No cuts, no scene changes.**
One clip contained two hard internal cuts (frame-to-frame difference of 25 and
27 against a normal ~1). That left only a 19-frame usable window out of 120.

**3. THE CENTRE OF FRAME STAYS DARK AND EMPTY.**
The identity card and the copy sit there. Bright or busy centres make text
unreadable and force a scrim that flattens the image.

**4. DARK LEFT AND RIGHT EDGES.**
The vignette needs somewhere to sit; detail should live in the middle band.

**5. STRONG TONAL SEPARATION.**
The site grades everything to `grayscale(1) contrast(1.45)`. Anything that
relies on hue contrast — pink against blue at the same brightness — turns into
grey mush. Compose in light and dark, not in colour.

**6. NO TEXT ANYWHERE.**
Subtitles, captions, watermarks, signatures, logos, UI. State it twice, opening
and closing. One image model baked in garbled subtitles across five attempts.

**7. FOR THE IDLE: it must return to where it started.**
Ask for a cycle — something that drifts out and settles back. If the generator
cannot, no disaster: `scripts/find-loop-point.mjs` finds the cheapest loop
window, and the player crossfades the reset. But a native seam is worth far
more than any crossfade.

## Settings

| | |
| --- | --- |
| Aspect | `16:9` primary, plus `9:16` — biolink pages are read on phones |
| Frame rate | 24 or 30 is fine. The cue system is fps-agnostic; `FPS` in `cues.ts` gets set to match |
| Resolution | 1080p is plenty. **Do not hand me 4K or 8K** — two masters arrived at 34 MB and 11 MB and had to be transcoded down 98% |
| Seed | Keep it. Matching idle and attack clips need the same character |

## Negative prompt (append to both)

```
text, lettering, captions, subtitles, watermark, signature, logo, numbers, UI,
camera zoom, camera push in, dolly, handheld shake, scene cut, jump cut,
transition, split screen, extra limbs, deformed hands, warped face,
morphing features, flicker, strobe, colour banding
```

---

## Clip 1 — IDLE (loops)

```
Locked-off static camera, no zoom, no push-in, no camera movement whatsoever.
One continuous unbroken shot.

Close portrait of an original character on a high Himalayan ridge at dusk: a
lone figure in a dark weather-worn coat, pale hair moving slightly in the wind,
a curved khukuri blade sheathed at their side. Behind and above them an immense
pale serpent — a naga — coils slowly through storm cloud, only its back and a
single coil emerging from the mist, drifting steadily across the frame.

The only motion is drifting snow, streaming cloud, slow hair movement and the
serpent's slow coil. The figure holds their position. The composition never
changes.

Deep indigo and near-black, bone-white serpent, one restrained hot vermilion
accent on the blade edge. Strong light-to-dark separation. Painterly
anime-influenced concept art, visible brush texture, film grain, atmospheric
haze, immense scale, quiet and mythic.

Keep the centre of the frame dark, empty and uncluttered so interface text can
sit over it. Keep the left and right edges falling into near-black.

The clip should cycle: the cloud and snow drift through and settle back close
to where they began, so the last frame nearly matches the first.

Absolutely no text, lettering, captions, watermarks, logos or UI anywhere.
```

## Clip 2 — ATTACK (plays once)

The page is cut along the blade's real path, so the stroke has to be
**readable and unambiguous**. The site measures where it enters and exits the
frame and aligns the interface cut to it — see `SLASH` in `src/intro/cues.ts`.

```
Locked-off static camera, no zoom, no push-in, no camera movement whatsoever.
One continuous unbroken shot.

The same character on the same Himalayan ridge at dusk. They draw a curved
khukuri blade and deliver a single decisive diagonal slash, entering from the
upper right of the frame and travelling down to the lower left, the blade
crossing the full width of the frame in one clean unbroken arc. A trailing edge
of white light follows the blade's path exactly. One clear strongest moment at
the point of impact, then the blade comes to rest.

Beat structure: hold still, wind up, one fast committed stroke, settle.

Deep indigo and near-black, bone white, one hot vermilion accent. Strong
light-to-dark separation. Painterly anime-influenced concept art, visible brush
texture, film grain, motion smear on the fast stroke.

The blade path must be clearly readable against the background — a single
unmistakable diagonal, not a flurry of strokes and not a burst of particles.

Absolutely no text, lettering, captions, watermarks, logos or UI anywhere.
```

### Why the trajectory matters

The current build measured Zangetsu entering the top edge at `x = 0.887` and
exiting the left edge at `y = 0.874` — about 29 degrees in screen pixels, not
the 45 the spec assumed. The page cut, the two separating halves and their
perpendicular travel are all derived from those two numbers. A new clip means
re-measuring them; the tooling to do it already exists.

## What happens when the clips land

1. `SRC=<clip> node scripts/frame-stats.mjs <frames>` — internal cuts, loop cost, motion level
2. `node scripts/find-loop-point.mjs` — best loop window, if the seam is not native
3. ffmpeg transcode to VP9 + H.264 at 1920/1280, masters into `art-masters/`
4. Measure the blade path off the strongest frame, update `SLASH`
5. Re-derive the cue frames in `cues.ts`
