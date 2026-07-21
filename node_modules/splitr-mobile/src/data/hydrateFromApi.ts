import {apiListGroups, apiGetGroup, apiListExpenses, apiListSettlements} from '../api/endpoints';
import type {ApiMember, ApiExpense, ApiSettlement} from '../api/types';
import {useSession} from '../auth/session';
import type {Group, Expense, SettlementRecord} from '../store/useAppStore';
import {useAppStore, MEMBERS, type Member} from '../store/useAppStore';
import {colors} from '../theme';

const PALETTE = [colors.pink, colors.cyan, colors.lime, colors.khaki, '#8aa0ff', '#f5b54a'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function mapMember(m: ApiMember, selfId: string, idx: number): Member {
  const isSelf = m.id === selfId;
  return {
    id: isSelf ? 'you' : m.id,
    name: isSelf ? 'You' : m.displayName,
    initials: isSelf ? 'You' : initials(m.displayName),
    color: m.stickerColor || PALETTE[idx % PALETTE.length],
    vpa: m.payoutVpa ?? `${m.email.split('@')[0]}@upi`,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return 'Today';
  }
  if (diff < 172800000) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});
}

function mapExpense(e: ApiExpense, memberIds: string[], selfId: string): Expense {
  return {
    id: e.id,
    title: e.title,
    cat: e.category || 'Food',
    amount: e.amountPaise / 100,
    paidBy: e.paidBy === selfId ? 'you' : e.paidBy,
    date: formatDate(e.createdAt),
    involved: memberIds,
  };
}

function mapSettlements(settlements: ApiSettlement[], selfId: string): {
  settledPairs: Record<string, boolean>;
  log: Record<string, SettlementRecord[]>;
} {
  const settledPairs: Record<string, boolean> = {};
  const log: Record<string, SettlementRecord[]> = {};

  settlements
    .filter(s => s.status === 'completed')
    .forEach(s => {
      const from = s.fromUser === selfId ? 'you' : s.fromUser;
      const to = s.toUser === selfId ? 'you' : s.toUser;
      if (from === 'you' && to !== 'you') {
        settledPairs[`${s.groupId}:${to}`] = true;
      }
      const entry: SettlementRecord = {
        to: to === 'you' ? from : to,
        amount: s.amountPaise / 100,
        method: s.method,
        date: formatDate(s.completedAt ?? s.createdAt),
      };
      log[s.groupId] = [...(log[s.groupId] ?? []), entry];
    });

  return {settledPairs, log};
}

/** Pull groups, members, expenses, and settlements from the API into the store. */
export async function hydrateFromApi(): Promise<void> {
  const user = useSession.getState().user;
  if (!user) {
    return;
  }

  const summaries = await apiListGroups();
  const membersMap: Record<string, Member> = {};
  const groups: Group[] = [];
  let settledPairs: Record<string, boolean> = {};
  let log: Record<string, SettlementRecord[]> = {};

  for (const summary of summaries) {
    const [detail, expenses, settlements] = await Promise.all([
      apiGetGroup(summary.id),
      apiListExpenses(summary.id),
      apiListSettlements(summary.id),
    ]);

    detail.members.forEach((m, idx) => {
      const mapped = mapMember(m, user.id, idx);
      membersMap[mapped.id] = mapped;
    });

    const memberIds = detail.members.map(m => (m.id === user.id ? 'you' : m.id));
    const mappedExpenses = expenses.map(e => mapExpense(e, memberIds, user.id));
    const settlementMaps = mapSettlements(settlements, user.id);
    settledPairs = {...settledPairs, ...settlementMaps.settledPairs};
    log = {...log, ...settlementMaps.log};

    groups.push({
      id: summary.id,
      name: summary.name,
      fill: summary.fill,
      members: memberIds,
      expenses: mappedExpenses,
    });
  }

  Object.assign(MEMBERS, membersMap);
  useAppStore.setState({
    groups,
    settledPairs,
    log,
    userColor: user.stickerColor || colors.pink,
    groupId: groups[0]?.id ?? 'goa',
  });
}

/** Restore the demo seed data when running without a live session. */
export function resetDemoData(): void {
  useAppStore.getState().resetToDemoSeed();
}

export function isLiveMode(): boolean {
  return useSession.getState().status === 'authed';
}
