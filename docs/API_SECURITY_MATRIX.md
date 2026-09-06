# paxa — API Security Matrix

Inventory of all API endpoints with their authentication, authorization, validation, and rate-limiting posture.

**Legend:** ✅ Secure · ⚠️ Partial / risk noted · ❌ Missing

| Endpoint | Method | Auth | Authorization | Validation | Rate Limit | Risk | Notes |
|----------|--------|------|---------------|------------|------------|------|-------|
| `/health` | GET | — | — | — | Global 120/min | INFO | Public health check |
| `/auth/signup` | POST | — | — | ✅ Zod (signupSchema) | authLimiter 30/15min | LOW | Creates account |
| `/auth/login` | POST | — | — | ✅ Zod (loginSchema) | authLimiter 30/15min | LOW | Email+password |
| `/auth/google` | POST | — | Verification server-side | ✅ Zod (googleAuthSchema) | authLimiter | LOW | Returns 501 if unconfigured |
| `/auth/apple` | POST | — | Verification server-side | ✅ Zod (appleAuthSchema) | authLimiter | LOW | Returns 501 if unconfigured |
| `/auth/refresh` | POST | — | Token rotation | ✅ Zod (refreshSchema) | authLimiter | LOW | Rotates refresh token |
| `/auth/logout` | POST | — | — | ✅ Zod (safeParse) | authLimiter | LOW | Revokes refresh token |
| `/auth/me` | GET | ✅ requireAuth | self-only | — | Global | LOW | Returns own profile |
| `/auth/me` | PATCH | ✅ requireAuth | self-only (`req.user.id`) | ✅ Zod (updateMeSchema) | Global | LOW | Update name/VPA |
| `/auth/forgot-password` | POST | — | Email enumeration protected | ✅ Zod | authLimiter | ⚠️ MEDIUM | **No email sent in production** |
| `/auth/reset-password` | POST | — | Token + one-time-use | ✅ Zod | authLimiter | LOW | Revokes all sessions |
| `/groups` | GET | ✅ requireAuth | own memberships only | — | Global | LOW | |
| `/groups` | POST | ✅ requireAuth | creator becomes owner | ✅ Zod (createGroupSchema) | Global | LOW | |
| `/groups/join/:token` | POST | ✅ requireAuth | invite token gate | — | Global | LOW | Token is 18-byte random |
| `/groups/:groupId` | GET | ✅ requireAuth | ✅ requireGroupMember | — | Global | LOW | |
| `/groups/:groupId/balances` | GET | ✅ requireAuth | ✅ requireGroupMember | — | Global | LOW | |
| `/groups/:groupId/invite` | POST | ✅ requireAuth | ✅ requireGroupMember | — | Global | LOW | Any member can mint invite |
| `/groups/:groupId/expenses` | GET | ✅ requireAuth | ✅ requireGroupMember | — | Global | ⚠️ MEDIUM | **Unbounded results** |
| `/groups/:groupId/expenses` | POST | ✅ requireAuth | ✅ requireGroupMember + member-set checks | ✅ Zod (addExpenseSchema) | Global | LOW | Server recomputes splits |
| `/groups/:groupId/expenses/:eid` | DELETE | ✅ requireAuth | creator/payer only | — | Global | LOW | Soft delete |
| `/groups/:groupId/settlements` | GET | ✅ requireAuth | ✅ requireGroupMember | — | Global | ⚠️ MEDIUM | **Unbounded results** |
| `/groups/:groupId/settlements` | POST | ✅ requireAuth | ✅ requireGroupMember + recipient check | ✅ Zod (initSettlementSchema) | paymentLimiter 30/min | LOW | Idempotency-keyed |
| `/settlements/:id/status` | GET | ✅ requireAuth | party-only | — | Global | LOW | fromUser/toUser check |
| `/settlements/:id/confirm` | POST | ✅ requireAuth | party-only | ✅ Zod (confirmSchema) | Global | ⚠️ LOW | Either party confirms |
| `/devices/register` | POST | ✅ requireAuth | self-only | ✅ Zod (registerDevice) | Global | LOW | Upsert by user+deviceId |
| `/devices/:deviceId` | DELETE | ✅ requireAuth | self-only | — | Global | LOW | |
| `/receipts` | POST | ✅ requireAuth | self-only | ✅ Zod (createReceipt) | receiptLimiter 20/min | ⚠️ MEDIUM | `groupId` not checked against membership |
| `/receipts` | GET | ✅ requireAuth | self-only | — | Global | LOW | Limited to 100 |
| `/receipts/:id` | DELETE | ✅ requireAuth | self-only | — | Global | LOW | Soft delete |
| `/payment-requests` | POST | ✅ requireAuth | self-only | ✅ Zod (createPaymentRequest) | paymentLimiter 30/min | ⚠️ MEDIUM | `groupId`/`receiptId` not validated against membership |
| `/payment-requests` | GET | ✅ requireAuth | party-only | — | Global | LOW | Listed 200 max |
| `/payment-requests/:id/paid` | POST | ✅ requireAuth | party-only | — | Global | LOW | Either party can mark paid |
| `/payment-requests/:id/cancel` | POST | ✅ requireAuth | creditor-only | — | Global | LOW | |
| `/payment-requests/:id/remind` | POST | ✅ requireAuth | creditor-only | — | notifLimiter 60/min + 12h window | LOW | Throttled |
| `/notifications` | GET | ✅ requireAuth | self-only | — | Global | LOW | |
| `/notifications/:id/read` | POST | ✅ requireAuth | self-only | — | notifLimiter | LOW | |
| `/notifications/read-all` | POST | ✅ requireAuth | self-only | — | notifLimiter | LOW | |
| `/insights` | GET | ✅ requireAuth | self-only | ✅ Zod (querySchema) | aiLimiter 15/min | LOW | Period regex validated |

## Cross-Cutting Checks

| Check | Status |
|-------|--------|
| Authentication on all data endpoints | ✅ Every non-public endpoint has `requireAuth` |
| Authorization (ownership/membership) | ✅ No IDOR found |
| Input validation (Zod) | ✅ All mutations validated |
| Error handling | ✅ No stack traces/DB details leaked |
| Response size | ⚠️ Some unbounded (see notes) |
| Rate limiting | ✅ Global + per-feature |
| Sensitive data exposure | ⚠️ `payoutVpa` returned to group members on `GET /groups/:id` — by design (needed for UPI settlement), but VPA is PII |
| Logging | ✅ Structured JSON |
| CORS | ✅ Explicit origins only |
| Caching | ❌ None — every request hits DB |

## Sensitive Data Exposure Review

- `GET /groups/:id` returns `payoutVpa` for all members — necessary for UPI settlement feature (by design), documented as PII risk.
- `GET /payment-requests` joins creditor and returns `payeeVpa` + `payeeName` — again needed for settlement UX.
- `GET /settlements/:id/status` returns full settlement record to either party.
- `payoutVpa` is a UPI identifier — treat as PII.
