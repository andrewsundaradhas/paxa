import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius} from '../theme';
import {LimeButton} from '../components/Buttons';
import {PaxaMark} from '../components/common';
import type {ScreenProps} from '../navigation/types';

export const OnboardingScreen: React.FC<ScreenProps<'Onboarding'>> = ({navigation}) => (
  <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={[styles.glow, styles.glowLime]} />
        <View style={[styles.glow, styles.glowBlue]} />

        <View>
          <View style={styles.heroTop}>
            <View style={styles.brand}>
              <PaxaMark size={26} color={colors.lime} />
              <Text style={styles.brandWord}>paxa</Text>
            </View>
            <View style={styles.chip}>
              <View style={styles.dot} />
              <Text style={styles.chipText}>UPI · Cards</Text>
            </View>
          </View>
          <Text style={styles.headline}>
            Split the bill.{'\n'}Keep the <Text style={styles.lime}>vibe.</Text>
          </Text>
          <Text style={styles.sub}>
            Add an expense, we do the math, everyone settles in two taps. Minus the awkward reminders.
          </Text>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Goa Trip · your balance</Text>
          <Text style={styles.previewAmount}>- ₹2,000</Text>
          <View style={styles.avatars}>
            {[colors.pink, colors.cyan, colors.lime, colors.khaki].map((c, i) => (
              <View key={c} style={[styles.av, {backgroundColor: c, marginLeft: i ? -12 : 0}]} />
            ))}
          </View>
        </View>
      </View>

      <LimeButton label="Get Started" onPress={() => navigation.replace('Login')} style={styles.cta} />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {flexGrow: 1, padding: 18, paddingTop: 14},
  hero: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: colors.ink,
    padding: 26,
    paddingBottom: 30,
    justifyContent: 'space-between',
    minHeight: 560,
  },
  glow: {position: 'absolute', borderRadius: 999},
  glowLime: {top: -60, right: -50, width: 240, height: 240, backgroundColor: 'rgba(194,242,63,0.18)'},
  glowBlue: {bottom: -40, left: -40, width: 180, height: 180, backgroundColor: 'rgba(120,160,255,0.12)'},
  heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 9},
  brandWord: {fontFamily: fonts.display, fontWeight: '700', fontSize: 22, color: colors.white, letterSpacing: -0.4},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime},
  chipText: {fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)'},
  headline: {fontFamily: fonts.display, fontWeight: '800', fontSize: 40, lineHeight: 42, letterSpacing: -1, color: colors.white, marginTop: 26},
  lime: {color: colors.lime},
  sub: {fontSize: 14.5, color: 'rgba(255,255,255,0.62)', fontWeight: '500', marginTop: 14, maxWidth: 280, lineHeight: 20},
  preview: {
    marginTop: 30,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 18,
  },
  previewLabel: {fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)'},
  previewAmount: {fontFamily: fonts.display, fontWeight: '800', fontSize: 34, color: colors.white, marginTop: 3, letterSpacing: -0.6},
  avatars: {flexDirection: 'row', marginTop: 10},
  av: {width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.ink},
  cta: {marginTop: 16, paddingVertical: 18},
});
