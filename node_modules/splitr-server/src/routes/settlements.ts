import {Router} from 'express';
import {and, eq, or} from 'drizzle-orm';
import {z} from 'zod';
import {initiateSettlementSchema, rupeesToPaise} from '@splitr/shared';
import {db} from '../db/client';
import {settlements, groupMembers, users} from '../db/schema';
import {asyncHandler, badRequest, notFound, forbidden, audit} from '../lib/http';
import {requireGroupMember, type AuthedRequest} from '../middleware';

const confirmSettlementSchema = z.object({
  upiRef: z.string().max(100).optional(),
});

/** Nested under /groups/:groupId/settlements (membership-guarded). */
export const settlementsRouter = Router({mergeParams: true});
settlementsRouter.use(requireGroupMember);

/**
 * POST /groups/:groupId/settlements → record an intent to pay another member.
 * paxa never moves the money — it returns the payee VPA so the app can open the
 * user's UPI app via a `upi://pay` deep link. Idempotency-keyed.
 */
settlementsRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const groupId = req.params.groupId;
    const me = req.user!.id;
    const body = initiateSettlementSchema.parse(req.body);

    if (body.toUserId === me) {
      throw badRequest('You cannot settle with yourself');
    }
    const [recipient] = await db
      .select()
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, body.toUserId)))
      .limit(1);
    if (!recipient) {
      throw badRequest('Recipient is not a member of this group');
    }

    // Idempotency: a retried request returns the original record instead of a duplicate.
    // Scoped to fromUser so one user cannot observe another's settlement via a shared key.
    const [existing] = await db.select().from(settlements).where(and(eq(settlements.idempotencyKey, body.idempotencyKey), eq(settlements.fromUser, me))).limit(1);
    if (existing) {
      res.status(200).json({settlement: existing, payeeVpa: recipient.users.payoutVpa});
      return;
    }

    const [created] = await db
      .insert(settlements)
      .values({
        groupId,
        fromUser: me,
        toUser: body.toUserId,
        amountPaise: rupeesToPaise(body.amount),
        method: body.method,
        status: 'initiated',
        idempotencyKey: body.idempotencyKey,
      })
      .returning();

    await audit(me, 'initiate_settlement', 'settlement', created.id, {groupId, toUserId: body.toUserId});
    res.status(201).json({settlement: created, payeeVpa: recipient.users.payoutVpa, payeeName: recipient.users.displayName});
  }),
);

/** GET /groups/:groupId/settlements → settlement history for the group. */
settlementsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db.select().from(settlements).where(eq(settlements.groupId, req.params.groupId));
    res.json({settlements: rows});
  }),
);

/** Top-level /settlements/:id ... for status + confirmation. */
export const settlementStatusRouter = Router();

settlementStatusRouter.get(
  '/:id/status',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [s] = await db.select().from(settlements).where(eq(settlements.id, req.params.id)).limit(1);
    if (!s) {
      throw notFound();
    }
    if (s.fromUser !== req.user!.id && s.toUser !== req.user!.id) {
      throw forbidden();
    }
    res.json({status: s.status, settlement: s});
  }),
);

/**
 * POST /settlements/:id/confirm → mark a UPI transfer as completed. Either party
 * can confirm (payer says "I paid", or recipient confirms receipt). Confirmed
 * settlements offset balances in the authoritative balance calc.
 *
 * Production hardening: instead of self-confirm, reconcile against a bank/UPI
 * webhook or an Account Aggregator read so "completed" reflects real money.
 */
settlementStatusRouter.post(
  '/:id/confirm',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [s] = await db.select().from(settlements).where(eq(settlements.id, req.params.id)).limit(1);
    if (!s) {
      throw notFound();
    }
    if (s.fromUser !== req.user!.id && s.toUser !== req.user!.id) {
      throw forbidden();
    }
    if (s.status === 'completed') {
      res.json({settlement: s});
      return;
    }
    const {upiRef} = confirmSettlementSchema.parse(req.body);
    const [updated] = await db
      .update(settlements)
      .set({status: 'completed', completedAt: new Date(), upiRef: upiRef ?? null})
      .where(eq(settlements.id, s.id))
      .returning();
    await audit(req.user!.id, 'confirm_settlement', 'settlement', s.id);
    res.json({settlement: updated});
  }),
);
