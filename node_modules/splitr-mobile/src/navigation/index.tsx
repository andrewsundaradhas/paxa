import React from 'react';
import {View, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {GroupsScreen} from '../screens/GroupsScreen';
import {GroupDetailScreen} from '../screens/GroupDetailScreen';
import {BillDetailScreen} from '../screens/BillDetailScreen';
import {ActivityScreen} from '../screens/ActivityScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SignupScreen} from '../screens/SignupScreen';
import {SheetHost} from '../sheets/SheetHost';
import {useSession} from '../auth/session';
import type {RootStackParamList} from './types';
import {colors} from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const status = useSession(s => s.status);
  const initialRoute = status === 'authed' ? 'Home' : 'Onboarding';

  return (
    <View style={styles.root}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{headerShown: false, contentStyle: styles.screen}}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={GroupsScreen} />
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
        <Stack.Screen name="Bill" component={BillDetailScreen} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
      <SheetHost />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  screen: {backgroundColor: colors.canvas},
});
