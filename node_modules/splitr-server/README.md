# paxa API

Express + TypeScript + Drizzle ORM on Postgres (Supabase). The server is the
**authoritative source of truth**: it re-computes every split and balance and
never trusts numbers sent by the client. paxa handles **no money** — settlements
are records; the actual transfer happens in the user's UPI app via a `upi://`
deep link the client builds from the payee VPA this API returns.

## Stack
- **Express** API, **Zod** validation (schemas shared with the app via `@splitr/shared`)
- **Drizzle ORM** + `postgres` driver → **Supabase Postgres**
- **JWT** access tokens (15 min) + **rotating, hashed, revocable refresh tokens**
- `helmet`, `cors`, `express-rate-limit`; money stored as integer **paise**

## Setup
1. Create a Supabase project → Project Settings → Database → copy the connection URI.
2. `cp .env.example .env` and fill `DATABASE_URL` + generate the two JWT secrets:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
3. From the repo root: `npm install`
4. Create tables: `npm -w server run db:generate` then `npm -w server run db:migrate`
   (or `npm -w server run db:push` to push the schema directly while prototyping).
5. `npm -w server run dev` → API on `http://localhost:4000` (`GET /health` to check).

## Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | — | Create account → access + refresh tokens |
| POST | `/auth/login` | — | Login → tokens |
| POST | `/auth/refresh` | — | Rotate refresh token → new access token |
| POST | `/auth/logout` | — | Revoke a refresh token (this device) |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/groups` | ✓ | Groups you belong to |
| POST | `/groups` | ✓ | Create group (+ add members by email) |
| GET | `/groups/:id` | member | Group + members + authoritative balances |
| GET | `/groups/:id/balances` | member | Net balances + simplified transfers |
| POST | `/groups/:id/invite` | member | 7-day invite token |
| POST | `/groups/join/:token` | ✓ | Join via invite |
| GET/POST/DELETE | `/groups/:id/expenses` | member | List / add (server recomputes split) / soft-delete |
| GET/POST | `/groups/:id/settlements` | member | History / initiate (returns payee VPA) |
| GET | `/settlements/:id/status` | party | Settlement status |
| POST | `/settlements/:id/confirm` | party | Mark a UPI transfer completed |
| POST | `/devices/register` | ✓ | Upsert FCM/APNs push token |

## Production hardening (do before real users)
- **Row-Level Security** on every table in Supabase (members read only their groups).
  The API uses the service role; if you ever query from the client, RLS is mandatory.
- Swap bcrypt → **argon2id**; add email verification + optional TOTP 2FA.
- Reconcile settlements against a real bank/UPI signal instead of self-confirm.
- Keep secrets server-side only; enable automated backups + PITR; ship behind HTTPS.

Never commit `.env`.
