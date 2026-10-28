# Bulig app

The React + Vite PWA. Project overview, roadmap and rules are in the [root README](../README.md).

## Scripts

```bash
npm install
npm run dev          # local dev server
npm test             # Vitest, once
npm run test:watch   # Vitest, watch mode
npm run lint         # ESLint
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build
```

To try it on your phone, run `npm run dev -- --host` and open the Network URL on a phone on the same Wi-Fi.

## Layout

```text
src/
├── main.tsx              BrowserRouter + App
├── App.tsx               DataProvider + routes: / (Emergency), /services, /about
├── types.ts              Data contract v1 (Area, EmergencyContact, Service, ...)
├── data/                 Loading (JsonSource, DataProvider, useAppData), validation, countries, labels
├── rules/                Pure, unit-tested rules: visibleContacts(), filterServices()
├── components/           Layout (header, tab bar), AreaPicker, DataNotice
├── pages/                One component per route, shared Page.module.css
└── test/setup.ts         jest-dom matchers; fetch() serves public/data in tests
public/data/<cc>/         Per-country data: areas, emergency-contacts, services, labels
pwa-assets.config.ts      Regenerates the app icons from favicon.svg (npx pwa-assets-generator)
wrangler.jsonc            Cloudflare Worker static assets, SPA fallback so refreshing any route works
```

Styles are plain CSS Modules, mobile first. Design tokens (colours, gutter, tab bar height) live in `src/index.css` and switch for dark mode.
