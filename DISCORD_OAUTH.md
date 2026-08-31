# Discord profile connection

The welcome screen draws its avatar, display name, handle, banner and accent
colour from the real Discord account, through OAuth and nothing else.

Unconfigured, the card falls back to `/character.webp` and the site's own name
— the same card with the same shape, not an empty box. Nothing here is
required to run the site.

### What this cannot show, and why

Discord's `identify` scope returns **identity**. It does not return presence:
online status, current game and Spotify are not in any public Discord API, for
OAuth or otherwise. The only way to get them is a third-party service that
monitors your account after you join someone else's server — a dependency on a
stranger's uptime, in exchange for a green dot.

A status dot therefore needs a process that holds a Gateway socket open, which
a serverless function cannot do. `presence-relay/` in this repo is that
process — deploy it anywhere that runs continuously, set `DISCORD_PRESENCE_URL`,
and the dot and activity line appear. Leave it unset and the card draws
neither, because a status indicator that guesses is worse than none.

Last seen is not available by any route: Discord has never published it.

## What the browser can see

Only `/api/discord/profile`, which returns id, username, display name, avatar
URL, banner URL, accent colour and bio. The client id, client secret, refresh
token and access token never leave the server — none of them carry Astro's
`PUBLIC_` prefix, and adding it to any of them would ship the value to every
visitor.

## Setup

**1. Create the application.** <https://discord.com/developers/applications> →
New Application → OAuth2. Copy the **Client ID** and **Client Secret**.

**2. Register the redirect.** On the same OAuth2 page add a redirect URL. It
must match byte for byte:

```
https://your-domain.com/api/discord/callback
```

Add `http://localhost:4321/api/discord/callback` too if you want the flow to
work in `astro dev`.

**3. Set the environment.** Locally in `.env`, and on Vercel under Settings →
Environment Variables:

```
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

**4. Approve the grant, once.** Visit `/api/discord/login` on the deployed
site. Discord asks for the `identify` scope — public profile only: no email, no
guilds, no messages, no ability to act as the account. Approve it.

The callback checks that the account you authorized as is the one in
`gate.discordId` (`src/data/site.ts`) and rejects any other, so someone who
finds the login URL cannot put their own face on your front page.

**5. Save the refresh token.** The callback page prints it once. Put it in the
environment and redeploy:

```
DISCORD_REFRESH_TOKEN=...
```

It is shown on screen because a serverless function cannot write to its own
environment — the credential has to reach it through a human. That page is
`no-store`, `noindex`, and reachable only by the browser that started the flow.

## Bot token — the one that keeps working

**On serverless, set this.** It is tried before OAuth and it is what makes the
card survive a redeploy.

Same application → **Bot** in the sidebar → **Reset Token** → copy it:

```
DISCORD_BOT_TOKEN=...
```

The bot needs no permissions, no invite, and does not have to be in any server.
It only calls `GET /users/{id}`, which reads a public profile.

### Why OAuth alone breaks

Discord **rotates** refresh tokens: every refresh issues a new one and
invalidates the one just used. A refresh token is effectively single-use.

A serverless function cannot write the new token back into its own environment.
So the rotated token lives only in that instance's memory, and the next cold
start reads the original `DISCORD_REFRESH_TOKEN`, which Discord has already
killed. From then on every request fails:

```json
{"profile":null,"reason":"discord token 400: {\"error\": \"invalid_grant\"}"}
```

Re-running `/api/discord/login` fixes it until the next cold start. That is not
a fix, it is a chore on a timer. A bot token has nothing to rotate.

OAuth is still worth running **once**, because approving the grant is what
proves the account is yours rather than whatever id is sitting in
`gate.discordId`. After that the bot token does the day-to-day reading.

To keep OAuth as the live path you need somewhere to persist the rotated token
between invocations — Vercel KV, Upstash, any small store — and to write it
back on every refresh.

## Hosting

The three routes under `src/pages/api/discord/` set `export const prerender =
false`, so they build as functions while every page stays prerendered HTML.
That needs an adapter — `@astrojs/vercel`, configured in `astro.config.mjs`.

To move to another host, swap the adapter. To go back to a purely static build,
remove the adapter and delete `src/pages/api/discord/`: the client falls back
to the local portrait on its own and nothing else on the page notices.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/api/discord/profile` returns 503 with "not configured" | No credentials set, or the grant has not been run |
| Callback says **Exchange failed** with `invalid_grant` | The redirect URL registered on the Discord application does not match the one the site sends — the page prints the exact string it used |
| Callback says **Wrong account** | You authorized as someone other than `gate.discordId` |
| `invalid_grant` on `/api/discord/profile` | The stored refresh token has been rotated past or revoked. Set `DISCORD_BOT_TOKEN` — see above. Re-running the grant works only until the next cold start |
| Worked, then stopped after a redeploy | Same cause. The refresh token is single-use and the environment still holds the spent one |
