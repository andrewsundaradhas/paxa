import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, fonts} from '../theme';

type Props = {
  initials: string;
  color: string;
  size?: number;
  /** Selection outline ring in ink (used on split rows / sticker picker). */
  ring?: boolean;
  /** 2px ink border for avatars sitting on dark hero cards. */
  darkBorder?: boolean;
  /** Faint 1px ring so light avatars read on the warm canvas. */
  softRing?: boolean;
  /** Negative left margin for overlapping avatar stacks. */
  overlap?: boolean;
  style?: ViewStyle;
};

/** Soft circular avatar — premium skin (no heavy black border). */
export const Avatar: React.FC<Props> = ({initials, color, size = 40, ring, darkBorder, softRing, overlap, style}) => (
  <View
    style={[
      styles.base,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        marginLeft: overlap ? -8 : 0,
      },
      ring && styles.ring,
      darkBorder && styles.darkBorder,
      softRing && styles.softRing,
      style,
    ]}>
    <Text style={[styles.label, {fontSize: Math.max(10, size * 0.3)}]}>{initials}</Text>
  </View>
);

const styles = StyleSheet.create({
  base: {alignItems: 'center', justifyContent: 'center'},
  ring: {borderWidth: 2, borderColor: colors.ink},
  darkBorder: {borderWidth: 2, borderColor: colors.ink},
  softRing: {borderWidth: 1, borderColor: 'rgba(20,20,15,0.08)'},
  label: {fontFamily: fonts.displaySemi, fontWeight: '700', color: colors.ink},
});
