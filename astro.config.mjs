// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // The canonical origin. og:image and canonical are absolute URLs, and every
  // social scraper drops a relative one, so this has to be the real deployed
  // host before launch — set SITE_URL in the deploy environment.
  // TODO: replace the fallback once the domain is registered.
  site: process.env.SITE_URL || 'http://localhost:4321',

  integrations: [react()],

  // STATIC BY DEFAULT, with a few functions.
  //
  // Every page here is still prerendered to HTML at build time — the adapter
  // does not change that, and nothing about the portfolio became slower or
  // dynamic. What it adds is the ability for individual routes to opt OUT via
  // `export const prerender = false`, which the three /api/discord routes do,
  // because Discord OAuth needs somewhere to hold a client secret that is not
  // the visitor's browser.
  //
  // Consequence worth knowing: the build now emits a Vercel deployment rather
  // than a plain folder of files. To go back to a pure static host, drop the
  // adapter and the /api/discord routes with it.
  adapter: vercel(),

  server: {
    // Honour an assigned port so this can run alongside other dev servers.
    port: Number(process.env.PORT) || 4321,
    allowedHosts: ['retain-adopted-differential-exists.trycloudflare.com'],
  },

  vite: {
    plugins: [tailwindcss()],
  },
})