import React from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity} from 'react-native';
import {colors, fonts} from '../theme';
import {Avatar} from '../components/Avatar';
import {LimeButton} from '../components/Buttons';
import {Sheet} from '../components/Sheet';
import {useAppStore, MEMBERS} from '../store/useAppStore';
import {submitCreateGroup} from '../data/liveMutations';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

const GROUP_COLORS = [colors.pink, colors.cyan, colors.lime];

export const CreateGroupSheet: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const grp = useAppStore(s => s.grp);
  const patchGrp = useAppStore(s => s.patchGrp);
  const closeSheet = useAppStore(s => s.closeSheet);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const visible = sheet === 'createGroup';
  if (!visible || !grp) {
    return <Sheet visible={false} onClose={closeSheet} scroll children={null} />;
  }

  const mids = Object.keys(grp.members).filter(k => grp.members[k]);
  const ok = !!grp.name.trim() && mids.length >= 2;

  const onCreate = async () => {
    const id = await submitCreateGroup(grp);
    if (id) {
      navigation.navigate('GroupDetail');
    }
  };

  return (
    <Sheet visible={visible} onClose={closeSheet} scroll>
      <Text style={styles.title}>New group</Text>
      <Text style={styles.sub}>Trip, flat, dinner crew — whatever.</Text>

      <TextInput
        value={grp.name}
        onChangeText={t => patchGrp({name: t})}
        placeholder="Group name"
        placeholderTextColor={colors.muted2}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>ACCENT</Text>
      <View style={styles.colorRow}>
        {GROUP_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            activeOpacity={0.85}
            onPress={() => patchGrp({color: c})}
            style={[styles.swatch, {backgroundColor: c}, grp.color === c && styles.swatchActive]}>
            {grp.color === c && <Text style={styles.swatchCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>MEMBERS</Text>
      <View style={styles.memberList}>
        {Object.keys(MEMBERS).map(id => {
          const m = MEMBERS[id];
          const on = !!grp.members[id];
          const locked = id === 'you';
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={locked ? 1 : 0.8}
              onPress={() => {
                if (!locked) {
                  patchGrp({members: {...grp.members, [id]: !on}});
                }
              }}
              style={[styles.memberRow, {opacity: on ? 1 : 0.5}]}>
              <Avatar initials={m.initials} color={m.color} size={34} />
              <Text style={styles.memberName}>{m.name}</Text>
              <View style={[styles.check, on ? styles.checkOn : styles.checkOff]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <LimeButton label="Create group" onPress={onCreate} disabled={!ok} />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 23, color: colors.ink},
  sub: {fontSize: 13, color: colors.muted, fontWeight: '500', marginBottom: 18},
  input: {backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(20,20,15,0.07)', borderRadius: 16, padding: 15, fontSize: 16, fontWeight: '500', color: colors.ink, marginBottom: 16},
  fieldLabel: {fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: colors.muted2, marginVertical: 4, marginBottom: 9, marginHorizontal: 2},
  colorRow: {flexDirection: 'row', gap: 10, marginBottom: 18},
  swatch: {flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  swatchActive: {borderWidth: 2, borderColor: colors.ink},
  swatchCheck: {fontSize: 18, fontWeight: '700', color: colors.ink},
  memberList: {gap: 8, marginBottom: 18},
  memberRow: {flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingVertical: 9, paddingHorizontal: 12},
  memberName: {flex: 1, fontWeight: '600', fontSize: 15, color: colors.ink},
  check: {width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
  checkOn: {backgroundColor: colors.lime, borderColor: colors.lime},
  checkOff: {backgroundColor: colors.canvas, borderColor: 'rgba(20,20,15,0.12)'},
  checkMark: {fontSize: 13, fontWeight: '800', color: colors.ink},
});
