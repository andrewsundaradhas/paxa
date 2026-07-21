# paxa — from prototype to a deployable, secure app

A free bill-splitter that **never touches money**: splits are calculated in the
app/server, and when someone settles, paxa opens a `upi://pay` deep link so the
payer's own UPI app moves the money **directly, bank-to-bank**. No platform fee.

That single decision (no fee, no money flow through paxa) is what keeps this
shippable in India without becoming a regulated payment company.

---

## Where it stands now

| Piece | Status |
|---|---|
| UI / all screens / premium design | ✅ Built |
| Balance + split engine | ✅ Built & tested — **35/35 logic checks pass** |
| Platform fee | ✅ **Removed** (paxa is free) |
| UPI redirect | ✅ `upi://pay?...` deep link (`mobile/src/payments/upi.ts`) |
| Backend API | ✅ Express + Drizzle schema + routes |
| Database migrations | ✅ `server/migrations/0000_initial.sql` |
| Real auth | ✅ JWT + Keychain refresh + biometric restore on launch |
| Native Android/iOS project | ✅ Generated (`com.paxa.app`) |
| API ↔ mobile sync | ✅ Live mode hydrates from API; demo mode uses seed data |
| Store submission | ⏳ **You** — signing, Play Console, App Store (see DEPLOYMENT.md) |

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full ship checklist.

---

## 1. Money & the law (why this is now the easy part)

- paxa **does not collect, hold, route, or skim** any money. It only constructs
  a UPI deep link; the transfer happens inside the user's UPI app, payer→payee.
- Because of that, you are **not a Payment Aggregator** and don't need RBI PA
  licensing or PA-style KYC for the core flow. You're a utility that hands a
  pre-filled payment to the user's bank app — like a "pay" button on an invoice.
- You still should, before scale: register a business entity, publish a privacy
  policy, and (cheap insurance) have a CA/lawyer confirm your exact model. If you
  later monetize via **subscription or ads** (not per-transaction cuts), that's
  the clean way to make money without re-entering the regulated perimeter.

## 2. How the UPI redirect works (already implemented)

- `buildUpiUrl()` produces `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>`
  per the NPCI spec.
- **Android:** opening it shows the system chooser of every installed UPI app
  (GPay / PhonePe / Paytm / bank apps) — exactly "redirect to any UPI app".
- **iOS:** there's no universal UPI scheme. `payViaUpi()` detects this and
  returns `no-app`; fall back to showing the payee VPA to copy, or register
  specific schemes (`phonepe://`, `paytmmp://`, `gpay://`) in `Info.plist`
  under `LSApplicationQueriesSchemes` and open one directly.
- paxa can't *confirm* a UPI payment by itself (NPCI doesn't push a callback to a
  non-PA). Options: (a) optimistic "mark as settled" + let either party undo, or
  (b) the recipient confirms receipt in-app, or (c) reconcile via a bank-statement
  webhook if you integrate a read-only account aggregator later.

## 3. Database — how to manage it

- **Use managed Postgres — don't run a DB server yourself.** Recommended:
  **Supabase** (Postgres + auth + row-level security + auto backups; its
  connector is already available in this workspace), or Neon / Railway / RDS.
- **Schema (no money/card data ever):** `users`, `refresh_tokens`, `groups`,
  `group_members`, `group_invites`, `expenses`, `expense_splits`, `settlements`
  (a *record* that a UPI payment was initiated — amount, payer, payee, status —
  never card/bank credentials), `audit_log`, `device_push_tokens`. Store a
  user's *own* payout VPA only with their consent.
- **Migrations:** Drizzle ORM + checked-in SQL migrations. Never hand-edit prod.
- **Safety:** enable **Row-Level Security** (a user reads only groups they belong
  to), automated **backups + point-in-time recovery**, encryption at rest (the
  managed providers do this), and least-privilege DB roles. The app talks to the
  **API**, never directly to the DB.

## 4. Auth — safe and secure

- Email/password + email verification; **JWT access token (~15 min)** +
  **rotating refresh token**. Refresh token lives in the phone's secure
  hardware — **iOS Keychain / Android Keystore** via `react-native-keychain`
  (already scaffolded in `src/security/`).
- **Biometric app-lock** (Face ID / fingerprint) on cold launch and after
  background; optional TOTP 2FA.
- Hash passwords with **argon2/bcrypt**; rotate/revoke refresh tokens per device
  (the schema keeps `device_id`); rate-limit login + lockout on abuse.

## 5. Transactions & data integrity

- **The server is the only source of truth.** Re-calculate every balance and
  split server-side; never trust amounts sent by the client.
- **Idempotency keys** so a retried "settle" never double-records.
- **Audit log** every money-relevant action (who added/edited/settled what).
- Validate with the shared **Zod** schemas on both client and server.

## 6. App, network & build security

- **Secrets only on the server** (`DATABASE_URL`, JWT secrets, any 3rd-party
  keys). Nothing secret ships in the app bundle.
- **TLS everywhere + certificate pinning** on the API client (scaffolded in
  `src/api/client.ts`) so a proxy/MITM can't read traffic.
- Release hardening: **Hermes** on, **ProGuard/R8** + resource shrinking on
  Android, console logs stripped, debug menus off, **Sentry** with source maps.
- Optional: root/jailbreak **warning** (not hard block) on launch.

## 7. Make it run on any phone → Play Store

1. **Generate the native project** — this repo has no `android/` yet. From a
   matching RN 0.74 template, create the app and copy in `android/` (and `ios/`),
   keeping `App.tsx` / `src/`. Add the bundled fonts (`assets/fonts`), then
   `npx react-native-asset`.
2. Build a signed **AAB** with a release keystore (back the keystore up safely).
3. **Google Play Console** ($25 once). Fill the **Data Safety** form, link the
   privacy policy. UPI apps get extra review — be ready to state plainly that
   paxa initiates UPI via the user's own app and **handles no funds**.
4. Roll out **Internal → Closed → Production**. Test on **physical iOS + Android
   devices** (biometrics, the UPI app-switch, and push can't be fully tested on
   emulators).

---

## Recommended order

1. Stand up **backend API + managed Postgres** (Supabase) and move all balance
   logic server-side.
2. Wire **real auth** (JWT + refresh in Keychain/Keystore + biometric).
3. Polish the **UPI redirect** (iOS fallbacks, settlement confirmation UX).
4. **Harden** (pinning, secrets, RLS, audit log) and get a security review.
5. **Generate native Android**, build the AAB, submit to Play.

The next thing I can build with you is **Step 1 — the backend API + Postgres
schema** (I can scaffold it against Supabase). Say the word.
