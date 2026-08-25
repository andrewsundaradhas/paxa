/**
 * SplitR app state + domain logic.
 *
 * Ported faithfully from the Claude Design prototype (SplitR.dc.html). The
 * prototype's `DCLogic` class becomes a Zustand store: the seed data, pairwise
 * balance engine, four split modes, and settlement/fee flow are preserved
 * exactly so the React Native app behaves like the mockup.
 *
 * NOTE: in production these computations live server-side (server-side
 * recalculation is the trusted boundary — see the PRD threat model). This
 * client-side engine drives the prototype UX and mirrors the server contract.
 */
import {create} from 'zustand';
import {colors} from '../theme';

export type Member = {
  id: string;
  name: string;
  initials: string;
  color: string;
  /** UPI VPA (payee address) used to build the upi:// deep link. */
  vpa: string;
};

export type Expense = {
  id: string;
  title: string;
  cat: string;
  amount: number;
  paidBy: string;
  date: string;
  involved: string[];
};

export type Group = {
  id: string;
  name: string;
  fill: string;
  members: string[];
  expenses: Expense[];
  settledBase?: boolean;
};

export type SettlementRecord = {
  to: string;
  amount: number;
  method: string;
  date: string;
};

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';
export type GroupTab = 'balances' | 'expenses' | 'history';
export type SheetName = 'addExpense' | 'createGroup' | 'settle' | 'success' | 'requestMoney' | 'scanReceipt';

/** Values used to pre-fill the Request-money sheet (e.g. from a scanned receipt). */
export type RequestPrefill = {
  amount?: string;
  toName?: string;
  toUserId?: string;
  note?: string;
  category?: string;
  receiptId?: string;
};

export type ExpenseForm = {
  title: string;
  amount: string;
  paidBy: string;
  mode: SplitMode;
  involved: Record<string, boolean>;
  vals: Record<string, string>;
};

export type GroupForm = {
  name: string;
  color: string;
  members: Record<string, boolean>;
};

/** Members directory — keyed by id, mirrors the prototype's `M`. */
export const MEMBERS: Record<string, Member> = {
  you: {id: 'you', name: 'You', initials: 'You', color: colors.pink, vpa: 'riya@okhdfc'},
  aarav: {id: 'aarav', name: 'Aarav', initials: 'Aa', color: colors.cyan, vpa: 'aarav@oksbi'},
  priya: {id: 'priya', name: 'Priya', initials: 'Pr', color: colors.lime, vpa: 'priya@okaxis'},
  rohan: {id: 'rohan', name: 'Rohan', initials: 'Ro', color: colors.khaki, vpa: 'rohan@okhdfc'},
  meera: {id: 'meera', name: 'Meera', initials: 'Me', color: colors.pink, vpa: 'meera@okicici'},
};

/** Category → sticker colour. */
export const CATEGORY_COLORS: Record<string, string> = {
  Food: colors.lime,
  Travel: colors.cyan,
  Stay: colors.khaki,
  Fun: colors.pink,
  Rent: colors.cyan,
  Bills: colors.khaki,
};

const SEED_GROUPS: Group[] = [
  {
    id: 'goa',
    name: 'Goa Trip 2026',
    fill: colors.khaki,
    members: ['you', 'aarav', 'priya', 'rohan'],
    expenses: [
      {id: 'goa-e1', title: 'Beach shack lunch', cat: 'Food', amount: 2400, paidBy: 'aarav', date: 'Today', involved: ['you', 'aarav', 'priya', 'rohan']},
      {id: 'goa-e2', title: 'Scooter rentals', cat: 'Travel', amount: 1600, paidBy: 'you', date: 'Yesterday', involved: ['you', 'aarav', 'priya', 'rohan']},
      {id: 'goa-e3', title: 'Hotel — night 1', cat: 'Stay', amount: 6400, paidBy: 'priya', date: '2 days ago', involved: ['you', 'aarav', 'priya', 'rohan']},
      {id: 'goa-e4', title: 'Club night', cat: 'Fun', amount: 3000, paidBy: 'rohan', date: '2 days ago', involved: ['you', 'aarav', 'rohan']},
    ],
  },
  {
    id: 'flat',
    name: 'Flat 4B',
    fill: colors.cyan,
    members: ['you', 'aarav', 'meera'],
    expenses: [
      {id: 'flat-e1', title: 'October rent', cat: 'Rent', amount: 45000, paidBy: 'you', date: 'Oct 1', involved: ['you', 'aarav', 'meera']},
      {id: 'flat-e2', title: 'Wifi + electricity', cat: 'Bills', amount: 3600, paidBy: 'meera', date: 'Oct 3', involved: ['you', 'aarav', 'meera']},
      {id: 'flat-e3', title: 'Groceries', cat: 'Food', amount: 2100, paidBy: 'you', date: 'Oct 5', involved: ['you', 'aarav', 'meera']},
    ],
  },
  {
    id: 'din',
    name: 'Friday Dinners',
    fill: colors.pink,
    members: ['you', 'priya', 'meera', 'rohan'],
    settledBase: true,
    expenses: [
      {id: 'din-e1', title: 'Sushi night', cat: 'Food', amount: 4800, paidBy: 'you', date: 'Last Fri', involved: ['you', 'priya', 'meera', 'rohan']},
    ],
  },
];

