import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius, softShadow, hairline} from '../theme';
import {TabBar} from '../components/TabBar';
import {BackButton} from '../components/common';
import {useAppStore, fmt, pairwise, MEMBERS} from '../store/useAppStore';
import {usePaymentRequests, useMarkRequestPaid, useRemindRequest} from '../api/hooks';
import {isLive} from '../data/liveMutations';
import type {ApiPaymentRequest} from '../api/types';
import type {ScreenProps} from '../navigation/types';

type Direction = 'iOwe' | 'owedToMe';

type TrackItem = {
  key: string;
  name: string;
  amount: number; // rupees
  direction: Direction;
  status: 'pending' | 'paid';
  ageDays: number | null;
  source: 'request' | 'group';
  requestId?: string;
  groupId?: string;
  memberId?: string;
};

const daysSince = (iso: string | null): number | null => {
  if (!iso) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
};

const ageLabel = (d: number | null): string => {
  if (d == null) {
    return '';
  }
  if (d === 0) {
    return 'today';
  }
  if (d === 1) {
    return '1 day';
  }
  return `${d} days`;
};

function fromRequest(r: ApiPaymentRequest, direction: Direction): TrackItem {
  return {
    key: `req-${r.id}`,
    name: r.toName,
    amount: r.amountPaise / 100,
    direction,
    status: r.status === 'paid' ? 'paid' : 'pending',
    ageDays: daysSince(r.createdAt),
    source: 'request',
    requestId: r.id,
  };
}

/** Pending peer balances derived from all groups (works offline / demo). */
function groupDerived(
  groups: ReturnType<typeof useAppStore.getState>['groups'],
  settledPairs: Record<string, boolean>,
): TrackItem[] {
  const out: TrackItem[] = [];
  groups.forEach(g => {
    const pw = pairwise(g);
    Object.entries(pw).forEach(([mid, v]) => {
      if (Math.abs(v) < 1 || settledPairs[`${g.id}:${mid}`]) {
        return;
      }
      const member = MEMBERS[mid];
      out.push({
        key: `grp-${g.id}-${mid}`,
        name: member?.name ?? mid,
        amount: Math.abs(v),
        direction: v > 0 ? 'iOwe' : 'owedToMe',
        status: 'pending',
        ageDays: null,
        source: 'group',
        groupId: g.id,
        memberId: mid,
      });
    });
  });
  return out;
}

