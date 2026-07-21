import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {colors, fonts, softShadow} from '../theme';

/**
 * paxa mark — the continuous-S twin-bar glyph (top bar, vertical bridge, bottom
 * bar), sheared -15°. Recreated from the SVG with scaled, absolutely-positioned
 * Views so it recolors per surface (lime on dark, ink on light) via `color`.
 * Geometry mirrors the 64-unit viewBox of the canonical asset.
 */
export const PaxaMark: React.FC<{size?: number; color?: string}> = ({size = 22, color = colors.ink}) => {
  const u = size / 64;
  const bar = (x: number, y: number, w: number, h: number) => ({
    position: 'absolute' as const,
    left: x * u,
    top: y * u,
    width: w * u,
    height: h * u,
    borderRadius: 6.5 * u,
    backgroundColor: color,
  });
  return (
    <View style={{width: size, height: size, transform: [{skewX: '-15deg'}]}}>
      <View style={bar(28, 12, 29, 13.5)} />
      <View style={bar(28, 18, 13.5, 28)} />
      <View style={bar(12, 38.5, 29, 13.5)} />
    </View>
  );
};

/** The "paxa" wordmark in Sora. */
export const Wordmark: React.FC<{size?: number; color?: string}> = ({size = 21, color = colors.ink}) => (
  <Text style={[styles.wordmark, {fontSize: size, color}]}>paxa</Text>
);

/** Dark rounded logo tile holding the lime mark (premium header lockup). */
export const LogoBadge: React.FC<{size?: number}> = ({size = 32}) => (
  <View style={[styles.badge, {width: size, height: size}]}>
    <PaxaMark size={size * 0.62} color={colors.lime} />
  </View>
);

/** Soft white rounded-square back button with a chevron. */
export const BackButton: React.FC<{onPress: () => void; style?: ViewStyle}> = ({onPress, style}) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.backBtn, style]}>
    <Text style={styles.chevron}>‹</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wordmark: {fontFamily: fonts.display, fontWeight: '700', letterSpacing: -0.4, color: colors.ink},
  badge: {borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center'},
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  chevron: {fontSize: 22, lineHeight: 24, fontWeight: '700', color: colors.ink, marginTop: -2},
});


