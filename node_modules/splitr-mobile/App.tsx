import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import {RootNavigator} from './src/navigation';
import {AppBootstrap} from './src/bootstrap/AppBootstrap';
import {SENTRY_DSN, APP_ENV} from './src/config';

const queryClient = new QueryClient();

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    tracesSampleRate: APP_ENV === 'production' ? 0.2 : 1.0,
  });
}

const App = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <AppBootstrap>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppBootstrap>
    </QueryClientProvider>
  </SafeAreaProvider>
);

export default Sentry.wrap(App);
