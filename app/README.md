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
├── App.tsx               Routes: / (Emergency), /services, /about
├── components/Layout.*   Header and tab bar (bottom on phones, top from 48rem)
├── pages/                One component per route, shared Page.module.css
└── test/setup.ts         jest-dom matchers for Vitest
public/_redirects         Cloudflare Pages SPA fallback, so refreshing any route works
```

Styles are plain CSS Modules, mobile first. Design tokens (colours, gutter, tab bar height) live in `src/index.css` and switch for dark mode.