// ---------------------------------------------------------------------------
// Pure domain helpers (the "balance engine"). Exported for reuse + testing.
// ---------------------------------------------------------------------------

/** Format a number as INR, e.g. 1240 -> "₹1,240". */
export const fmt = (n: number): string => '₹' + Math.round(n).toLocaleString('en-IN');

/**
 * Pairwise balance from YOUR perspective: a positive value means you owe them,
 * negative means they owe you. Keyed by member id (excludes "you").
 */
export const pairwise = (g: Group): Record<string, number> => {
  const map: Record<string, number> = {};
  g.members.forEach(m => {
    if (m !== 'you') {
      map[m] = 0;
    }
  });
  g.expenses.forEach(e => {
    const share = e.amount / e.involved.length;
    if (e.paidBy !== 'you' && e.involved.includes('you') && map[e.paidBy] !== undefined) {
      map[e.paidBy] += share;
    }
    if (e.paidBy === 'you') {
      e.involved.forEach(m => {
        if (m !== 'you' && map[m] !== undefined) {
          map[m] -= share;
        }
      });
    }
  });
  return map;
};

export const youOweTotal = (g: Group, settledPairs: Record<string, boolean>): number => {
  const m = pairwise(g);
  let t = 0;
  Object.entries(m).forEach(([id, v]) => {
    if (v > 0 && !settledPairs[g.id + ':' + id]) {
      t += v;
    }
  });
  return t;
};

export const owedToYouTotal = (g: Group): number => {
  const m = pairwise(g);
  let t = 0;
  Object.values(m).forEach(v => {
    if (v < 0) {
      t += -v;
    }
  });
  return t;
};

export const topCreditor = (g: Group, settledPairs: Record<string, boolean> = {}): Member => {
  const m = pairwise(g);
  let best: string | null = null;
  let amt = 0;
  Object.entries(m).forEach(([k, v]) => {
    if (v > amt && !settledPairs[g.id + ':' + k]) {
      amt = v;
      best = k;
    }
  });
  return best ? MEMBERS[best] : MEMBERS[g.members.find(x => x !== 'you') as string];
};

export const groupSettled = (g: Group, settledPairs: Record<string, boolean>, log: Record<string, SettlementRecord[]>): boolean => {
  if (g.settledBase && !log[g.id]) {
    return true;
  }
  return youOweTotal(g, settledPairs) < 1 && owedToYouTotal(g) < 1;
};

// paxa never takes a cut: settlement moves the exact amount, peer-to-peer over
// the user's own UPI app. No platform fee (free P2P UPI; keeps paxa out of the
// payment-intermediary regulatory perimeter).

/** Category bar colours for the spending-insights breakdown. */
export const CAT_BAR_COLORS: Record<string, string> = {
  Food: '#c2f23f',
  Travel: '#02bbff',
  Stay: '#e7e3bf',
  Fun: '#fa00ff',
  Rent: '#8aa0ff',
  Bills: '#f5b54a',
};

export type InsightCategory = {name: string; color: string; amount: string; pct: string; barW: number};
export type TrendBar = {label: string; h: number; last: boolean; amount: string};
export type Insights = {total: string; topCatName: string; topCatPct: string; categories: InsightCategory[]; trendBars: TrendBar[]};

/**
 * Your spending across every expense you're part of, by category, plus a
 * 6-month trend. Mirrors the canonical Premium design's insights block.
 */
