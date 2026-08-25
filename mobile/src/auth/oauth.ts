/**
 * Native social sign-in bridges (Google + Apple).
 *
 * The native SDKs are loaded through guarded `require`s so the app builds and
 * runs even before they're installed/linked — the buttons then surface a clear
 * "not available in this build" message instead of crashing. Each function only
 * returns the provider token; the paxa server verifies it and issues the session
 * (see auth/session.ts → loginWithGoogle / loginWithApple).
 *
 * To fully enable, install and rebuild (see PHASE_NOTES):
 *   @react-native-google-signin/google-signin
 *   @invertase/react-native-apple-authentication
 * and set GOOGLE_WEB_CLIENT_ID in the app .env.
 */
import {Platform} from 'react-native';
import {GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID} from '../config';

export class OAuthUnavailable extends Error {}
export class OAuthCancelled extends Error {}

/* eslint-disable @typescript-eslint/no-var-requires */
// Literal requires (wrapped in try/catch) so Metro can treat them as OPTIONAL
// dependencies — the bundle succeeds whether or not the native module is
// installed (see metro.config.js → resolver.allowOptionalDependencies).
function requireGoogleSignin(): any | null {
  try {
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

function requireAppleAuth(): any | null {
  try {
    return require('@invertase/react-native-apple-authentication');
  } catch {
    return null;
  }
}

let googleConfigured = false;

/** Trigger the Google account picker and return a verified-by-Google ID token. */
export async function signInWithGoogle(): Promise<string> {
  const mod = requireGoogleSignin();
  if (!mod?.GoogleSignin) {
    throw new OAuthUnavailable('Google sign-in is not available in this build');
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new OAuthUnavailable('Google sign-in is not configured');
  }
  const {GoogleSignin, statusCodes} = mod;
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
    googleConfigured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    const result = await GoogleSignin.signIn();
    // Support both old and new response shapes across library versions.
    const idToken = result?.idToken ?? result?.data?.idToken ?? (await GoogleSignin.getTokens())?.idToken;
    if (!idToken) {
      throw new OAuthUnavailable('Google did not return an ID token');
    }
    return idToken;
  } catch (err: any) {
    if (statusCodes && (err?.code === statusCodes.SIGN_IN_CANCELLED || err?.code === statusCodes.IN_PROGRESS)) {
      throw new OAuthCancelled('cancelled');
    }
    throw err;
  }
}

export type AppleResult = {identityToken: string; fullName?: string};

/** Present Apple's sign-in sheet and return the identity token (iOS only). */
export async function signInWithApple(): Promise<AppleResult> {
  if (Platform.OS !== 'ios') {
    throw new OAuthUnavailable('Apple sign-in is available on iOS');
  }
  const mod = requireAppleAuth();
  const appleAuth = mod?.appleAuth ?? mod?.default;
  if (!appleAuth) {
    throw new OAuthUnavailable('Apple sign-in is not available in this build');
  }
  const resp = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });
  if (!resp.identityToken) {
    throw new OAuthUnavailable('Apple did not return an identity token');
  }
  const name = resp.fullName;
  const fullName = [name?.givenName, name?.familyName].filter(Boolean).join(' ') || undefined;
  return {identityToken: resp.identityToken, fullName};
}

/** Whether the Apple button should be shown at all (native iOS only). */
export const appleSignInSupported = Platform.OS === 'ios';