export const TrackingScreen: React.FC<ScreenProps<'Tracking'>> = ({navigation}) => {
  const live = isLive();
  const groups = useAppStore(s => s.groups);
  const settledPairs = useAppStore(s => s.settledPairs);
  const setGroupId = useAppStore(s => s.setGroupId);
  const openSheet = useAppStore(s => s.openSheet);
  const openRequestSheet = useAppStore(s => s.openRequestSheet);
  const remind = useAppStore(s => s.remind);
  const flash = useAppStore(s => s.flash);

  const requests = usePaymentRequests(live);
  const markPaid = useMarkRequestPaid();
  const remindReq = useRemindRequest();

  const reqItems: TrackItem[] = [
    ...(requests.data?.iOwe ?? []).map(r => fromRequest(r, 'iOwe')),
    ...(requests.data?.owedToMe ?? []).map(r => fromRequest(r, 'owedToMe')),
  ];
  const items = [...reqItems, ...groupDerived(groups, settledPairs)];

  const iOwe = items.filter(i => i.direction === 'iOwe');
  const owedToMe = items.filter(i => i.direction === 'owedToMe');
  const totOwe = iOwe.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totOwed = owedToMe.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);

  const onPay = (it: TrackItem) => {
    if (it.source === 'request' && it.requestId) {
      markPaid.mutate(it.requestId, {onSuccess: () => flash('Marked as paid')});
    } else if (it.groupId) {
      setGroupId(it.groupId);
      navigation.navigate('GroupDetail');
      if (it.memberId) {
        openSheet('settle', it.memberId);
      }
    }
  };

  const onRemind = (it: TrackItem) => {
    if (it.source === 'request' && it.requestId) {
      remindReq.mutate(it.requestId, {
        onSuccess: () => flash(`Reminder sent to ${it.name}`),
        onError: () => flash('Reminder throttled — try again later'),
      });
    } else {
      remind(it.key, it.name);
    }
  };

  const onReceived = (it: TrackItem) => {
    if (it.source === 'request' && it.requestId) {
      markPaid.mutate(it.requestId, {onSuccess: () => flash('Marked as received')});
    } else {
      flash('Settle up inside the group to clear this');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topTitle}>Tracking</Text>
        <TouchableOpacity onPress={() => openRequestSheet()} activeOpacity={0.85} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={[styles.sumCard, {backgroundColor: colors.ink}]}>
            <Text style={styles.sumLabel}>You owe</Text>
            <Text style={styles.sumValue}>{fmt(totOwe)}</Text>
            <Text style={styles.sumSub}>{iOwe.filter(i => i.status === 'pending').length} pending</Text>
          </View>
          <View style={[styles.sumCard, styles.sumCardLight]}>
            <Text style={[styles.sumLabel, {color: colors.muted}]}>Owed to you</Text>
            <Text style={[styles.sumValue, {color: colors.limeDark}]}>{fmt(totOwed)}</Text>
            <Text style={[styles.sumSub, {color: colors.muted2}]}>{owedToMe.filter(i => i.status === 'pending').length} pending</Text>
          </View>
        </View>

        {live && requests.isLoading && <ActivityIndicator style={styles.loader} color={colors.ink} />}

        <Section
          title="Money I owe"
          empty="You're all clear — nothing to pay."
          items={iOwe}
          actionLabel="Mark paid"
          onAction={onPay}
        />
        <Section
          title="Money owed to me"
          empty="No one owes you right now."
          items={owedToMe}
          actionLabel="Remind"
          secondaryLabel="Received"
          onAction={onRemind}
          onSecondary={onReceived}
        />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

const Section: React.FC<{
  title: string;
  empty: string;
  items: TrackItem[];
  actionLabel: string;
  secondaryLabel?: string;
  onAction: (it: TrackItem) => void;
  onSecondary?: (it: TrackItem) => void;
}> = ({title, empty, items, actionLabel, secondaryLabel, onAction, onSecondary}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.length === 0 ? (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{empty}</Text>
      </View>
    ) : (
      <View style={styles.list}>
        {items.map(it => {
          const paid = it.status === 'paid';
          return (
            <View key={it.key} style={styles.row}>
              <View style={[styles.check, paid && styles.checkOn]}>
                {paid && <Text style={styles.checkGlyph}>✓</Text>}
              </View>
              <View style={styles.rowMid}>
                <Text style={[styles.rowName, paid && styles.rowNamePaid]}>{it.name}</Text>
                <Text style={styles.rowSub}>
                  {fmt(it.amount)}
                  {paid ? ' · Paid' : it.ageDays != null ? ` · Pending ${ageLabel(it.ageDays)}` : ' · Pending'}
                </Text>
              </View>
              {!paid && (
                <View style={styles.actions}>
                  {secondaryLabel && onSecondary && (
                    <TouchableOpacity onPress={() => onSecondary(it)} activeOpacity={0.8} style={styles.secondaryBtn}>
                      <Text style={styles.secondaryText}>{secondaryLabel}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => onAction(it)} activeOpacity={0.85} style={styles.actionBtn}>
                    <Text style={styles.actionText}>{actionLabel}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8},
  topTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, color: colors.ink},
  newBtn: {backgroundColor: colors.lime, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14},
  newBtnText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 13, color: colors.ink},

  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  summaryRow: {flexDirection: 'row', gap: 11, marginBottom: 22},
  sumCard: {flex: 1, borderRadius: radius.card, padding: 16, overflow: 'hidden'},
  sumCardLight: {backgroundColor: colors.white, ...hairline, ...softShadow},
  sumLabel: {fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  sumValue: {fontFamily: fonts.display, fontWeight: '800', fontSize: 26, color: colors.white, marginTop: 4, letterSpacing: -0.5},
  sumSub: {fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 3},

  loader: {marginBottom: 16},
  section: {marginBottom: 24},
  sectionTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink, marginBottom: 12, marginHorizontal: 2},
  emptyCard: {backgroundColor: colors.white, ...hairline, borderRadius: radius.card, padding: 18, alignItems: 'center'},
  emptyText: {fontSize: 13.5, color: colors.muted, fontWeight: '500'},

  list: {gap: 10},
  row: {flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, ...hairline, ...softShadow, borderRadius: radius.card, padding: 13, paddingHorizontal: 15},
  check: {width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.track, alignItems: 'center', justifyContent: 'center'},
  checkOn: {backgroundColor: colors.limeDark, borderColor: colors.limeDark},
  checkGlyph: {color: colors.white, fontSize: 13, fontWeight: '800'},
  rowMid: {flex: 1, minWidth: 0},
  rowName: {fontSize: 15.5, fontWeight: '600', color: colors.ink},
  rowNamePaid: {color: colors.muted2, textDecorationLine: 'line-through'},
  rowSub: {fontSize: 12.5, color: colors.muted, fontWeight: '500', marginTop: 2},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  secondaryBtn: {backgroundColor: colors.canvas, ...hairline, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 11},
  secondaryText: {fontSize: 12.5, fontWeight: '700', color: colors.ink},
  actionBtn: {backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12},
  actionText: {fontSize: 12.5, fontWeight: '700', color: colors.white},
});
