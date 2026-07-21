import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Modal, Animated, Easing, TouchableOpacity} from 'react-native';
import {colors, fonts} from '../theme';
import {useAppStore, MEMBERS, fmt, pairwise, topCreditor} from '../store/useAppStore';

type Confetto = {left: number; top: number; size: number; fill: string; circle?: boolean; delay: number; duration: number};

const CONFETTI: Confetto[] = [
  {left: 50, top: 90, size: 12, fill: colors.lime, delay: 50, duration: 1500},
  {left: 300, top: 60, size: 10, fill: colors.cyan, circle: true, delay: 300, duration: 1700},
  {left: 300, top: 120, size: 14, fill: colors.pink, delay: 150, duration: 1900},
  {left: 140, top: 80, size: 9, fill: colors.khaki, circle: true, delay: 450, duration: 1600},
  {left: 210, top: 50, size: 11, fill: colors.lime, delay: 250, duration: 1800},
];

const FallingConfetto: React.FC<{c: Confetto}> = ({c}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {toValue: 1, duration: c.duration, delay: c.delay, easing: Easing.in(Easing.ease), useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, c.delay, c.duration]);
  const translateY = anim.interpolate({inputRange: [0, 1], outputRange: [-10, 380]});
  const rotate = anim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '220deg']});
  const opacity = anim.interpolate({inputRange: [0, 0.12, 1], outputRange: [0, 1, 0]});
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: c.left,
        top: c.top,
        width: c.size,
        height: c.size,
        backgroundColor: c.fill,
        borderRadius: c.circle ? c.size / 2 : 3,
        transform: [{translateY}, {rotate}],
        opacity,
      }}
    />
  );
};

export const SuccessOverlay: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const group = useAppStore(s => s.group());
  const settleTarget = useAppStore(s => s.settleTarget);
  const settleMethod = useAppStore(s => s.settleMethod);
  const settledPairs = useAppStore(s => s.settledPairs);
  const finishPay = useAppStore(s => s.finishPay);

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (sheet === 'success') {
      pop.setValue(0);
      Animated.spring(pop, {toValue: 1, useNativeDriver: true, friction: 5, tension: 80}).start();
    }
  }, [sheet, pop]);

  if (sheet !== 'success' || !group) {
    return null;
  }

  const pw = pairwise(group);
  const tid = settleTarget ?? topCreditor(group, settledPairs).id;
  const amount = Math.max(0, pw[tid] || 0);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finishPay}>
      <View style={styles.fill}>
        {CONFETTI.map((c, i) => (
          <FallingConfetto key={i} c={c} />
        ))}
        <Animated.View style={[styles.checkCircle, {transform: [{scale: pop}]}]}>
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>
        <Text style={styles.sent}>Payment sent</Text>
        <Text style={styles.total}>{fmt(amount)}</Text>
        <Text style={styles.to}>
          to {MEMBERS[tid].name} · via {settleMethod === 'upi' ? 'UPI' : 'Card'}
        </Text>
        <Text style={styles.note}>Receipt logged to history. No fees — paxa is free.</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={finishPay} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 30, overflow: 'hidden'},
  checkCircle: {width: 96, height: 96, borderRadius: 48, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center'},
  checkMark: {fontSize: 48, fontWeight: '800', color: colors.ink, marginTop: -4},
  sent: {fontFamily: fonts.display, fontWeight: '700', fontSize: 26, color: colors.white, marginTop: 24, letterSpacing: -0.2},
  total: {fontFamily: fonts.display, fontWeight: '800', fontSize: 40, color: colors.lime, marginTop: 8, letterSpacing: -0.6},
  to: {fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center'},
  note: {fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 20, textAlign: 'center'},
  doneBtn: {marginTop: 28, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 44},
  doneText: {fontFamily: fonts.display, fontWeight: '600', fontSize: 16, color: colors.white},
});
