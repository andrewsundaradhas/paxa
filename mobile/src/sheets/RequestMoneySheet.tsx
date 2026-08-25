import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {colors, fonts, radius, hairline} from '../theme';
import {LimeButton} from '../components/Buttons';
import {Sheet} from '../components/Sheet';
import {SPENDING_CATEGORIES} from '../categories';
import {useAppStore, MEMBERS} from '../store/useAppStore';
import {submitPaymentRequest} from '../data/liveMutations';

/**
 * Ask someone to pay you. Reachable from the "Request" quick action and from a
 * scanned receipt (pre-filled). Mirrors the Add-expense sheet's light styling.
 */
export const RequestMoneySheet: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const prefill = useAppStore(s => s.requestPrefill);
  const closeSheet = useAppStore(s => s.closeSheet);
  const openScanSheet = useAppStore(s => s.openScanSheet);
  const flash = useAppStore(s => s.flash);

  const visible = sheet === 'requestMoney';

  const people = useMemo(
    () => Object.values(MEMBERS).filter(m => m.id !== 'you'),
    // recompute each open so freshly-hydrated members appear
    [visible],
  );

  const [amount, setAmount] = useState('');
  const [toName, setToName] = useState('');
  const [toUserId, setToUserId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed once per open from the prefill (from a receipt scan).
  if (visible && !seeded) {
    setSeeded(true);
    setAmount(prefill?.amount ?? '');
    setToName(prefill?.toName ?? '');
    setToUserId(prefill?.toUserId);
    setNote(prefill?.note ?? '');
    setCategory(prefill?.category ?? 'Other');
  }
  if (!visible && seeded) {
    setSeeded(false);
  }

  if (!visible) {
    return <Sheet visible={false} onClose={closeSheet} children={null} />;
  }

  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && toName.trim().length > 0;

  const pickPerson = (id: string, name: string) => {
    setToUserId(id.length > 12 ? id : undefined); // real backend uuids only
    setToName(name);
  };

  const onSubmit = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    try {
      const ok = await submitPaymentRequest({
        toUserId,
        toName: toName.trim(),
        amount: amt,
        note: note.trim() || undefined,
        category,
        receiptId: prefill?.receiptId,
      });
      if (ok) {
        flash(`Request for ₹${Math.round(amt).toLocaleString('en-IN')} sent to ${toName.trim()}`);
        closeSheet();
      } else {
        flash('Enter an amount and who should pay');
      }
    } catch {
      flash('Could not send the request — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={closeSheet} scroll>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Request money</Text>
        <TouchableOpacity onPress={openScanSheet} activeOpacity={0.8} style={styles.scanChip}>
          <Text style={styles.scanChipText}>⌁ Scan receipt</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>AMOUNT</Text>
      <View style={styles.amountRow}>
        <Text style={styles.rupee}>₹</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={colors.muted2}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <Text style={styles.label}>FROM</Text>
      {people.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
          {people.map(p => {
            const on = toName === p.name;
            return (
              <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => pickPerson(p.id, p.name)} style={[styles.person, on && styles.personOn]}>
                <View style={[styles.personAv, {backgroundColor: p.color}]}>
                  <Text style={styles.personAvText}>{p.initials.slice(0, 2)}</Text>
                </View>
                <Text style={[styles.personName, on && styles.personNameOn]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <TextInput
        style={styles.input}
        placeholder="Or type a name"
        placeholderTextColor={colors.muted2}
        value={toName}
        onChangeText={t => {
          setToName(t);
          setToUserId(undefined);
        }}
      />

      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.catWrap}>
        {SPENDING_CATEGORIES.map(c => {
          const on = category === c;
          return (
            <TouchableOpacity key={c} activeOpacity={0.85} onPress={() => setCategory(c)} style={[styles.cat, on && styles.catOn]}>
              <Text style={[styles.catText, on && styles.catTextOn]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="What's it for?"
        placeholderTextColor={colors.muted2}
        value={note}
        onChangeText={setNote}
      />

      <LimeButton
        label={busy ? 'Sending…' : valid ? `Request ₹${Math.round(amt).toLocaleString('en-IN')}` : 'Request'}
        onPress={onSubmit}
        disabled={!valid || busy}
        style={styles.cta}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6},
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 21, color: colors.ink},
  scanChip: {backgroundColor: colors.white, ...hairline, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 13},
  scanChipText: {fontSize: 12.5, fontWeight: '700', color: colors.limeDark},

  label: {fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5, color: colors.muted, marginTop: 18, marginBottom: 8, marginHorizontal: 2},
  amountRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, ...hairline, borderRadius: radius.md, paddingHorizontal: 16},
  rupee: {fontFamily: fonts.display, fontWeight: '700', fontSize: 26, color: colors.ink, marginRight: 6},
  amountInput: {flex: 1, fontFamily: fonts.display, fontWeight: '700', fontSize: 30, color: colors.ink, paddingVertical: 12},

  chipsRow: {marginBottom: 10},
  chipsContent: {gap: 8, paddingRight: 8},
  person: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, ...hairline, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 10, paddingRight: 14},
  personOn: {borderColor: colors.limeDark, backgroundColor: '#edf7cf'},
  personAv: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  personAvText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 11, color: colors.ink},
  personName: {fontSize: 13.5, fontWeight: '600', color: colors.ink},
  personNameOn: {color: colors.limeDark},

  input: {backgroundColor: colors.white, ...hairline, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, fontWeight: '500', color: colors.ink},

  catWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  cat: {backgroundColor: colors.white, ...hairline, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14},
  catOn: {backgroundColor: colors.ink, borderColor: colors.ink},
  catText: {fontSize: 13, fontWeight: '600', color: colors.muted3},
  catTextOn: {color: colors.white},

  cta: {marginTop: 24, paddingVertical: 18},
});
