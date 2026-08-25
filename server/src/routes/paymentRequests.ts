import {Router} from 'express';
import {and, desc, eq, or} from 'drizzle-orm';
import {createPaymentRequestSchema, rupeesToPaise, formatPaise} from '@splitr/shared';
import {db} from '../db/client';
import {paymentRequests, notifications, users} from '../db/schema';
import {asyncHandler, badRequest, notFound, forbidden, audit} from '../lib/http';
import {requireAuth, type AuthedRequest} from '../middleware';
import {paymentLimiter, notificationLimiter} from '../lib/rateLimits';

/** /payment-requests — 1:1 money requests (checklist of "I owe / owed to me"). */
export const paymentRequestsRouter = Router();
paymentRequestsRouter.use(requireAuth);

/** Best-effort in-app notification insert; never blocks the request. */
async function notify(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    await db.insert(notifications).values({userId, type, title, body, data: data ?? null});
  } catch (err) {
    console.error('notify failed', err);
  }
}

/** POST /payment-requests → ask someone to pay you. */
paymentRequestsRouter.post(
  '/',
  paymentLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const body = createPaymentRequestSchema.parse(req.body);
    if (body.toUserId === me) {
      throw badRequest('You cannot request money from yourself');
    }

    // Resolve the payer's display name when they are a paxa user.
    let toName = body.toName ?? null;
    if (body.toUserId) {
      const [payer] = await db.select().from(users).where(eq(users.id, body.toUserId)).limit(1);
      if (!payer) {
        throw badRequest('Payer is not a paxa user');
      }
      toName = toName ?? payer.displayName;
    }

    const amountPaise = rupeesToPaise(body.amount);
    const [created] = await db
      .insert(paymentRequests)
      .values({
        fromUser: me,
        toUser: body.toUserId ?? null,
        toName: toName!, // schema guarantees toUserId or toName was provided
        amountPaise,
        note: body.note ?? null,
        category: body.category,
        receiptId: body.receiptId ?? null,
        groupId: body.groupId ?? null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: 'pending',
      })
      .returning();

    if (body.toUserId) {
      const [requester] = await db.select().from(users).where(eq(users.id, me)).limit(1);
      await notify(
        body.toUserId,
        'payment_request',
        `${requester?.displayName ?? 'Someone'} requested ${formatPaise(amountPaise)}`,
        body.note ?? '',
        {paymentRequestId: created.id},
      );
    }
    await audit(me, 'create_payment_request', 'payment_request', created.id);
    res.status(201).json({paymentRequest: created});
  }),
);

/**
 * GET /payment-requests → the caller's requests, split for the checklist UI:
 *  - `owedToMe`: requests I created (money others owe me)
 *  - `iOwe`:     requests where I'm the payer (money I owe)
 */
paymentRequestsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const rows = await db
      .select()
      .from(paymentRequests)
      .where(or(eq(paymentRequests.fromUser, me), eq(paymentRequests.toUser, me)))
      .orderBy(desc(paymentRequests.createdAt))
      .limit(200);
    res.json({
      owedToMe: rows.filter(r => r.fromUser === me),
      iOwe: rows.filter(r => r.toUser === me),
    });
  }),
);

/** Load a request the caller is party to, or 404/403. */
async function loadOwn(id: string, me: string) {
  const [r] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).limit(1);
  if (!r) {
    throw notFound();
  }
  if (r.fromUser !== me && r.toUser !== me) {
    throw forbidden();
  }
  return r;
}

/** POST /payment-requests/:id/paid → mark settled (either party may confirm). */
paymentRequestsRouter.post(
  '/:id/paid',
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const r = await loadOwn(req.params.id, me);
    if (r.status === 'paid') {
      res.json({paymentRequest: r});
      return;
    }
    if (r.status === 'cancelled') {
      throw badRequest('Request was cancelled');
    }
    const [updated] = await db
      .update(paymentRequests)
      .set({status: 'paid', paidAt: new Date()})
      .where(eq(paymentRequests.id, r.id))
      .returning();
    // Tell the other party it's settled.
    const other = me === r.fromUser ? r.toUser : r.fromUser;
    if (other) {
      await notify(other, 'paid', `${formatPaise(r.amountPaise)} marked paid`, r.note ?? '', {paymentRequestId: r.id});
    }
    await audit(me, 'mark_payment_request_paid', 'payment_request', r.id);
    res.json({paymentRequest: updated});
  }),
);

/** POST /payment-requests/:id/cancel → only the creditor can cancel. */
paymentRequestsRouter.post(
  '/:id/cancel',
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const r = await loadOwn(req.params.id, me);
    if (r.fromUser !== me) {
      throw forbidden('Only the requester can cancel');
    }
    if (r.status === 'paid') {
      throw badRequest('Already paid');
    }
    const [updated] = await db
      .update(paymentRequests)
      .set({status: 'cancelled'})
      .where(eq(paymentRequests.id, r.id))
      .returning();
    await audit(me, 'cancel_payment_request', 'payment_request', r.id);
    res.json({paymentRequest: updated});
  }),
);

/**
 * POST /payment-requests/:id/remind → nudge the payer. Throttled to once every
 * 12h per request so reminders stay useful, not annoying.
 */
paymentRequestsRouter.post(
  '/:id/remind',
  notificationLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const r = await loadOwn(req.params.id, me);
    if (r.fromUser !== me) {
      throw forbidden('Only the requester can send reminders');
    }
    if (r.status !== 'pending') {
      throw badRequest('Request is not pending');
    }
    if (!r.toUser) {
      throw badRequest('This request has no paxa payer to remind');
    }
    const TWELVE_H = 12 * 60 * 60 * 1000;
    if (r.remindedAt && Date.now() - r.remindedAt.getTime() < TWELVE_H) {
      throw badRequest('Already reminded recently — try again later');
    }
    await db.update(paymentRequests).set({remindedAt: new Date()}).where(eq(paymentRequests.id, r.id));
    const [requester] = await db.select().from(users).where(eq(users.id, me)).limit(1);
    await notify(
      r.toUser,
      'reminder',
      `Reminder: you owe ${requester?.displayName ?? 'someone'} ${formatPaise(r.amountPaise)}`,
      r.note ?? '',
      {paymentRequestId: r.id},
    );
    await audit(me, 'remind_payment_request', 'payment_request', r.id);
    res.json({ok: true});
  }),
);
