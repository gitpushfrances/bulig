# Bulig

Bulig ("help" in Waray/Hiligaynon) is a road-help PWA for drivers and riders in the Philippines: Call 911 in one tap, then the nearest vulcanizing shop, gas, mechanic, hospital, food or store.

## Read before changing anything

- [docs/UI-UX.md](docs/UI-UX.md): source of truth for screens, flows, tokens, the mascot (Ropi) and design acceptance checks.
- [docs/ROADMAP.md](docs/ROADMAP.md): what ships in which phase. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it is built. [docs/WORKFLOW.md](docs/WORKFLOW.md): roles, sign-in, code-change flow.
- [docs/CHANGELOG.md](docs/CHANGELOG.md): add every change under **Unreleased** as you make it, using the headings at the top of that file.

## Stack and commands

React + TypeScript + Vite PWA in `app/` (static, JSON data in `app/public/data/`, deployed on Cloudflare). Run from `app/`:

```bash
npm run lint
npx vitest run
npm run build
```

## Hard rules

- Emergency (`/emergency`: 911 and local authorities) is open to everyone with no login, and one tap away from every screen (the red hazard button). Everything else needs an account ("Continue without an account" = Emergency only). Nothing heavy loads before 911; no ad or paywall near emergencies.
- Free services only: no paid APIs or subscriptions (the map is MapLibre + OpenFreeMap, addresses are Nominatim, routes are OSRM on routing.openstreetmap.de, voice navigation is a Google Maps URL).
- Never say Bulig dispatches help, sends location, or that a place is "open now".
- Works offline after one visit. Low-cost Android, 360px, sunlight: 16px body, 48px targets.
- Mascot Ropi: only on the screens UI-UX.md allows, never near the emergency path, moves only when tapped (the one exception: walking while a page loads).
