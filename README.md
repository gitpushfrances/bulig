# Bulig

**Help Along the Way.** Road help and local services for travellers anywhere, added one checked area at a time. The first pilot area is Guiuan and Mercedes, Eastern Samar, Philippines.

Bulig is a free, offline-first web app (PWA) for people on the road. It has two main parts:

- **Emergency Help**: the country's main emergency number first (911 in the Philippines and US, 112 in the EU, and so on), then checked local numbers (police, fire, medical, rescue, coast guard, local disaster office). No login, no ads, ever.
- **Services**: tire repair (vulcanizing), mechanics, hospitals, fuel, food and stores, by area and category, with call and directions buttons.

## Status

**Phase 1: Setup and skeleton (v0.1)**, in progress. See [docs/CHANGELOG.md](docs/CHANGELOG.md) for what has changed and [docs/ROADMAP.md](docs/ROADMAP.md) for what comes next.

| Phase | Name | Release |
| --- | --- | --- |
| 1 | Setup and skeleton | v0.1 |
| 2 | Emergency + Services PWA (offline, sample data) | v0.2 |
| 3 | First pilot (Guiuan + Mercedes, PH) | v0.3 |
| 4 | Backend and admin (Laravel) | v0.4 |
| 5 | Community features | v0.5 |
| 6 | Android app (Capacitor), optional | v1.0 |
| 7 | More areas and countries | v1.x |

## Docs

| File | What it covers |
| --- | --- |
| [docs/ROADMAP.md](docs/ROADMAP.md) | **When** to build each part: phases, Jira tickets, steps, "done when" lists |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **How** each part is built and what it plugs into (the four spines) |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Every change, error, conflict and big decision, newest first |

## Stack

- **Frontend:** Vite 8.3, React 19.3, TypeScript 6.0.x, React Router 8, ESLint, plain CSS Modules
- **Coming in Phase 2:** vite-plugin-pwa 2.0, Vitest 5, `ajv` for schema checks
- **Data (Phases 1 to 3):** JSON files in `app/public/data/`
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
└── docs/        Roadmap, architecture, changelog
```

One repo, no monorepo tooling. `contracts/` and `api/` don't exist yet.

## Getting started

Needs Node 24 (installed with fnm) and Git.

```bash
git clone https://github.com/gitpushfrances/bulig.git
cd bulig/app
npm install
npm run dev        # local dev server
npm run lint       # ESLint
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

1. **Emergency Help** never needs a login and never shows ads. It never says help was dispatched or a location was sent. It only lists checked numbers, and hides any not checked in the last 180 days.
2. **`main` is always deployable.** Work on `feat/...` or `fix/...` branches, merge by pull request, and wait for green CI.
3. **Test on a real phone** (a low-cost Android with Chrome) before closing any UI ticket. Resizing a desktop browser only checks layout, not touch, speed or install.
4. **One phase at a time.** New ideas go into the Jira backlog.
5. **Update [docs/CHANGELOG.md](docs/CHANGELOG.md) with every change**, and especially with errors, conflicts and big changes. At the end of each phase, tag a release (`git tag v0.x`) and move the `Unreleased` entries under that version.

**Budget rule: PHP 0.** Every phase has a free path. Paid items (domain, Play Store, paid server) wait until Bulig earns money or wins a grant.

## License

Not chosen yet.
