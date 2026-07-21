import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, softShadow, CATTINT} from '../theme';
import {Avatar} from '../components/Avatar';
import {BackButton} from '../components/common';
import {useAppStore, MEMBERS, fmt} from '../store/useAppStore';
import type {ScreenProps} from '../navigation/types';

export const BillDetailScreen: React.FC<ScreenProps<'Bill'>> = ({navigation}) => {
  const group = useAppStore(s => s.group());
  const billId = useAppStore(s => s.billId);

  if (!group) {
    return <SafeAreaView style={styles.safe} />;
  }
  const e = group.expenses.find(x => x.id === billId) ?? group.expenses[0];
  if (!e) {
    return <SafeAreaView style={styles.safe} />;
  }

  const share = e.amount / e.involved.length;
  const payer = MEMBERS[e.paidBy];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('GroupDetail')} style={styles.backRow}>
          <BackButton onPress={() => navigation.navigate('GroupDetail')} />
          <Text style={styles.backLabel}>Expense</Text>
        </TouchableOpacity>

        <View style={[styles.billCard, {backgroundColor: CATTINT[e.cat] || '#f0ecdd'}]}>
          <View style={styles.billTop}>
            <View style={styles.catPill}>
              <Text style={styles.catPillText}>{e.cat}</Text>
            </View>
            <Text style={styles.billDate}>{e.date}</Text>
          </View>
          <Text style={styles.billTitle}>{e.title}</Text>
          <Text style={styles.billAmount}>{fmt(e.amount)}</Text>
          <Text style={styles.billPaid}>
            Paid by {e.paidBy === 'you' ? 'you' : payer.name} · split {e.involved.length} ways
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Who owes what</Text>
          <Text style={styles.sectionNote}>auto-calculated</Text>
        </View>

        <View style={styles.gap9}>
          {e.involved.map(id => {
            const m = MEMBERS[id];
            const role =
              id === e.paidBy ? 'paid the bill' : id === 'you' ? 'you owe this' : `owes ${e.paidBy === 'you' ? 'you' : payer.name}`;
            return (
              <View key={id} style={styles.row}>
                <Avatar initials={m.initials} color={m.color} size={38} softRing />
                <View style={styles.flex1}>
                  <Text style={styles.rowName}>{m.name}</Text>
                  <Text style={styles.rowRole}>{role}</Text>
                </View>
                <Text style={styles.rowShare}>{fmt(share)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const card = {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...softShadow};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40},
  flex1: {flex: 1},
  gap9: {gap: 9},
  backRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4, marginBottom: 18},
  backLabel: {fontFamily: fonts.display, fontWeight: '600', fontSize: 16, color: colors.ink},
  billCard: {position: 'relative', overflow: 'hidden', borderRadius: 26, padding: 22, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(20,20,15,0.05)'},
  billTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  catPill: {backgroundColor: colors.white, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11},
  catPillText: {fontSize: 11, fontWeight: '600', color: colors.ink},
  billDate: {fontSize: 12, fontWeight: '500', color: colors.muted},
  billTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 23, color: colors.ink, marginTop: 14, letterSpacing: -0.2},
  billAmount: {fontFamily: fonts.display, fontWeight: '800', fontSize: 46, color: colors.ink, marginTop: 4, letterSpacing: -1.2},
  billPaid: {fontSize: 13, fontWeight: '500', color: colors.muted3, marginTop: 8},
  sectionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 24, marginBottom: 12, marginHorizontal: 2},
  sectionTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 17, color: colors.ink},
  sectionNote: {fontSize: 12, fontWeight: '600', color: colors.muted2},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, ...card, borderRadius: 16, padding: 12, paddingHorizontal: 14},
  rowName: {fontWeight: '600', fontSize: 15, color: colors.ink},
  rowRole: {fontSize: 11.5, fontWeight: '500', color: colors.muted},
  rowShare: {fontFamily: fonts.display, fontWeight: '700', fontSize: 18, color: colors.ink},
});
