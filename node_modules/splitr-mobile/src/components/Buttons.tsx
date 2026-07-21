import React from 'react';
import {Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle} from 'react-native';
import {colors, radius, fonts} from '../theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/**
 * Primary money-moving CTA — lime fill, Sora bold ink label, soft lime glow.
 * Reserved for Settle / Pay / Add / Create per the design rules.
 */
export const LimeButton: React.FC<ButtonProps> = ({label, onPress, disabled, style, textStyle}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={disabled ? undefined : onPress}
    style={[styles.lime, disabled && styles.disabled, style]}>
    <Text style={[styles.limeText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

/** Secondary action — soft canvas fill, hairline border (Remind, etc.). */
export const GhostButton: React.FC<ButtonProps> = ({label, onPress, style, textStyle}) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.ghost, style]}>
    <Text style={[styles.ghostText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  lime: {
    backgroundColor: colors.lime,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 10},
    elevation: 3,
  },
  disabled: {backgroundColor: '#dfe7c4', opacity: 0.6, shadowOpacity: 0},
  limeText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 16, color: colors.ink},
  ghost: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: 'rgba(20,20,15,0.07)',
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {fontWeight: '600', fontSize: 13, color: colors.ink},
});
