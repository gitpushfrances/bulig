# Changelog

All notable changes to Bulig are recorded here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow the phase tags in the [Roadmap](ROADMAP.md) (`v0.1` to `v1.x`).

## How to write an entry

- Add every change under **Unreleased** as it happens, not at the end of the phase.
- Put each entry under one of these headings:
  - **Added**, **Changed**, **Removed**, **Fixed**, **Security**: the usual kinds of change.
  - **Errors**: something broke (build, CI, deploy, data). Say what failed, the error message, the cause, and the fix. If it isn't fixed yet, mark it **open**.
  - **Conflicts**: merge conflicts, or the code disagreeing with the Roadmap or Architecture. Say which side won and why.
  - **Big changes**: anything that changes the data contract, a route, the stack, hosting or a phase plan. Link the doc you updated.
- Mention the Jira ticket (`SCRUM-xx`) and the PR or commit when there is one.
- At the end of a phase, tag the release, rename **Unreleased** to the version and date, and start a new empty **Unreleased**. The Roadmap asks for a 3-line summary at the top of each release.

---

## [Unreleased]

Phase 1: Setup and skeleton (target `v0.1`). Tickets SCRUM-21, SCRUM-22, SCRUM-23.

### Added

- Root `README.md` with the project summary, stack, repo layout, getting started, deploy settings and working rules. (branch `docs/readme-changelog`)
- `docs/CHANGELOG.md` (this file), as asked for by Roadmap ground rule 5. (branch `docs/readme-changelog`)
- **SCRUM-23 app shell** (branch `feat/phase-1-skeleton`):
  - Routes `/` (Emergency), `/services` and `/about` inside `<Layout>`, plus a "Page not found" route for anything else.
  - Responsive, mobile-first layout in CSS Modules. Phones get a bottom tab bar in thumb reach with 64px touch targets. Short landscape phones get a slimmer bar. From 48rem (tablets and desktops) the tabs move into the top header. Content is capped at 48rem wide. Safe-area insets are handled for notched phones, the tagline is hidden below 22rem (320px phones), and there's a light and dark theme, a skip link, visible focus rings and reduced-motion support.
  - Placeholder text on each page, with a "Coming in v0.2" badge.
  - `public/_redirects` with `/* /index.html 200`, so refreshing any route works on Cloudflare Pages.
  - New Bulig favicon, `theme-color`, page title and description in `index.html`.
- Vitest 5 + jsdom + Testing Library. `src/App.test.tsx` checks each route shows its page and marks its tab active, the three tabs stay in order, and unknown paths show "Page not found". Scripts: `npm test`, `npm run test:watch`.
- `.github/workflows/ci.yml`: `npm ci`, `npm run lint`, `npx vitest run`, `npm run build` in `app/`, on every PR and on pushes to `main` (Roadmap step 5).
- Root `.gitignore` (Roadmap step 3), also ignoring `.env` files.

### Changed

- `app/README.md` replaced: the Vite template text is now app-specific scripts and folder layout.

### Removed

- Vite demo content: counter, logos, `App.css`, `src/assets/*` and `public/icons.svg` (Roadmap step 7).

### Errors

- **Open:** `docs/ROADMAP.md` Phase 1 step 1 says to follow `local-setup.md`, but that file isn't in the repo.
- **Fixed (testing only, not an app bug):** the first headless Edge screenshots at 320px and 390px looked cut off on the right. Cause: headless Edge won't use a viewport narrower than 496px and crops the image. Fix: checked with `playwright-core` and real mobile emulation instead. At 320, 390, landscape 844x390, tablet 820 and desktop 1440, `scrollWidth` equals the viewport width, so there's no sideways scrolling.
- **Note:** the GitHub CLI (`gh`) isn't installed on the dev machine, so PRs are opened from the GitHub link printed by `git push`.

### Still to do in Phase 1

- Connect Cloudflare Pages: root `app`, build `npm run build`, output `dist` (step 4).
- Turn on branch protection for `main`, requiring the CI check.
- Test on a real Android phone (ground rule 3), then check the "Done when" list and move SCRUM-21, 22 and 23 to Done.

---

## 2026-10-28: Docs and line endings

Commit `b0fe06f`, merged in PR #1 (`c8ffdfd`).

### Added

- `docs/ROADMAP.md`: phases 1 to 7, Jira tickets, steps, "done when" lists and the PHP 0 budget rule.
- `docs/ARCHITECTURE.md`: the four spines (data contract, data source adapter, feedback pipeline, identity) and how each phase is built.
- `.gitattributes` forcing LF line endings (`* text=auto eol=lf`) and marking images as binary, so Windows and CI see the same files.

## 2026-10-28: Scaffold (SCRUM-22)

Commit `338e925`.

### Added

- `app/` created with `npm create vite@latest app -- --template react-ts`, with ESLint.
- React 19.3, React Router 8.5, Vite 8.3, TypeScript ~6.0, typescript-eslint 8.

### Big changes

- TypeScript is pinned to `~6.0.0` instead of 7, because typescript-eslint 8 needs TypeScript below 6.1. See the Roadmap's stack notes.
