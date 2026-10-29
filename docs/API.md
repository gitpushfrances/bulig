# Bulig API contract

Every request the app makes, or will make once the backend exists, with its exact payload and response. Build the Laravel API (Phase 4) to match this file, and the frontend switches over without page changes.

Last updated: 2026-10-30 · Owner: John · Matches the frontend on `main` (v0.3.0).

**Why this file exists.** Until Phase 4 the app has no server: data comes from JSON files, and accounts, saved places and profiles live on the phone (`localStorage`). Each section below says **where that lives in the frontend today** and **what the API replaces it with**, so nothing is guessed when the backend is built.

**How it relates to the other docs.** The record shapes are the data contract in [ARCHITECTURE.md, Spine 1](ARCHITECTURE.md#1-data-contract) and `app/src/types.ts`; this file never redefines them, it shows them on the wire. Who may do what is in [WORKFLOW.md](WORKFLOW.md#roles). Screens are in [UI-UX.md](UI-UX.md). When Phase 4 starts, generate `contracts/openapi.yaml` from this file and run Pest contract tests against it.

---

## Contents

1. [Conventions](#1-conventions)
2. [All requests at a glance](#2-all-requests-at-a-glance)
3. [Public data](#3-public-data): areas, emergency contacts, services, labels
4. [Accounts](#4-accounts): register, login, logout, forgot and reset password
5. [Me](#5-me): profile, photo, password, delete account
6. [Saved places](#6-saved-places)
7. [Reports](#7-reports-report-wrong-info) (Report wrong info)
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
| Auth | **Laravel Sanctum personal access tokens.** Send `Authorization: Bearer <token>`. 🔒 in the tables = token required. Public data and Emergency never need one. |
| Roles | `user`, `moderator`, `admin`. Sign-ups are always `user`; moderators and admins are appointed in the admin panel. |
| Errors | Laravel's shape. Validation: `422 {"message": "...", "errors": {"field": ["..."]}}`. Others: `{"message": "..."}` with `401` (no or bad token), `403` (role or scope), `404`, `409`, `429` (rate limit, with `Retry-After`). The app shows its own friendly words; `message` is for logs. |
| Caching | Public reads: `Cache-Control: public, max-age=3600` and an `ETag`; the service worker uses NetworkFirst with a 3 s timeout, then its cache (offline still works). 🔒 responses: `Cache-Control: no-store`. |
| CORS | Only the app's origin (`https://bulig.<subdomain>.workers.dev`, later the real domain). |
| Rate limits | Auth endpoints 10/min per IP and per email; reports 10/hour per user; everything else 120/min per token or IP. |
| Versioning | `/api/v1`. A breaking change means `/api/v2` (see [§11](#11-changing-this-contract)). The data envelopes keep `"version": 1`. |

---

## 2. All requests at a glance

| # | Request | Method and path | Auth | Phase | Frontend today |
| --- | --- | --- | --- | --- | --- |
| 1 | Areas of a country | `GET /areas?country=PH` | — | 4 | `fetch /data/ph/areas.json` in `data/JsonSource.ts` |
| 2 | Emergency contacts | `GET /emergency-contacts?country=PH[&area=]` | — | 4 | `fetch /data/ph/emergency-contacts.json` |
| 3 | Services (places) | `GET /services?country=PH[&area=][&category=]` | — | 4 | `fetch /data/ph/services.json` |
| 4 | Local category words | `GET /labels?country=PH` | — | 4 | `fetch /data/ph/labels.json` |
| 5 | Create account | `POST /auth/register` | — | 4 | `register()` in `auth/localAccounts.ts` (`bulig.accounts`) |
| 6 | Sign in | `POST /auth/login` | — | 4 | `checkLogin()` / `checkLocalLogin()` (`bulig.session`) |
| 7 | Sign out | `POST /auth/logout` | 🔒 | 4 | `signOut()` in `auth/AuthProvider.tsx` |
| 8 | Forgot password | `POST /auth/forgot-password` | — | 4 | Preview only: `pages/ForgotPasswordPage.tsx` sends nothing |
| 9 | Reset password | `POST /auth/reset-password` | — | 4 | Not built (the emailed link opens `/reset-password?token=&email=`) |
| 10 | Who am I | `GET /me` | 🔒 | 4 | `sessionAccount()` reads `bulig.session` + `bulig.profile.<email>` |
| 11 | Edit profile | `PATCH /me` | 🔒 | 4 | `updateProfile()` → `bulig.profile.<email>` |
| 12 | Upload photo | `POST /me/photo` | 🔒 | 4 | `toAvatar()` in `auth/photo.ts` → data URL in `bulig.profile.<email>` |
| 13 | Remove photo | `DELETE /me/photo` | 🔒 | 4 | `updateProfile({ photo: undefined })` |
| 14 | Change password | `PUT /me/password` | 🔒 | 4 | `changeLocalPassword()` |
| 15 | Delete account | `DELETE /me` | 🔒 | 4 | `deleteAccount()` → removes the local account, saved list and profile |
| 16 | List saved | `GET /me/saved` | 🔒 | 4 | `bulig.saved.<email>` (array of record IDs) |
| 17 | Save a place or number | `PUT /me/saved/{recordId}` | 🔒 | 4 | `toggleSaved(id)` (heart) |
| 18 | Unsave | `DELETE /me/saved/{recordId}` | 🔒 | 4 | `toggleSaved(id)` (heart) |
| 19 | Report wrong info | `POST /submissions` | 🔒 | 5 (3: Google Form) | SCRUM-30: Google Form with the record ID |

Admin and moderator screens (Filament, Phase 4) are server-side and not part of this contract.

---

## 3. Public data

These four replace the JSON files one to one: **same envelope, same fields, same IDs**. If the API needs a different shape, that's a design bug in the API (ARCHITECTURE.md, Phase 4).

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
      "languages": ["en", "ceb"]
    }
  ]
}
```

**Errors:** `422` missing or unknown `country`.

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
| `sample` | no | Test data only. |

### 3.4 `GET /labels?country=PH`

The country's own words for categories (`"Vulcanizing"`), per language. Not an envelope.

**200**

```json
{
  "version": 1,
  "categories": {
    "tire_repair": { "en": "Vulcanizing", "war": "Vulcanizing" },
    "fuel": { "en": "Gas station" },
    "food": { "en": "Resto and carinderia" },
    "lodging": { "en": "Hotel and inn" },
    "other": { "en": "Others" }
  }
}
```

---

## 4. Accounts

Everything except Emergency needs an account; "Continue without an account" (guest) is a phone-only choice with no request. Sign-up is the onboarding's last step (`pages/SignupPage.tsx`).

### 4.1 `POST /auth/register`

**Request**

```json
{
  "name": "Ana Reyes",
  "email": "ana@example.com",
  "password": "long enough",
  "acceptedTerms": true,
  "device": "Bulig PWA on Android"
}
```

| Field | Rules (same as the form) |
| --- | --- |
| `name` | required, 1–80 characters after trimming |
| `email` | required, valid email, stored lower-cased and trimmed, unique |
| `password` | required, at least 8 characters, max 128 |
| `acceptedTerms` | required, must be `true` (the Terms of Use / Privacy Policy box) |
| `device` | optional, names the token (shown in a future "signed-in devices" list) |

**201**

```json
{
  "token": "1|q7Z…",
  "user": { "id": "usr_01JBX…", "email": "ana@example.com", "name": "Ana Reyes", "role": "user", "areas": [], "createdAt": "2026-10-30", "phone": null, "homeArea": null, "photoUrl": null }
}
```

**Errors:** `422` with `errors.email: ["taken"]` when the email has an account (the app shows "That email already has an account. Sign in instead."), or the field rules above.

### 4.2 `POST /auth/login`

**Request**

```json
{ "email": "ana@example.com", "password": "long enough", "device": "Bulig PWA on Android" }
```

**200:** same body as register (`token`, `user`).

**Errors:** `422 {"message": "These credentials do not match our records."}` for a wrong email *or* password (never say which). `429` after too many tries. The app shows "That email and password don't match."

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

---

## 5. Me

### 5.1 `GET /me` 🔒

**200:** the [User](#81-user) object. The app calls it on start when it has a token; `401` means the token is gone, so the app clears it and shows the login.

### 5.2 `PATCH /me` 🔒

Edit profile (`/profile/edit`). Send only what changed.

**Request**

```json
{ "name": "Juan Dela Cruz", "phone": "+639171234567", "homeArea": "ph-cebu-cebu-city" }
```

| Field | Rules |
| --- | --- |
| `name` | 1–80 characters |
| `phone` | `null`, or a PH mobile number. The form accepts `0917 123 4567` or `+63 917 123 4567`; send it normalised to E.164 (`+639171234567`). |
| `homeArea` | `null` or an existing area ID |

`email` and `role` can't be changed here (`422` if sent). **200:** the updated User.

### 5.3 `POST /me/photo` 🔒

`multipart/form-data` with one file field, `photo`. The app already centre-crops to a **256 × 256 WebP** (JPEG on old Safari) of about 15–30 KB (`auth/photo.ts`); the server re-encodes anyway and strips metadata.

**Limits:** `image/webp`, `image/jpeg` or `image/png`, at most 2 MB.

**200:** `{ "photoUrl": "https://<cdn>/avatars/usr_01JBX…/8f3c.webp" }`. **Errors:** `422` wrong type or too big.

### 5.4 `DELETE /me/photo` 🔒

**204.** The app falls back to Ropi's head.

### 5.5 `PUT /me/password` 🔒

**Request:** `{ "currentPassword": "long enough", "newPassword": "a new long one" }`

**204.** Other tokens are revoked; this one stays signed in. **Errors:** `422 errors.currentPassword: ["incorrect"]` ("That isn't your current password."), or a new password under 8 characters.

### 5.6 `DELETE /me` 🔒

**Request:** `{ "confirm": "delete" }` (the word the person typed on Profile).

**204.** Deletes the account, its saved list, photo and tokens (soft delete for 30 days for abuse handling, then purged; say so in the Privacy Policy). Admins and moderators get `403` until an admin removes their role.

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

## 7. Reports (Report wrong info)

Phase 3 (SCRUM-30): a Google Form with the record ID pre-filled; no API. Phase 5: in the app, through this endpoint. Nothing submitted is public until a moderator approves it (ARCHITECTURE.md, Spine 3). Emergency contacts can be reported but never edited by the public.

### 7.1 `POST /submissions` 🔒

**Request**

```json
{
  "recordType": "service",
  "recordId": "ph-cebu-cebu-city-sample-vulcanizing",
  "reason": "wrong_hours",
  "note": "Closes at 8 PM now, not 10.",
  "position": { "lat": 10.316, "lng": 123.885 }
}
```

| Field | Rules |
| --- | --- |
| `recordType` | `service` or `emergency_contact` |
| `recordId` | an existing ID |
| `reason` | `number_not_working`, `closed_for_good`, `wrong_location`, `wrong_hours`, `wrong_details`, `duplicate`, `other` |
| `note` | optional, up to 500 characters |
| `position` | optional, only if the person agrees; rounded to 3 decimals (~110 m) by the app |

**201:** `{ "id": "sub_01JBY…", "status": "pending" }`. **Errors:** `422`, `429` (10 an hour).

---

## 8. Shared objects

### 8.1 User

```json
{
  "id": "usr_01JBX…",
  "email": "ana@example.com",
  "name": "Ana Reyes",
  "role": "user",
  "areas": [],
  "createdAt": "2026-10-30",
  "phone": "+639171234567",
  "homeArea": "ph-cebu-cebu-city",
  "photoUrl": null
}
```

Matches `Account` in `app/src/auth/types.ts`, except `photo` (a data URL on the phone today) becomes `photoUrl`. `areas` lists a moderator's area IDs (each covers the areas inside it); empty for users and admins. Never returned: password hashes, tokens, deleted state.

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
| `bulig.guest` | "Continue without an account" | Stays on the phone |
| `bulig.area`, `bulig.country` | Picked area and country | Stay on the phone (`homeArea` is the server-side preference) |
| `bulig.address` | Last looked-up address | Stays on the phone |
| `bulig.theme` | System / Light / Dark | Stays on the phone |
| `bulig.route` (sessionStorage) | The route in progress | Stays on the phone |
| Test logins (`auth/testAccount.ts`) | `test@`, `moderator@`, `admin@bulig.com` | **Removed.** Seed real accounts in Filament |

Only `AuthProvider` (`app/src/auth/`) and the data source (`app/src/data/`) change; pages keep calling `useAuth()` and `useAppData()`.

---

## 11. Changing this contract

- **Adding** an optional field or a new endpoint: update this file, `app/src/types.ts` and `validate.ts`, and the CHANGELOG under **Big changes**. No version bump.
- **Changing or removing** a field, or making one required: that's `/api/v2`, and the app keeps working against v1 until it ships the matching build.
- Every PR that adds a request to the frontend adds it here in the same PR.
