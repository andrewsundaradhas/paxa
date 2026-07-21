import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, softShadow, CATTINT} from '../theme';
import {TabBar} from '../components/TabBar';
import {useAppStore, MEMBERS, fmt, spendingInsights} from '../store/useAppStore';
import type {ScreenProps} from '../navigation/types';

type Item = {settle: boolean; title: string; sub: string; amount: string; amountColor: string; date: string; tint: string};

export const ActivityScreen: React.FC<ScreenProps<'Activity'>> = () => {
  const groups = useAppStore(s => s.groups);
  const log = useAppStore(s => s.log);
  const insights = spendingInsights(groups);

  const items: Item[] = [];
  groups.forEach(g => {
    g.expenses.slice(0, 2).forEach(e => {
      const payer = MEMBERS[e.paidBy];
      items.push({
        settle: false,
        title: e.title,
        sub: `${g.name} · ${e.paidBy === 'you' ? 'you paid' : payer.name + ' paid'}`,
        amount: fmt(e.amount),
        amountColor: colors.ink,
        date: e.date,
        tint: CATTINT[e.cat] || '#f0ecdd',
      });
    });
    (log[g.id] || []).forEach(r => {
      items.push({
        settle: true,
        title: `You paid ${r.to}`,
        sub: `${g.name} · via ${r.method.toUpperCase()}`,
        amount: fmt(r.amount),
        amountColor: colors.limeDark,
        date: r.date,
        tint: '#edf7cf',
      });
    });
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Activity</Text>

        {/* spending insights */}
        <View style={styles.insightCard}>
          <View style={styles.insightGlow} />
          <View style={styles.insightTop}>
            <View>
              <Text style={styles.insightLabel}>You spent · last 6 months</Text>
              <Text style={styles.insightTotal}>{insights.total}</Text>
            </View>
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>↗ trending up</Text>
            </View>
          </View>
          <View style={styles.bars}>
            {insights.trendBars.map(b => (
              <View key={b.label} style={styles.barCol}>
                <Text style={[styles.barAmount, {color: b.last ? colors.lime : 'rgba(255,255,255,0.4)'}]}>{b.amount}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, {height: `${b.h}%`, backgroundColor: b.last ? colors.lime : 'rgba(255,255,255,0.16)'}]} />
                </View>
                <Text style={[styles.barLabel, {color: b.last ? colors.lime : 'rgba(255,255,255,0.4)'}]}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* category breakdown */}
        <View style={styles.catCard}>
          <View style={styles.catHead}>
            <Text style={styles.catTitle}>By category</Text>
            <Text style={styles.catTop}>
              {insights.topCatName} · {insights.topCatPct}
            </Text>
          </View>
          <View style={styles.catList}>
            {insights.categories.map(c => (
              <View key={c.name}>
                <View style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, {backgroundColor: c.color}]} />
                    <Text style={styles.catName}>{c.name}</Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>{c.amount}</Text>
                    <Text style={styles.catPct}>{c.pct}</Text>
                  </View>
                </View>
                <View style={styles.catBarTrack}>
                  <View style={[styles.catBar, {width: `${c.barW}%`, backgroundColor: c.color}]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.recent}>Recent</Text>
        <View style={styles.list}>
          {items.map((a, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.icon, {backgroundColor: a.tint}]}>
                <Text style={[styles.iconGlyph, a.settle && {color: colors.limeDark}]}>{a.settle ? '✓' : '≣'}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <Text style={styles.rowSub}>{a.sub}</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.rowAmount, {color: a.amountColor}]}>{a.amount}</Text>
                <Text style={styles.rowDate}>{a.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  flex1: {flex: 1, minWidth: 0},
  right: {alignItems: 'flex-end'},
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 24, color: colors.ink, marginVertical: 8, marginBottom: 18, marginHorizontal: 2, letterSpacing: -0.4},

  insightCard: {position: 'relative', overflow: 'hidden', borderRadius: 26, backgroundColor: colors.ink, padding: 20, marginBottom: 14},
  insightGlow: {position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, backgroundColor: 'rgba(194,242,63,0.16)'},
  insightTop: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between'},
  insightLabel: {fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  insightTotal: {fontFamily: fonts.display, fontWeight: '800', fontSize: 38, letterSpacing: -1.1, color: colors.white, marginTop: 3},
  trendBadge: {backgroundColor: 'rgba(194,242,63,0.16)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11},
  trendBadgeText: {fontSize: 11.5, fontWeight: '600', color: colors.lime},
  bars: {flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 96, marginTop: 20},
  barCol: {flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 8},
  barAmount: {fontSize: 9.5, fontWeight: '700', height: 11},
  barTrack: {flex: 1, width: '100%', justifyContent: 'flex-end'},
  bar: {width: '100%', borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 4, borderBottomRightRadius: 4},
  barLabel: {fontSize: 10.5, fontWeight: '600'},

  catCard: {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 18, marginBottom: 22, ...softShadow},
  catHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
  catTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink},
  catTop: {fontSize: 12, fontWeight: '600', color: colors.muted2},
  catList: {gap: 14},
  catRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7},
  catLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  catDot: {width: 11, height: 11, borderRadius: 4},
  catName: {fontSize: 14, fontWeight: '600', color: colors.ink},
  catRight: {flexDirection: 'row', alignItems: 'baseline', gap: 7},
  catAmount: {fontFamily: fonts.display, fontWeight: '700', fontSize: 15, color: colors.ink},
  catPct: {fontSize: 11, fontWeight: '600', color: colors.muted2},
  catBarTrack: {height: 9, borderRadius: 5, backgroundColor: '#f0eee7', overflow: 'hidden'},
  catBar: {height: '100%', borderRadius: 5},

  recent: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink, marginHorizontal: 2, marginBottom: 12},
  list: {gap: 10},
  row: {flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 13, paddingHorizontal: 14, ...softShadow},
  icon: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  iconGlyph: {fontSize: 18, fontWeight: '700', color: colors.ink},
  rowTitle: {fontWeight: '600', fontSize: 15, color: colors.ink},
  rowSub: {fontSize: 12, color: colors.muted, fontWeight: '500', marginTop: 1},
  rowAmount: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16},
  rowDate: {fontSize: 11, fontWeight: '500', color: colors.muted2, marginTop: 1},
});
