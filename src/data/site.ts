// Content layer. Every figure here must be checkable against a live URL or a
// repository: no invented figures. What the page draws it derives from these
// values rather than keeping a second copy that can drift.

import { arrivalEdits } from './arrival-playlist.generated'

export const profile = {
  name: 'Sugam Pokharel',
  // POSITIONING, not a job title. "Full-stack developer" describes a skill set
  // that ten thousand other pages also claim; it says nothing about who the
  // work is for or why this person rather than another. The line below names
  // the audience (founders and small teams shipping something people pay for)
  // and the part of the job most portfolios never get to (the commercial
  // layer). Both halves are backed by the projects listed further down —
  // Toolorah runs real accounts, tiers and Paddle billing in production.
  role: 'Full-stack product builder for founders shipping paid software',
  location: 'Nepal',
  email: 'sugampokharel28@gmail.com',
  // Says what is actually true, not what sounds impressive. Doubles as the
  // page's meta description, so it has to read on its own out of context.
  //
  // The differentiator is stated as a fact, not an adjective: building from
  // Nepal means the default payment rails are simply unavailable, so the
  // billing layer had to be engineered rather than pasted in. That is a
  // specific reason to hire this developer, and it is checkable — the Toolorah
  // crux below is the working out.
  statement:
    'I design and ship complete products for founders and small teams — from the interface ' +
    'people touch to the accounts, payments and infrastructure that make it real. Based in ' +
    'Nepal, working worldwide.',
  links: {
    github: 'https://github.com/sugampokhareldev',
  },
} as const

// The entry gate. Everything here is swappable content, not layout.
export const gate = {
  tagline: 'Builds tools that ship',

  // The film's own music, shipped as a separate track so it can be toggled
  // (a video that autoplays with sound does not autoplay at all). Sources
  // live in cues.ts as BG_AUDIO — the same timeline as the picture, which is
  // why the player scrubs both at once.
  audio: {
    title: 'twilight-loop',
    detail: '86.75 BPM',
  },

  // ---- Discord ----
  //
  // Identity comes from Discord OAuth, served by this site's own
  // /api/discord/profile function. See DISCORD_OAUTH.md.
  //
  // There is no live-presence layer. Discord publishes no API for online
  // status, current game or Spotify, and the third-party service that fills
  // that gap needs the account to join someone else's server to be monitored
  // at all — a dependency on a stranger's uptime for a green dot. The card
  // shows what OAuth can prove and stops there.

  // The account. Public either way: it is already in the Discord profile link
  // in `socials`, and the OAuth callback checks against it.
  discordId: '826337984700743710',

  // The cinematic character portrait is also used as the default gate avatar.
  // Replace this with a square personal image later if one becomes available.
  // Order of preference: live Discord avatar, then this file, then initials.
  avatar: '/character.webp',
} as const

/**
 * THE PLAYLIST.
 *
 * Track 1 is always the film's own loop and is NOT listed here — it ships in
 * cues.ts as BG_AUDIO and behaves differently on purpose (seeking it moves
 * the picture too, because they are one recording).
 *
 * Everything else is an ordinary track: its own timeline, and the playlist
 * advances when it ends. Which one a visitor gets is chosen at random on every
 * load — see useGateAudio — so the welcome screen sounds different each time
 * rather than having one song attached to it.
 *
 * `title` and `detail` are the two lines the player shows, so `detail` is the
 * artist. Nothing is fetched and nothing is streamed — these are files you are
 * serving, so only put up what you are entitled to serve.
 *
 * Empty is a valid state: with no entries the player is exactly what it was,
 * a single looping track with no skip controls.
 */
export type Track = { title: string; detail: string; src: string }

// The complete library, cut to size.
//
// `art-masters/audio-playlist/` holds the full-length recordings — 304 MB,
// which is a library rather than a web asset and stays out of `public/` like
// every other master here. `scripts/build-arrival-edits.mjs` cuts a 45-second
// edit from each one into `public/audio/arrival/` (14 MB for all 26) and
// writes the list below. Add a track to that script's LIBRARY table and re-run
// it; do not hand-edit the generated file.
export const playlist: Track[] = arrivalEdits

export type Social = { label: string; href: string; icon: string }

