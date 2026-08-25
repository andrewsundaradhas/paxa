import 'dotenv/config';

/** Validate + expose environment once at boot; crash early if misconfigured. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  // Refresh tokens are opaque (not JWTs), so this secret is reserved for future use.
  // Not required at boot to avoid unnecessary deploy failures.
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  // Accepted OAuth audiences (comma-separated). Google: web + iOS + android client
  // ids. Apple: the app bundle id(s) / services id. Empty ⇒ that provider is off.
  googleClientIds: (process.env.GOOGLE_CLIENT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  appleClientIds: (process.env.APPLE_CLIENT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean),
};
