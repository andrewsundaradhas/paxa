import {and, eq, isNull, inArray} from 'drizzle-orm';
import {db} from '../db/client';
import {groupMembers, expenses, expenseSplits, settlements} from '../db/schema';
import {computeNetBalances, simplifyDebts, type ExpenseInput, type Transfer} from '@splitr/shared';

/**
 * THE trusted balance calculation. Reads the group's members + non-deleted
 * expenses + their stored shares straight from the DB and recomputes net
 * balances — the client's numbers are never trusted. Completed settlements are
 * folded in as transfers that reduce what's outstanding.
 */
export async function getGroupBalances(groupId: string): Promise<{
  net: Record<string, number>;
  transfers: Transfer[];
}> {
  const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  const memberIds = members.map(m => m.userId);
  if (memberIds.length === 0) {
    return {net: {}, transfers: []};
  }

  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)));

  const expenseIds = rows.map(r => r.id);
  const splits = expenseIds.length
    ? await db.select().from(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds))
    : [];

  const sharesByExpense = new Map<string, Record<string, number>>();
  for (const s of splits) {
    const m = sharesByExpense.get(s.expenseId) ?? {};
    m[s.userId] = s.sharePaise;
    sharesByExpense.set(s.expenseId, m);
  }

  const inputs: ExpenseInput[] = rows.map(r => ({
    amountPaise: r.amountPaise,
    paidBy: r.paidBy,
    shares: sharesByExpense.get(r.id) ?? {},
  }));

  const net = computeNetBalances(memberIds, inputs);

  // Apply completed settlements: payer paid the recipient, so it offsets debt.
  const completed = await db
    .select()
    .from(settlements)
    .where(and(eq(settlements.groupId, groupId), eq(settlements.status, 'completed')));
  for (const s of completed) {
    if (net[s.fromUser] !== undefined) {
      net[s.fromUser] += s.amountPaise; // debtor's negative balance moves toward 0
    }
    if (net[s.toUser] !== undefined) {
      net[s.toUser] -= s.amountPaise;
    }
  }

  return {net, transfers: simplifyDebts(net)};
}
