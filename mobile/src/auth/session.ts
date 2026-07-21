import {create} from 'zustand';
import DeviceInfo from 'react-native-device-info';
import {configureAuth} from '../api/client';
import {apiLogin, apiSignup, apiRefresh, apiLogout} from '../api/endpoints';
import type {ApiUser, AuthResponse} from '../api/types';
import {storeRefreshToken, getRefreshToken, clearRefreshToken} from '../security/SecureStorage';

/**
 * Session manager.
 * - Access token: in memory only (attached to every request by the API client).
 * - Refresh token: in memory for silent rotation during a session, AND persisted
 *   to the Keychain/Keystore (biometric-gated) so a cold launch can restore.
 * - `restore()` runs the app-open gate: one biometric prompt → new access token.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

function getDeviceId(): string {
  try {
    return DeviceInfo.getUniqueIdSync();
  } catch {
    return 'unknown-device';
  }
}

type SessionState = {
  status: 'loading' | 'authed' | 'guest';
  user: ApiUser | null;
  setUser: (u: ApiUser | null) => void;
  setStatus: (s: SessionState['status']) => void;
};

export const useSession = create<SessionState>(set => ({
  status: 'loading',
  user: null,
  setUser: u => set({user: u}),
  setStatus: s => set({status: s}),
}));

async function apply(auth: AuthResponse): Promise<void> {
  accessToken = auth.accessToken;
  refreshToken = auth.refreshToken;
  await storeRefreshToken(auth.refreshToken, getDeviceId());
  useSession.setState({user: auth.user, status: 'authed'});
}

export async function login(email: string, password: string): Promise<void> {
  await apply(await apiLogin({email, password, deviceId: getDeviceId()}));
}

export async function signup(email: string, password: string, displayName: string): Promise<void> {
  await apply(await apiSignup({email, password, displayName, deviceId: getDeviceId()}));
}

/** Silent rotation used by the API client on a 401. Uses the in-memory token (no biometric prompt). */
async function refresh(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }
  try {
    const auth = await apiRefresh(refreshToken);
    await apply(auth);
    return true;
  } catch {
    await logout();
    return false;
  }
}

/** Cold-launch restore: read the biometric-gated refresh token and exchange it. */
export async function restore(): Promise<boolean> {
  try {
    const stored = await getRefreshToken(); // triggers the biometric prompt
    if (!stored) {
      useSession.setState({status: 'guest'});
      return false;
    }
    refreshToken = stored;
    const auth = await apiRefresh(stored);
    await apply(auth);
    return true;
  } catch {
    useSession.setState({status: 'guest'});
    return false;
  }
}

export async function logout(): Promise<void> {
  const rt = refreshToken;
  accessToken = null;
  refreshToken = null;
  await clearRefreshToken();
  useSession.setState({user: null, status: 'guest'});
  if (rt) {
    apiLogout(rt).catch(() => {});
  }
}

// Register token access + silent refresh with the API client (breaks import cycle).
configureAuth(
  () => accessToken,
  () => refresh(),
);
