import {Router} from 'express';
import {and, eq, isNull} from 'drizzle-orm';
import {addExpenseSchema, computeShares, validateShares, rupeesToPaise} from '@splitr/shared';
import {db} from '../db/client';
import {groupMembers, expenses, expenseSplits} from '../db/schema';
import {asyncHandler, badRequest, notFound, forbidden, audit} from '../lib/http';
import {requireGroupMember, type AuthedRequest} from '../middleware';

// mergeParams so :groupId from the parent mount is visible here.
export const expensesRouter = Router({mergeParams: true});
expensesRouter.use(requireGroupMember);

/** GET /groups/:groupId/expenses → non-deleted expenses with their splits. */
expensesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.groupId, req.params.groupId), isNull(expenses.deletedAt)));
    res.json({expenses: rows});
  }),
);

/**
 * POST /groups/:groupId/expenses → add an expense.
 * The server expands the split from (amount, mode, participants, values) and
 * validates it sums to the total. Client-sent shares are NEVER trusted.
 */
expensesRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const groupId = req.params.groupId;
    const body = addExpenseSchema.parse(req.body);

    const members = await db.select({userId: groupMembers.userId}).from(groupMembers).where(eq(groupMembers.groupId, groupId));
    const memberSet = new Set(members.map(m => m.userId));
    if (!memberSet.has(body.paidBy)) {
      throw badRequest('paidBy must be a group member');
    }
    if (!body.participants.every(p => memberSet.has(p))) {
      throw badRequest('All participants must be group members');
    }

    const amountPaise = rupeesToPaise(body.amount);
    // For 'exact', the per-person values arrive in rupees; convert to paise.
    const engineValues: Record<string, number> = {};
    if (body.values) {
      for (const [k, v] of Object.entries(body.values)) {
        engineValues[k] = body.mode === 'exact' ? rupeesToPaise(v) : v;
      }
    }
    const shares = computeShares(amountPaise, body.mode, body.participants, engineValues);
    if (!validateShares(amountPaise, shares)) {
      throw badRequest('Split does not add up to the total amount');
    }

    const expense = await db.transaction(async tx => {
      const [created] = await tx
        .insert(expenses)
        .values({
          groupId,
          title: body.title,
          category: body.category,
          amountPaise,
          paidBy: body.paidBy,
          note: body.note,
          createdBy: req.user!.id,
        })
        .returning();
      await tx.insert(expenseSplits).values(
        Object.entries(shares).map(([userId, sharePaise]) => ({expenseId: created.id, userId, sharePaise})),
      );
      return created;
    });

    await audit(req.user!.id, 'add_expense', 'expense', expense.id, {groupId, amountPaise});
    res.status(201).json({expense, shares});
  }),
);

/** DELETE /groups/:groupId/expenses/:expenseId → soft delete (audit-logged). */
expensesRouter.delete(
  '/:expenseId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, req.params.expenseId), eq(expenses.groupId, req.params.groupId)))
      .limit(1);
    if (!expense || expense.deletedAt) {
      throw notFound('Expense not found');
    }
    // Only the creator or the payer can delete.
    if (expense.createdBy !== req.user!.id && expense.paidBy !== req.user!.id) {
      throw forbidden('Only the creator or payer can delete this expense');
    }
    await db.update(expenses).set({deletedAt: new Date()}).where(eq(expenses.id, expense.id));
    await audit(req.user!.id, 'delete_expense', 'expense', expense.id, {groupId: req.params.groupId});
    res.json({ok: true});
  }),
);
