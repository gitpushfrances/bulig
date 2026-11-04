# Testing the Bulig API with Postman

Base URL (live): `https://bulig-backend.onrender.com/api/v1`. Local backend: `http://localhost:8000/api/v1`. The full contract is [docs/API.md](../API.md); this file is the copy-paste list plus test steps.

## Every endpoint, and whether the app calls it

🔒 = send `Authorization: Bearer <token>` (from register or login). Everything is JSON (`Accept: application/json`).

| # | Method | Path | 🔒 | Backend | App (production build) |
|---|---|---|---|---|---|
| 1 | GET | `/health` | | ✅ | not called (for UptimeRobot) |
| 2 | GET | `/areas?country=PH` | | ✅ | ✅ on start |
| 3 | GET | `/emergency-contacts?country=PH[&area=]` | | ✅ | ✅ on start |
| 4 | GET | `/services?country=PH[&area=][&category=]` | | ✅ | ✅ on start |
| 5 | GET | `/labels?country=PH` | | ✅ | ✅ on start |
| 6 | GET | `/settings` | | ✅ | ❌ not yet (announcement banner) |
| 7 | POST | `/auth/register` | | ✅ | ✅ Create account |
| 8 | POST | `/auth/login` | | ✅ | ✅ Sign in |
| 9 | POST | `/auth/logout` | 🔒 | ✅ | ✅ Sign out |
| 10 | POST | `/auth/forgot-password` | | ✅ | ✅ Forgot password |
| 11 | POST | `/auth/reset-password` | | ✅ | ✅ `/reset-password` (the emailed link) |
| 12 | GET | `/me` | 🔒 | ✅ | ✅ on start (a revoked token signs the phone out) |
| 13 | PATCH | `/me` | 🔒 | ✅ | ✅ Edit profile (name, phone, home area) |
| 14 | PUT | `/me/password` | 🔒 | ✅ | ✅ Change password |
| 15 | DELETE | `/me` | 🔒 | ✅ | ✅ Delete account |
| 16 | GET | `/me/saved` | 🔒 | ✅ | ✅ on sign-in |
| 17 | PUT | `/me/saved/{recordId}` | 🔒 | ✅ | ✅ heart on |
| 18 | DELETE | `/me/saved/{recordId}` | 🔒 | ✅ | ✅ heart off |
| 19 | POST | `/submissions` | 🔒 | ✅ | ❌ not yet (Update details / flag) |
| 20 | GET | `/me/submissions` | 🔒 | ✅ | ❌ not yet |
| 21 | POST | `/issues` | 🔒 | ✅ | ❌ not yet (Help → report a problem) |
| 22 | GET | `/me/issues` | 🔒 | ✅ | ❌ not yet |
| 23 | POST | `/me/photo`, DELETE `/me/photo` | 🔒 | ❌ not built | photo stays on the phone |
| 24 | POST | `/uploads` | 🔒 | ❌ not built | ❌ |

The app calls the API only in a production build (`npm run build`, which reads `app/.env.production`). `npm run dev` and the tests use the bundled files and the phone-only test logins. To point a dev build at the API, copy `app/.env.example` to `app/.env.local` and uncomment the two lines.

## Steps in Postman

1. **Import.** Postman → Import → pick `docs/postman/bulig-api.postman_collection.json`. You get a collection called "Bulig API v1" with 6 folders.
2. **Check the variables.** Click the collection → Variables. `baseUrl` is the live server. Change `email` and `password` if you like. Leave `token` empty: login fills it.
3. **Wake the server.** Run `0. Health → Health`. The first call after 15 idle minutes can take about a minute (Render free). You want `200`. A `503` names what is failing (usually the database).
4. **Public data.** Run every request in `1. Public data`. Each one should show `200`, `version: 1` and an `items` list. Places you added in the admin panel must be in `Services`. If one is missing there, the problem is the backend data, not the app. Check the place's area, category and `Sample data` toggle (samples only show while `BULIG_SHOW_SAMPLE_DATA=true`). `Services` also saves the first place ID into `recordId`.
5. **Account.** Run `2. Accounts → Register` (`201`). If you already registered, run `Login` (`200`). Either one saves the token. The Tests tab shows "signed in: passed".
6. **Me.** Run `3. Me → Who am I` (`200`, your user), then `Edit profile` (`200`), then `Change password` (`204`). Skip `Delete account` unless you mean it.
7. **Saved.** Run `4. Saved places`: `Save a place` (`204`), then `List saved` (the ID is listed), then `Unsave` (`204`).
8. **Reports (optional).** `Flag a place` and `Report an app problem` create real rows in the panel. Reject or close them there afterwards.
9. **Run it all at once.** Collection → Run → untick `Delete account` and `Reset password` → Run. Every test should pass.

## What the errors mean

| Code | Meaning |
|---|---|
| 401 | No token or a dead token. Run Login again. |
| 403 | Your role can't do this, or (at login) the account is suspended. |
| 404 | Wrong path or unknown ID. |
| 422 | A field broke a rule. The `errors` object names it. At login: wrong email or password. |
| 429 | Too many tries. Wait for the `Retry-After` seconds. |
| 503 | `/health` only: the API is up but something it needs (the database) isn't. |
| No answer for ~60 s | The server is asleep and waking. Send the request again. |

## Checking the app itself

1. Open the live app, then DevTools (F12) → Network, and reload.
2. You should see `areas`, `emergency-contacts`, `services` and `labels` going to `bulig-backend.onrender.com`. If they go to `/data/ph/…json` instead, the build isn't using the API (check the Cloudflare build variables, or that `app/.env.production` is in the deployed commit).
3. Create an account in the app, then check it in Postman with `Login` using the same email and password. Then check the admin panel's Users list.
4. Tap a heart in the app, then run `List saved` in Postman while logged in as that same account. The place ID should be there.
