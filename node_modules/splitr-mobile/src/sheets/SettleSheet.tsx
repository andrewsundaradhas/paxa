import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, fonts} from '../theme';
import {LimeButton} from '../components/Buttons';
import {Sheet} from '../components/Sheet';
import {useAppStore, MEMBERS, fmt, pairwise, topCreditor} from '../store/useAppStore';
import {payViaUpi} from '../payments/upi';
import {submitSettlement} from '../data/liveMutations';

/**
 * The "real-money moment" — ink sheet. Shows the exact amount (no platform
 * fee), then hands off to the user's own UPI app via a `upi://pay` deep link so
 * the money moves peer-to-peer. paxa never touches the funds.
 */
export const SettleSheet: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const group = useAppStore(s => s.group());
  const settleTarget = useAppStore(s => s.settleTarget);
  const settleMethod = useAppStore(s => s.settleMethod);
  const settledPairs = useAppStore(s => s.settledPairs);
  const setSettleMethod = useAppStore(s => s.setSettleMethod);
  const flash = useAppStore(s => s.flash);
  const closeSheet = useAppStore(s => s.closeSheet);

  const visible = sheet === 'settle';
  if (!visible || !group) {
    return <Sheet visible={false} onClose={closeSheet} dark children={null} />;
  }

  const pw = pairwise(group);
  const tid = settleTarget ?? topCreditor(group, settledPairs).id;
  const recipient = MEMBERS[tid];
  const amount = Math.max(0, pw[tid] || 0);

  const onPay = async () => {
    if (settleMethod === 'card') {
      flash('Card payments are not enabled yet — use UPI');
      return;
    }

    const apiRes = await submitSettlement(group.id, tid, amount, settleMethod);
    const vpa = apiRes?.payeeVpa ?? recipient.vpa;
    const name = apiRes?.payeeName ?? recipient.name;

    if (settleMethod === 'upi') {
      const res = await payViaUpi({vpa, name, amount, note: `${group.name} settle`});
      if (res === 'no-app') {
        flash(`No UPI app found · pay ${vpa}`);
      }
    }
  };

  const Method = ({k, title, sub}: {k: 'upi' | 'card'; title: string; sub: string}) => {
    const on = settleMethod === k;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSettleMethod(k)}
        style={[styles.method, {backgroundColor: on ? 'rgba(194,242,63,0.12)' : 'rgba(255,255,255,0.05)', borderColor: on ? colors.lime : 'rgba(255,255,255,0.1)'}]}>
        <View style={styles.methodTop}>
          <Text style={styles.methodTitle}>{title}</Text>
          <View style={[styles.radio, {borderColor: on ? colors.lime : 'rgba(255,255,255,0.3)'}]}>
            <View style={[styles.radioDot, {backgroundColor: on ? colors.lime : 'transparent'}]} />
          </View>
        </View>
        <Text style={styles.methodSub}>{sub}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Sheet visible={visible} onClose={closeSheet} dark>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Settle up</Text>
        <View style={styles.secured}>
          <Text style={styles.securedText}>● Secured</Text>
        </View>
      </View>
      <Text style={styles.paying}>
        Paying {recipient.name} · {recipient.vpa}
      </Text>

      <View style={styles.payCard}>
        <View style={styles.payGlow} />
        <Text style={styles.payLabel}>You'll send</Text>
        <Text style={styles.payTotal}>{fmt(amount)}</Text>
        <View style={styles.directRow}>
          <View style={styles.directDot} />
          <Text style={styles.directText}>Direct UPI transfer · no fees</Text>
        </View>
      </View>

      <Text style={styles.payWith}>PAY WITH</Text>
      <View style={styles.methods}>
        <Method k="upi" title="UPI" sub="GPay · PhonePe · any app" />
        <Method k="card" title="Card" sub="via your bank" />
      </View>

      <LimeButton label={`Pay ${fmt(amount)} now`} onPress={onPay} style={styles.payBtn} textStyle={styles.payBtnText} />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 21, color: colors.white},
  secured: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(194,242,63,0.14)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11},
  securedText: {fontSize: 11, fontWeight: '600', color: colors.lime},
  paying: {fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500', marginTop: 3},
  payCard: {position: 'relative', overflow: 'hidden', borderRadius: 22, backgroundColor: '#20201a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginVertical: 18},
  payGlow: {position: 'absolute', top: -30, right: -20, width: 130, height: 130, borderRadius: 999, backgroundColor: 'rgba(194,242,63,0.14)'},
  payLabel: {fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)'},
  payTotal: {fontFamily: fonts.display, fontWeight: '800', fontSize: 48, color: colors.white, letterSpacing: -1.3, marginTop: 2},
  directRow: {flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start'},
  directDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime},
  directText: {fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)'},
  payWith: {fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: 'rgba(255,255,255,0.45)', marginHorizontal: 2, marginBottom: 9},
  methods: {flexDirection: 'row', gap: 10, marginBottom: 20},
  method: {flex: 1, borderRadius: 16, padding: 14, borderWidth: 1},
  methodTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  methodTitle: {fontFamily: fonts.display, fontWeight: '700', fontSize: 15, color: colors.white},
  radio: {width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'},
  radioDot: {width: 8, height: 8, borderRadius: 4},
  methodSub: {fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.5)', marginTop: 3},
  payBtn: {paddingVertical: 18},
  payBtnText: {fontSize: 17},
});
