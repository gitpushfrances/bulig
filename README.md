# Bulig

**Help Along the Way.** Road help and local services for travellers in the Philippines first, then anywhere, added one checked area at a time.

Bulig is a free, offline-first web app (PWA) for people on the road. Installed to the home screen it opens full screen, like any app.

- **Emergency Help** (`/emergency`): the national number first (911 in the Philippines), then checked local police, fire, medical, rescue and disaster numbers. Open to everyone with no login, one tap away from every screen through a red button, and never behind an ad.
- **What's wrong?**: Home's tiles are the problems: Flat tire, Breakdown, Out of gas, Hospital, Food, Hotel, Store, and **Others** (new stalls and local businesses). Each opens **Nearby results**: the nearest place as a big card with **Call** and **Route**, then the rest, nearest first.
- **Map**: every place as a pin on a free OpenStreetMap map, styled to match the app, with **routes drawn in the app** (distance, time, car or walk) and a Google Maps hand-off for voice navigation.
- **Accounts**: sign in or sign up (Ropi, the mascot, explains the app on the way). Everything except Emergency needs an account; "Continue without an account" opens Emergency only. Saved places, a profile with a photo, light and dark themes.
- **Where you are**: found from GPS, shown on Home as one line ("Lahug · Cebu City · Cebu · 6000"), and used to sort everything by distance.

## Status

**Phase 3 (v0.3) in progress.** v0.2 (Emergency + Services offline PWA) was released on 2026-10-29. Since then: the Graphite theme, Ropi, accounts and onboarding, the Map with in-app routes, "What's wrong?" and Nearby results. Still on sample data; real, verified records come next. Read [docs/UI-UX.md](docs/UI-UX.md) ("Where the app is now") for the current state, [docs/CHANGELOG.md](docs/CHANGELOG.md) for every change, and [docs/ROADMAP.md](docs/ROADMAP.md) for what comes next.

**Test logins** (preview only, typed on the login screen; password `password` for all): `test@bulig.com` (user), `moderator@bulig.com` (moderator), `admin@bulig.com` (admin). Accounts you create are kept on that phone only until the backend arrives.

| Phase | Name | Release |
| --- | --- | --- |
| 1 | Setup and skeleton | v0.1 |
| 2 | Emergency + Services PWA (offline, sample data) | v0.2 |
| 3 | First pilot (Philippines) | v0.3 |
| 4 | Backend and admin (Laravel) | v0.4 |
| 5 | Community features | v0.5 |
| 6 | Android app (Capacitor), optional | v1.0 |
| 7 | More areas and countries | v1.x |

## Docs

| File | What it covers |
| --- | --- |
| [docs/ROADMAP.md](docs/ROADMAP.md) | **When** to build each part: phases, Jira tickets, steps, "done when" lists |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **How** each part is built and what it plugs into (the four spines) |
| [docs/UI-UX.md](docs/UI-UX.md) | **What** each screen looks like and how people move through the app |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Every change, error, conflict and big decision, newest first |
| [docs/API.md](docs/API.md) | **The API contract**: every request the app makes (or will, once the backend exists) with its payload, response and errors, and what moves from the phone to the server |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | **Who does what**: areas, roles (user, moderator, admin), sign-in, how records and code changes flow |

## Stack

- **Frontend:** Vite 8, React 19, TypeScript 6.0.x, React Router 8, ESLint, plain CSS Modules, lucide-react icons, Lexend and Source Sans 3 (self-hosted with Fontsource)
- **Offline and install:** vite-plugin-pwa 2 (Workbox): the app, data and fonts are precached; `display: standalone` for a full-screen installed app
- **Tests:** Vitest 5 + Testing Library (jsdom)
- **Map and location, all free with no key:** MapLibre GL JS 5 with OpenFreeMap tiles (OpenStreetMap data), Nominatim for the address, OSRM on `routing.openstreetmap.de` for routes, a Google Maps URL for voice navigation
- **Data (Phases 1 to 3):** JSON files in `app/public/data/`
- **Accounts (until Phase 4):** test logins plus accounts kept on the phone (`localStorage`, salted SHA-256 password hash)
- **Hosting:** Cloudflare Worker with static assets, free plan (see [Deploy](#deploy))
- **Backend (Phase 4+):** Laravel 13, PHP 8.5, PostgreSQL + PostGIS, Sanctum, Filament 5, Pest 5
- **Native (Phase 6):** Capacitor 8

TypeScript stays on 6.0.x, not 7, because typescript-eslint 8 needs TypeScript below 6.1.

## Repo layout

```text
bulig/
├── app/         React + Vite PWA (Phase 1+)
├── contracts/   JSON Schema for the data contract (Phase 2+)
├── api/         Laravel API and Filament admin (Phase 4+)
└── docs/        Roadmap, architecture, UI/UX, changelog
```

One repo, no monorepo tooling. `contracts/` and `api/` don't exist yet. Inside `app/src/`: `pages/` (screens), `components/`, `rules/` (pure, tested logic: distance, needs, emergency, permissions), `data/`, `location/`, `map/` (theme and routes), `auth/`.

## Getting started

Needs Node 24 (installed with fnm) and Git.

```bash
git clone https://github.com/gitpushfrances/bulig.git
cd bulig/app
npm install
npm run dev        # local dev server
npm run lint       # ESLint
npx vitest run     # tests
npm run build      # type-check + production build into app/dist
npm run preview    # serve the production build
```

## Deploy

Cloudflare builds from `main` as a **Worker with static assets**. It works like Pages, but the output folder is set in [`app/wrangler.jsonc`](app/wrangler.jsonc) instead of the dashboard.

| Dashboard setting | Value |
| --- | --- |
| Root directory (Path) | `app` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build variable | `NODE_VERSION` = `24` |

`wrangler.jsonc` serves `dist/` and sends unknown paths to `index.html`, so refreshing `/services` never 404s. To check the config locally, run `npx wrangler deploy --dry-run` after a build.

## Working rules

These come from the [Roadmap](docs/ROADMAP.md#ground-rules-for-every-phase).

1. **Emergency Help** (`/emergency`) never needs a login and never shows ads, and the red button opens it from every screen. Everything else needs an account. It never says help was dispatched or a location was sent. It only lists checked numbers, and hides any not checked in the last 180 days.
2. **`main` is always deployable.** Work on `feat/...` or `fix/...` branches, merge by pull request, and wait for green CI.
3. **Test on a real phone** (a low-cost Android with Chrome) before closing any UI ticket. Resizing a desktop browser only checks layout, not touch, speed or install.
4. **One phase at a time.** New ideas go into the Jira backlog.
5. **Update [docs/CHANGELOG.md](docs/CHANGELOG.md) with every change**, and especially with errors, conflicts and big changes. At the end of each phase, tag a release (`git tag v0.x`) and move the `Unreleased` entries under that version.

**Budget rule: PHP 0.** Every phase has a free path, and the app uses no paid APIs or subscriptions (map: MapLibre + OpenFreeMap; addresses: Nominatim; routes: OSRM on routing.openstreetmap.de). Paid items (domain, Play Store, paid server) wait until Bulig earns money or wins a grant.

## License

Not chosen yet.