// Icons are inline SVG path data — no icon library, no network request.
export const socials: Social[] = [
  {
    label: 'Discord',
    href: 'https://discord.com/users/826337984700743710',
    icon: 'M20.3 4.4A19 19 0 0 0 15.6 3l-.24.5a17.6 17.6 0 0 1 4.3 1.44C17.9 3.62 15.7 3.04 12 3.04s-5.9.58-7.66 1.9A17.6 17.6 0 0 1 8.64 3.5L8.4 3a19 19 0 0 0-4.7 1.4C1.3 8.06.64 11.66 1 15.2A19.2 19.2 0 0 0 6.84 21a14 14 0 0 0 1.2-2 12.4 12.4 0 0 1-1.96-.94l.48-.38a13.6 13.6 0 0 0 11.6 0l.48.38a12.4 12.4 0 0 1-1.96.95 14 14 0 0 0 1.2 1.99 19.2 19.2 0 0 0 5.84-5.8c.44-4.1-.62-7.7-3.42-10.8ZM8.68 13.9c-1.12 0-2.04-1.03-2.04-2.3s.9-2.3 2.04-2.3 2.06 1.03 2.04 2.3c0 1.27-.9 2.3-2.04 2.3Zm6.64 0c-1.12 0-2.04-1.03-2.04-2.3s.9-2.3 2.04-2.3 2.05 1.03 2.03 2.3c0 1.27-.9 2.3-2.03 2.3Z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/sugampokharel01',
    // Five subpaths, drawn as a ring inside a ring: outer frame, inner frame,
    // lens outer, lens inner, flash dot. Relies on fill-rule="evenodd" to
    // carve the holes — see the <path> in BeatIntro.
    icon: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.2-3.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z',
  },
  {
    label: 'Spotify',
    href: 'https://open.spotify.com/user/31vehpoverqns2ujtpidus3risxm',
    // A filled disc with three bands cut out of it, same evenodd trick.
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-4.7 6.1c3.4-1 7.9-.6 10.8 1.2a1 1 0 1 1-1 1.7c-2.5-1.5-6.4-1.9-9.3-1a1 1 0 1 1-.5-1.9Zm.7 3.5c2.8-.8 6.5-.4 8.9 1a.9.9 0 1 1-.9 1.5c-2-1.2-5.2-1.5-7.5-.8a.9.9 0 1 1-.5-1.7Zm.6 3.3c2.2-.6 5-.3 6.9.8a.75.75 0 1 1-.7 1.3c-1.6-.9-4-1.2-5.8-.7a.75.75 0 1 1-.4-1.4Z',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/sugampokhareldev',
    icon: 'M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.23.66-.5v-1.69C6.73 19.91 6.14 18 6.14 18a2.7 2.7 0 0 0-1.13-1.49c-.92-.63.07-.62.07-.62a2.14 2.14 0 0 1 1.56 1.05 2.17 2.17 0 0 0 2.96.85 2.16 2.16 0 0 1 .65-1.37c-2.23-.25-4.57-1.12-4.57-4.96a3.88 3.88 0 0 1 1.03-2.69 3.6 3.6 0 0 1 .1-2.65s.84-.27 2.75 1.03a9.42 9.42 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03a3.6 3.6 0 0 1 .1 2.65 3.87 3.87 0 0 1 1.03 2.69c0 3.85-2.34 4.7-4.57 4.95a2.43 2.43 0 0 1 .69 1.88v2.79c0 .27.16.59.67.5A10 10 0 0 0 12 2Z',
  },
  {
    label: 'Email',
    href: 'mailto:sugampokharel28@gmail.com',
    icon: 'M3 5.5h18a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Zm.9 2 8.1 5.4 8.1-5.4H3.9Z',
  },
  {
    label: 'Toolorah',
    href: 'https://www.toolorah.com',
    icon: 'M12 2 2 7l10 5 10-5-10-5Zm0 20 10-5v-4l-10 5-10-5v4l10 5Zm0-6.5L2 10.5v4l10 5 10-5v-4l-10 5Z',
  },
]

export type Reading = { label: string; value: string }

export type Project = {
  index: string
  slug: string
  name: string
  kicker: string
  year: string
  status: 'live' | 'active' | 'archived'
  summary: string
  // The single most interesting engineering decision. This is the reason the
  // project is on the site at all.
  crux: { title: string; body: string }
  readings: Reading[]
  stack: string[]
  href?: string
  featured?: boolean
  /**
   * A real capture of the project's own interface, used as raw material in the
   * work scene — cropped, masked and revealed, never dropped inside a laptop
   * mockup. Optional by design: the scenes are composed to be complete without
   * it, so an absent capture is a quieter scene, not a broken one.
   *
   * Put files in /public/work/. See ASSETS.md for what to capture.
   */
  preview?: { src: string; alt: string; focus?: string }
}

