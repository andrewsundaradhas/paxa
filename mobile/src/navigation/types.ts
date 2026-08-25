import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  GroupDetail: undefined;
  Bill: undefined;
  Activity: undefined;
  Tracking: undefined;
  Insights: undefined;
  Profile: undefined;
  Login: undefined;
  Signup: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
