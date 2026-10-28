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

- Root `README.md` with the project summary, stack, repo layout, getting started, deploy settings and working rules.
- `docs/CHANGELOG.md` (this file), as asked for by Roadmap ground rule 5.

### Errors

- **Open:** `docs/ROADMAP.md` Phase 1 step 1 says to follow `local-setup.md`, but that file isn't in the repo.

### Still to do in Phase 1

- Root `.gitignore`. Only `app/.gitignore` exists (Roadmap step 3).
- Connect Cloudflare Pages: root `app`, build `npm run build`, output `dist` (step 4).
- `.github/workflows/ci.yml` running `npm ci`, `npm run lint`, `npx vitest run` and `npm run build`. Vitest isn't installed yet (step 5).
- SCRUM-23: `<Layout>` with a bottom tab bar, routes `/`, `/services` and `/about`, and `public/_redirects` with `/* /index.html 200` (step 6).
- Remove the Vite demo: the counter, the logos, `App.css` and `src/assets/hero.png` (step 7).
- Replace `app/README.md`, which is still the Vite template text.

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