export const projects: Project[] = [
  {
    index: '01',
    slug: 'toolorah',
    name: 'Toolorah',
    kicker: 'Browser-side tool platform with its own billing layer',
    year: '2026',
    status: 'live',
    summary:
      'A rack of 53 small utilities that run entirely in the browser — text, PDF, ' +
      'conversion, design and developer tools — behind accounts, tiers and paid plans.',
    crux: {
      title: 'Stripe does not operate in Nepal, so the payment layer had to be rebuilt',
      body:
        'The obvious billing integration was unavailable: Stripe has no support for ' +
        'Nepal-based businesses. Toolorah runs on Paddle instead, as merchant of record — ' +
        'Paddle is the legal seller, handles global sales tax, and pays out. That changes ' +
        'the integration in ways the documentation does not lead with. Paddle’s list ' +
        'endpoints are not read-your-writes consistent, so two concurrent checkouts both ' +
        'see an empty customer list and both try to create; the loser is rejected with ' +
        'customer_already_exists and the winning id has to be recovered from the error ' +
        'body rather than treated as a failure. Its webhook signature window is five ' +
        'seconds, not Stripe’s three hundred, so a slow cold start can fail verification ' +
        'on a perfectly valid delivery — nothing may run before the unmarshal call.',
    },
    readings: [
      { label: 'Tools', value: '53' },
      { label: 'Categories', value: '8' },
      { label: 'Rendering', value: 'Hybrid SSR' },
      { label: 'Billing', value: 'Paddle MoR' },
    ],
    stack: ['Astro 6', 'TypeScript', 'Supabase', 'Paddle', 'Vercel'],
    href: 'https://www.toolorah.com',
    featured: true,
  },
  {
    index: '02',
    slug: 'instagram-view-counter',
    name: 'View Counter',
    kicker: 'Reconciling two views of the same data',
    year: '2026',
    status: 'active',
    summary:
      'Reads public Instagram reel view counts locally, then reconciles the logged-out pass ' +
      'against an authenticated one to recover the reels anonymous visitors cannot see.',
    crux: {
      title: 'The hidden reels were the ones that mattered',
      body:
        'A logged-out scrape looks complete and is not. Instagram hides some reels from ' +
        'anonymous visitors, and disproportionately the popular ones — in one account a ' +
        'single hidden reel was 58% of its total views. So the scanner runs two passes and ' +
        'reconciles them: an anonymous pass that carries no ban risk does the bulk of the ' +
        'work, and an authenticated pass fills only the gaps, usually in one request. If ' +
        'you are paying people from these numbers, the difference is the whole point.',
    },
    readings: [
      { label: 'Passes', value: '2' },
      { label: 'Recovered', value: 'up to 58%' },
      { label: 'Runtime', value: 'Local only' },
      { label: 'Output', value: 'PDF report' },
    ],
    stack: ['Node.js', 'Playwright', 'Electron', 'PDFKit'],
    featured: true,
  },
  {
    index: '03',
    slug: 'pixeletshop',
    name: 'PixeletShop',
    kicker: 'Storefront with live order analytics',
    year: '2026',
    status: 'active',
    summary:
      'A commerce front end with catalogue, cart and an admin surface that charts order ' +
      'and revenue movement as it happens.',
    crux: {
      title: 'Two audiences, one data model',
      body:
        'The shopper and the operator want opposite things from the same records — one ' +
        'wants a product, the other wants a trend. The build keeps a single Firestore shape ' +
        'and derives both surfaces from it, rather than maintaining a reporting copy that ' +
        'drifts out of sync with what customers actually see.',
    },
    readings: [
      { label: 'Surfaces', value: '2' },
      { label: 'Data', value: 'Firestore' },
      { label: 'Charts', value: 'Recharts' },
    ],
    stack: ['React', 'Firebase', 'Recharts', 'Vite'],
  },
  {
    index: '04',
    slug: 'ridebooking',
    name: 'RideBooking',
    kicker: 'Four surfaces, one dispatch core',
    year: '2026',
    status: 'archived',
    summary:
      'A ride-hailing system built as four coordinated clients — customer app, driver app, ' +
      'admin dashboard and backend — around a shared dispatch model.',
    crux: {
      title: 'The hard part was never the map',
      body:
        'Every surface has a different idea of what a ride means: a request, an assignment, ' +
        'a job, a row. Getting four clients to agree on one state machine — and to stay ' +
        'agreed when a driver goes offline mid-trip — was the actual engineering, and the ' +
        'reason the project is worth listing.',
    },
    readings: [
      { label: 'Clients', value: '4' },
      { label: 'Shared core', value: '1' },
    ],
    stack: ['Node.js', 'React', 'Mobile'],
  },
]

/**
 * THE JOURNEY. Written by Sugam; kept verbatim rather than rewritten, because
 * the plain account of how someone actually learned is more convincing than a
 * polished one. `tags` are pulled from the text itself — every technology
 * listed appears in the paragraph beside it.
 */
