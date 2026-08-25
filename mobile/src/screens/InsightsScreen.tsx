import React from 'react';
import {View, Text, StyleSheet, ScrollView, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius, softShadow, hairline} from '../theme';
import {TabBar} from '../components/TabBar';
import {BackButton} from '../components/common';
import {useAppStore, fmt, spendingInsights, youOweTotal, owedToYouTotal} from '../store/useAppStore';
import {useInsights} from '../api/hooks';
import {isLive} from '../data/liveMutations';
import type {ScreenProps} from '../navigation/types';

/** Category → bar colour (canonical spending categories). */
const CAT_COLOR: Record<string, string> = {
  Food: '#c2f23f',
  Travel: '#02bbff',
  Shopping: '#fa00ff',
  Entertainment: '#8aa0ff',
  Bills: '#f5b54a',
  Education: '#38c1a6',
  Groceries: '#e7a54a',
  Stay: '#e7e3bf',
  Fun: '#fa00ff',
  Rent: '#8aa0ff',
  Other: '#a3a196',
};
const catColor = (name: string) => CAT_COLOR[name] ?? colors.khaki;

type CatRow = {name: string; amount: number; pct: number; color: string};

type ViewModel = {
  spent: number;
  received: number;
  iOwe: number;
  owedToMe: number;
  categories: CatRow[];
  weekdayPaise: number;
  weekendPaise: number;
  insights: string[];
  topCatName: string;
};

const monthName = () => new Date().toLocaleDateString('en-IN', {month: 'long'});

