declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    APP_ENV?: string;
    SENTRY_DSN?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
    GOOGLE_IOS_CLIENT_ID?: string;
  }
  export const Config: NativeConfig;
  export default Config;
}
