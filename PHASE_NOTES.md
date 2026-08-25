# paxa — Feature build notes (backend + mobile)

This documents the new features added across the 9-part spec and the few
platform steps that require your credentials / a native rebuild.

## What was built (all code complete, all packages typecheck clean)

### Backend (`server/`)
- **New tables** (`0002_features.sql`): `receipts`, `payment_requests`, `notifications`, `spending_insights`.
- **OAuth** (`0003_oauth.sql`): `users.password_hash` now nullable; added `auth_provider`, `google_sub`, `apple_sub`, `avatar_url` + unique indexes.
- **Routes:** `/receipts`, `/payment-requests` (+ `/paid` `/cancel` `/remind`), `/notifications` (+ `/read` `/read-all`), `/insights`, `/auth/google`, `/auth/apple`.
- **Granular rate limiting:** `src/lib/rateLimits.ts` (auth / payment / receipt / ai / notification), keyed by user-id or IP.
- **No RLS** — authorization is enforced in the API layer, per the product decision.

### Mobile (`mobile/`)
- **Payment tracking:** `TrackingScreen` — checklist of *Money I owe* / *Owed to me* (live payment-requests + group-derived balances), mark-paid, remind.
- **AI spending dashboard:** `InsightsScreen` — spent/received/owe cards, category bars, money-in-vs-out, weekday/weekend, insight sentences. Live from `/insights`, with a local fallback in demo mode.
- **Receipt scanning:** `ScanReceiptSheet` + `receipts/parseReceipt.ts` (pure, tested) + `receipts/scan.ts` (camera + on-device OCR). Flow: capture → OCR → review → `RequestMoneySheet` (pre-filled).
- **Request money:** `RequestMoneySheet`.
- **Google / Apple sign-in:** `components/SocialAuthButtons` on the Login screen, `auth/oauth.ts` bridge, `auth/session.ts` `loginWithGoogle/Apple`.
- Home screen quick actions now: **Add · Request · Scan · Insights**, plus a **Pending payments** strip → Tracking. Design tokens unchanged.

> All native module usage (camera, OCR, Google, Apple) is behind **guarded `require`s**, so the current build keeps working; the features light up after the installs + rebuild below. No design tokens were changed.

---

## Steps that need you

### 1. Resume Supabase + migrate (required)
The Supabase project was **paused** — resume it in the dashboard, then:
```bash
cd server && npm run db:migrate      # applies 0002_features + 0003_oauth
```

### 2. Receipt scanning — native modules + rebuild
```bash
cd mobile
npm install     # pulls react-native-image-picker + @react-native-ml-kit/text-recognition (already in package.json)
npx pod-install ios   # iOS only
```
- Android: add camera permission to `android/app/src/main/AndroidManifest.xml`
  `<uses-permission android:name="android.permission.CAMERA"/>`
- iOS: add `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` to `Info.plist`.
- Rebuild the app. Until then, the scan sheet falls back to manual entry.

### 3. Google / Apple sign-in — credentials + native modules
```bash
cd mobile && npm install   # google-signin + apple-authentication (already in package.json)
cd ../server && npm install # google-auth-library + apple-signin-auth (already in package.json)
```
**Google:** create OAuth client ids in Google Cloud (Web + Android + iOS). Then set:
- mobile `.env`: `GOOGLE_WEB_CLIENT_ID` (and `GOOGLE_IOS_CLIENT_ID` for iOS)
- server `.env`: `GOOGLE_CLIENT_IDS=<web>,<android>,<ios>`
- Android: add your SHA-1 to the Android OAuth client.

**Apple** (needs a paid Apple Developer account):
- Enable "Sign in with Apple" capability in Xcode for the app id.
- server `.env`: `APPLE_CLIENT_IDS=<your.bundle.id>`
- Apple sign-in shows on iOS only.

Both providers return **501 `oauth_unconfigured`** until their env vars are set — verified.

---

## Verified now
- `server`, `shared`, `mobile` all **typecheck clean**.
- Mobile **logic tests pass** (`npm run test:logic`).
- **Receipt parser** correctly extracts merchant/total/date/category/items on Cafe, Grocery, Fuel, Movie samples.
- Server boots; new routes are auth-guarded (401 unauth); OAuth endpoints validate + return 501 until configured.

## Not verifiable here (blocked on paused DB / no emulator)
- Live end-to-end API round-trips (DB paused).
- On-device camera/OCR + Google/Apple native flows (need the rebuild + credentials above).
