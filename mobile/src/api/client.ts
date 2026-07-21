import axios, {AxiosError, type InternalAxiosRequestConfig} from 'axios';
import {Platform} from 'react-native';
import {API_BASE_URL, APP_ENV} from '../config';

/**
 * Shared API client.
 * - Injects the in-memory access token on every request.
 * - On a 401, transparently refreshes once and retries (the refresh logic is
 *   registered by the auth session to avoid an import cycle).
 * - Certificate pinning is configured for native builds (defence-in-depth).
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
});

// SPKI-pinned cert names ship in the native project; see DEPLOYMENT.md.
if ((Platform.OS === 'android' || Platform.OS === 'ios') && APP_ENV === 'production') {
  (apiClient.defaults as Record<string, unknown>).sslPinning = {
    certs: ['paxa_api', 'paxa_api_backup'],
    disableAllSecurity: false,
  };
}

// --- auth wiring (set by src/auth/session.ts) ---
let accessTokenGetter: () => string | null = () => null;
let refreshHandler: (() => Promise<boolean>) | null = null;

export function configureAuth(getter: () => string | null, refresh: () => Promise<boolean>): void {
  accessTokenGetter = getter;
  refreshHandler = refresh;
}

apiClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = accessTokenGetter();
  if (token) {
    cfg.headers.set('Authorization', `Bearer ${token}`);
  }
  return cfg;
});

apiClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & {_retried?: boolean}) | undefined;
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && refreshHandler) {
      original._retried = true;
      const ok = await refreshHandler();
      if (ok) {
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
