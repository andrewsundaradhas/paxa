import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fonts, radius} from '../theme';
import {LimeButton} from '../components/Buttons';
import {LogoBadge, Wordmark, BackButton} from '../components/common';
import {signup} from '../auth/session';
import {hydrateFromApi} from '../data/hydrateFromApi';
import type {ScreenProps} from '../navigation/types';

export const SignupScreen: React.FC<ScreenProps<'Signup'>> = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignup = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await signup(email.trim(), password, name.trim());
      await hydrateFromApi();
      navigation.replace('Home');
    } catch (e: unknown) {
      const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
      setError(msg ?? 'Could not create your account. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <BackButton onPress={() => navigation.goBack()} style={styles.back} />
        <View style={styles.brandRow}>
          <LogoBadge size={36} />
          <Wordmark size={22} />
        </View>
        <Text style={styles.heading}>Create account</Text>

        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted2} value={name} onChangeText={setName} />
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
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.muted2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <LimeButton label={busy ? 'Creating…' : 'Create account'} onPress={onSignup} disabled={busy} style={styles.cta} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={styles.linkMuted}>Already have an account? </Text>
          <Text style={styles.link}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.canvas},
  content: {flex: 1, paddingHorizontal: 22, justifyContent: 'center'},
  back: {position: 'absolute', top: 8, left: 22},
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
  linkRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 22},
  linkMuted: {color: colors.muted, fontSize: 14, fontWeight: '500'},
  link: {color: colors.limeDark, fontSize: 14, fontWeight: '700'},
});
