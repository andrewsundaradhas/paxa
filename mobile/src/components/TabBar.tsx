import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../theme';
import {useAppStore} from '../store/useAppStore';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

/**
 * Floating, blurred-glass bottom tab bar — Home · Activity · (＋) · Profile,
 * with a dark center action that opens Add-expense (in a group) or New-group.
 */
export const TabBar: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const routeName = useNavigationState((s: {index: number; routes: {name: string}[]}) => s.routes[s.index]?.name);
  const openSheet = useAppStore(s => s.openSheet);

  const onCenter = () => {
    if (routeName === 'GroupDetail') {
      openSheet('addExpense');
    } else {
      openSheet('createGroup');
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pill
          active={routeName === 'Home'}
          label="Home"
          onPress={() => navigation.navigate('Home')}
          icon={active => <HomeIcon color={active ? colors.ink : colors.muted} />}
        />
        <Pill
          active={routeName === 'Activity'}
          label="Activity"
          onPress={() => navigation.navigate('Activity')}
          icon={active => <ActivityIcon color={active ? colors.ink : colors.muted} />}
        />
        <TouchableOpacity activeOpacity={0.85} onPress={onCenter} style={styles.center}>
          <Text style={styles.plus}>＋</Text>
        </TouchableOpacity>
        <Pill
          active={routeName === 'Profile'}
          label="Profile"
          onPress={() => navigation.navigate('Profile')}
          icon={active => <ProfileIcon color={active ? colors.ink : colors.muted} />}
        />
      </View>
    </View>
  );
};

const Pill: React.FC<{
  active: boolean;
  label: string;
  onPress: () => void;
  icon: (active: boolean) => React.ReactNode;
}> = ({active, label, onPress, icon}) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
    {icon(active)}
    {active && <Text style={styles.pillLabel}>{label}</Text>}
  </TouchableOpacity>
);

// Lightweight glyphs (no SVG dependency) built from Views.
const HomeIcon: React.FC<{color: string}> = ({color}) => (
  <View style={[icon.box, {borderColor: color, borderWidth: 1.7, borderTopLeftRadius: 6, borderTopRightRadius: 6}]} />
);
const ActivityIcon: React.FC<{color: string}> = ({color}) => (
  <View style={icon.box}>
    <View style={{height: 2, width: 18, backgroundColor: color, borderRadius: 2, transform: [{rotate: '-18deg'}]}} />
  </View>
);
const ProfileIcon: React.FC<{color: string}> = ({color}) => (
  <View style={icon.box}>
    <View style={{width: 8, height: 8, borderRadius: 4, borderWidth: 1.7, borderColor: color, marginBottom: 1}} />
    <View style={{width: 14, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.7, borderBottomWidth: 0, borderColor: color}} />
  </View>
);

const icon = StyleSheet.create({
  box: {width: 19, height: 19, alignItems: 'center', justifyContent: 'center'},
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 7,
    shadowColor: '#14140f',
    shadowOpacity: 0.16,
    shadowRadius: 34,
    shadowOffset: {width: 0, height: 14},
    elevation: 8,
  },
  pill: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 17},
  pillActive: {backgroundColor: colors.lime},
  pillLabel: {fontSize: 13, fontWeight: '600', color: colors.ink},
  center: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14140f',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  plus: {fontSize: 24, color: colors.lime, fontWeight: '400', marginTop: -2},
});
