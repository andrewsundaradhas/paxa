import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius, softShadow, tintOf} from '../theme';
import {TabBar} from '../components/TabBar';
import {useAppStore, fmt, youOweTotal, owedToYouTotal, groupSettled} from '../store/useAppStore';
import type {ScreenProps} from '../navigation/types';

const QUICK = [
  {key: 'add', label: 'Add', tint: '#edf7cf', glyph: '＋', glyphColor: '#3f6b00'},
  {key: 'request', label: 'Request', tint: '#f6e6f3', glyph: '↓', glyphColor: '#8a2178'},
  {key: 'scan', label: 'Scan', tint: '#e3eef5', glyph: '⌁', glyphColor: '#1f5b86'},
  {key: 'insights', label: 'Insights', tint: '#f0ecdd', glyph: '∿', glyphColor: '#6b6630'},
];

export const GroupsScreen: React.FC<ScreenProps<'Home'>> = ({navigation}) => {
  const groups = useAppStore(s => s.groups);
  const settledPairs = useAppStore(s => s.settledPairs);
  const log = useAppStore(s => s.log);
  const userColor = useAppStore(s => s.userColor);
  const setGroupId = useAppStore(s => s.setGroupId);
  const openSheet = useAppStore(s => s.openSheet);
  const openRequestSheet = useAppStore(s => s.openRequestSheet);
  const openScanSheet = useAppStore(s => s.openScanSheet);
  const flash = useAppStore(s => s.flash);

  let totOwe = 0;
  let totOwed = 0;
  groups.forEach(g => {
    totOwe += youOweTotal(g, settledPairs);
    totOwed += owedToYouTotal(g);
  });
  const net = totOwed - totOwe;
  const heroNet = (net >= 0 ? '+' : '- ') + fmt(Math.abs(net));
  const heroNetLabel = net >= 0 ? 'You’re up overall' : 'You owe overall';

  const openGroup = (id: string) => {
    setGroupId(id);
    navigation.navigate('GroupDetail');
  };

  const onQuick = (key: string) => {
    if (key === 'add') {
      const first = groups[0];
      if (first) {
        setGroupId(first.id);
        navigation.navigate('GroupDetail');
      }
      openSheet('addExpense');
    } else if (key === 'request') {
      openRequestSheet();
    } else if (key === 'scan') {
      openScanSheet();
    } else if (key === 'insights') {
      navigation.navigate('Insights');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* greeting */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetSmall}>Good evening</Text>
            <Text style={styles.greetName}>Riya Sharma</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Profile')} style={styles.avatarWrap}>
            <View style={[styles.avatar, {backgroundColor: userColor}]}>
              <Text style={styles.avatarText}>Ri</Text>
            </View>
            <View style={styles.avatarDot} />
          </TouchableOpacity>
        </View>

        {/* hero balance card */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Net balance · all groups</Text>
            <Text style={styles.heroCount}>{groups.length} groups</Text>
          </View>
          <Text style={styles.heroNet}>{heroNet}</Text>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>{heroNetLabel}</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>You owe</Text>
              <Text style={styles.heroStatValue}>{fmt(totOwe)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>You're owed</Text>
              <Text style={[styles.heroStatValue, {color: colors.lime}]}>+{fmt(totOwed)}</Text>
            </View>
          </View>
        </View>

        {/* quick actions */}
        <View style={styles.quickRow}>
          {QUICK.map(q => (
            <TouchableOpacity key={q.key} activeOpacity={0.85} onPress={() => onQuick(q.key)} style={styles.quick}>
              <View style={[styles.quickIcon, {backgroundColor: q.tint}]}>
                <Text style={[styles.quickGlyph, {color: q.glyphColor}]}>{q.glyph}</Text>
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* pending payments → Tracking */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Tracking')} style={styles.pendingStrip}>
          <View style={styles.pendingIcon}>
            <Text style={styles.pendingGlyph}>☑</Text>
          </View>
          <View style={styles.pendingMid}>
            <Text style={styles.pendingTitle}>Pending payments</Text>
            <Text style={styles.pendingSub}>
              {totOwe > 0 ? `You owe ${fmt(totOwe)}` : 'Nothing to pay'}
              {totOwed > 0 ? ` · ${fmt(totOwed)} owed to you` : ''}
            </Text>
          </View>
          <Text style={styles.pendingChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your groups</Text>
          <Text style={styles.sectionAction} onPress={() => openSheet('createGroup')}>
            + New
          </Text>
        </View>

        <View style={styles.list}>
          {groups.map(g => {
            let netLabel = 'settled up';
            let netAmount = '✓';
            let netColor: string = colors.muted2;
            if (!groupSettled(g, settledPairs, log)) {
              const owe = youOweTotal(g, settledPairs);
              const owed = owedToYouTotal(g);
              if (owe > owed) {
                netLabel = 'you owe';
                netAmount = fmt(owe - owed);
                netColor = colors.ink;
              } else {
                netLabel = 'owed to you';
                netAmount = '+' + fmt(owed - owe);
                netColor = colors.limeDark;
              }
            }
            return (
              <TouchableOpacity key={g.id} activeOpacity={0.85} onPress={() => openGroup(g.id)} style={styles.groupCard}>
                <View style={[styles.groupInitial, {backgroundColor: tintOf(g.fill)}]}>
                  <Text style={styles.groupInitialText}>{g.name.charAt(0)}</Text>
                </View>
                <View style={styles.groupMid}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.groupSub}>
                    {g.members.length} people · {g.expenses.length} expenses
                  </Text>
                </View>
                <View style={styles.groupRight}>
                  <Text style={[styles.groupNet, {color: netColor}]}>{netAmount}</Text>
                  <Text style={styles.groupNetLabel}>{netLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

const card = {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.line,
  ...softShadow,
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  greetRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 2, marginBottom: 18},
  greetSmall: {fontSize: 13, fontWeight: '500', color: colors.muted},
  greetName: {fontFamily: fonts.display, fontWeight: '700', fontSize: 21, color: colors.ink, letterSpacing: -0.2},
  avatarWrap: {position: 'relative'},
  avatar: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...softShadow},
  avatarText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.ink},
  avatarDot: {position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.canvas},

  hero: {position: 'relative', overflow: 'hidden', borderRadius: 28, backgroundColor: colors.ink, padding: 20, paddingTop: 22},
  heroGlow: {position: 'absolute', top: -50, right: -40, width: 190, height: 190, borderRadius: 999, backgroundColor: 'rgba(194,242,63,0.16)'},
  heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  heroLabel: {fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.55)'},
  heroCount: {fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden'},
  heroNet: {fontFamily: fonts.display, fontWeight: '800', fontSize: 42, letterSpacing: -1.2, color: colors.white, marginTop: 8},
  heroBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(194,242,63,0.16)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, marginTop: 8, alignSelf: 'flex-start'},
  heroBadgeDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime},
  heroBadgeText: {fontSize: 12, fontWeight: '600', color: colors.lime},
  heroStats: {flexDirection: 'row', gap: 10, marginTop: 18},
  heroStat: {flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 16, padding: 12, paddingHorizontal: 14},
  heroStatLabel: {fontSize: 11.5, fontWeight: '500', color: 'rgba(255,255,255,0.5)'},
  heroStatValue: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, color: colors.white, marginTop: 2},

  quickRow: {flexDirection: 'row', gap: 10, marginVertical: 18, marginBottom: 24},
  quick: {flex: 1, ...card, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', gap: 9},
  quickIcon: {width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  quickGlyph: {fontSize: 20, fontWeight: '700'},
  quickLabel: {fontSize: 12, fontWeight: '600', color: colors.ink},

  pendingStrip: {flexDirection: 'row', alignItems: 'center', gap: 13, ...card, borderRadius: radius.card, padding: 13, paddingHorizontal: 15, marginBottom: 22},
  pendingIcon: {width: 42, height: 42, borderRadius: 14, backgroundColor: '#edf7cf', alignItems: 'center', justifyContent: 'center'},
  pendingGlyph: {fontSize: 19, color: '#3f6b00'},
  pendingMid: {flex: 1, minWidth: 0},
  pendingTitle: {fontSize: 15, fontWeight: '600', color: colors.ink},
  pendingSub: {fontSize: 12.5, color: colors.muted, fontWeight: '500', marginTop: 2},
  pendingChevron: {fontSize: 24, color: colors.muted2, fontWeight: '400'},

  sectionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 2, marginBottom: 14},
  sectionTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, color: colors.ink, letterSpacing: -0.2},
  sectionAction: {fontSize: 13, fontWeight: '600', color: colors.limeDark},

  list: {gap: 11},
  groupCard: {flexDirection: 'row', alignItems: 'center', gap: 14, ...card, borderRadius: radius.card, padding: 13, paddingHorizontal: 14},
  groupInitial: {width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  groupInitialText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 19, color: colors.ink},
  groupMid: {flex: 1, minWidth: 0},
  groupName: {fontWeight: '600', fontSize: 16, color: colors.ink},
  groupSub: {fontSize: 12.5, color: colors.muted, fontWeight: '500', marginTop: 2},
  groupRight: {alignItems: 'flex-end'},
  groupNet: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, letterSpacing: -0.2},
  groupNetLabel: {fontSize: 11, fontWeight: '600', color: colors.muted2, marginTop: 1},
});
