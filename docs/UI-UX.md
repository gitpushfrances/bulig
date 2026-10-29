# Bulig UI and UX

How Bulig looks and behaves, and the rules every screen follows. The tokens live in [`app/src/index.css`](../app/src/index.css); this file explains them.

Last updated: 2026-10-29 · Theme: **Ocean Depths** · Design canvas: https://claude.ai/artifact/Pvr4j7BMVZZB4WfMmmKSiR

## Who it's for

People on the road anywhere in the Philippines first, then any country: riders, tricycle and jeepney drivers, travellers. Usually on a low-cost Android phone, one-handed, outdoors in bright sun, on a weak or no signal, sometimes stressed. Every rule below follows from that.

## The look: Ocean Depths

Calm and clear, so a stressed person can read it. One deep sea colour carries trust, one bright aqua marks the action that matters most. Colour is for data, status and actions, not decoration.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| Deep | `#0B3B4F` | `#0E7490` | The national hotline card |
| Primary | `#0E7490` | `#22D3EE` | Call buttons, active chip, logo |
| Primary text | `#0B5A70` | `#67E8F9` | Links, icons beside text |
| Flare | `#2DD4BF` | `#2DD4BF` | "Call 911" only |
| Ground | `#F1F6F8` | `#061A22` | Page background and header |
| Surface | `#FFFFFF` | `#0C2733` | Cards, inputs, tab bar |
| Ink | `#0B2530` | `#E6F4F7` | Body text |
| Muted | `#48616C` | `#A6C1CA` | Secondary text |
| Checked | `#047857` | `#34D399` | "Last checked" line |
| Error | `#B42318` | `#FDA29B` | Form errors |

Every text pair meets WCAG AA (4.5:1 for body text, 3:1 for large text and icons). Light or dark follows the phone's setting.

**Forest Canopy** (greens) is drawn on the design canvas as an alternate. It isn't built; switching means changing the primitives in `index.css` only.

### Type

- **Lexend** (headings, numbers, buttons): designed for reading ease. Phone numbers use tabular figures so digits line up.
- **Source Sans 3** (body): clear at small sizes, wide language coverage.
- Both are self-hosted through Fontsource and precached (Latin only), so they work offline. No Google Fonts request.
- Scale: hotline number 72–96px, page title 26–34px, section 19px, card title 17px, body 16px, small 13px. Inputs are never under 16px (iOS would zoom).

### Icons

One outline set, [Lucide](https://lucide.dev) (`lucide-react`), at stroke 1.75. Each category and contact kind has its own icon in [`components/icons.ts`](../app/src/components/icons.ts). Icons sit inline beside text, never in tinted squares. Decorative icons are `aria-hidden`; icon-only buttons carry an `aria-label`.

## Tokens

Three layers, following the design-system skill. Components use only layers 2 and 3, never a raw hex.

1. **Primitives:** raw values, `--ocean-700: #0e7490`.
2. **Semantic:** a job, `--color-primary: var(--ocean-700)`. Dark mode only redefines this layer.
3. **Component:** a part, `--button-call-bg: var(--color-primary)`.

Shape: cards 16px, buttons and inputs 12px, chips and tab pills fully round. Elevation is a 1px border, never a shadow. Page gutter 16px, content max 48rem.

## Screens

| Screen | Path | Its one question | What's biggest |
| --- | --- | --- | --- |
| Emergency Help | `/` | "Who do I call right now?" | The national hotline card and its Call button |
| Services | `/services` | "Where's the nearest tire shop or mechanic?" | Category chips, then the list with Call |
| Saved | `/saved` | "What did I keep?" | Saved places and numbers |
| Account | `/account` | "Am I signed in?" | Sign-in form, or profile with role |
| About | `/about` | "What is Bulig?" | Plain text |

Navigation: a 4-item bottom tab bar on phones (in thumb reach), moving into the header from 48rem. The active tab is a neutral pill behind the icon. About lives under Account.

## Components

- **Hotline card:** deep background, country name from `Intl.DisplayNames` (no names in code), the number at display size, one flare "Call" button, last-checked date. Shown while data loads too, from the built-in fallback.
- **Contact card / Service card:** title, SAMPLE badge, bookmark, kind or category icon with label and landmark, opening hours and area, then Call (filled) and Directions (outline), then "Last checked". All from [`Cards.tsx`](../app/src/components/Cards.tsx), shared by Emergency, Services and Saved.
- **Save button:** a 44px bookmark. Signed out, it links to Account and returns to the same page after sign-in.
- **Area picker:** native `<select>`, areas grouped by province or region.
- **Chips:** only categories that exist in the picked area.
- **Notices:** loading, error with "Try again", sample-data warning. Offline shows once, in the header.

## UX rules

1. **Emergency Help never needs an account.** No ads, never says help is on the way.
2. **Touch targets are 48px or more** (44px for icon buttons and chips), with 8px between them.
3. **Press feedback on touch-down:** `scale(0.97)` over 160ms with a strong ease-out. Hover styles only on devices that hover (`(hover: hover) and (pointer: fine)`). No animation on entry, nothing that loops. Reduced motion turns all of it off.
4. **Mobile platform fixes:** no tap flash, no pull-to-refresh fight (`overscroll-behavior: none`), safe-area padding for notches, `100dvh` shell, `theme-color` per scheme, buttons don't select their label on long-press.
5. **Forms:** every input has a visible label. Errors appear on blur or submit, clear as soon as the person types, say what went wrong and how to fix it, and are announced (`role="alert"`). Inputs set `type`, `autocomplete`, `inputmode` and `enterkeyhint`.
6. **Honest data:** every record shows when it was last checked. SAMPLE records are badged and warned about. Empty results say so and offer a way out ("Clear search and category").
7. **Copy:** buttons start with a verb ("Call", "Sign in", "Fill in test login"). No "OK" or "Submit".
8. **Browser surfaces are themed:** selection colour, caret, accent colour, scrollbar and focus ring (3px, offset 2px).

## Skills used

The redesign followed these skills, installed in `app/.agents/skills` and `app/.claude/skills`:

- **ui-ux-pro-max:** the palette direction (teal and aqua), "Flat + Accessible" style, the Lexend and Source Sans 3 pairing, and its accessibility and touch checklist.
- **design-system** and **brand:** the three token layers and this document's structure.
- **impeccable:** the craft floor (contrast, one elevation, no eyebrow labels, themed browser surfaces). Its detector reports no findings on `src/`.
- **design-taste-frontend (taste-skill):** app-screen rules (colour on data not chrome, no icons in tinted squares, a neutral active nav pill, honest empty states).
- **emil-design-eng** and **mobile-native:** press feedback, easing and the mobile platform fixes above.

## Checking a change

- `npm run lint`, `npx vitest run`, `npm run build` in `app/`.
- Screenshots at 390px and 1280px, light and dark (the Playwright plugin, or `npx playwright screenshot --channel msedge`).
- `./.agents/skills/impeccable/scripts/impeccable detect --json src/` should print `[]`.
- Then a real low-cost Android phone, outdoors, as ROADMAP ground rule 3 asks.
