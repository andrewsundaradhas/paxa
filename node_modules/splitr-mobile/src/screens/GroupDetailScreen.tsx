import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius, softShadow, CATTINT} from '../theme';
import {Avatar} from '../components/Avatar';
import {BackButton} from '../components/common';
import {LimeButton, GhostButton} from '../components/Buttons';
import {TabBar} from '../components/TabBar';
import {
  useAppStore,
  MEMBERS,
  fmt,
  pairwise,
  youOweTotal,
  owedToYouTotal,
  groupSettled,
  type GroupTab,
} from '../store/useAppStore';
import type {ScreenProps} from '../navigation/types';

const TABS: {key: GroupTab; label: string}[] = [
  {key: 'balances', label: 'Balances'},
  {key: 'expenses', label: 'Expenses'},
  {key: 'history', label: 'History'},
];

export const GroupDetailScreen: React.FC<ScreenProps<'GroupDetail'>> = ({navigation}) => {
  const group = useAppStore(s => s.group());
  const tab = useAppStore(s => s.tab);
  const setTab = useAppStore(s => s.setTab);
  const settledPairs = useAppStore(s => s.settledPairs);
  const log = useAppStore(s => s.log);
  const openSheet = useAppStore(s => s.openSheet);
  const setBillId = useAppStore(s => s.setBillId);
  const reminded = useAppStore(s => s.reminded);
  const remind = useAppStore(s => s.remind);

  if (!group) {
    return <SafeAreaView style={styles.safe} />;
  }

  const pw = pairwise(group);
  const settledNow = groupSettled(group, settledPairs, log);
  const oweT = youOweTotal(group, settledPairs);
  const owedT = owedToYouTotal(group);
  const heroLabel = settledNow ? 'This group is settled' : oweT > owedT ? 'You owe in this group' : 'You’re owed in this group';
  const heroAmount = settledNow ? '₹0' : (oweT > owedT ? '- ' : '+') + fmt(Math.abs(oweT - owedT));

  const youOwe: {id: string; amount: number}[] = [];
  const owesYou: {id: string; amount: number}[] = [];
  Object.entries(pw).forEach(([id, v]) => {
    if (v > 1 && !settledPairs[group.id + ':' + id]) {
      youOwe.push({id, amount: v});
    } else if (v < -1) {
      owesYou.push({id, amount: -v});
    }
  });

  const openBill = (id: string) => {
    setBillId(id);
    navigation.navigate('Bill');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.navigate('Home')} />
          <Text style={styles.headerTitle}>{group.name}</Text>
          <View style={styles.menuBtn}>
            <Text style={styles.menuDots}>•••</Text>
          </View>
        </View>

        {/* group hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <Text style={styles.heroAmount}>{heroAmount}</Text>
          <View style={styles.avatarRow}>
            {group.members.slice(0, 4).map(id => {
              const m = MEMBERS[id];
              return <Avatar key={id} initials={m.initials} color={m.color} size={32} darkBorder overlap />;
            })}
          </View>
        </View>

        {/* segmented tabs */}
        <View style={styles.segment}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.8}
                onPress={() => setTab(t.key)}
                style={[styles.segTab, active && styles.segTabActive]}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'balances' && (
          <BalancesTab
            settledNow={settledNow}
            youOwe={youOwe}
            owesYou={owesYou}
            onSettle={id => openSheet('settle', id)}
            reminded={reminded}
            onRemind={(id, name) => remind(`${group.id}:${id}`, name)}
            remindKey={id => `${group.id}:${id}`}
          />
        )}

        {tab === 'expenses' && (
          <View style={styles.gap10}>
            {group.expenses.map(e => {
              const share = e.involved.includes('you') ? e.amount / e.involved.length : 0;
              const payer = MEMBERS[e.paidBy];
              const meta = `${e.paidBy === 'you' ? 'You paid' : payer.name + ' paid'} · ${e.date}`;
              const lent = e.paidBy === 'you';
              return (
                <TouchableOpacity key={e.id} activeOpacity={0.85} onPress={() => openBill(e.id)} style={styles.expense}>
                  <View style={[styles.catIcon, {backgroundColor: CATTINT[e.cat] || '#f0ecdd'}]}>
                    <Text style={styles.catIconText}>{e.cat}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.expenseTitle}>{e.title}</Text>
                    <Text style={styles.expenseMeta}>{meta}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.expenseAmount}>{fmt(e.amount)}</Text>
                    <Text style={[styles.expenseShare, {color: lent ? colors.limeDark : colors.muted}]}>
                      {lent ? `you lent ${fmt(e.amount - share)}` : `you owe ${fmt(share)}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'history' && <HistoryTab groupId={group.id} settledBase={group.settledBase} log={log} />}
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

const BalancesTab: React.FC<{
  settledNow: boolean;
  youOwe: {id: string; amount: number}[];
  owesYou: {id: string; amount: number}[];
  onSettle: (id: string) => void;
  reminded: Record<string, boolean>;
  onRemind: (id: string, name: string) => void;
  remindKey: (id: string) => string;
}> = ({settledNow, youOwe, owesYou, onSettle, reminded, onRemind, remindKey}) => {
  if (settledNow) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyCheck}>✓</Text>
        </View>
        <Text style={styles.emptyTitle}>All squared up</Text>
        <Text style={styles.emptySub}>No one owes anyone here.</Text>
      </View>
    );
  }
  return (
    <View style={styles.gap12}>
      {youOwe.map(b => {
        const m = MEMBERS[b.id];
        return (
          <View key={b.id} style={styles.oweCard}>
            <View style={styles.oweTop}>
              <View style={styles.oweWho}>
                <Avatar initials={m.initials} color={m.color} size={42} style={styles.oweAvatar} />
                <View>
                  <Text style={styles.oweCaption}>You owe</Text>
                  <Text style={styles.oweName}>{m.name}</Text>
                </View>
              </View>
              <Text style={styles.oweAmount}>{fmt(b.amount)}</Text>
            </View>
            <LimeButton label="Settle up" onPress={() => onSettle(b.id)} style={styles.settleBtn} textStyle={styles.settleBtnText} />
          </View>
        );
      })}
      {owesYou.map(b => {
        const m = MEMBERS[b.id];
        return (
          <View key={b.id} style={styles.owedCard}>
            <View style={styles.oweWho}>
              <Avatar initials={m.initials} color={m.color} size={42} softRing />
              <View>
                <Text style={styles.owedCaption}>Owes you</Text>
                <Text style={styles.owedName}>{m.name}</Text>
              </View>
            </View>
            <View style={styles.owedRight}>
              <Text style={styles.owedAmount}>+{fmt(b.amount)}</Text>
              <GhostButton
                label={reminded[remindKey(b.id)] ? 'Sent ✓' : 'Remind'}
                onPress={() => onRemind(b.id, m.name)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const HistoryTab: React.FC<{
  groupId: string;
  settledBase?: boolean;
  log: Record<string, {to: string; amount: number; method: string; date: string}[]>;
}> = ({groupId, settledBase, log}) => {
  const recs = log[groupId] ?? [];
  const items = recs.map(r => ({title: `You paid ${r.to}`, meta: `${r.method.toUpperCase()} · ${r.date}`, amount: fmt(r.amount)}));
  if (settledBase && recs.length === 0) {
    items.push({title: 'Sushi night squared up', meta: 'UPI · Last Fri', amount: fmt(3600)});
  }
  if (items.length === 0) {
    return <Text style={styles.historyEmpty}>Nothing settled yet.</Text>;
  }
  return (
    <View style={styles.gap10}>
      {items.map((h, i) => (
        <View key={i} style={styles.histRow}>
          <View style={styles.histIcon}>
            <Text style={styles.histCheck}>✓</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.histTitle}>{h.title}</Text>
            <Text style={styles.histMeta}>{h.meta}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.histAmount}>{h.amount}</Text>
            <Text style={styles.histTag}>SETTLED</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const card = {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...softShadow};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  flex1: {flex: 1, minWidth: 0},
  right: {alignItems: 'flex-end'},
  gap10: {gap: 10},
  gap12: {gap: 12},

  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4, marginBottom: 18},
  headerTitle: {fontFamily: fonts.display, fontWeight: '600', fontSize: 16, color: colors.ink},
  menuBtn: {width: 42, height: 42, borderRadius: 14, ...card, alignItems: 'center', justifyContent: 'center'},
  menuDots: {fontSize: 16, color: colors.ink, fontWeight: '700', marginTop: -6},

  hero: {position: 'relative', overflow: 'hidden', borderRadius: 26, backgroundColor: colors.ink, padding: 20},
  heroGlow: {position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, backgroundColor: 'rgba(194,242,63,0.15)'},
  heroLabel: {fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  heroAmount: {fontFamily: fonts.display, fontWeight: '800', fontSize: 40, letterSpacing: -1.2, color: colors.white, marginTop: 4},
  avatarRow: {flexDirection: 'row', marginTop: 14, paddingLeft: 8},

  segment: {flexDirection: 'row', gap: 4, backgroundColor: colors.track, borderRadius: 16, padding: 4, marginVertical: 18},
  segTab: {flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 9},
  segTabActive: {backgroundColor: colors.ink, shadowColor: '#14140f', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 2},
  segText: {fontWeight: '600', fontSize: 13, color: colors.muted3},
  segTextActive: {color: colors.white},

  empty: {alignItems: 'center', paddingVertical: 46, paddingHorizontal: 20},
  emptyIcon: {width: 74, height: 74, borderRadius: 37, backgroundColor: '#edf7cf', alignItems: 'center', justifyContent: 'center'},
  emptyCheck: {fontSize: 32, color: colors.limeDark, fontWeight: '700'},
  emptyTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 20, color: colors.ink, marginTop: 16},
  emptySub: {fontSize: 14, color: colors.muted, fontWeight: '500', marginTop: 4},

  oweCard: {borderRadius: 24, backgroundColor: colors.ink, padding: 18, shadowColor: '#14140f', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: {width: 0, height: 14}, elevation: 4},
  oweTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  oweWho: {flexDirection: 'row', alignItems: 'center', gap: 11},
  oweAvatar: {borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)'},
  oweCaption: {fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  oweName: {fontWeight: '600', fontSize: 16, color: colors.white},
  oweAmount: {fontFamily: fonts.display, fontWeight: '800', fontSize: 26, color: colors.white, letterSpacing: -0.6},
  settleBtn: {marginTop: 16, paddingVertical: 14, borderRadius: 15},
  settleBtnText: {fontSize: 15},

  owedCard: {borderRadius: 24, ...card, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  owedCaption: {fontSize: 12, fontWeight: '500', color: colors.muted2},
  owedName: {fontWeight: '600', fontSize: 16, color: colors.ink},
  owedRight: {flexDirection: 'row', alignItems: 'center', gap: 12},
  owedAmount: {fontFamily: fonts.display, fontWeight: '800', fontSize: 22, color: colors.limeDark, letterSpacing: -0.4},

  expense: {flexDirection: 'row', alignItems: 'center', gap: 13, ...card, borderRadius: 18, padding: 13, paddingHorizontal: 14},
  catIcon: {width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  catIconText: {fontSize: 11, fontWeight: '700', color: colors.ink},
  expenseTitle: {fontWeight: '600', fontSize: 15, color: colors.ink},
  expenseMeta: {fontSize: 12, color: colors.muted, fontWeight: '500', marginTop: 1},
  expenseAmount: {fontFamily: fonts.display, fontWeight: '700', fontSize: 17, color: colors.ink},
  expenseShare: {fontSize: 11, fontWeight: '600', marginTop: 1},

  historyEmpty: {textAlign: 'center', paddingVertical: 40, color: colors.muted2, fontSize: 14, fontWeight: '500'},
  histRow: {flexDirection: 'row', alignItems: 'center', gap: 13, ...card, borderRadius: 18, padding: 13, paddingHorizontal: 14},
  histIcon: {width: 42, height: 42, borderRadius: 13, backgroundColor: '#edf7cf', alignItems: 'center', justifyContent: 'center'},
  histCheck: {color: colors.limeDark, fontWeight: '700', fontSize: 18},
  histTitle: {fontWeight: '600', fontSize: 15, color: colors.ink},
  histMeta: {fontSize: 12, color: colors.muted, fontWeight: '500', marginTop: 1},
  histAmount: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink},
  histTag: {fontSize: 10, fontWeight: '700', letterSpacing: 0.4, color: colors.limeDark},
});
