import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {colors, fonts, radius, hairline} from '../theme';
import {signInWithGoogle, signInWithApple, appleSignInSupported, OAuthUnavailable, OAuthCancelled} from '../auth/oauth';
import {loginWithGoogle, loginWithApple} from '../auth/session';
import {hydrateFromApi} from '../data/hydrateFromApi';

/**
 * "Continue with Google / Apple" — self-contained. Each button runs the native
 * flow, exchanges the provider token for a paxa session, hydrates, then calls
 * `onDone`. Native modules are optional (see auth/oauth.ts): if they're not in
 * the build, the button shows a friendly message via `onError` instead.
 */
export const SocialAuthButtons: React.FC<{onDone: () => void; onError?: (msg: string) => void}> = ({onDone, onError}) => {
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);

  const run = async (provider: 'google' | 'apple') => {
    if (busy) {
      return;
    }
    setBusy(provider);
    try {
      if (provider === 'google') {
        const idToken = await signInWithGoogle();
        await loginWithGoogle(idToken);
      } else {
        const {identityToken, fullName} = await signInWithApple();
        await loginWithApple(identityToken, fullName);
      }
      await hydrateFromApi();
      onDone();
    } catch (e) {
      if (e instanceof OAuthCancelled) {
        // user backed out — say nothing
      } else if (e instanceof OAuthUnavailable) {
        onError?.(e.message);
      } else {
        const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
        onError?.(msg ?? 'Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => run('google')} style={styles.btn} disabled={!!busy}>
        {busy === 'google' ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <View style={styles.gGlyph}>
              <Text style={styles.gG}>G</Text>
            </View>
            <Text style={styles.btnText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {appleSignInSupported && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => run('apple')} style={[styles.btn, styles.appleBtn]} disabled={!!busy}>
          {busy === 'apple' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.appleGlyph}></Text>
              <Text style={[styles.btnText, styles.appleText]}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {marginTop: 20},
  dividerRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18},
  line: {flex: 1, height: 1, backgroundColor: colors.line},
  or: {fontSize: 12.5, fontWeight: '600', color: colors.muted2},

  btn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.white, ...hairline, borderRadius: radius.md, paddingVertical: 15, marginBottom: 12},
  btnText: {fontSize: 15, fontWeight: '700', color: colors.ink},
  gGlyph: {width: 22, height: 22, borderRadius: 11, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center'},
  gG: {fontFamily: fonts.display, fontWeight: '800', fontSize: 14, color: '#4285F4'},

  appleBtn: {backgroundColor: colors.ink, borderColor: colors.ink},
  appleGlyph: {fontSize: 17, color: colors.white, marginTop: -2},
  appleText: {color: colors.white},
});
