import {Router} from 'express';
import {and, desc, eq, isNull} from 'drizzle-orm';
import {createReceiptSchema, rupeesToPaise} from '@splitr/shared';
import {db} from '../db/client';
import {receipts} from '../db/schema';
import {asyncHandler, notFound, audit} from '../lib/http';
import {requireAuth, type AuthedRequest} from '../middleware';
import {receiptLimiter} from '../lib/rateLimits';

/** /receipts — user-scoped scanned bills. OCR happens on-device. */
export const receiptsRouter = Router();
receiptsRouter.use(requireAuth);

/** POST /receipts → store a reviewed scan. */
receiptsRouter.post(
  '/',
  receiptLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const body = createReceiptSchema.parse(req.body);
    const [created] = await db
      .insert(receipts)
      .values({
        userId: me,
        groupId: body.groupId ?? null,
        merchant: body.merchant ?? null,
        category: body.category,
        totalPaise: rupeesToPaise(body.amount),
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : null,
        rawText: body.rawText ?? null,
        items: body.items ?? null,
        status: 'reviewed',
      })
      .returning();
    await audit(me, 'create_receipt', 'receipt', created.id);
    res.status(201).json({receipt: created});
  }),
);

/** GET /receipts → the caller's recent receipts (soft-deletes excluded). */
receiptsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.userId, req.user!.id), isNull(receipts.deletedAt)))
      .orderBy(desc(receipts.createdAt))
      .limit(100);
    res.json({receipts: rows});
  }),
);

/** DELETE /receipts/:id → soft-delete one of the caller's receipts. */
receiptsRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [row] = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.id, req.params.id), eq(receipts.userId, req.user!.id)))
      .limit(1);
    if (!row || row.deletedAt) {
      throw notFound();
    }
    await db.update(receipts).set({deletedAt: new Date()}).where(eq(receipts.id, row.id));
    res.json({ok: true});
  }),
);
