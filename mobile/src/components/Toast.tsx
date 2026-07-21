import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../theme';
import {useAppStore} from '../store/useAppStore';

/** Bottom-center toast pill — ink fill, lime dot. Driven by store `toast`. */
export const Toast: React.FC = () => {
  const toast = useAppStore(s => s.toast);
  if (!toast) {
    return null;
  }
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.text}>{toast}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {position: 'absolute', left: 0, right: 0, bottom: 92, alignItems: 'center'},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 18,
    shadowColor: '#14140f',
    shadowOpacity: 0.32,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 14},
    elevation: 8,
  },
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime},
  text: {fontSize: 13, fontWeight: '600', color: colors.white},
});
