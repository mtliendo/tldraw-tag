# INK TAG

Live audience tag on a [tldraw](https://tldraw.dev) canvas. An admin creates a room, the crowd joins from their phones, and a projector shows the shrinking zone. The Colyseus server owns the simulation; browsers only send input and paint state.

The whole UI is Direction A (Clean tldraw): off-white dot-grid paper, Shantell Sans headings, Inter labels, orange-red for IT, and 13 critter avatars on a 72px hitbox. Dark mode keeps paper cards and inputs readable.

![INK TAG social preview](docs/social-preview.jpg)

## What it is

A developer-advocate conference demo: twenty-plus people in a hall scan a QR, drop a name, and play tag. The server assigns each player a critter (all 13 before any repeats). Power-ups spawn in the zone. Whoever is **IT** when the timer hits zero loses. Score is time spent as IT; lowest wins.

| Role | Route | Auth |
| --- | --- | --- |
| Admin | `/admin` | Auth0 Universal Login (`@auth0/nextjs-auth0` v4). Local demos can use `DEV_BYPASS_AUTH`. |
| Player | `/join/<code>` → `/play/<code>` | None. Name only; a critter is assigned server-side. |
| Projector | `/screen/<code>` | None. Read-only board + QR. |

Simulated bots: open `/admin?bots=10` (or click **+10 bots**) so you can rehearse without a crowd.

## Architecture

```mermaid
flowchart LR
  subgraph phones [Phones]
    P[Player clients]
  end
  subgraph projector [Projector]
    S["/screen/CODE tldraw"]
  end
  subgraph vercel [Vercel - Next.js]
    W[App Router]
    A[Auth0 middleware]
    T["/api/admin/token"]
  end
  subgraph railway [Railway - Colyseus]
    R[TagRoom]
    E[TagEngine 20 Hz]
    J[JWKS JWT verify]
  end
  subgraph auth0 [Auth0]
    U[Universal Login]
    API[API audience]
  end

  P -->|input WASD / joystick / power| R
  S -->|spectator join| R
  W --> A --> U
  T -->|access token| R
  R --> J --> API
  R --> E
  E -->|schema patches| P
  E -->|schema patches| S
  S --> W
  P --> W
```

- **Authoritative server.** Positions, zone, spawns, tags, and cooldowns live in `packages/shared` (`TagEngine`) and are ticked at 20 Hz inside `TagRoom`. Clients never move themselves.
- **tldraw is a renderer.** Custom shapes for the arena, zone, players, walls, pulses, power-ups, and decoys. The editor is read-only; the camera is locked to the 1600×900 arena.
- **Interpolation.** The client buffers snapshots and lerps between the last two (~80 ms delay) so 20 Hz ticks still look smooth.

## Monorepo

```
apps/web          Next.js 15 App Router (Vercel)
apps/server       Colyseus 0.18 game server (Railway)
packages/shared   Engine, power-up registry, avatars, constants
```

Power-ups are data-driven in `packages/shared/src/powerups.ts`. Add a definition, a `applyPower` case, and a color — the admin toggles, spawner, HUD, and tldraw gem all pick it up.

| Power | Charges | Effect |
| --- | --- | --- |
| Speedster | 3 | 2 s speed burst |
| Paver | 4 | Blocking wall, 5 s |
| Ghost | 2 | Pass through walls / skip tags, 2 s |
| Decoy | 1 | Fake copy drifts 4 s |
| Freezer | 1 | Freeze nearest player in range, 1.5 s |
| Swapper | 1 | Swap with a random player |
| Shield | 1 | Blocks one tag |

The shrinking zone is a hard wall. Every 10 seconds (configurable) the bounding box eases inward. Players are clamped so they are never outside it.

## Setup

Needs Node 20+.

```bash
git clone <this-repo>
cd tldraw-tag
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env
npm run dev
```

Then:

1. http://localhost:3000 — landing
2. http://localhost:3000/admin?bots=10 — create a room, start, watch bots
3. Scan the QR (or open `/join/CODE`) on a phone
4. http://localhost:3000/screen/CODE — projector view

`npm run dev` starts the Next.js app on `:3000` and the Colyseus server on `:2567`.

`npm test` runs the engine + a 20-bot headless round (create → play → shrink → leaderboard).

## Environment variables

Documented copies live in `apps/web/.env.example` and `apps/server/.env.example`. **Do not commit secrets.**

### Web (`apps/web`)

| Name | Required | Purpose |
| --- | --- | --- |
| `APP_BASE_URL` | yes (Auth0) | Canonical origin, e.g. `http://localhost:3000`. Auth0 v4 uses this instead of `AUTH0_BASE_URL`. |
| `NEXT_PUBLIC_APP_URL` | yes | Same origin; used for QR join links. |
| `NEXT_PUBLIC_COLYSEUS_URL` | yes | Browser WebSocket URL. Local `ws://localhost:2567`, Railway `wss://…`. |
| `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` | production | tldraw production license. Localhost works without it. |
| `AUTH0_DOMAIN` | production | Tenant host only, no `https://`. |
| `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` | production | Regular Web Application. |
| `AUTH0_SECRET` | production | Cookie secret, `openssl rand -hex 32`. |
| `AUTH0_AUDIENCE` | production | API identifier. Access tokens for the game server must carry this audience. |
| `DEV_BYPASS_AUTH` | local only | `true` skips Universal Login and mints a shared admin secret. **Must be false in production.** |
| `DEV_ADMIN_SECRET` | with bypass | Shared secret the Colyseus server also accepts. |

Auth0 app settings:

- Type: Regular Web Application
- Callback: `{APP_BASE_URL}/auth/callback`
- Logout: `{APP_BASE_URL}`
- Allowed origins: `{APP_BASE_URL}`
- Create an API whose identifier equals `AUTH0_AUDIENCE`, and authorize the web app to request it.

### Server (`apps/server`)

| Name | Required | Purpose |
| --- | --- | --- |
| `PORT` | Railway sets this | HTTP + WebSocket port. |
| `CORS_ORIGIN` | yes | Comma-separated browser origins. |
| `APP_BASE_URL` | optional | Public web origin. |
| `AUTH0_DOMAIN` | production | Same tenant host as the web app. JWKS: `https://{AUTH0_DOMAIN}/.well-known/jwks.json`. |
| `AUTH0_AUDIENCE` | production | JWT `aud` the server requires. |
| `DEV_BYPASS_AUTH` / `DEV_ADMIN_SECRET` | local only | Must match the web app. Disabled in production. |

Admin actions (`create`, `start`, `pause`, `reset`, config, spawn bots) are rejected unless `onCreate` / `onAuth` verified an Auth0 access token (or the explicit local secret).

## Deploy

### Vercel (web)

1. Import the GitHub repo.
2. Root directory: `apps/web` **or** repo root with Build Command `npm run build:web`.
3. If the root directory is `apps/web`, set Install to `cd ../.. && npm ci` and Build to `cd ../.. && npm run build:web` so the workspace package `@inkt/shared` is available.
4. Set the web env vars above. `NEXT_PUBLIC_COLYSEUS_URL` must be the Railway `wss://` URL.
5. Add the Vercel origin to Auth0 callbacks and to the server `CORS_ORIGIN`.

### Railway (Colyseus)

1. New project → deploy from the same repo.
2. Builder: Dockerfile at `apps/server/Dockerfile` (see `railway.json`). Build context is the **repository root**.
3. Set `PORT` (Railway provides it), `CORS_ORIGIN` (your Vercel URL), `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`.
4. Generate a public HTTPS domain; that becomes `NEXT_PUBLIC_COLYSEUS_URL` (`wss://…`).
5. Health check: `GET /health`.

Do not enable `DEV_BYPASS_AUTH` on Railway.

## Controls

- **Desktop:** WASD or arrows to move, space to fire the held power.
- **Mobile:** on-screen joystick + one large power button.
- Critters are assigned by the server (shuffled deck of 13, then hue-tinted repeats). Powers are loot that spawn after a ~1 s pulse warning. Holding a second power replaces the first.

## Screenshots

![Landing](docs/screenshots/00-home.png)

![Admin create](docs/screenshots/01-admin-create.png)

![Admin room with QR](docs/screenshots/01b-admin-room.png)

![Join](docs/screenshots/02-join.png)

![Join on a phone](docs/screenshots/02b-join-mobile.png)

![Join in dark mode](docs/screenshots/02c-join-dark.png)

![Lobby](docs/screenshots/03-lobby.png)

![In-game power-ups](docs/screenshots/04-ingame-powers.png)

![Player view](docs/screenshots/04b-player.png)

![Phone play — joystick + power](docs/screenshots/04c-player-mobile.png)

![Phone round 2](docs/screenshots/04d-player-mobile-r2.png)

![Shrinking zone](docs/screenshots/05-shrinking-zone.png)

![Shrinking zone on projector](docs/screenshots/05b-projector-zone.png)

![Leaderboard](docs/screenshots/06-leaderboard.png)

![Projector end](docs/screenshots/06b-projector-end.png)

![Phone end](docs/screenshots/06c-player-mobile-end.png)

![Projector view](docs/screenshots/07-projector.png)

![20-player projector](docs/screenshots/08-projector-20.png)

![Phone lobby landscape (iPhone)](docs/screenshots/09-player-iphone-landscape-lobby.png)

![Phone lobby landscape (Android)](docs/screenshots/09b-player-android-landscape-lobby.png)

![Phone play landscape (iPhone)](docs/screenshots/10-player-iphone-landscape.png)

![Phone play landscape (Android)](docs/screenshots/10b-player-android-landscape.png)

![Phone rotate to landscape](docs/screenshots/10c-player-rotate-landscape.png)

![Phone end landscape (iPhone)](docs/screenshots/11-player-iphone-landscape-end.png)

![Phone end landscape (Android)](docs/screenshots/11b-player-android-landscape-end.png)