export const spendingInsights = (groups: Group[]): Insights => {
  const catTotals: Record<string, number> = {};
  let yourSpend = 0;
  groups.forEach(g =>
    g.expenses.forEach(e => {
      if (!e.involved.includes('you')) {
        return;
      }
      const share = e.amount / e.involved.length;
      yourSpend += share;
      catTotals[e.cat] = (catTotals[e.cat] || 0) + share;
    }),
  );
  const catMax = Math.max(1, ...Object.values(catTotals));
  const categories: InsightCategory[] = Object.keys(catTotals)
    .sort((a, b) => catTotals[b] - catTotals[a])
    .map(name => ({
      name,
      color: CAT_BAR_COLORS[name] || colors.khaki,
      amount: fmt(catTotals[name]),
      pct: Math.round((catTotals[name] / (yourSpend || 1)) * 100) + '%',
      barW: Math.max(6, Math.round((catTotals[name] / catMax) * 100)),
    }));
  const trendVals = [0.42, 0.61, 0.38, 0.74, 0.55, 1.0];
  const trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const trendBars: TrendBar[] = trendVals.map((v, i) => ({
    label: trendLabels[i],
    h: Math.round(v * 100),
    last: i === trendVals.length - 1,
    amount: i === trendVals.length - 1 ? fmt(yourSpend) : '',
  }));
  const topCat = categories[0];
  return {
    total: fmt(yourSpend),
    topCatName: topCat ? topCat.name : '—',
    topCatPct: topCat ? topCat.pct : '',
    categories,
    trendBars,
  };
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type AppState = {
  groups: Group[];
  settledPairs: Record<string, boolean>;
  log: Record<string, SettlementRecord[]>;
  userColor: string;

  groupId: string;
  billId: string;
  tab: GroupTab;

  sheet: SheetName | null;
  settleMethod: 'upi' | 'card';
  settleTarget: string | null;

  exp: ExpenseForm | null;
  grp: GroupForm | null;

  /** Transient toast message (auto-clears) + which debts have been reminded. */
  toast: string | null;
  reminded: Record<string, boolean>;

  // selectors
  group: (id?: string) => Group | undefined;

  // feedback
  flash: (msg: string) => void;
  remind: (key: string, name: string) => void;

  // navigation-ish state
  setGroupId: (id: string) => void;
  setBillId: (id: string) => void;
  setTab: (tab: GroupTab) => void;
  setUserColor: (c: string) => void;

  // sheets
  openSheet: (name: SheetName, target?: string) => void;
  closeSheet: () => void;
  setSettleMethod: (m: 'upi' | 'card') => void;

  // request money / scan receipt
  requestPrefill: RequestPrefill | null;
  openRequestSheet: (prefill?: RequestPrefill) => void;
  openScanSheet: () => void;

  // add expense
  patchExp: (patch: Partial<ExpenseForm>) => void;
  addExpense: () => boolean;

  // create group
  patchGrp: (patch: Partial<GroupForm>) => void;
  createGroup: () => string | null;

  // settle
  doPay: () => void;
  finishPay: () => void;

  /** Reset to bundled demo seed data (offline / guest mode). */
  resetToDemoSeed: () => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set, get) => ({
  groups: SEED_GROUPS,
  settledPairs: {},
  log: {},
  userColor: colors.pink,
  toast: null,
  reminded: {},

  groupId: 'goa',
  billId: 'goa-e1',
  tab: 'balances',

  sheet: null,
  settleMethod: 'upi',
  settleTarget: null,
  requestPrefill: null,

  exp: null,
  grp: null,

  group: id => {
    const gid = id ?? get().groupId;
    return get().groups.find(g => g.id === gid);
  },

  flash: msg => {
    set({toast: msg});
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => set({toast: null}), 2200);
  },
  remind: (key, name) => {
    set({reminded: {...get().reminded, [key]: true}});
    get().flash('Reminder sent to ' + name);
  },

  setGroupId: id => set({groupId: id, tab: 'balances'}),
  setBillId: id => set({billId: id}),
  setTab: tab => set({tab}),
  setUserColor: c => {
    set({userColor: c});
    get().flash('Sticker color updated');
  },

  openSheet: (name, target) => {
    if (name === 'addExpense') {
      const g = get().group();
      const involved: Record<string, boolean> = {};
      g?.members.forEach(m => {
        involved[m] = true;
      });
      set({
        sheet: name,
        exp: {title: '', amount: '', paidBy: 'you', mode: 'equal', involved, vals: {}},
      });
      return;
    }
    if (name === 'createGroup') {
      set({sheet: name, grp: {name: '', color: colors.cyan, members: {you: true}}});
      return;
    }
    if (name === 'settle') {
      set({sheet: name, settleMethod: 'upi', settleTarget: target ?? null});
      return;
    }
    set({sheet: name});
  },
  closeSheet: () => set({sheet: null}),
  setSettleMethod: m => set({settleMethod: m}),

  openRequestSheet: prefill => set({sheet: 'requestMoney', requestPrefill: prefill ?? null}),
  openScanSheet: () => set({sheet: 'scanReceipt'}),

  patchExp: patch => {
    const exp = get().exp;
    if (!exp) {
      return;
    }
    set({exp: {...exp, ...patch}});
  },

  addExpense: () => {
    const {exp, group} = get();
    const g = group();
    if (!exp || !g) {
      return false;
    }
    const amt = parseFloat(exp.amount) || 0;
    const ids = Object.keys(exp.involved).filter(k => exp.involved[k]);
    if (!exp.title.trim() || amt <= 0 || ids.length === 0) {
      return false;
    }
    if (exp.mode === 'exact' || exp.mode === 'percent') {
      const splits = computeSplits(exp);
      let sum = 0;
      ids.forEach(id => {
        sum += splits[id];
      });
      if (Math.abs(sum - amt) >= 1) {
        return false;
      }
    }
    const newExpense: Expense = {
      id: g.id + '-u' + Date.now(),
      title: exp.title.trim(),
      cat: 'Food',
      amount: amt,
      paidBy: exp.paidBy,
      date: 'Just now',
      involved: ids,
    };
    // settling a fresh expense re-opens that group's debts
    const settledPairs = {...get().settledPairs};
    Object.keys(settledPairs).forEach(k => {
      if (k.indexOf(g.id + ':') === 0) {
        delete settledPairs[k];
      }
    });
    set({
      groups: get().groups.map(grp =>
        grp.id === g.id ? {...grp, expenses: [newExpense, ...grp.expenses]} : grp,
      ),
      sheet: null,
      settledPairs,
      tab: 'expenses',
    });
    return true;
  },

  patchGrp: patch => {
    const grp = get().grp;
    if (!grp) {
      return;
    }
    set({grp: {...grp, ...patch}});
  },

  createGroup: () => {
    const f = get().grp;
    if (!f) {
      return null;
    }
    const mids = Object.keys(f.members).filter(k => f.members[k]);
    if (!f.name.trim() || mids.length < 2) {
      return null;
    }
    const id = 'grp' + Date.now();
    set({
      groups: get().groups.concat([{id, name: f.name.trim(), fill: f.color, members: mids, expenses: []}]),
      sheet: null,
      groupId: id,
      tab: 'expenses',
    });
    return id;
  },

  doPay: () => set({sheet: 'success'}),

  finishPay: () => {
    const {group, settleTarget, settledPairs, log} = get();
    const g = group();
    if (!g) {
      return;
    }
    const tid = settleTarget ?? topCreditor(g, settledPairs).id;
    const pw = pairwise(g);
    const amount = Math.max(0, pw[tid] || 0);
    const rec: SettlementRecord = {to: MEMBERS[tid].name, amount, method: get().settleMethod, date: 'Just now'};
    const nextLog = {...log};
    nextLog[g.id] = (nextLog[g.id] || []).concat([rec]);
    set({
      sheet: null,
      settledPairs: {...settledPairs, [g.id + ':' + tid]: true},
      log: nextLog,
      tab: 'history',
    });
  },

  resetToDemoSeed: () =>
    set({
      groups: SEED_GROUPS,
      settledPairs: {},
      log: {},
      groupId: 'goa',
      billId: 'goa-e1',
      tab: 'balances',
      sheet: null,
      userColor: colors.pink,
    }),
}));

