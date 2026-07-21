import {apiAddExpense, apiCreateGroup, apiInitiateSettlement, apiConfirmSettlement} from '../api/endpoints';
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
