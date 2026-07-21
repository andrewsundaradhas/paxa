import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius} from '../theme';
import {LimeButton} from '../components/Buttons';
import {LogoBadge, Wordmark} from '../components/common';
import {login} from '../auth/session';
import {hydrateFromApi} from '../data/hydrateFromApi';
import {useAppStore} from '../store/useAppStore';
import type {ScreenProps} from '../navigation/types';

export const LoginScreen: React.FC<ScreenProps<'Login'>> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      await hydrateFromApi();
      navigation.replace('Home');
    } catch (e: unknown) {
      const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
      setError(msg ?? 'Could not sign in. Check your details or your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <LogoBadge size={36} />
          <Wordmark size={22} />
        </View>
        <Text style={styles.heading}>Welcome back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted2}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <LimeButton label={busy ? 'Signing in…' : 'Continue'} onPress={onLogin} disabled={busy} style={styles.cta} />
        {busy && <ActivityIndicator style={styles.spinner} color={colors.ink} />}

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
          <Text style={styles.linkMuted}>New to paxa? </Text>
          <Text style={styles.link}>Create an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            useAppStore.getState().resetToDemoSeed();
            navigation.replace('Home');
          }}
          style={styles.demoRow}>
          <Text style={styles.demo}>Continue in demo mode</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {flex: 1, paddingHorizontal: 22, justifyContent: 'center'},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24},
  heading: {fontFamily: fonts.display, fontWeight: '800', fontSize: 34, color: colors.ink, marginBottom: 24, letterSpacing: -0.6},
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(20,20,15,0.07)',
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 14,
  },
  error: {color: '#b00050', fontSize: 13, fontWeight: '600', marginBottom: 12, marginHorizontal: 2},
  cta: {marginTop: 10, paddingVertical: 18},
  spinner: {marginTop: 12},
  linkRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 22},
  linkMuted: {color: colors.muted, fontSize: 14, fontWeight: '500'},
  link: {color: colors.limeDark, fontSize: 14, fontWeight: '700'},
  demoRow: {alignItems: 'center', marginTop: 16},
  demo: {color: colors.muted2, fontSize: 13, fontWeight: '500', textDecorationLine: 'underline'},
});
