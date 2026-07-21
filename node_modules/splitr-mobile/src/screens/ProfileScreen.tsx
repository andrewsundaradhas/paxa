import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, softShadow} from '../theme';
import {BackButton} from '../components/common';
import {TabBar} from '../components/TabBar';
import {useAppStore} from '../store/useAppStore';
import {logout, useSession} from '../auth/session';
import type {ScreenProps} from '../navigation/types';

const STICKER_COLORS = [colors.pink, colors.cyan, colors.khaki];
const SETTINGS: {glyph: string; label: string; value: string; tint: string}[] = [
  {glyph: '💳', label: 'Payment methods', value: 'riya@okhdfc', tint: '#e3eef5'},
  {glyph: '🔔', label: 'Notifications', value: 'On', tint: '#f6e6f3'},
  {glyph: '🔒', label: 'Privacy & security', value: '', tint: '#edf7cf'},
  {glyph: '💬', label: 'Help & support', value: '', tint: '#f0ecdd'},
];

export const ProfileScreen: React.FC<ScreenProps<'Profile'>> = ({navigation}) => {
  const userColor = useAppStore(s => s.userColor);
  const setUserColor = useAppStore(s => s.setUserColor);
  const groupCount = useAppStore(s => s.groups.length);
  const user = useSession(s => s.user);
  const isAuthed = useSession(s => s.status) === 'authed';

  const onSignOut = async () => {
    await logout();
    useAppStore.getState().resetToDemoSeed();
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Home')} style={styles.backRow}>
          <BackButton onPress={() => navigation.navigate('Home')} />
          <Text style={styles.backLabel}>Profile</Text>
        </TouchableOpacity>

        <View style={styles.profileTop}>
          <View style={[styles.bigAvatar, {backgroundColor: userColor}]}>
            <Text style={styles.bigAvatarText}>Ri</Text>
          </View>
          <Text style={styles.name}>{user?.displayName ?? 'Riya Sharma'}</Text>
          <Text style={styles.handle}>{user?.email ?? 'riya@okhdfc · @riyas'}</Text>
        </View>
        

        <View style={styles.statRow}>
          <View style={styles.statDark}>
            <Text style={styles.statDarkLabel}>Settled this month</Text>
            <Text style={styles.statDarkValue}>₹14,820</Text>
          </View>
          <View style={styles.statLight}>
            <Text style={styles.statLightLabel}>Active groups</Text>
            <Text style={styles.statLightValue}>{groupCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>YOUR STICKER COLOR</Text>
        <View style={styles.colorRow}>
          {STICKER_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.85}
              onPress={() => setUserColor(c)}
              style={[styles.swatch, {backgroundColor: c}, userColor === c && styles.swatchActive]}>
              {userColor === c && <Text style={styles.swatchCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settings}>
          {SETTINGS.map((s, i) => (
            <View key={s.label} style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingBorder]}>
              <View style={[styles.settingIcon, {backgroundColor: s.tint}]}>
                <Text style={styles.settingGlyph}>{s.glyph}</Text>
              </View>
              <Text style={styles.settingLabel}>{s.label}</Text>
              {!!s.value && <Text style={styles.settingValue}>{s.value}</Text>}
              <Text style={styles.settingChevron}>›</Text>
            </View>
          ))}
        </View>

        {isAuthed && (
          <TouchableOpacity activeOpacity={0.85} onPress={onSignOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 6, paddingBottom: 130},
  backRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4, marginBottom: 18},
  backLabel: {fontFamily: fonts.display, fontWeight: '600', fontSize: 16, color: colors.ink},
  profileTop: {alignItems: 'center', paddingTop: 6, paddingBottom: 22},
  bigAvatar: {width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', shadowColor: '#14140f', shadowOpacity: 0.14, shadowRadius: 26, shadowOffset: {width: 0, height: 12}, elevation: 5},
  bigAvatarText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 32, color: colors.ink},
  name: {fontFamily: fonts.display, fontWeight: '700', fontSize: 22, color: colors.ink, marginTop: 14},
  handle: {fontSize: 13, color: colors.muted, fontWeight: '500', marginTop: 2},

  statRow: {flexDirection: 'row', gap: 11, marginBottom: 18},
  statDark: {flex: 1, backgroundColor: colors.ink, borderRadius: 20, padding: 16, shadowColor: '#14140f', shadowOpacity: 0.14, shadowRadius: 26, shadowOffset: {width: 0, height: 12}, elevation: 4},
  statDarkLabel: {fontSize: 11.5, fontWeight: '500', color: 'rgba(255,255,255,0.5)'},
  statDarkValue: {fontFamily: fonts.display, fontWeight: '800', fontSize: 24, color: colors.white, marginTop: 4},
  statLight: {flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, ...softShadow},
  statLightLabel: {fontSize: 11.5, fontWeight: '500', color: colors.muted2},
  statLightValue: {fontFamily: fonts.display, fontWeight: '800', fontSize: 24, color: colors.ink, marginTop: 4},

  sectionLabel: {fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: colors.muted2, marginVertical: 6, marginBottom: 10, marginHorizontal: 2},
  colorRow: {flexDirection: 'row', gap: 12, marginBottom: 20},
  swatch: {flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#14140f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: {width: 0, height: 6}, elevation: 2},
  swatchActive: {borderWidth: 2, borderColor: colors.ink},
  swatchCheck: {fontSize: 20, fontWeight: '700', color: colors.ink},

  settings: {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden', ...softShadow},
  settingRow: {flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, paddingHorizontal: 16},
  settingBorder: {borderBottomWidth: 1, borderBottomColor: colors.line},
  settingIcon: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  settingGlyph: {fontSize: 14},
  settingLabel: {flex: 1, fontWeight: '600', fontSize: 15, color: colors.ink},
  settingValue: {fontSize: 13, fontWeight: '500', color: colors.muted2},
  settingChevron: {fontSize: 18, color: '#c7c5ba', fontWeight: '700', marginLeft: 8},
  signOut: {marginTop: 20, alignItems: 'center', paddingVertical: 16},
  signOutText: {fontSize: 15, fontWeight: '600', color: '#b00050'},
});
