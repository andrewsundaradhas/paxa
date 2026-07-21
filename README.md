# paxa — SplitR Mobile + Backend Monorepo

A mobile-first bill-splitting app with UPI peer-to-peer settlement. paxa **never holds money** — it calculates splits and opens a `upi://pay` deep link in the user's own UPI app.

## Packages

| Path | Purpose |
|------|---------|
| `mobile/` | React Native 0.74 app (iOS + Android) |
| `server/` | Express API + Drizzle/Postgres |
| `shared/` | Zod schemas + split/balance math |

