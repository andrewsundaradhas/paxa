import React from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {colors, fonts} from '../theme';
import {Avatar} from '../components/Avatar';
import {LimeButton} from '../components/Buttons';
import {Sheet} from '../components/Sheet';
import {useAppStore, MEMBERS, fmt, computeSplits, splitValid, type SplitMode} from '../store/useAppStore';
import {submitAddExpense} from '../data/liveMutations';

const MODES: {key: SplitMode; label: string}[] = [
  {key: 'equal', label: 'Equal'},
  {key: 'exact', label: 'Exact'},
  {key: 'percent', label: '%'},
  {key: 'shares', label: 'Shares'},
];

export const AddExpenseSheet: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const group = useAppStore(s => s.group());
  const exp = useAppStore(s => s.exp);
  const patchExp = useAppStore(s => s.patchExp);
  const closeSheet = useAppStore(s => s.closeSheet);

  const visible = sheet === 'addExpense';
  if (!visible || !group || !exp) {
    return <Sheet visible={false} onClose={closeSheet} scroll children={null} />;
  }

  const amt = parseFloat(exp.amount) || 0;
  const ids = Object.keys(exp.involved).filter(k => exp.involved[k]);
  const splits = computeSplits(exp);
  const editable = exp.mode === 'exact' || exp.mode === 'percent' || exp.mode === 'shares';
  const unit = exp.mode === 'percent' ? '%' : exp.mode === 'shares' ? '×' : '₹';
  const valid = splitValid(exp);

  let status = '';
  let remaining = '';
  let remColor: string = colors.muted;
  if (exp.mode === 'equal') {
    status = `${ids.length} people · equal`;
    remaining = ids.length ? `${fmt(amt / ids.length)} each` : '';
  } else if (exp.mode === 'percent') {
    let p = 0;
    ids.forEach(id => (p += parseFloat(exp.vals[id]) || 0));
    status = `${p.toFixed(0)}% allocated`;
    const left = 100 - p;
    remaining = Math.abs(left) < 0.5 ? 'balanced' : left > 0 ? `${left}% left` : `${-left}% over`;
    remColor = Math.abs(left) < 0.5 ? colors.limeDark : colors.muted;
  } else if (exp.mode === 'shares') {
    let t = 0;
    ids.forEach(id => (t += parseFloat(exp.vals[id]) || 0));
    status = `${t} shares total`;
    remaining = 'auto-split';
    remColor = colors.limeDark;
  } else {
    let sum = 0;
    ids.forEach(id => (sum += splits[id]));
    const left = amt - sum;
    status = `${fmt(sum)} of ${fmt(amt)}`;
    remaining = Math.abs(left) < 1 ? 'balanced' : `${fmt(Math.abs(left))}${left > 0 ? ' left' : ' over'}`;
    remColor = Math.abs(left) < 1 ? colors.limeDark : '#b00050';
  }

  return (
    <Sheet visible={visible} onClose={closeSheet} scroll>
      <Text style={styles.title}>Add an expense</Text>
      <Text style={styles.sub}>into {group.name}</Text>

      <TextInput
        value={exp.title}
        onChangeText={t => patchExp({title: t})}
        placeholder="What was it for?"
        placeholderTextColor={colors.muted2}
        style={styles.input}
      />

      <View style={styles.amountBox}>
        <Text style={styles.amountRupee}>₹</Text>
        <TextInput
          value={exp.amount}
          onChangeText={t => patchExp({amount: t.replace(/[^0-9.]/g, '')})}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={styles.amountInput}
        />
      </View>

      <Text style={styles.fieldLabel}>PAID BY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll}>
        {group.members.map(id => {
          const m = MEMBERS[id];
          const active = exp.paidBy === id;
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.8}
              onPress={() => patchExp({paidBy: id})}
              style={[styles.payerChip, active ? styles.payerChipActive : styles.payerChipIdle]}>
              <Avatar initials={m.initials} color={m.color} size={28} />
              <Text style={[styles.payerName, {color: active ? colors.white : colors.ink}]}>{m.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>SPLIT</Text>
      <View style={styles.segment}>
        {MODES.map(mode => {
          const active = exp.mode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              activeOpacity={0.8}
              onPress={() => patchExp({mode: mode.key})}
              style={[styles.segTab, active && styles.segTabActive]}>
              <Text style={[styles.segText, active && styles.segTextActive]}>{mode.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.splitRows}>
        {group.members.map(id => {
          const m = MEMBERS[id];
          const on = !!exp.involved[id];
          return (
            <View key={id} style={[styles.splitRow, {opacity: on ? 1 : 0.42}]}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => patchExp({involved: {...exp.involved, [id]: !on}})}>
                <Avatar initials={m.initials} color={m.color} size={34} ring={on} />
              </TouchableOpacity>
              <Text style={styles.splitName}>{m.name}</Text>
              {editable && on ? (
                <View style={styles.editWrap}>
                  <TextInput
                    value={exp.vals[id] || ''}
                    onChangeText={v => patchExp({vals: {...exp.vals, [id]: v}})}
                    keyboardType="numeric"
                    style={styles.splitInput}
                  />
                  <Text style={styles.splitUnit}>{unit}</Text>
                </View>
              ) : (
                <Text style={styles.splitShare}>{on ? fmt(splits[id] || 0) : '—'}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{status}</Text>
        <Text style={[styles.statusRemaining, {color: remColor}]}>{remaining}</Text>
      </View>

      <LimeButton label="Add expense" onPress={() => submitAddExpense(group.id, exp)} disabled={!valid} />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 23, color: colors.ink, letterSpacing: -0.2},
  sub: {fontSize: 13, color: colors.muted, fontWeight: '500', marginBottom: 18},
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(20,20,15,0.07)',
    borderRadius: 16,
    padding: 15,
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 11,
  },
  amountBox: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.ink, borderRadius: 20, padding: 20, marginBottom: 18},
  amountRupee: {fontFamily: fonts.display, fontWeight: '700', fontSize: 30, color: 'rgba(255,255,255,0.5)'},
  amountInput: {fontFamily: fonts.display, fontWeight: '800', fontSize: 42, color: colors.white, padding: 0, minWidth: 60, maxWidth: 220, textAlign: 'center', letterSpacing: -0.6},
  fieldLabel: {fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: colors.muted2, marginVertical: 4, marginBottom: 9, marginHorizontal: 2},
  chipScroll: {marginBottom: 18},
  chipRow: {gap: 8, paddingBottom: 4},
  payerChip: {flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 8, paddingLeft: 8, paddingRight: 13, borderWidth: 1},
  payerChipActive: {backgroundColor: colors.ink, borderColor: colors.ink},
  payerChipIdle: {backgroundColor: colors.white, borderColor: colors.line},
  payerName: {fontWeight: '600', fontSize: 13},
  segment: {flexDirection: 'row', gap: 4, backgroundColor: colors.track, borderRadius: 14, padding: 4, marginBottom: 14},
  segTab: {flex: 1, alignItems: 'center', borderRadius: 11, paddingVertical: 9},
  segTabActive: {backgroundColor: colors.ink},
  segText: {fontWeight: '600', fontSize: 12.5, color: colors.muted3},
  segTextActive: {color: colors.white},
  splitRows: {gap: 8, marginBottom: 6},
  splitRow: {flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingVertical: 9, paddingHorizontal: 12},
  splitName: {flex: 1, fontWeight: '600', fontSize: 14, color: colors.ink},
  editWrap: {flexDirection: 'row', alignItems: 'center', gap: 6},
  splitInput: {width: 76, backgroundColor: colors.canvas, borderWidth: 1, borderColor: 'rgba(20,20,15,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.ink, textAlign: 'right'},
  splitUnit: {fontSize: 12, fontWeight: '700', color: colors.muted2, width: 12},
  splitShare: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink},
  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, paddingBottom: 16},
  statusText: {fontSize: 13, fontWeight: '500', color: colors.muted},
  statusRemaining: {fontFamily: fonts.display, fontWeight: '700', fontSize: 15},
});