export type Era = {
  period: string
  title: string
  body: string
  coda?: string
  tags: string[]
  /** The current era draws itself differently — it has not finished. */
  present?: boolean
}

export const journey: Era[] = [
  {
    period: '2020 — 2022',
    title: 'The Beginning',
    body:
      'Started exploring web development through HTML, CSS, and JavaScript, learning how ' +
      'the web works from the ground up. This period was about experimentation, curiosity, ' +
      'and building the foundation that would shape everything that followed.',
    tags: ['HTML', 'CSS', 'JavaScript'],
  },
  {
    period: '2022 — 2024',
    title: 'Going Deeper',
    body:
      'Moved beyond the fundamentals and began exploring modern development more seriously. ' +
      'Expanded into React, Astro, TypeScript, Python, and the MERN stack, while building ' +
      'smaller projects to turn concepts into practical experience and better understand ' +
      'how complete applications come together.',
    tags: ['React', 'Astro', 'TypeScript', 'Python', 'MERN'],
  },
  {
    period: '2024 — 2026',
    title: 'Building for the Real World',
    body:
      'Took development further through an Advanced Web Development course while focusing ' +
      'increasingly on real-world execution. Designed, developed, and shipped four production ' +
      'projects, gaining hands-on experience across the full journey from an initial idea to ' +
      'a finished product used in the real world.',
    tags: ['Advanced Web Development', '4 production projects', 'Idea to product'],
  },
  {
    period: 'Present',
    title: 'Still Learning. Still Building.',
    body:
      'I continue to explore new technologies, refine my craft, and take on more ambitious ' +
      'ideas. My focus has shifted beyond simply learning frameworks or tools toward building ' +
      'useful, polished, performant, and production-ready digital experiences.',
    coda: 'Keep learning, keep shipping, and make every project better than the last.',
    tags: ['Learning', 'Shipping', 'Improving'],
    present: true,
  },
]

/**
 * CAPABILITIES.
 *
 * Deliberately DERIVED, not hand-written: every technology listed here is
 * pulled from a shipped project's `stack` or from a `journey` entry above, so
 * this section cannot drift into a wishlist. If something is not in a project
 * or in the written history, it does not appear.
 *
 * Grouped by what the work actually is, rather than listed as thirty badges.
 */
export type Capability = {
  index: string
  verb: string
  group: string
  note: string
  proof: { value: string; label: string }
  items: string[]
}

const fromStacks = new Set(projects.flatMap((p) => p.stack))
const fromJourney = new Set(journey.flatMap((e) => e.tags))
const known = (name: string) => fromStacks.has(name) || fromJourney.has(name)

// Each list is filtered against the real data, so an entry that is not backed
// by a project or the journey silently drops out rather than being asserted.
export const capabilities: Capability[] = [
  {
    index: '01',
    verb: 'Design',
    group: 'Product interfaces',
    note: 'Clear, responsive surfaces that make complicated tools feel immediate.',
    proof: { value: '53', label: 'browser-side utilities shipped in one platform' },
    items: ['Astro 6', 'React', 'TypeScript', 'Vite', 'HTML', 'CSS', 'JavaScript'].filter(known),
  },
  {
    index: '02',
    verb: 'Connect',
    group: 'Systems & data',
    note: 'APIs, accounts and data paths that stay dependable behind the interface.',
    proof: { value: '2 passes', label: 'reconciled into one accurate reporting flow' },
    items: ['Node.js', 'Supabase', 'Firebase', 'Python', 'MERN', 'Playwright'].filter(known),
  },
  {
    index: '03',
    verb: 'Ship',
    group: 'Launch & revenue',
    note: 'Deployment, billing and the last mile between a working build and a real product.',
    proof: { value: 'Paddle MoR', label: 'global billing engineered from Nepal' },
    items: ['Paddle', 'Vercel', 'Electron', 'PDFKit', 'Recharts'].filter(known),
  },
]

// Canonical production sequence. The nav, HUD and scene numbering all derive
// from this list, so every id must have a matching chapter on the main page.
export const sections = [
  { id: 'arrival', label: 'Arrival' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'journey', label: 'Journey' },
  { id: 'contact', label: 'Contact' },
] as const

/**
 * The scene's own index, derived from `sections`.
 *
 * The scene labels were hand-numbered (About / 05, Capability / 06) while the
 * nav numbered the same sections 03 and 04. §25.7: metadata must be
 * informative, not decorative — two different numbers for one section is
 * misinformation, so both now read from the same list.
 */
export const sectionNo = (id: string): string => {
  const i = sections.findIndex((s) => s.id === id)
  return i < 0 ? '--' : String(i + 1).padStart(2, '0')
}
