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
