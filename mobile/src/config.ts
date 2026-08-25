/**
 * Runtime configuration baked per build flavour via react-native-config.
 * Copy `.env.example` to `.env` for local dev; use `.env.production` for release builds.
 */
import Config from 'react-native-config';
import {Platform} from 'react-native';

const devDefault = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_BASE_URL = Config.API_BASE_URL || devDefault;
export const APP_ENV = Config.APP_ENV || 'development';
export const SENTRY_DSN = Config.SENTRY_DSN || '';

/**
 * Google OAuth Web client id (the "server"/web client from the Google Cloud
 * console). Required for "Continue with Google"; the server validates the token
 * against its own accepted client-id list. iOS additionally needs the iOS client
 * id, configured natively in Info.plist / GoogleService-Info.
 */
export const GOOGLE_WEB_CLIENT_ID = Config.GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = Config.GOOGLE_IOS_CLIENT_ID || '';
