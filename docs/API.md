# Bulig API contract

Every request the app makes, or will make once the backend exists, with its exact payload and response. Build the Laravel API (Phase 4) to match this file, and the frontend switches over without page changes.

Last updated: 2026-11-10 · Owner: John · Matches the frontend on `main` (v0.3.0).

**Why this file exists.** Until Phase 4 the app has no server: data comes from JSON files, and accounts, saved places and profiles live on the phone (`localStorage`). Each section below says **where that lives in the frontend today** and **what the API replaces it with**, so nothing is guessed when the backend is built.

**How it relates to the other docs.** The record shapes are the data contract in [ARCHITECTURE.md, Spine 1](ARCHITECTURE.md#1-data-contract) and `app/src/types.ts`; this file never redefines them, it shows them on the wire. Who may do what is in [WORKFLOW.md](WORKFLOW.md#roles). Screens are in [UI-UX.md](UI-UX.md). When Phase 4 starts, generate `contracts/openapi.yaml` from this file and run Pest contract tests against it.

---

## Contents

1. [Conventions](#1-conventions)
2. [All requests at a glance](#2-all-requests-at-a-glance)
3. [Public data](#3-public-data): areas, emergency contacts, services, labels
4. [Accounts](#4-accounts): register, login, logout, forgot and reset password, confirm a new email, continue with Google
5. [Me](#5-me): profile, photo, password, delete account, change email
6. [Saved places](#6-saved-places)
7. [Community updates](#7-community-updates-update-details) (Update details, photos, my submissions, app issues, settings, health, staff requests, becoming a Scout)
8. [Shared objects](#8-shared-objects)
9. [Services the app calls directly](#9-services-the-app-calls-directly-not-the-backend) (not the backend)
10. [What moves from the phone to the server](#10-what-moves-from-the-phone-to-the-server)
11. [Changing this contract](#11-changing-this-contract)

---

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `https://<api-host>/api/v1`. The app reads it from `VITE_API_URL`; `VITE_DATA_SOURCE=json\|api` picks JSON files or the API at build time (ARCHITECTURE.md, Spine 2). |
| Format | JSON in and out, UTF-8, `Content-Type: application/json`. The one exception is the photo upload (`multipart/form-data`). |
| Field names | `camelCase`, exactly as in `app/src/types.ts` (`verifiedAt`, `weeklyHours`). Laravel API Resources map from `snake_case` columns. |
| IDs | Records keep their slug IDs from the JSON files (`ph-cebu-cebu-city-sample-vulcanizing`). User IDs are opaque strings (`"usr_01J..."`), never auto-increment numbers in URLs. |
| Dates | `verifiedAt`, `addedAt`, `createdAt`: ISO 8601 date `"2026-10-21"`. Timestamps (`updatedAt` on envelopes, `savedAt`): ISO 8601 with `Z`. Opening hours are local `"HH:MM"`, `"24:00"` = midnight. |
| Countries | ISO 3166-1 alpha-2, upper case: `PH`. Every public read needs `?country=`. |
| Auth | **Laravel Sanctum personal access tokens.** Send `Authorization: Bearer <token>`. A token stops working 60 days after sign-in, however often it is used; the request then gets `401` and the app shows the login, like any other signed-out token. 🔒 in the tables = token required. Public data and Emergency never need one. |
| Roles | `user`, `contributor`, `moderator`, `admin`. Sign-ups (email or Google) are always `user`. A user can ask to become a `contributor` ([§7.9](#79-becoming-a-scout)); a moderator or admin decides, in the app or the admin panel; only an admin appoints moderators and admins. The app calls a `contributor` a **Scout** ("Bulig Scout", John 2026-11-10); the key stays `contributor`. |
| Errors | Laravel's shape. Validation: `422 {"message": "...", "errors": {"field": ["..."]}}`. Others: `{"message": "..."}` with `401` (no or bad token), `403` (role or scope; at login, `{"message": "...", "reason": "suspended"}` for a suspended account), `404`, `409`, `429` (rate limit, with `Retry-After`). The app shows its own friendly words; `message` is for logs. |
| Caching | Public reads: `Cache-Control: public, max-age=3600` and an `ETag`; the service worker uses NetworkFirst with a 3 s timeout, then its cache (offline still works). 🔒 responses: `Cache-Control: no-store`. |
| CORS | Only the app's origin (`https://app.bulig.workers.dev`, later the real domain). |
| Rate limits | Auth endpoints (including `/auth/google`) 10/min per IP and per email or username (login counts each value it is sent, lower-cased); submissions 10/day per user (admin-configurable); uploads 30/day per user; issues 5/day per user; email changes 5/hour per user; everything else 120/min per token or IP. |
| Versioning | `/api/v1`. A breaking change means `/api/v2` (see [§11](#11-changing-this-contract)). The data envelopes keep `"version": 1`. |

---

## 2. All requests at a glance

The production build (`app/.env.production`) calls the API; `npm run dev` and the tests use the bundled files and phone-only test logins. Postman collection and test steps: [docs/postman/](postman/README.md).

| # | Request | Method and path | Auth | Phase | Frontend today |
| --- | --- | --- | --- | --- | --- |
| 1 | Areas of a country | `GET /areas?country=PH` | — | 4 | `data/ApiSource.ts` (production build), `data/JsonSource.ts` fallback |
| 2 | Emergency contacts | `GET /emergency-contacts?country=PH[&area=]` | — | 4 | `data/ApiSource.ts`, `data/JsonSource.ts` fallback |
| 3 | Services (places) | `GET /services?country=PH[&area=][&category=]` | — | 4 | `data/ApiSource.ts`, `data/JsonSource.ts` fallback |
| 4 | Local category words | `GET /labels?country=PH` | — | 4 | `data/ApiSource.ts`, `data/JsonSource.ts` fallback |
| 5 | Create account | `POST /auth/register` | — | 4 | `register()` in `auth/apiStore.ts` (production build); `auth/localAccounts.ts` in dev and tests |
| 6 | Sign in | `POST /auth/login` | — | 4 | `signIn()` in `auth/apiStore.ts`; token in `bulig.token`, account copy in `bulig.account` |
| 7 | Sign out | `POST /auth/logout` | 🔒 | 4 | `signOut()` in `auth/apiStore.ts` (clears the phone first, works offline) |
| 8 | Forgot password | `POST /auth/forgot-password` | — | 4 | `forgotPassword()` in `auth/apiStore.ts` (`pages/ForgotPasswordPage.tsx`) |
| 9 | Reset password | `POST /auth/reset-password` | — | 4 | `pages/ResetPasswordPage.tsx` at `/reset-password?token=&email=` |
| 10 | Who am I | `GET /me` | 🔒 | 4 | `refresh()` in `auth/apiStore.ts` on every start; `401` signs the phone out |
| 11 | Edit profile | `PATCH /me` | 🔒 | 4 | `updateProfile()` in `auth/apiStore.ts`; phone sent as E.164 |
| 12 | Upload photo | `POST /me/photo` | 🔒 | 4 | `setPhoto()` in `auth/apiStore.ts`, on Edit profile's Save when the photo changed (a photo kept only on the phone before is sent on the next save) |
| 13 | Remove photo | `DELETE /me/photo` | 🔒 | 4 | `setPhoto(account, null)` in `auth/apiStore.ts` |
| 14 | Change password | `PUT /me/password` | 🔒 | 4 | `changePassword()` in `auth/apiStore.ts` |
| 15 | Delete account | `DELETE /me` | 🔒 | 4 | `deleteAccount()` in `auth/apiStore.ts` (sends `{confirm: "delete"}`) |
| 16 | List saved | `GET /me/saved` | 🔒 | 4 | `loadSaved()` in `auth/apiStore.ts` after sign-in and on start |
| 17 | Save a place or number | `PUT /me/saved/{recordId}` | 🔒 | 4 | `setSaved()` in `auth/apiStore.ts` (heart flips at once, flips back if the server says no) |
| 18 | Unsave | `DELETE /me/saved/{recordId}` | 🔒 | 4 | `setSaved()` in `auth/apiStore.ts` |
| 19 | Update details (includes "report wrong info") | `POST /submissions` | 🔒 | 4 | New places: `submitNewPlace()` in `contribute/store.ts` (`pages/AddPlacePage.tsx`, `/add`). Changes to a listed place and flags: not built yet (SCRUM-30) |
| 20 | Upload a photo for an update | `POST /uploads` | 🔒 | 4 | `uploadPhoto()` in `contribute/store.ts`, with `source` |
| 21 | My submissions and their status | `GET /me/submissions` | 🔒 | 4 | `mySubmissions()` in `contribute/store.ts` (`pages/UpdatesPage.tsx` and Home's bell, `contribute/useMyUpdates.ts`) |
| 22 | Report an app problem | `POST /issues` | 🔒 | 4 | Not built (Profile → Help today has no form) |
| 23 | My app problems and their status | `GET /me/issues` | 🔒 | 4 | Not built |
| 24 | Public settings (banner, submissions on/off) | `GET /settings` | — | 4 | Not built |
| 25 | Health check (UptimeRobot, not the app) | `GET /health` | — | 4 | Not called by the app |
| 26 | Change email (sends a confirmation link) | `POST /me/email` | 🔒 | 4 | `requestEmailChange()` in `auth/apiStore.ts` (`pages/AccountPages.tsx`, `/profile/email`) |
| 27 | Cancel an email change | `DELETE /me/email` | 🔒 | 4 | `cancelEmailChange()` in `auth/apiStore.ts` |
| 28 | Confirm the new email (the link) | `POST /auth/confirm-email` | — | 4 | `pages/ConfirmEmailPage.tsx` at `/confirm-email?token=` |
| 29 | Staff counts (dashboard, "12 to review") | `GET /staff/summary` | 🔒 staff | 4 | `summary()` in `staff/api.ts` |
| 30 | Review queue | `GET /staff/submissions` | 🔒 staff | 4 | `queue()` in `staff/api.ts` |
| 31 | One submission to review | `GET /staff/submissions/{id}` | 🔒 staff | 4 | `submission()` in `staff/api.ts` |
| 32 | Approve ticked fields | `POST /staff/submissions/{id}/approve` | 🔒 staff | 4 | `approve()` in `staff/api.ts` |
| 33 | Confirm a flag | `POST /staff/submissions/{id}/confirm` | 🔒 staff | 4 | `confirm()` in `staff/api.ts` |
| 34 | Reject one | `POST /staff/submissions/{id}/reject` | 🔒 staff | 4 | `reject()` in `staff/api.ts` |
| 35 | Reject many | `POST /staff/submissions/reject` | 🔒 staff | 4 | `rejectMany()` in `staff/api.ts` |
| 36 | Add a place directly | `POST /staff/services` | 🔒 staff | 4 | `addPlace()` in `staff/api.ts` |
| 37 | Mark a place checked | `POST /staff/services/{id}/verify` | 🔒 staff | 4 | `verifyPlace()` in `staff/api.ts` |
| 38 | Emergency numbers due for a check | `GET /staff/emergency-contacts?due=30` | 🔒 staff | 4 | `hotlines({ due: 30 })` in `staff/api.ts` |
| 39 | Mark an emergency number checked | `POST /staff/emergency-contacts/{id}/verify` | 🔒 staff | 4 | `verifyHotline()` in `staff/api.ts` |
| 40 | People (masked) | `GET /staff/users?q=&role=&page=` | 🔒 staff | 4 | `users()` in `staff/api.ts` (`pages/staff/ManagePage.tsx`) |
| 41 | One person | `GET /staff/users/{id}` | 🔒 staff | 4 | `user()` in `staff/api.ts` (`pages/staff/UserPage.tsx`) |
| 42 | Switch user ↔ contributor | `PATCH /staff/users/{id}/role` | 🔒 staff | 4 | `setRole()` in `staff/api.ts` |
| 43 | Take down a profile photo | `DELETE /staff/users/{id}/photo` | 🔒 staff | 4 | `removePhoto()` in `staff/api.ts` |
| 44 | Areas with counts | `GET /staff/areas` | 🔒 staff | 4 | `areas()` in `staff/api.ts` |
| 45 | Add / edit an area | `POST /staff/areas`, `PATCH /staff/areas/{id}` | 🔒 staff | 4 | `saveArea()` in `staff/api.ts` (`pages/staff/AreaPage.tsx`) |
| 46 | All local hotlines | `GET /staff/emergency-contacts[?area=][&level=][&due=]` | 🔒 staff | 4 | `hotlines()` in `staff/api.ts` (row 38 is the same request with `due`) |
| 47 | Add / edit a hotline | `POST /staff/emergency-contacts`, `PATCH /staff/emergency-contacts/{id}` | 🔒 staff | 4 | `saveHotline()` in `staff/api.ts` (`pages/staff/HotlinePage.tsx`) |
| 48 | My Scout request | `GET /me/contributor-request` | 🔒 | 4 | `myRequest()` in `contribute/scout.ts` (`pages/ScoutPage.tsx`, `/profile/scout`) |
| 49 | Ask to become a Scout | `POST /me/contributor-request` | 🔒 | 4 | `apply()` in `contribute/scout.ts` |
| 50 | Take back a waiting request | `DELETE /me/contributor-request` | 🔒 | 4 | `withdraw()` in `contribute/scout.ts` |
| 51 | Decline a Scout request | `POST /staff/users/{id}/contributor-request/decline` | 🔒 staff | 4 | `declineScout()` in `staff/api.ts` (`pages/staff/UserPage.tsx`). Saying yes is row 42 |
| 52 | Continue with Google (sign in, link or sign up) | `POST /auth/google` | — | 4 | `signInWithGoogle()` in `auth/apiStore.ts` (`components/GoogleSignIn.tsx` on `/login` and `/signup`); button only when `VITE_GOOGLE_CLIENT_ID` is set |

Admin and moderator screens in Filament (`/panel`, Phase 4) are server-side and not part of this contract: places, photos, users and moderators, areas, emergency contacts, app issues, settings, activity log and the Pulse dashboard. The two jobs a moderator does on the road, the review queue and marking records checked, are also in the app, through the staff requests in [§7.8](#78-staff-requests-moderators-and-admins) (John, 2026-11-05). See [ARCHITECTURE.md, Phase 4](ARCHITECTURE.md#phase-4-backend-and-admin-v04).

---

## 3. Public data

These four replace the JSON files one to one: **same envelope, same fields, same IDs**. If the API needs a different shape, that's a design bug in the API (ARCHITECTURE.md, Phase 4).

**Status (2026-11-02):** built in `bulig-backend` (`PublicDataController`, `bulig:import`) and read by the app's `ApiSource` when built with `VITE_DATA_SOURCE=api`. Until the admin panel exists, the server's rows are a copy of the app's JSON files, re-synced on every server start; the `updatedAt` of each envelope is the file's own. Optional fields are left out when empty, never `null` (except `parent` and `area`, as in the files). Items are sorted by `id`, with the national line first in emergency contacts. The app waits at most 4 s for an answer, then uses the JSON files bundled with it.

### 3.1 `GET /areas?country=PH`

Every listed area of a country. The app picks the nearest one from GPS (`nearestArea()` in `rules/nearby.ts`).

**Query:** `country` (required, `PH`).

**200**

```json
{
  "version": 1,
  "updatedAt": "2026-10-29T00:00:00Z",
  "items": [
    {
      "id": "ph-cebu-cebu-city",
      "country": "PH",
      "name": "Cebu City",
      "region": "Cebu",
      "level": "city",
      "parent": null,
      "lat": 10.3157,
      "lng": 123.8854,
      "languages": ["en", "fil"]
    }
  ]
}
```

**Errors:** `422` missing or unknown `country` (a country is known once it has areas; codes are upper case).

### 3.2 `GET /emergency-contacts?country=PH[&area=<areaId>]`

The national line(s) and checked local numbers. **Never requires a login, in any phase.**

**Query:** `country` (required); `area` (optional: that area, the areas it sits inside, and every `area: null` national line).

**Server rules:** only contacts verified in the last 180 days (the phone applies the same rule again in `visibleContacts()`, because cached data ages offline). The national number is always returned.

**200**

```json
{
  "version": 1,
  "updatedAt": "2026-10-29T00:00:00Z",
  "items": [
    {
      "id": "ph-national-911",
      "country": "PH",
      "area": null,
      "name": "National Emergency Hotline",
      "kind": "national",
      "phones": ["911"],
      "verifiedAt": "2026-10-29",
      "source": "Emergency 911 national hotline (Executive Order No. 56, 2016)"
    },
    {
      "id": "ph-cebu-cebu-city-police",
      "country": "PH",
      "area": "ph-cebu-cebu-city",
      "name": "Cebu City Police Station",
      "kind": "police",
      "phones": ["+63 32 000 0061"],
      "verifiedAt": "2026-10-21",
      "source": "Called the station desk, 2026-10-21"
    }
  ]
}
```

`kind`: `national | police | fire | medical | rescue | coast_guard | disaster`. `sample: true` only in test data; the production API never returns sample records.

### 3.3 `GET /services?country=PH[&area=<areaId>][&category=<category>]`

Road services and local businesses. The app ranks them on the phone (distance, chips, open now); see ARCHITECTURE.md Phase 7 for moving ranking to the server later (`&near=lat,lng`).

**Query:** `country` (required); `area`, `category` (optional). `category`: `tire_repair | mechanic | fuel | hospital | food | lodging | store | other`.

**200**

```json
{
  "version": 1,
  "updatedAt": "2026-10-30T12:00:00Z",
  "items": [
    {
      "id": "ph-cebu-cebu-city-sample-vulcanizing",
      "country": "PH",
      "area": "ph-cebu-cebu-city",
      "category": "tire_repair",
      "name": "Sample Uptown Vulcanizing",
      "phone": "+63 900 000 0251",
      "landmark": "Under the flyover",
      "lat": 10.3157,
      "lng": 123.8854,
      "hours": "6am to 10pm",
      "weeklyHours": {
        "mon": [["06:00", "22:00"]],
        "tue": [["06:00", "22:00"]],
        "wed": [["06:00", "22:00"]],
        "thu": [["06:00", "22:00"]],
        "fri": [["06:00", "22:00"]],
        "sat": [["06:00", "22:00"]],
        "sun": [["06:00", "22:00"]]
      },
      "features": { "air_pump": true, "tube_type": true, "motorcycle": true, "comes_to_you": true },
      "verifiedAt": "2026-10-21",
      "source": "Field visit, 2026-10-21"
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id`, `country`, `area`, `category`, `name`, `landmark`, `verifiedAt`, `source` | yes | |
| `phone` | no | E.164 preferred (`+63...`) so `tel:` links work from anywhere. |
| `lat`, `lng` | both or neither | Needed for distance, the map pin and routes. |
| `hours` | no | Free text, shown only where `weeklyHours` is missing. |
| `weeklyHours` | no | Per day (`sun`…`sat`), list of `["HH:MM","HH:MM"]`. A close at or before the open runs past midnight. A missing day is closed. |
| `open24h` | no | `true` overrides `weeklyHours`. |
| `features` | no | `tubeless, tube_type, air_pump, comes_to_you, motorcycle, car_truck, bottled_fuel, emergency_room` → `true` confirmed, `false` confirmed not offered, missing = not confirmed. |
| `subtype` | no | The owner's word, shown instead of the category ("Halo-halo"). |
| `addedAt` | no | Date first listed; the app shows **NEW** for 60 days. |
| `prices` | no | Phase 4. Newest approved price per item: `[{ "item": "ron91", "amount": 82.0, "currency": "PHP", "unit": "L", "seenAt": "2026-10-30" }]`. `item` keys, their words and `unit` come from `labels.json` `priceItems`, and `currency` from its `currency`. The app shows "seen <date> by a Bulig user", greys it after 7 days and hides it after 30. Never "current price". |
| `photos` | no | Phase 4. Public photo URLs on Cloudinary (WebP, max 1280 px), first is the cover: `["https://res.cloudinary.com/…/bulig/places/….webp"]`. Added by staff in the panel, or from an approved update's photos. Left out when there are none. |
| `sample` | no | Test data only. |

### 3.4 `GET /labels?country=PH`

The country's own words for categories (`"Vulcanizing"`), per language, and the things a price can be given for. Not an envelope.

**200**

```json
{
  "version": 1,
  "categories": {
    "tire_repair": { "en": "Vulcanizing" },
    "fuel": { "en": "Gas station" },
    "food": { "en": "Resto and carinderia" },
    "lodging": { "en": "Hotel and inn" },
    "other": { "en": "Others" }
  },
  "currency": "PHP",
  "priceItems": {
    "ron91": { "category": "fuel", "unit": "L", "names": { "en": "Unleaded 91" } },
    "ron95": { "category": "fuel", "unit": "L", "names": { "en": "Premium 95" } },
    "ron97": { "category": "fuel", "unit": "L", "names": { "en": "Super Premium 97" } },
    "diesel": { "category": "fuel", "unit": "L", "names": { "en": "Diesel" } },
    "kerosene": { "category": "fuel", "unit": "L", "names": { "en": "Kerosene" } }
  }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `currency` | with `priceItems` | ISO 4217 code for every price in this country. |
| `priceItems` | no | Key = the `item` in a price (never changes once used). `category`: the only kind of place that can have this price. `unit`: what the amount is for (`L` litre, `each`, …). `names`: words per language, like `categories`. Adding an item is a data change, not a code change. |

---

## 4. Accounts

Everything except Emergency needs an account; there is no guest mode (removed 2026-11-04). Sign-up is the onboarding's last step (`pages/SignupPage.tsx`).

### 4.1 `POST /auth/register`

**Request**

```json
{
  "name": "Ana Reyes",
  "username": "ana_reyes",
  "email": "ana@example.com",
  "password": "long enough",
  "acceptedTerms": true,
  "device": "Bulig PWA on Android"
}
```

| Field | Rules (same as the form) |
| --- | --- |
| `name` | required, 1–80 characters after trimming |
| `username` | required, see [Usernames](#usernames) |
| `email` | required, valid email, stored lower-cased and trimmed, unique |
| `password` | required, at least 8 characters, max 128 |
| `acceptedTerms` | required, must be `true` (the Terms of Use / Privacy Policy box) |
| `device` | optional, names the token (shown in a future "signed-in devices" list) |

**201**

```json
{
  "token": "1|q7Z…",
  "user": { "id": "usr_01JBX…", "username": "ana_reyes", "email": "ana@example.com", "name": "Ana Reyes", "role": "user", "areas": [], "createdAt": "2026-10-30", "phone": null, "homeArea": null, "photoUrl": null }
}
```

**Errors:** `422` with `errors.email: ["taken"]` when the email has an account (the app shows "That email already has an account. Sign in instead."), `errors.username: ["taken"]` ("That username is taken. Try another.") or `errors.username: ["reserved"]` ("That username isn't allowed. Try another."), or the field rules above.

#### Usernames

Added 2026-11-07 (John) so people can sign in with a short name instead of their email.

- 3–20 characters: lower-case letters `a–z`, digits and `.` or `_`, starting with a letter. Regex `^[a-z][a-z0-9._]{2,19}$`.
- Case-insensitive: the server trims and lower-cases it before checking and storing, so `Ana_Reyes` and `ana_reyes` are one name. The column has a unique index, and a deleted account's name stays taken while the account is kept (30 days, §5.6).
- Never contains `@`, so a sign-in value with `@` is always an email and one without is always a username.
- Reserved, `422 ["reserved"]`: `admin`, `administrator`, `bulig`, `moderator`, `mod`, `staff`, `support`, `help`, `root`, `system`, `emergency`, `police`, `api`, `me`, `null`, `undefined`.
- Set at email sign-up. Accounts made before 2026-11-07, and accounts made with Google (§4.7), have `username: null` and keep signing in with their email; they can add one in Edit profile (§5.2). It can be changed there, and the old name is free at once.
- Never shown to other people yet. Password reset stays email-only.

### 4.2 `POST /auth/login`

**Request**

```json
{ "login": "ana_reyes", "password": "long enough", "device": "Bulig PWA on Android" }
```

`login` is the email **or** the username, required, at most 191 characters, trimmed and lower-cased by the server. With `@` the server looks up the email, without it the username ([Usernames](#usernames)). Older app builds send `email` instead of `login`; the server treats it the same way until every phone has updated.

**200:** same body as register (`token`, `user`).

**Errors:** `422 {"message": "These credentials do not match our records.", "errors": {"login": ["…"]}}` for an unknown email or username *or* a wrong password (never say which, and the same answer time either way). `429` after too many tries. The app shows "That username or email and password don't match."

`403 {"message": "This account is suspended.", "reason": "suspended"}` when an admin has suspended the account. It comes only after a **correct** password, so it never tells a stranger that an email has an account. The app shows "Your account is suspended. If you think this is a mistake, contact us." and doesn't offer a password reset. Suspending also revokes every token at once, so a suspended person's other requests get `401` and the app goes back to the login screen. Forgot-password still answers `202` as for anyone.

### 4.3 `POST /auth/logout` 🔒

No body. Revokes the current token. **204.** The app also clears its copy (`bulig.session` today).

### 4.4 `POST /auth/forgot-password`

**Request:** `{ "email": "ana@example.com" }`

**202** always, with `{ "message": "If that email has an account, a reset link is on its way." }`, whether or not the account exists, so the endpoint can't be used to find accounts. The email links to `https://<app>/reset-password?token=<token>&email=<email>` (valid 60 minutes).

### 4.5 `POST /auth/reset-password`

**Request**

```json
{ "email": "ana@example.com", "token": "<from the email link>", "password": "a new long one" }
```

**204** on success (all the user's tokens are revoked; they sign in again). **Errors:** `422` invalid or expired token, or a short password.

### 4.6 `POST /auth/confirm-email`

The link from [§5.7](#57-post-meemail-)'s email. No token needed: the link may open in another browser or on a laptop.

**Request:** `{ "token": "<from the email link>" }`

**200** `{ "email": "juan@example.com" }`. The account's email is now the new one (and counts as verified), the pending change is cleared, and any password reset link sent to the old address stops working. Signed-in phones stay signed in; their next `GET /me` shows the new email. From now on the person signs in with the new email.

**Errors:** `422 errors.token: ["invalid"]` for an unknown, used, cancelled or expired link (the app shows "That link has expired or was already used. Ask for a new one from Profile."), `422 errors.token: ["taken"]` if another account took that email in the meantime.

### 4.7 `POST /auth/google`

Added 2026-11-10 (John: "login using Google… so it's easier, and they set up their profile later"). One endpoint signs in, links, or signs up. The app uses **Google Identity Services** (the "Sign in with Google" button, popup mode): Google hands the page an **ID token** (a JWT), the app posts it here, and the server answers with a Sanctum token exactly like [§4.2](#42-post-authlogin). No redirect page, no client secret anywhere, no Google API calls after sign-in. Free.

**Request**

```json
{ "idToken": "eyJhbGciOiJSUzI1NiIs…", "acceptedTerms": true, "device": "Bulig PWA" }
```

| Field | Rules |
| --- | --- |
| `idToken` | required. The server **must** verify it itself, never trust the app: signature against Google's keys (`https://www.googleapis.com/oauth2/v3/certs`, cached per its `Cache-Control`), `iss` is `accounts.google.com` or `https://accounts.google.com`, `aud` equals the server's `GOOGLE_CLIENT_ID`, `exp` in the future, and `email_verified` is `true`. Any failure: `422`. Use a JWT library (`firebase/php-jwt` with `CachedKeySet`, or `google/apiclient`'s `verifyIdToken`), not the `tokeninfo` endpoint (Google says it's for debugging). |
| `acceptedTerms` | required, `true`. The app shows "By continuing with Google you agree to the Terms of Use and Privacy Policy" under the button; store the time like a sign-up. |
| `device` | optional, names the token, as in §4.1. |

**What the server does, in this order**

1. **A Google account already linked** (`users.google_sub` = the token's `sub`): sign in. The email may differ now (they changed it in Bulig or at Google); `sub` is the identity, never the email.
2. **Same email, not linked yet** (an account made with a password): **link it** (store `google_sub`, set `email_verified_at` if empty) and sign in. **Then, if that account's email had never been verified, clear its password and revoke its other tokens.** Bulig doesn't verify email at sign-up, so a stranger could have registered someone's Gmail first with a password they know ("pre-account hijacking"); without this step they would keep a way in after the real owner links Google. The person can set a new password from Profile ([§5.5](#55-put-mepassword-)) or Forgot password.
3. **New email:** create a `user` with `name` = the token's `name` (or the part of the email before `@`, 80 characters at most), `email` lower-cased, **no password** (`hasPassword: false`), `google_sub`, `email_verified_at` now, terms accepted now. The token's `picture` is **not** copied (the photo stays the person's choice, and stays on Cloudinary). Return `"created": true`.

A **suspended** account answers `403 {"reason": "suspended"}` in every case, as §4.2. Old saved hearts on the phone are sent after sign-in as with §4.2.

**200** (signed in or linked) or **201** (created):

```json
{ "token": "1|q7Z…", "user": { …User (§8.1)…, "hasPassword": false, "google": true }, "created": true }
```

**Errors:** `422 {"message": "…"}` for any token that doesn't check out (the app shows "Google couldn't confirm your sign-in. Try again."), `403` suspended, `429` rate limit. A server that doesn't have this yet answers `404`; the app then says Google sign-in isn't available and points to email.

**Setup (John, once, free):** Google Cloud Console → a project "Bulig" → Google Auth Platform → Branding (app name, support email, the Privacy Policy and Terms links, logo), Audience **External**, then **Clients → Create client → Web application** with **Authorized JavaScript origins** `https://app.bulig.workers.dev` and `http://localhost:5173` (no redirect URIs needed for the popup). Scopes: only `openid`, `email`, `profile` (non-sensitive, so no Google verification review). Put the client ID in Cloudflare as `VITE_GOOGLE_CLIENT_ID` (it's public by design) and on Render as `GOOGLE_CLIENT_ID`. Nothing else is secret: there is no client secret in this flow.

**Known limits.** Google refuses to sign in inside app web views (Facebook, Messenger, Instagram, TikTok), with "403 disallowed_useragent". Bulig links get shared on Facebook, so the app detects those browsers and shows "Open Bulig in Chrome" with Copy the link, instead of a button that fails. The Google button is Google's own 40 px pill (their branding rules), so it sits in a 48 px row.

**Facebook login: not now.** Meta's Login needs a live app with a Privacy Policy URL, a data-deletion callback, and Business Verification for anything beyond the basics, and it only works in a real browser too. Revisit when Bulig has a registered business and real users ask for it.

---

## 5. Me

### 5.1 `GET /me` 🔒

**200:** the [User](#81-user) object. The app calls it on start when it has a token; `401` means the token is gone, so the app clears it and shows the login.

### 5.2 `PATCH /me` 🔒

Edit profile (`/profile/edit`). Send only what changed.

**Request**

```json
{ "name": "Juan Dela Cruz", "username": "juan.dc", "phone": "+639171234567", "homeArea": "Surok, Guiuan, Eastern Samar" }
```

| Field | Rules |
| --- | --- |
| `name` | 1–80 characters |
| `username` | [Usernames](#usernames) rules. Can't be cleared once set (`null` is `422`). `422 errors.username: ["taken"]` or `["reserved"]` as at sign-up; sending your own name is fine. |
| `phone` | `null`, or a PH mobile number. The form accepts `0917 123 4567` or `+63 917 123 4567`; send it normalised to E.164 (`+639171234567`). |
| `homeArea` | `null`, or free text up to 120 characters: the barangay and town the person calls home, listed in Bulig or not (2026-11-04; it was an area ID, and older accounts were converted to "Name, Region"). Never a house address. |

`email` and `role` can't be changed here (`422` if sent); email changes go through [§5.7](#57-post-meemail-). **200:** the updated User.

### 5.3 `POST /me/photo` 🔒

`multipart/form-data` with one file field, `photo`. The app already centre-crops to a **256 × 256 WebP** (JPEG on old Safari) of about 15–30 KB (`auth/photo.ts`); the server re-encodes anyway and strips metadata.

**Limits:** `image/webp`, `image/jpeg` or `image/png`, at most 2 MB.

**200:** `{ "photoUrl": "https://res.cloudinary.com/…/bulig/avatars/….webp" }`. A new photo replaces the old one, which is deleted. **Errors:** `422` wrong type or too big, `429` (30 photos a day, shared with `POST /uploads`), `503` photo storage isn't set up on the server.

### 5.4 `DELETE /me/photo` 🔒

**204.** The app falls back to Ropi's head.

### 5.5 `PUT /me/password` 🔒

**Request:** `{ "currentPassword": "long enough", "newPassword": "a new long one" }`

An account with `hasPassword: false` (made with Google) **sets** its first password with `{ "newPassword": "…" }` only; `currentPassword` is ignored for it. Profile calls this row "Set a password". After it, `hasPassword` is `true` and the person can sign in with Google or their email and password.

**204.** Other tokens are revoked; this one stays signed in. **Errors:** `422 errors.currentPassword: ["incorrect"]` ("That isn't your current password."), or a new password under 8 characters.

### 5.6 `DELETE /me` 🔒

**Request:** `{ "confirm": "delete" }` (the word the person typed on Profile).

**204.** Deletes the account, its saved list, photo and tokens (soft delete for 30 days for abuse handling, then purged; say so in the Privacy Policy). Admins and moderators get `403` until an admin removes their role.

### 5.7 `POST /me/email` 🔒

Change email (`/profile/email`). Nothing changes until the person opens the link sent to the **new** address, so a typo can't lock them out: they keep signing in with the old email until then.

**Request:** `{ "newEmail": "juan@example.com", "currentPassword": "long enough" }`

| Field | Rules |
| --- | --- |
| `newEmail` | required, valid email, at most 191 characters, stored lower-cased and trimmed. Not the current email (`same`), not another account's (`taken`). |
| `currentPassword` | required, must match (`incorrect`), so a phone left signed in can't be used to take the account. |

**202** `{ "pendingEmail": "juan@example.com" }`. Two emails go out:

- To the **new** address: a link to `https://<app>/confirm-email?token=<token>`, valid 60 minutes ([§4.6](#46-post-authconfirm-email)).
- To the **old** address: a notice that someone asked to move the account to `ju***@example.com`, with no link, saying "If this wasn't you, change your password now."

Asking again replaces the earlier link. The token is 64 random characters; the server keeps only its SHA-256 hash.

**Errors:** `422 errors.newEmail: ["same"]` ("That's already your email."), `422 errors.newEmail: ["taken"]` ("That email already has an account."), `422 errors.currentPassword: ["incorrect"]` ("That isn't your current password."), `429` after 5 requests in an hour (the app shows "Too many tries. Wait an hour and try again.").

An account with no password (`hasPassword: false`) gets `422 errors.currentPassword: ["incorrect"]`; the app never sends it, and asks the person to set a password first. A linked Google account keeps working after the change: it signs in by `sub`, not by email.

### 5.8 `DELETE /me/email` 🔒

Cancels a pending change, so its link stops working. **204**, also when nothing was pending.

---

## 6. Saved places

The heart on cards, Nearby results, Place details and the Map. A saved record is a **service or an emergency contact**, by ID.

### 6.1 `GET /me/saved` 🔒

**200**

```json
{
  "items": [
    { "recordId": "ph-cebu-cebu-city-sample-mechanic", "recordType": "service", "savedAt": "2026-10-30T08:12:00Z" },
    { "recordId": "ph-cebu-cebu-city-police", "recordType": "emergency_contact", "savedAt": "2026-10-30T08:13:00Z" }
  ]
}
```

The app joins these IDs to the records it already has (it shows nothing for a record that no longer exists).

### 6.2 `PUT /me/saved/{recordId}` 🔒

Idempotent: saving twice is fine. No body. **204.** **Errors:** `404` unknown record ID.

### 6.3 `DELETE /me/saved/{recordId}` 🔒

**204**, also when it wasn't saved.

**First sign-in after Phase 4:** the app sends its local list once (`PUT` per ID from `bulig.saved.<email>`), then clears it, so nobody loses their hearts.

---

## 7. Community updates (Update details)

Phase 4 (SCRUM-30). One endpoint, two levels (John, 2026-11-03):

- **Users flag.** Any signed-in user can report that something is wrong ("number not working", "closed for good", "wrong location", "duplicate", "other"), with a note and photos. No `changes`.
- **Contributors request changes.** A user a moderator or admin has made a `contributor` can also send **Update details**: new prices, hours, services offered, phone, location, a new place, or a removal (`closed_for_good`, `duplicate`).

Nothing submitted is public until a moderator (or an admin) approves it, field by field (ARCHITECTURE.md, Spine 3). Emergency contacts can be flagged but never edited through submissions; moderators and admins edit them in the panel.

### 7.1 `POST /uploads` 🔒

Upload one photo before sending the update, so a weak signal only retries the photo, not the whole form. `multipart/form-data`, one field `photo`. Optional second field `source`: `camera` (taken in the app just now) or `gallery` (picked from the phone's photos); the reviewer sees it, so they know which photos to trust less. Missing = `gallery`. The app shrinks it first to WebP (JPEG on old Safari), max 1280 px on the long side, about 300 KB. The server rejects anything over 2 MB, re-encodes it, strips location and camera data, and stores it privately.

**201:** `{ "id": "upl_01JC…", "expiresAt": "2026-11-29T00:00:00Z" }`. An upload not attached to a submission within 24 hours is deleted. **Errors:** `413` too large, `415` not an image (checked from the bytes, not the name), `422` no `photo` field, `429` (30 photos a day, shared with `POST /me/photo`), `503` photo storage isn't set up. Each `photoIds` entry in `POST /submissions` must be the sender's own upload, unused and under 24 hours old (else `422` on `photoIds.N`: send that photo again).

### 7.2 `POST /submissions` 🔒

**Request** (only the fields that changed go in `changes`)

```json
{
  "recordType": "service",
  "recordId": "ph-eastern-samar-guiuan-sample-fuel",
  "reason": "changed",
  "changes": {
    "prices": [
      { "item": "ron91", "amount": 82.0 },
      { "item": "diesel", "amount": 71.5 }
    ],
    "features": { "air_pump": true }
  },
  "seenAt": "2026-10-30",
  "photoIds": ["upl_01JC…"],
  "note": "Price board this morning. They have an air pump now.",
  "position": { "lat": 11.035, "lng": 125.722 }
}
```

| Field | Rules |
| --- | --- |
| `recordType` | `service` or `emergency_contact` (emergency contacts: `reason` only, no `changes`) |
| `recordId` | an existing ID; omit for `reason: "new_place"` |
| `reason` | `changed`, `number_not_working`, `closed_for_good`, `wrong_location`, `duplicate`, `new_place`, `other`. `changed` and `new_place` need role `contributor` or above (`403` for a `user`) |
| `changes` | required for `changed` and `new_place`. Allowed keys: `name`, `phone`, `landmark`, `lat`, `lng`, `weeklyHours`, `open24h`, `features`, `subtype`, `prices`, and for `new_place` also `category` and `area`. Same rules as the Service fields in [§3.3](#33-get-servicescountryphareaareaidcategorycategory). `prices` is 1 to 10 of `{item, amount}`, each `item` once; `amount` is 0.01 to 100000; `item` must be a key of `labels.json` `priceItems` for that country whose `category` is the place's category (or `changes.category` for a new place). |
| `seenAt` | the date the person saw it, today or up to 7 days ago; defaults to today |
| `photoIds` | 0 to 3 IDs from `POST /uploads`. **At least 1 is required** when `changes.prices` is present or `reason` is `new_place`. |
| `note` | optional, up to 500 characters |
| `position` | optional, only if the person agrees; rounded to 3 decimals (~110 m) by the app |

**201:** `{ "id": "sub_01JBY…", "status": "pending" }`. **Errors:** `403` (a `user` sent `changed` or `new_place`), `422` (field rules, or a missing photo with prices), `423` submissions are switched off in settings, `429` (daily limit).

### 7.3 `GET /me/submissions` 🔒

The signed-in user's submissions, newest first, 20 per page (`?page=`).

**200:** `{ "items": [{ "id": "sub_01JBY…", "recordId": "…", "recordName": "Guiuan Sample Fuel", "reason": "changed", "status": "approved", "approvedFields": ["prices"], "reviewNote": null, "createdAt": "2026-10-30T01:12:00Z", "reviewedAt": "2026-10-30T05:40:00Z" }], "nextPage": null }`. `status`: `pending`, `approved` (all fields), `partly_approved`, `rejected` (with `reviewNote`, the reason the reviewer picked), `confirmed` (a flag the reviewer agreed with; `approvedFields` is empty).

### 7.4 `POST /issues` 🔒

A problem with the app itself, not with a place. From Profile → Help → "Something's not working".

**Request:** `{ "kind": "bug", "message": "Map stays blank after I allow location.", "page": "/map", "appVersion": "0.4.0", "device": "Android 13, Chrome 131" }`. `kind`: `bug`, `wrong_translation`, `slow`, `other`. `message` 10 to 1000 characters. The app fills `page`, `appVersion` and `device`; the person can see them before sending.

**201:** `{ "id": "iss_01JC…", "status": "open" }`. **Errors:** `422`, `429` (5 a day).

### 7.5 `GET /me/issues` 🔒

**200:** `{ "items": [{ "id": "iss_01JC…", "kind": "bug", "message": "…", "status": "in_progress", "createdAt": "…", "updatedAt": "…" }] }`. `status`: `open`, `in_progress`, `fixed`, `wont_fix`.

### 7.6 `GET /settings`

Public settings an admin sets in the panel. `Cache-Control: public, max-age=300`.

**200:** `{ "announcement": null, "submissionsOpen": true, "priceStaleDays": 7, "priceHideDays": 30, "statusPageUrl": "https://stats.uptimerobot.com/…" }`. The app shows `announcement` as a dismissible banner on Home, **never on Emergency**.

### 7.7 `GET /health`

For a manual check. UptimeRobot watches `/up`, so monitoring never wakes Neon (John, 2026-11-05). **200** `{ "ok": true }` when the database answers; **503** `{ "ok": false, "failing": ["db"] }` otherwise. No auth and no details beyond that. `Cache-Control: no-store`, but on Neon the server reuses its database check for 30 minutes so 5-minute pings don't keep the database awake.

Not part of the app's contract: `POST /internal/schedule` (alpha and beta on Render, which has no cron). A GitHub Actions schedule calls it hourly with a secret header; it runs `schedule:run`. It answers `404` without the secret.


### 7.8 Staff requests (moderators and admins)

Added 2026-11-05 (John). The app's moderator screens use these; the panel keeps doing everything else. All under `/staff`, all 🔒 with a Bearer token, all `Cache-Control: no-store`.

**Who may call them.** Role `moderator` or `admin`; anyone else gets `403`. A suspended account has no tokens left, so it gets `401` (§4.2). **Area scope isn't active yet** (John, 2026-11-06): the server can't store a moderator's areas, `areas` is always `[]`, and every moderator covers the whole country. The area rules in this section start when area assignment ships. The server reuses the same policies and `Submission::approve()`, `confirm()` and `reject()` as the panel, so both give the same answer.

**Rules that hold everywhere** (same as the panel):

- Nobody reviews their own submission, or one already reviewed. Both are `422` with the messages below.
- Moderators never delete places or emergency contacts, here or in the panel. Admins can, in the panel only. Instead a moderator uses **Mark closed** or **Mark duplicate** on a place in the panel: it leaves `GET /services`, its row and history stay, and an admin can reopen or delete it. A place can have up to 6 public photos.
- A change reaches phones on the next public read, which may be cached for up to 1 hour.

**`422` messages** (the app shows these words as they are):

| `message` | When |
| --- | --- |
| `Someone already reviewed this.` | The submission isn't `pending` any more |
| `Tick at least one field, or reject it.` | `approve` with an empty `fields` list |
| `A new place needs its name, category, area and landmark.` | `approve` of a `new_place` without all four ticked |
| `This place no longer exists. Reject it.` | The record was removed after it was sent |
| `You can't review your own update.` | The sender is the signed-in staff member |

#### `GET /staff/summary`

**200:** `{ "pendingSubmissions": 12, "places": 77, "hiddenEmergencyContacts": 3, "dueEmergencyContacts": 5, "users": 41 }`. `dueEmergencyContacts` = local numbers that hide within 30 days. Counts are inside the caller's areas.

#### `GET /staff/submissions?status=pending[&reason=][&page=]`

`status`: `pending` (default, **oldest first**), `approved`, `partly_approved`, `rejected`, `confirmed` (these newest first). `reason`: any reason from §7.2. 20 per page.

**200:**

```json
{
  "items": [
    {
      "id": "sub_01JBY…",
      "recordType": "service",
      "recordId": null,
      "recordName": "Aling Nena Vulcanizing",
      "reason": "new_place",
      "status": "pending",
      "area": "ph-eastern-samar-guiuan",
      "sender": { "id": "usr_01JBX…", "name": "Juan D." },
      "photoCount": 2,
      "createdAt": "2026-11-05T01:12:00Z",
      "canReview": true
    }
  ],
  "nextPage": 2
}
```

`recordName` is the proposed name for a `new_place`. `canReview` is `false` for the caller's own submissions and for any not `pending`; the app greys those out.

#### `GET /staff/submissions/{id}`

What the review screen needs: each field as current → proposed, and the sender's private photos.

**200:**

```json
{
  "id": "sub_01JBY…",
  "recordType": "service",
  "recordId": "ph-eastern-samar-guiuan-sample-fuel",
  "recordName": "Guiuan Sample Fuel",
  "reason": "changed",
  "status": "pending",
  "area": "ph-eastern-samar-guiuan",
  "sender": { "id": "usr_01JBX…", "name": "Juan D.", "role": "contributor" },
  "seenAt": "2026-11-04",
  "note": "Price board this morning.",
  "createdAt": "2026-11-05T01:12:00Z",
  "canReview": true,
  "fields": [
    { "key": "prices", "current": [{ "item": "diesel", "amount": 70.0 }], "proposed": [{ "item": "diesel", "amount": 71.5 }] },
    { "key": "location", "current": { "lat": 11.0351, "lng": 125.7222 }, "proposed": { "lat": 11.0353, "lng": 125.7219 } },
    { "key": "weeklyHours", "current": null, "proposed": { "mon": [["06:00", "20:00"]] } }
  ],
  "photos": [
    { "id": "upl_01JC…", "url": "https://…signed…", "expiresAt": "2026-11-05T02:12:00Z", "source": "camera" }
  ],
  "reviewNote": null
}
```

- `fields[].key` is a key from §7.2 `changes`, except that `lat` and `lng` arrive together as one `location` field. For a `new_place`, `current` is `null` on every field.
- Flags (`number_not_working`, `closed_for_good`, `wrong_location`, `duplicate`, `other`) have `"fields": []`; the app shows the record as it is now from the public data.
- `photos[].url` is a signed link that works for about an hour; the photos stay private.

#### `POST /staff/submissions/{id}/approve`

For `changed` and `new_place`. **Request:** `{ "fields": ["prices", "location"], "photos": ["upl_01JC…"] }`. `fields` = the ticked `fields[].key`s; `photos` = the sender photos to copy to the place (may be empty).

What the server does: applies only those fields (hours are stored as `weeklyHours` per day, never flattened to one text); `verifiedAt` becomes `seenAt` unless the record's date is newer; `source` becomes "Bulig user, checked by a moderator"; approved prices go into the dated price history; ticked photos are copied to the place. A photo copy that fails doesn't undo the approval.

**200:** `{ "status": "partly_approved", "approvedFields": ["prices", "location"], "recordId": "ph-eastern-samar-guiuan-sample-fuel", "photosCopied": 1, "photosFailed": 0 }`. A `new_place` returns its new `recordId`.

#### `POST /staff/submissions/{id}/confirm`

For the flags. Changes no data: the moderator then fixes the record in the panel (Mark closed, Mark duplicate or an edit). No body. **200:** `{ "status": "confirmed" }`.

#### `POST /staff/submissions/{id}/reject`

**Request:** `{ "reason": "<key>" }`, one of the six fixed reject reasons below. The sender sees its label as `reviewNote` in `GET /me/submissions`. **200:** `{ "status": "rejected" }`.

| `reason` key | Label the sender sees |
| --- | --- |
| `could_not_confirm` | Could not confirm it |
| `photo_mismatch` | The photo does not show it |
| `wrong_place` | Wrong place |
| `up_to_date` | Already up to date |
| `duplicate` | Duplicate |
| `not_road_help` | Not a place for road help |

#### `POST /staff/submissions/reject`

Bulk reject. **Request:** `{ "ids": ["sub_…", "sub_…"], "reason": "<key>" }`, 1 to 50 IDs. **200:** `{ "rejected": ["sub_…"], "skipped": [{ "id": "sub_…", "why": "already_reviewed" }] }`. `why`: `already_reviewed`, `own`, `out_of_area`, `not_found`. Skips never fail the whole request.

#### `POST /staff/services`

A moderator or admin adds a place directly. It is published at once, because a moderator can't approve their own submission. **Request:** the Service fields from §3.3 except `id` (the server makes the slug), plus `photoIds` (0 to 3 uploads from §7.1). Required: `name`, `category`, `area`, `landmark`; `lat` and `lng` together. The server sets `verifiedAt` to today, `source` to "Added by a moderator" and `addedAt` to today.

**201:** the Service as in §3.3. **Errors:** `422` field rules, `403` area outside the moderator's areas.

#### `POST /staff/services/{id}/verify` and `POST /staff/emergency-contacts/{id}/verify`

Mark checked today. **Request:** `{ "source": "called" }`, one of `called`, `visited`, `owner`. The server sets `verifiedAt` to today and `source` to "Called by a moderator", "Visited by a moderator" or "Confirmed by the owner", and the record history keeps both. A hidden local emergency number (180 days unchecked) shows again. **200:** the updated record.

#### `GET /staff/emergency-contacts?due=30`

Local emergency numbers already hidden or hiding within `due` days (0 to 90), oldest check first, inside the caller's areas. **200:** `{ "items": [ { …EmergencyContact (§3.2)…, "hidden": true, "hidesOn": "2026-11-20" } ] }`.

#### People, areas and hotlines (added 2026-11-06, John)

The app's **Manage** tab: Users, Areas and Hotlines. Same policies as the panel (`UserPolicy`, `AreaPolicy`, `EmergencyContactPolicy`), so both give the same answer. Every write goes into the activity log with who did it.

**No leakage.** These answers carry only what the screens show. Never: full email, mobile, home area, saved places, photo of a deleted account, tokens or another staff member's activity. The app keeps them in memory only (never `localStorage` or the offline cache) and forgets them on sign-out.

##### `GET /staff/users?q=&role=&page=`

`q`: 3 or more characters, matched against the name and the email (`422` if shorter). `role`: `user`, `contributor`, `moderator`, `admin`. `asked=1`: only people with a **pending** Scout request (§7.9), oldest request first. 20 per page, newest first.

**200:** `{ "items": [ { "id": "usr_01JBX…", "name": "Juan Dela Cruz", "role": "contributor", "email": "ju…@gmail.com", "createdAt": "2026-10-30", "sent": 7, "asked": false } ], "nextPage": 2 }`. `email` is masked: the first two characters and the domain. `sent` = submissions they sent. `asked` = a Scout request is pending.

##### `GET /staff/users/{id}`

**200:** the list item plus `"approved": 5, "photoUrl": "https://…" | null, "canChangeRole": true, "canRemovePhoto": true`. `canChangeRole` is `false` for the caller themselves and for any moderator or admin. Plus `"scoutRequest": { "area": "Surok, Guiuan", "travel": ["tricycle"], "why": "Tricycle driver…" | null, "createdAt": "2026-11-10T08:00:00Z" } | null`: the **pending** Scout request only.

##### `PATCH /staff/users/{id}/role`

**Request:** `{ "role": "user" | "contributor" }`. Moderators may only move people between these two; admins do the rest in the panel. Setting `contributor` on someone with a pending Scout request also marks that request `approved` (with `reviewedAt` and the reviewer), in the same transaction. **200:** the `GET /staff/users/{id}` body. **403:** self, staff, or a role a moderator can't give.

##### `POST /staff/users/{id}/contributor-request/decline`

Says no to a pending Scout request (§7.9). **Request:** `{ "note": "We have enough Scouts in your barangay for now." }` (`note` optional, up to 200 characters; the person sees it). Sets the request `declined`, `reviewedAt` now, `canApplyAgainAt` 30 days later. Logged with the reviewer. **200:** the `GET /staff/users/{id}` body (with `scoutRequest: null`). **404:** no pending request. **403:** same rules as `PATCH …/role`.

##### `DELETE /staff/users/{id}/photo`

For an offensive profile photo. **204.** The person sees Ropi's head again; nothing tells others why.

##### `GET /staff/areas`

Every area in the caller's scope (all of them for now), as in §3.1, plus `"places": 41, "hotlines": 4, "inUse": true`. Sorted by `level` (province, city, municipality, barangay), then name.

##### `POST /staff/areas` and `PATCH /staff/areas/{id}`

**Request:** `{ "name": "Salcedo", "level": "province" | "city" | "municipality" | "barangay", "parent": "ph-eastern-samar" | null, "region": "Eastern Samar", "lat": 11.15, "lng": 125.66 }` (`lat`/`lng` optional, together). The server makes the ID from the parent and name and never changes it on `PATCH`. **201/200:** the area as in `GET /staff/areas`. **422:** a name already used under the same parent (`That area is already listed.`), or a parent that would make a loop. Only an admin deletes, in the panel, and only an unused area.

##### `GET /staff/emergency-contacts[?area=][&level=][&due=]`

Without `due`: every **local** hotline in the caller's scope, grouped by the app, sorted by area level then name. `area` = that area only; `level` = only areas of that level. With `due` it is row 38 (unchanged). Each item: the EmergencyContact (§3.2) plus `"areaName": "Guiuan", "areaLevel": "municipality", "hidden": false, "hidesOn": "2027-04-20"`. National lines (`kind: "national"`, `area: null`) are never in this list: they are admin-only, in the panel (one typo there breaks the most important button in Bulig).

##### `POST /staff/emergency-contacts` and `PATCH /staff/emergency-contacts/{id}`

**Request:** `{ "area": "ph-eastern-samar-guiuan", "kind": "police" | "fire" | "medical" | "rescue" | "coast_guard" | "disaster", "name": "PNP Guiuan", "phones": ["+639171234567"], "source": "Called the office", "checkedToday": true }`. 1 to 3 phones, E.164 or a short local hotline (3 to 6 digits). `checkedToday: true` sets `verifiedAt` to today; otherwise a new hotline gets today and an edit keeps its date. `area` is required (no national lines here). **201/200:** the item as in the list. **422:** field rules; `kind: national` (`National lines are changed in the panel.`). Only an admin deletes.

`GET /staff/summary` also returns `"scoutRequests": 2`: pending Scout requests (§7.9). The app treats a missing key as 0.

#### Waking up

Render's free plan can take about a minute to wake. Staff requests have no shorter timeout: the app shows "Waking the server. This can take a minute." and waits up to 90 s before offering Try again.

### 7.9 Becoming a Scout

Added 2026-11-10 (John). A **Scout** ("Bulig Scout") is the app's name for the `contributor` role. A `user` asks from Profile → Become a Bulig Scout; a moderator or admin answers (§7.8: yes is `PATCH /staff/users/{id}/role` with `contributor`, no is `…/contributor-request/decline`). Nothing here changes a role by itself. One table, `contributor_requests`: `id`, `user_id`, `status` (`pending`, `approved`, `declined`), `area` (text, 120), `travel` (JSON array), `why` (text, 280, nullable), `adult_confirmed_at`, `reviewed_by`, `reviewed_at`, `review_note` (200), `created_at`. At most one `pending` row per user (a partial unique index). Deleting the account deletes its rows (RA 10173).

The request object:

```json
{
  "id": "scr_01JD…",
  "status": "pending",
  "area": "Surok, Guiuan",
  "travel": ["tricycle", "motorcycle"],
  "why": "Tricycle driver, Guiuan to Mercedes every day.",
  "createdAt": "2026-11-10T08:00:00Z",
  "reviewedAt": null,
  "reviewNote": null,
  "canApplyAgainAt": null
}
```

`reviewNote` and `canApplyAgainAt` are only set on `declined` (30 days after `reviewedAt`). The reviewer's name is never returned.

#### `GET /me/contributor-request` 🔒

**200:** `{ "request": <the latest request> | null }`. `null` when they never asked, or withdrew. An `approved` request means a moderator said yes: the app then calls `GET /me` to pick up the new role.

#### `POST /me/contributor-request` 🔒

**Request:** `{ "area": "Surok, Guiuan", "travel": ["tricycle"], "why": "…", "agreed": true, "adult": true }`. `area` 3 to 120 characters (barangay and town; the app pre-fills Profile's home area). `travel` 1 to 7 of `motorcycle`, `tricycle`, `car`, `jeepney`, `truck`, `bicycle`, `walk`. `why` optional, up to 280. `agreed` must be `true` (the Scout rules on the page). `adult` must be `true` ("I'm 18 or older"; stored as `adult_confirmed_at`). **No birthday, no house address, no ID** (RA 10173 data minimisation: a moderator doesn't need them to decide, and a leak of them hurts people). **201:** `{ "request": … }` with `status: "pending"`.
**409:** `{ "code": "pending" }` when one is already waiting, `{ "code": "already_contributor" }` when the role is `contributor` or above. **429:** `{ "canApplyAgainAt": "2026-12-10T08:00:00Z" }` when declined less than 30 days ago; a plain `429` (no `canApplyAgainAt`) is the rate limit, 5 an hour. **422:** field rules.

#### `DELETE /me/contributor-request` 🔒

Takes back a **pending** request (the row is deleted, so they can ask again at once). **204.** **404:** nothing pending (answered, or already taken back).

---

## 8. Shared objects

### 8.1 User

```json
{
  "id": "usr_01JBX…",
  "username": "ana_reyes",
  "email": "ana@example.com",
  "name": "Ana Reyes",
  "role": "user",
  "areas": [],
  "createdAt": "2026-10-30",
  "phone": "+639171234567",
  "homeArea": "Surok, Guiuan, Eastern Samar",
  "photoUrl": null,
  "pendingEmail": null,
  "hasPassword": true,
  "google": false
}
```

`username` is lower-case, or `null` for an account made before usernames or with Google ([§4.1](#usernames)).

`hasPassword` is `false` for an account made with Google that never set a password ([§4.7](#47-post-authgoogle), [§5.5](#55-put-mepassword-)); `google` is `true` once a Google account is linked. Both were added 2026-11-10; the app reads a missing `hasPassword` as `true`.

`pendingEmail` is the address waiting for confirmation ([§5.7](#57-post-meemail-)), or `null`. It turns back to `null` when the link is used, cancelled or expires.

Matches `Account` in `app/src/auth/types.ts`, except `photo` (a data URL on the phone today) becomes `photoUrl`. `areas` lists a moderator's area IDs (each covers the areas inside it); empty for users and admins. Until area assignment ships it is `[]` for everyone, and an empty list on a moderator means the whole country. Never returned: password hashes, tokens, `google_sub`, deleted state.

### 8.2 Envelope, Area, EmergencyContact, Service, Labels

Exactly as in `app/src/types.ts` and [ARCHITECTURE.md, Spine 1](ARCHITECTURE.md#1-data-contract); examples in [§3](#3-public-data). `app/src/data/validate.ts` is the checker the app runs on every response; the Pest tests run the same rules on the server.

---

## 9. Services the app calls directly (not the backend)

Free services with no key or account. They stay direct calls after Phase 4; listed here so the backend and the Privacy Policy agree on what leaves the phone.

| What | Request the app sends | Where | Sent when |
| --- | --- | --- | --- |
| Address (barangay, town, province, ZIP) | `GET https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=10.316&lon=123.885&zoom=18&addressdetails=1&accept-language=en` | `location/address.ts` | Online, after a 250 m move or a refresh; position rounded to 3 decimals |
| Map tiles and style | `GET https://tiles.openfreemap.org/styles/positron` and its tiles | `map/mapTheme.ts`, MapLibre | Only on the Map tab |
| Route (line, distance, time) | `GET https://routing.openstreetmap.de/routed-car/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson&steps=false` (`routed-foot` for walking) | `map/route.ts` | When a route is on; again per ~200 m cell |
| Voice navigation | Opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` | `data/format.ts` | Only when the person taps Google Maps |
| Phone calls | `tel:` links | everywhere | Only when tapped |

If traffic grows past fair use: self-host OSRM with a Philippines extract and Nominatim, then point these URLs at them. Same request shapes.

---

## 10. What moves from the phone to the server

| Phone storage today | Holds | Phase 4 |
| --- | --- | --- |
| `bulig.accounts` (localStorage) | Accounts made on the phone: name, email, salt, SHA-256 hash | **Gone.** `POST /auth/register` |
| `bulig.session` | Email of the signed-in account | **Token** (Sanctum) in localStorage; `GET /me` on start |
| `bulig.profile.<email>` | name, phone, home area, photo (data URL) | `PATCH /me`, `POST /me/photo` |
| `bulig.saved.<email>` | Saved record IDs | `/me/saved` (sent once on first sign-in, then cleared) |
| `bulig.guest` | Old guest flag (guest mode removed 2026-11-04) | Cleared on start |
| `bulig.area`, `bulig.country` | Picked area and country | Stay on the phone (`homeArea` is the server-side preference) |
| `bulig.address` | Last looked-up address | Stays on the phone |
| `bulig.mapView` | Last Map view (centre rounded to ~100 m, zoom), to reopen the map there | Stays on the phone |
| `bulig.savedCache.<email>` | The last saved list from the server, shown at once on the next start and offline (server accounts) | Stays on the phone as a cache; cleared on sign out |
| `bulig.savedOutbox.<email>` | Hearts the server hasn't confirmed yet (`{recordId: true/false}`), sent again later | Stays on the phone until sent; cleared on sign out |
| `bulig.welcome` | Index of the last welcome line on Home, so the next one differs | Stays on the phone |
| `bulig.theme` | System / Light / Dark | Stays on the phone |
| `bulig.route` (sessionStorage) | The route in progress | Stays on the phone |
| Test logins (`auth/testAccount.ts`) | `test@`, `moderator@`, `admin@bulig.com` | **Removed.** Seed real accounts in Filament |
| `bulig.drafts.<recordId>` (new in Phase 4) | An unsent Update details form | Stays on the phone until sent |
| `bulig.drafts.new-place.<email>` | An unsent Add a place form (upload IDs and small previews, not the photos) | Stays on the phone until sent |
| `bulig.updatesSeen.<email>` | Which answers in My updates the person has seen, for the bell | Stays on the phone |
| `bulig.localSubmissions` | Dev and tests only: new places sent with no backend | Not in the API build |
| `bulig.finishProfile.<email>` | "Finish your profile" on Home was closed (Profile still shows it until a photo or home area is added) | Stays on the phone |
| `bulig.traveller.<email>` | Staff only: "Use the app as: Traveller" (everyday tabs back) | Stays on the phone; holds no data |
| Staff snapshots (`staff/snapshot.ts`) | The last copy of the queue, people, areas and hotlines, so screens open at once | **Memory only**, never stored; dropped on sign-out or another sign-in |

Only `AuthProvider` (`app/src/auth/`) and the data source (`app/src/data/`) change; pages keep calling `useAuth()` and `useAppData()`.

---

## 11. Changing this contract

- **Adding** an optional field or a new endpoint: update this file, `app/src/types.ts` and `validate.ts`, and the CHANGELOG under **Big changes**. No version bump.
- **Changing or removing** a field, or making one required: that's `/api/v2`, and the app keeps working against v1 until it ships the matching build.
- Every PR that adds a request to the frontend adds it here in the same PR.
