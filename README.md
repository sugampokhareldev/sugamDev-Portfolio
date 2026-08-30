# Sugam Pokharel — Portfolio

A cinematic, proof-led portfolio built with Astro. The production page moves
from a character-led arrival into selected work, capability proof, a six-year
journey, and a direct contact close.

## Local development

```sh
npm install
npx astro dev --background
```

Manage the background server with:

```sh
npx astro dev status
npx astro dev logs
npx astro dev stop
```

## Validation

```sh
npm run build
node scripts/contrast-check.mjs
```

## Asset workflow

- Production media belongs in `public/`.
- Large source renders and unused experiments belong in `art-masters/` so they
  are not copied into the final site.
- Regenerate the social card with `node scripts/build-og.mjs`.
- Re-cut the welcome screen's music with `npm run audio:arrival` — see
  `ASSETS.md`. The 304 MB of full-length masters stay in `art-masters/`; only
  the 45-second edits are deployed.

The canonical production URL is supplied through `SITE_URL` at deployment.

## Deployment

Every page is prerendered to HTML. Three routes under `src/pages/api/discord/`
opt out via `export const prerender = false` so the Discord OAuth client secret
has somewhere to live that is not the visitor's browser — which is why
`astro.config.mjs` carries the `@astrojs/vercel` adapter and the build emits a
Vercel deployment rather than a plain folder of files.

None of it is required to run the site. With no Discord credentials set the
profile endpoint answers 503 by design and the welcome screen falls back to the
local portrait; removing the adapter and the `api/discord/` directory returns
the project to a purely static build. Copy `.env.example` to `.env` for the
full list of settings, and see `DISCORD_OAUTH.md` for the walkthrough.
