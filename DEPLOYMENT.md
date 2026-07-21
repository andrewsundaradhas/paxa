# paxa — Deployment Guide

This document covers everything needed to ship paxa to iOS and Android, and what **you** must do manually (accounts, signing, store listings).

---

## Architecture

```
Mobile (React Native 0.74)  →  HTTPS API (Express)  →  Postgres (Supabase)
         ↓
   UPI deep link (peer-to-peer; paxa never holds money)
```

---

## 1. Backend (do this first)

### 1a. Create Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Postgres connection string** (Settings → Database → URI).
3. Copy `server/.env.example` → `server/.env` and fill in:

```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<random 64+ chars>
JWT_REFRESH_SECRET=<random 64+ chars>
PORT=4000
NODE_ENV=production
CORS_ORIGINS=*
```

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 1b. Run migrations

```bash
cd server
npm install
npm run db:migrate
```

### 1c. Deploy the API

**Option A — Docker (any host with Docker):**

```bash
cd server
docker build -t paxa-api .
docker run -p 4000:4000 --env-file .env paxa-api
```

**Option B — Render / Railway / Fly:** point the service at `server/`, set build command `npm run build`, start command `npm start`, and inject the env vars above.

Your production URL should be HTTPS, e.g. `https://api.yourdomain.com`.

### 1d. Enable Row-Level Security (recommended)

In Supabase SQL editor, enable RLS on all tables and add policies so users only read their own groups. See `server/README.md` for the checklist.

---

## 2. Mobile — local dev setup

```bash
# From repo root
npm install --legacy-peer-deps

# Mobile env
cp mobile/.env.example mobile/.env

# Start API (separate terminal)
cd server && npm run dev

# Start Metro + run on device/emulator
cd mobile && npm start
cd mobile && npm run android   # or npm run ios (macOS only)
```

**Android emulator** reaches your PC at `10.0.2.2:4000`. **Physical device** needs your LAN IP, e.g. `http://192.168.1.5:4000`.

---

## 3. Mobile — production build config

```bash
cp mobile/.env.production.example mobile/.env.production
```

Edit `.env.production`:

```env
API_BASE_URL=https://api.yourdomain.com
APP_ENV=production
SENTRY_DSN=https://...@sentry.io/...
```

### Fonts (optional but recommended)

Download **Space Grotesk** and **Hanken Grotesk** from Google Fonts, place `.ttf` files in `mobile/assets/fonts/`, then:

```bash
cd mobile && npx react-native-asset
```

The app works without them (system font fallback).

---

## 4. Android release (Play Store)

### What is already done

- `android/` native project generated (`com.paxa.app`)
- Hermes enabled, biometric permissions, react-native-config wired
- Release scripts: `npm run android:bundle` (AAB), `npm run android:release` (APK)

### What YOU must do

| Step | Action |
|------|--------|
| 1 | Install **Android Studio** + SDK 34 |
| 2 | Generate a **release keystore**: `keytool -genkey -v -keystore paxa-release.keystore -alias paxa -keyalg RSA -keysize 2048 -validity 10000` |
| 3 | Add signing to `android/app/build.gradle` (release `signingConfig`) — **never commit the keystore** |
| 4 | Build AAB: `cd mobile && npm run android:bundle` |
| 5 | Create **Google Play Console** account ($25 one-time) |
| 6 | Upload AAB → Internal testing → Production |
| 7 | Fill **Data Safety** form + link **Privacy Policy** URL |
| 8 | State clearly: paxa initiates UPI via the user's own app and **handles no funds** |

### SSL pinning (production)

Export your API cert SPKI hashes and add to:
- `android/app/src/main/res/raw/paxa_api.cer`
- `android/app/src/main/res/raw/paxa_api_backup.cer`

Pinning is enabled only when `APP_ENV=production`.

---

## 5. iOS release (App Store)

### What is already done

- `ios/` native project generated (target `paxa`)
- UPI query schemes in `Info.plist` (PhonePe, GPay, Paytm, BHIM)
- Face ID usage description

### What YOU must do

| Step | Action |
|------|--------|
| 1 | **macOS with Xcode 15+** (iOS builds cannot be done on Windows) |
| 2 | Enroll in **Apple Developer Program** ($99/year) |
| 3 | `cd mobile/ios && pod install` |
| 4 | Open `paxa.xcodeproj` in Xcode → set Team, Bundle ID `com.paxa.app` |
| 5 | Archive → Upload to **TestFlight** → submit for App Store review |
| 6 | Fill **App Privacy** nutrition labels (email, device ID, push tokens) |

---

## 6. Optional: EAS Build (cloud builds without local Xcode)

An `eas.json` is included. To use Expo Application Services:

```bash
npm install -g eas-cli
eas login
cd mobile && eas build:configure
eas build --platform android
eas build --platform ios   # requires Apple credentials
```

---

## 7. Monitoring

- **Sentry**: create a project at sentry.io, paste DSN into `.env.production`
- Source maps: upload via `@sentry/react-native` CLI after each release build

---

## 8. Store listing checklist

- [ ] App icon (1024×1024 PNG) — convert from `mobile/assets/icon/paxa-icon.svg`
- [ ] Feature graphic (Android, 1024×500)
- [ ] Screenshots on real devices (5+ per platform)
- [ ] Privacy policy URL (required)
- [ ] Support email
- [ ] Short description: free bill splitter, UPI settle, no platform fees

---

## 9. Testing before submit

| Test | Device |
|------|--------|
| Sign up / login / biometric restore | Physical iOS + Android |
| Create group, add expense, balances | Both |
| UPI settle → app switch to GPay/PhonePe | **Physical Android** (emulator has no UPI apps) |
| iOS UPI fallback (copy VPA if no app) | Physical iPhone |
| Offline / API down graceful errors | Both |
| Release build (not debug) | Both |

---

## Quick reference — npm scripts

| Command | Where | Purpose |
|---------|-------|---------|
| `npm run dev` | server | Local API |
| `npm run db:migrate` | server | Apply DB migrations |
| `npm start` | mobile | Metro bundler |
| `npm run android` | mobile | Debug on Android |
| `npm run ios` | mobile | Debug on iOS (macOS) |
| `npm run android:bundle` | mobile | Play Store AAB |
| `npm run test:logic` | mobile | 35 domain logic checks |
