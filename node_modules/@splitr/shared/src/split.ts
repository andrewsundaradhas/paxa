/**
 * Authoritative split & balance math — shared by the mobile client (for live
 * UX) and, definitively, by the server (which recomputes everything and never
 * trusts client-sent shares).
 *
 * All money is integer **paise** to avoid floating-point drift. ₹2,400.00 =
 * 240000 paise. Remainder paise from uneven divisions are distributed
 * deterministically so shares always sum back to the exact total.
 */

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';

/**
 * Expand an expense into per-participant shares (in paise).
 * - equal:   amount split evenly; leftover paise go to the first participants.
 * - exact:   `values[id]` is each person's paise amount.
 * - percent: `values[id]` is each person's percentage (0–100).
 * - shares:  `values[id]` is a weight; amount is split proportionally.
 * For percent/shares the last participant absorbs rounding so the sum is exact.
 */
export function computeShares(
  amountPaise: number,
  mode: SplitMode,
  participants: string[],
  values: Record<string, number> = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  const n = participants.length;
  if (n === 0 || amountPaise < 0) {
    return out;
  }

  if (mode === 'equal') {
    const base = Math.floor(amountPaise / n);
    const remainder = amountPaise - base * n;
    participants.forEach((id, i) => {
      out[id] = base + (i < remainder ? 1 : 0);
    });
  } else if (mode === 'exact') {
    participants.forEach(id => {
      out[id] = Math.round(values[id] || 0);
    });
  } else if (mode === 'percent') {
    let assigned = 0;
    participants.forEach((id, i) => {
      if (i < n - 1) {
        const v = Math.round((amountPaise * (values[id] || 0)) / 100);
        out[id] = v;
        assigned += v;
      } else {
        out[id] = amountPaise - assigned;
      }
    });
  } else {
    // shares
    const total = participants.reduce((s, id) => s + (values[id] || 0), 0) || 1;
    let assigned = 0;
    participants.forEach((id, i) => {
      if (i < n - 1) {
        const v = Math.round((amountPaise * (values[id] || 0)) / total);
        out[id] = v;
        assigned += v;
      } else {
        out[id] = amountPaise - assigned;
      }
    });
  }
  return out;
}

/** Shares are valid when they're non-negative and sum to the exact amount. */
export function validateShares(amountPaise: number, shares: Record<string, number>): boolean {
  const values = Object.values(shares);
  if (values.some(v => v < 0 || !Number.isFinite(v))) {
    return false;
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - amountPaise) < 1;
}

export type ExpenseInput = {
  amountPaise: number;
  paidBy: string;
  /** Per-participant share in paise (already expanded + validated). */
  shares: Record<string, number>;
};

/**
 * Net balance per member (paise). Positive => net creditor (others owe them);
 * negative => net debtor (they owe). Sums to ~0 across the group.
 */
export function computeNetBalances(memberIds: string[], expenses: ExpenseInput[]): Record<string, number> {
  const net: Record<string, number> = {};
  memberIds.forEach(id => {
    net[id] = 0;
  });
  expenses.forEach(e => {
    if (net[e.paidBy] !== undefined) {
      net[e.paidBy] += e.amountPaise;
    }
    Object.entries(e.shares).forEach(([id, share]) => {
      if (net[id] !== undefined) {
        net[id] -= share;
      }
    });
  });
  return net;
}

export type Transfer = {from: string; to: string; amountPaise: number};

/**
 * Debt simplification: turn net balances into the minimal set of pay-this-person
 * transfers (greedy largest-debtor → largest-creditor). Settling these clears
 * the whole group with the fewest payments.
 */
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({id, amt: -v}))
    .sort((a, b) => b.amt - a.amt);
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({id, amt: v}))
    .sort((a, b) => b.amt - a.amt);

  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) {
      out.push({from: debtors[i].id, to: creditors[j].id, amountPaise: pay});
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) {
      i++;
    }
    if (creditors[j].amt === 0) {
      j++;
    }
  }
  return out;
}

export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);
export const paiseToRupees = (paise: number): number => paise / 100;
export const formatPaise = (paise: number): string => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
