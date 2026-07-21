# paxa — SplitR Mobile + Backend Monorepo

A mobile-first bill-splitting app with UPI peer-to-peer settlement. paxa **never holds money** — it calculates splits and opens a `upi://pay` deep link in the user's own UPI app.

## Packages

| Path | Purpose |
|------|---------|
| `mobile/` | React Native 0.74 app (iOS + Android) |
| `server/` | Express API + Drizzle/Postgres |
| `shared/` | Zod schemas + split/balance math |

## Quick start

```bash
npm install --legacy-peer-deps

# Terminal 1 — API
cp server/.env.example server/.env   # fill DATABASE_URL + JWT secrets
cd server && npm run db:migrate && npm run dev

# Terminal 2 — Mobile
cp mobile/.env.example mobile/.env
cd mobile && npm start

# Terminal 3 — Run on device
cd mobile && npm run android   # or npm run ios (macOS)
```

**Demo mode:** tap "Continue in demo mode" on the login screen — works offline with seed data.

**Live mode:** sign up / sign in — data syncs from the API with biometric session restore on cold launch.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full Play Store / App Store checklist, signing, env config, and what you must do manually (developer accounts, keystore, Supabase, etc.).

## Verification

```bash
npm run typecheck          # all workspaces
cd mobile && npm run test:logic   # 35 balance/split checks
```

## Native projects

`mobile/android/` and `mobile/ios/` are generated from the RN 0.74 template with bundle ID **`com.paxa.app`**.
