import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, StyleSheet, View} from 'react-native';
import {restore, useSession} from '../auth/session';
import {colors} from '../theme';
import {hydrateFromApi, resetDemoData} from '../data/hydrateFromApi';

type Props = {children: React.ReactNode};

/**
 * Cold-launch gate: restore a biometric-gated session, then hydrate live data
 * from the API. Re-prompts biometrics when returning from background.
 */
export const AppBootstrap: React.FC<Props> = ({children}) => {
  const status = useSession(s => s.status);
  const [ready, setReady] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await restore();
      if (cancelled) {
        return;
      }
      if (ok) {
        try {
          await hydrateFromApi();
        } catch {
          // API unreachable — stay authed; screens can retry.
        }
      } else {
        resetDemoData();
      }
      if (!cancelled) {
        setReady(true);
      }
    })();

    const sub = AppState.addEventListener('change', async next => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = next;
      if (wasBackground && next === 'active' && useSession.getState().status === 'authed') {
        await restore();
        try {
          await hydrateFromApi();
        } catch {
          /* offline */
        }
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  if (!ready || status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  splash: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas},
});