export const InsightsScreen: React.FC<ScreenProps<'Insights'>> = ({navigation}) => {
  const live = isLive();
  const groups = useAppStore(s => s.groups);
  const settledPairs = useAppStore(s => s.settledPairs);
  const query = useInsights(undefined, live);

  const vm = buildViewModel(live, query.data, groups, settledPairs);
  const inOut = vm.spent + vm.received;
  const spentPct = inOut > 0 ? Math.round((vm.spent / inOut) * 100) : 0;
  const dayTotal = vm.weekdayPaise + vm.weekendPaise;
  const weekendPct = dayTotal > 0 ? Math.round((vm.weekendPaise / dayTotal) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topTitle}>Insights</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* hero — spent this month */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroLabel}>Spent in {monthName()}</Text>
          <Text style={styles.heroValue}>{fmt(vm.spent)}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Received</Text>
              <Text style={[styles.heroStatValue, {color: colors.lime}]}>+{fmt(vm.received)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>You owe</Text>
              <Text style={styles.heroStatValue}>{fmt(vm.iOwe)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Owed to you</Text>
              <Text style={styles.heroStatValue}>{fmt(vm.owedToMe)}</Text>
            </View>
          </View>
        </View>

        {live && query.isLoading && <ActivityIndicator style={styles.loader} color={colors.ink} />}

        {/* AI insight cards */}
        {vm.insights.length > 0 && (
          <View style={styles.insightList}>
            {vm.insights.map((line, i) => (
              <View key={i} style={styles.insightCard}>
                <View style={styles.sparkDot} />
                <Text style={styles.insightText}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        {/* categories */}
        <Text style={styles.sectionTitle}>Where it went</Text>
        <View style={styles.card}>
          {vm.categories.length === 0 ? (
            <Text style={styles.emptyText}>No spending recorded this month yet.</Text>
          ) : (
            vm.categories.map(c => (
              <View key={c.name} style={styles.catRow}>
                <View style={styles.catHead}>
                  <View style={styles.catNameRow}>
                    <View style={[styles.catDot, {backgroundColor: c.color}]} />
                    <Text style={styles.catName}>{c.name}</Text>
                  </View>
                  <Text style={styles.catAmount}>{fmt(c.amount)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {width: `${Math.max(4, c.pct)}%`, backgroundColor: c.color}]} />
                </View>
              </View>
            ))
          )}
        </View>

        {/* money in vs out */}
        <Text style={styles.sectionTitle}>Money in vs out</Text>
        <View style={styles.card}>
          <View style={styles.inoutBar}>
            <View style={[styles.inoutSeg, {flex: Math.max(1, spentPct), backgroundColor: colors.ink}]} />
            <View style={[styles.inoutSeg, {flex: Math.max(1, 100 - spentPct), backgroundColor: colors.lime}]} />
          </View>
          <View style={styles.inoutLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.catDot, {backgroundColor: colors.ink}]} />
              <Text style={styles.legendText}>Out {fmt(vm.spent)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.catDot, {backgroundColor: colors.lime}]} />
              <Text style={styles.legendText}>In {fmt(vm.received)}</Text>
            </View>
          </View>
        </View>

        {/* weekday vs weekend */}
        {dayTotal > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weekday vs weekend</Text>
            <View style={styles.card}>
              <View style={styles.dayRow}>
                <Text style={styles.dayLabel}>Weekdays</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {width: `${Math.max(4, 100 - weekendPct)}%`, backgroundColor: colors.cyan}]} />
                </View>
                <Text style={styles.dayVal}>{fmt(vm.weekdayPaise / 100)}</Text>
              </View>
              <View style={styles.dayRow}>
                <Text style={styles.dayLabel}>Weekends</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {width: `${Math.max(4, weekendPct)}%`, backgroundColor: colors.pink}]} />
                </View>
                <Text style={styles.dayVal}>{fmt(vm.weekendPaise / 100)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

function buildViewModel(
  live: boolean,
  data: ReturnType<typeof useInsights>['data'],
  groups: ReturnType<typeof useAppStore.getState>['groups'],
  settledPairs: Record<string, boolean>,
): ViewModel {
  if (live && data) {
    const total = data.categories.reduce((s, c) => s + c.amountPaise, 0);
    const categories: CatRow[] = data.categories.map(c => ({
      name: c.category,
      amount: c.amountPaise / 100,
      pct: total > 0 ? Math.round((c.amountPaise / total) * 100) : 0,
      color: catColor(c.category),
    }));
    return {
      spent: data.totals.spentPaise / 100,
      received: data.totals.receivedPaise / 100,
      iOwe: data.totals.iOwePaise / 100,
      owedToMe: data.totals.owedToMePaise / 100,
      categories,
      weekdayPaise: data.weekday.weekdayPaise,
      weekendPaise: data.weekday.weekendPaise,
      insights: data.insights,
      topCatName: categories[0]?.name ?? '—',
    };
  }

  // Demo / offline: derive from the local seed store.
  const local = spendingInsights(groups);
  const spentNum = Number(local.total.replace(/[^0-9.]/g, '')) || 0;
  let totOwe = 0;
  let totOwed = 0;
  groups.forEach(g => {
    totOwe += youOweTotal(g, settledPairs);
    totOwed += owedToYouTotal(g);
  });
  const categories: CatRow[] = local.categories.map(c => ({
    name: c.name,
    amount: Number(c.amount.replace(/[^0-9.]/g, '')) || 0,
    pct: Number(c.pct.replace('%', '')) || 0,
    color: catColor(c.name),
  }));
  const insights: string[] = [];
  if (local.topCatName !== '—') {
    insights.push(`Your largest spending category this month is ${local.topCatName}.`);
  }
  if (totOwe > totOwed) {
    insights.push(`You owe ${fmt(totOwe)} across your groups — more than the ${fmt(totOwed)} owed to you.`);
  } else if (totOwed > 0) {
    insights.push(`You're up ${fmt(totOwed - totOwe)} overall across your groups.`);
  }
  insights.push('Connect your account to unlock month-over-month AI insights.');
  return {
    spent: spentNum,
    received: 0,
    iOwe: totOwe,
    owedToMe: totOwed,
    categories,
    weekdayPaise: Math.round(spentNum * 100 * 0.6),
    weekendPaise: Math.round(spentNum * 100 * 0.4),
    insights,
    topCatName: local.topCatName,
  };
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8},
  topTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, color: colors.ink},
  spacer: {width: 42},

  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  hero: {position: 'relative', overflow: 'hidden', borderRadius: radius.hero, backgroundColor: colors.ink, padding: 20, paddingTop: 22, marginBottom: 20},
  heroGlow: {position: 'absolute', top: -50, right: -40, width: 190, height: 190, borderRadius: 999, backgroundColor: 'rgba(194,242,63,0.16)'},
  heroLabel: {fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  heroValue: {fontFamily: fonts.display, fontWeight: '800', fontSize: 40, letterSpacing: -1.1, color: colors.white, marginTop: 6},
  heroStats: {flexDirection: 'row', gap: 9, marginTop: 18},
  heroStat: {flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: 11},
  heroStatLabel: {fontSize: 10.5, fontWeight: '500', color: 'rgba(255,255,255,0.5)'},
  heroStatValue: {fontFamily: fonts.display, fontWeight: '700', fontSize: 15, color: colors.white, marginTop: 3},

  loader: {marginBottom: 16},
  insightList: {gap: 10, marginBottom: 22},
  insightCard: {flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: colors.white, ...hairline, ...softShadow, borderRadius: radius.card, padding: 15},
  sparkDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.limeDark, marginTop: 4},
  insightText: {flex: 1, fontSize: 14, fontWeight: '500', color: colors.ink, lineHeight: 20},

  sectionTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink, marginBottom: 12, marginTop: 4, marginHorizontal: 2},
  card: {backgroundColor: colors.white, ...hairline, ...softShadow, borderRadius: radius.card, padding: 16, marginBottom: 22},
  emptyText: {fontSize: 13.5, color: colors.muted, fontWeight: '500', textAlign: 'center', paddingVertical: 6},

  catRow: {marginBottom: 14},
  catHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7},
  catNameRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  catDot: {width: 9, height: 9, borderRadius: 5},
  catName: {fontSize: 14, fontWeight: '600', color: colors.ink},
  catAmount: {fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.ink},
  barTrack: {flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden'},
  barFill: {height: '100%', borderRadius: 5},

  inoutBar: {flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 14},
  inoutSeg: {height: '100%'},
  inoutLegend: {flexDirection: 'row', justifyContent: 'space-between'},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 7},
  legendText: {fontSize: 13, fontWeight: '600', color: colors.ink},

  dayRow: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12},
  dayLabel: {width: 72, fontSize: 13, fontWeight: '600', color: colors.muted3},
  dayVal: {width: 66, textAlign: 'right', fontFamily: fonts.display, fontWeight: '700', fontSize: 13, color: colors.ink},
});