/**
 * Compute the per-member share for the active add-expense form. Mirrors the
 * prototype's `computeSplits` across all four split modes.
 */
export const computeSplits = (e: ExpenseForm): Record<string, number> => {
  const amt = parseFloat(e.amount) || 0;
  const ids = Object.keys(e.involved).filter(k => e.involved[k]);
  const out: Record<string, number> = {};
  if (e.mode === 'equal') {
    ids.forEach(id => {
      out[id] = ids.length ? amt / ids.length : 0;
    });
  } else if (e.mode === 'exact') {
    ids.forEach(id => {
      out[id] = parseFloat(e.vals[id]) || 0;
    });
  } else if (e.mode === 'percent') {
    ids.forEach(id => {
      out[id] = (amt * (parseFloat(e.vals[id]) || 0)) / 100;
    });
  } else if (e.mode === 'shares') {
    let tot = 0;
    ids.forEach(id => {
      tot += parseFloat(e.vals[id]) || 0;
    });
    ids.forEach(id => {
      out[id] = tot ? (amt * (parseFloat(e.vals[id]) || 0)) / tot : 0;
    });
  }
  return out;
};

/** Whether the active add-expense form is valid to submit. */
export const splitValid = (e: ExpenseForm | null): boolean => {
  if (!e) {
    return false;
  }
  const amt = parseFloat(e.amount) || 0;
  const ids = Object.keys(e.involved).filter(k => e.involved[k]);
  if (!e.title.trim() || amt <= 0 || ids.length === 0) {
    return false;
  }
  if (e.mode === 'equal' || e.mode === 'shares') {
    return true;
  }
  const splits = computeSplits(e);
  let sum = 0;
  ids.forEach(id => {
    sum += splits[id];
  });
  return Math.abs(sum - amt) < 1;
};
