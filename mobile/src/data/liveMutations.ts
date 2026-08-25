import {
  apiAddExpense,
  apiCreateGroup,
  apiInitiateSettlement,
  apiConfirmSettlement,
  apiCreatePaymentRequest,
  apiCreateReceipt,
} from '../api/endpoints';
import type {ReceiptItem} from '../api/types';
import {useSession} from '../auth/session';
import {hydrateFromApi} from './hydrateFromApi';
import {useAppStore, computeSplits, splitValid, type ExpenseForm, type GroupForm} from '../store/useAppStore';

function live(): boolean {
  return useSession.getState().status === 'authed';
}

function mapPaidBy(paidBy: string, selfId: string): string {
  return paidBy === 'you' ? selfId : paidBy;
}

function mapParticipants(ids: string[], selfId: string): string[] {
  return ids.map(id => (id === 'you' ? selfId : id));
}

export async function submitAddExpense(groupId: string, exp: ExpenseForm): Promise<boolean> {
  if (!splitValid(exp)) {
    return false;
  }

  if (!live()) {
    return useAppStore.getState().addExpense();
  }

  const user = useSession.getState().user;
  if (!user) {
    return false;
  }

  const amt = parseFloat(exp.amount) || 0;
  const ids = Object.keys(exp.involved).filter(k => exp.involved[k]);
  const splits = computeSplits(exp);
  const values: Record<string, number> = {};
  ids.forEach(id => {
    values[id === 'you' ? user.id : id] = splits[id];
  });

  await apiAddExpense(groupId, {
    title: exp.title.trim(),
    category: 'Food',
    amount: amt,
    paidBy: mapPaidBy(exp.paidBy, user.id),
    mode: exp.mode,
    participants: mapParticipants(ids, user.id),
    values: exp.mode === 'equal' ? undefined : values,
  });
  await hydrateFromApi();
  useAppStore.setState({sheet: null, tab: 'expenses'});
  return true;
}

export async function submitCreateGroup(grp: GroupForm): Promise<string | null> {
  const mids = Object.keys(grp.members).filter(k => grp.members[k]);
  if (!grp.name.trim() || mids.length < 2) {
    return null;
  }

  if (!live()) {
    return useAppStore.getState().createGroup();
  }

  const memberEmails = mids
    .filter(k => k !== 'you')
    .map(k => `${k}@example.com`);

  const res = await apiCreateGroup({name: grp.name.trim(), fill: grp.color, memberEmails});
  await hydrateFromApi();
  useAppStore.setState({sheet: null, groupId: res.group.id, tab: 'expenses'});
  return res.group.id;
}

export async function submitSettlement(
  groupId: string,
  toUserId: string,
  amount: number,
  method: 'upi' | 'card',
): Promise<{payeeVpa: string | null; payeeName?: string} | null> {
  if (!live()) {
    useAppStore.getState().doPay();
    return {payeeVpa: null};
  }

  const user = useSession.getState().user;
  if (!user) {
    return null;
  }

  const to = toUserId === 'you' ? user.id : toUserId;
  const res = await apiInitiateSettlement(groupId, {
    toUserId: to,
    amount,
    method,
    idempotencyKey: `${groupId}-${to}-${Date.now()}`,
  });

  if (method === 'upi' && res.settlement.id) {
    await apiConfirmSettlement(res.settlement.id);
    await hydrateFromApi();
  }

  useAppStore.getState().doPay();
  return {payeeVpa: res.payeeVpa, payeeName: res.payeeName};
}

export type PaymentRequestInput = {
  toUserId?: string;
  toName: string;
  amount: number;
  note?: string;
  category?: string;
  receiptId?: string;
};

/**
 * Create a money request. Live: POSTs and returns true. Demo/guest: no backend,
 * so we just confirm optimistically (the Tracking screen derives demo pending
 * items from group balances). `isLive` lets callers refresh live caches.
 */
export async function submitPaymentRequest(input: PaymentRequestInput): Promise<boolean> {
  if (input.amount <= 0 || !input.toName.trim()) {
    return false;
  }
  if (!live()) {
    return true;
  }
  await apiCreatePaymentRequest({
    toUserId: input.toUserId,
    toName: input.toName.trim(),
    amount: input.amount,
    note: input.note,
    category: input.category,
    receiptId: input.receiptId,
  });
  return true;
}

export type ReceiptInput = {
  merchant?: string;
  amount: number;
  category?: string;
  receiptDate?: string;
  rawText?: string;
  items?: ReceiptItem[];
};

/** Persist a reviewed scanned receipt (live only); returns its id or null. */
export async function submitReceipt(input: ReceiptInput): Promise<string | null> {
  if (!live() || input.amount <= 0) {
    return null;
  }
  const receipt = await apiCreateReceipt({
    merchant: input.merchant,
    amount: input.amount,
    category: input.category,
    receiptDate: input.receiptDate,
    rawText: input.rawText,
    items: input.items,
  });
  return receipt.id;
}

export function isLive(): boolean {
  return live();
}
