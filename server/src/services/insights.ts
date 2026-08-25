/**
 * Spending insights, computed from the user's own paxa history (no external AI).
 * Money each user actually spent = their SHARE of each expense, so a group
 * dinner counts only the payer-independent portion owed by this user.
 *
 * The result is cached per (user, period) in `spending_insights`; callers get an
 * instant read on repeat opens and a fresh compute when `refresh` is requested.
 */
import {and, eq, gte, lt} from 'drizzle-orm';
import {SPENDING_CATEGORIES, type SpendingCategory} from '@splitr/shared';
import {db} from '../db/client';
import {expenses, expenseSplits, settlements, paymentRequests, spendingInsights} from '../db/schema';

export interface InsightPayload {
  period: string; // 'YYYY-MM'
  totals: {
    spentPaise: number;
    receivedPaise: number;
    iOwePaise: number; // pending money the user owes
    owedToMePaise: number; // pending money owed to the user
  };
  categories: {category: SpendingCategory; amountPaise: number}[];
  weekday: {weekdayPaise: number; weekendPaise: number};
  insights: string[];
}

const fmt = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');

function monthBounds(period: string): {start: Date; end: Date; prev: string} {
  const [y, m] = period.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return {start, end, prev: `${py}-${String(pm).padStart(2, '0')}`};
}

const asCategory = (c: string): SpendingCategory =>
  (SPENDING_CATEGORIES as readonly string[]).includes(c) ? (c as SpendingCategory) : 'Other';

/** Sum this user's expense shares within [start, end), bucketed by category + day type. */
async function spendBreakdown(userId: string, start: Date, end: Date) {
  const rows = await db
    .select({
      sharePaise: expenseSplits.sharePaise,
      category: expenses.category,
      createdAt: expenses.createdAt,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
    .where(and(eq(expenseSplits.userId, userId), gte(expenses.createdAt, start), lt(expenses.createdAt, end)));

  const byCat = new Map<SpendingCategory, number>();
  let total = 0;
  let weekday = 0;
  let weekend = 0;
  for (const r of rows) {
    if (r.category == null) {
      continue;
    }
    const cat = asCategory(r.category);
    byCat.set(cat, (byCat.get(cat) ?? 0) + r.sharePaise);
    total += r.sharePaise;
    const day = new Date(r.createdAt).getUTCDay(); // 0 Sun … 6 Sat
    if (day === 0 || day === 6) {
      weekend += r.sharePaise;
    } else {
      weekday += r.sharePaise;
    }
  }
  const categories = SPENDING_CATEGORIES.map(c => ({category: c, amountPaise: byCat.get(c) ?? 0})).filter(
    x => x.amountPaise > 0,
  );
  categories.sort((a, b) => b.amountPaise - a.amountPaise);
  return {total, categories, weekday, weekend};
}

async function periodTotals(userId: string, period: string): Promise<InsightPayload> {
  const {start, end, prev} = monthBounds(period);
  const [cur, prevBreak] = await Promise.all([
    spendBreakdown(userId, start, end),
    (async () => {
      const b = monthBounds(prev);
      return spendBreakdown(userId, b.start, b.end);
    })(),
  ]);

  // Money received this month (completed settlements to this user).
  const received = await db
    .select({amountPaise: settlements.amountPaise})
    .from(settlements)
    .where(
      and(
        eq(settlements.toUser, userId),
        eq(settlements.status, 'completed'),
        gte(settlements.createdAt, start),
        lt(settlements.createdAt, end),
      ),
    );
  const receivedPaise = received.reduce((s, r) => s + r.amountPaise, 0);

  // Current pending obligations (point-in-time, not month-bound).
  const pending = await db
    .select({amountPaise: paymentRequests.amountPaise, fromUser: paymentRequests.fromUser, toUser: paymentRequests.toUser})
    .from(paymentRequests)
    .where(eq(paymentRequests.status, 'pending'));
  let iOwePaise = 0;
  let owedToMePaise = 0;
  for (const p of pending) {
    if (p.toUser === userId) {
      iOwePaise += p.amountPaise;
    }
    if (p.fromUser === userId) {
      owedToMePaise += p.amountPaise;
    }
  }

  const insights: string[] = [];
  if (cur.categories.length > 0) {
    insights.push(`Your largest spending category this month is ${cur.categories[0].category}.`);
    const top = cur.categories[0];
    const prevTop = prevBreak.categories.find(c => c.category === top.category);
    if (prevTop && prevTop.amountPaise > 0) {
      const pct = Math.round(((top.amountPaise - prevTop.amountPaise) / prevTop.amountPaise) * 100);
      if (Math.abs(pct) >= 5) {
        insights.push(
          `You spent ${fmt(top.amountPaise)} on ${top.category} this month, ${Math.abs(pct)}% ${
            pct > 0 ? 'higher' : 'lower'
          } than last month.`,
        );
      }
    }
  }
  if (cur.total > 0 && prevBreak.total > 0) {
    const pct = Math.round(((cur.total - prevBreak.total) / prevBreak.total) * 100);
    if (Math.abs(pct) >= 5) {
      insights.push(`Overall spending is ${Math.abs(pct)}% ${pct > 0 ? 'up' : 'down'} versus last month.`);
    }
  }
  if (cur.weekend > cur.weekday && cur.weekday > 0) {
    insights.push('You spent more on weekends than weekdays this month.');
  }
  if (insights.length === 0) {
    insights.push('Not enough activity yet this month to spot trends.');
  }

  return {
    period,
    totals: {spentPaise: cur.total, receivedPaise, iOwePaise, owedToMePaise},
    categories: cur.categories,
    weekday: {weekdayPaise: cur.weekday, weekendPaise: cur.weekend},
    insights,
  };
}

/** Return cached insights, recomputing when missing or `refresh` is set. */
export async function getInsights(userId: string, period: string, refresh = false): Promise<InsightPayload> {
  if (!refresh) {
    const [cached] = await db
      .select()
      .from(spendingInsights)
      .where(and(eq(spendingInsights.userId, userId), eq(spendingInsights.period, period)))
      .limit(1);
    if (cached) {
      return cached.payload as InsightPayload;
    }
  }
  const payload = await periodTotals(userId, period);
  await db
    .insert(spendingInsights)
    .values({userId, period, payload})
    .onConflictDoUpdate({
      target: [spendingInsights.userId, spendingInsights.period],
      set: {payload, generatedAt: new Date()},
    });
  return payload;
}
