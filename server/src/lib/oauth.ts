/**
 * Social sign-in token verification (Google + Apple).
 *
 * The heavy verifier libraries are imported lazily through non-literal specifiers
 * so the API compiles and boots even before they're installed — the endpoints
 * return a clear 501 until `google-auth-library` / `apple-signin-auth` are
 * present and the provider's client ids are configured. Verification is ALWAYS
 * server-side: the client only ever sends the provider's signed token.
 */
import {env} from '../env';
import {AppError} from './http';

export interface OAuthIdentity {
  provider: 'google' | 'apple';
  subject: string; // stable provider user id
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

const notConfigured = (p: string) =>
  new AppError(501, `${p} sign-in is not configured on the server`, 'oauth_unconfigured');
const invalid = (p: string) => new AppError(401, `Invalid ${p} token`, 'oauth_invalid');

// Non-literal specifiers keep TypeScript from requiring the modules at compile
// time (they resolve to `any`); the try/catch handles them being absent.
const GOOGLE_LIB = 'google-auth-library';
const APPLE_LIB = 'apple-signin-auth';

async function optionalImport(spec: string): Promise<any | null> {
  try {
    return await import(spec);
  } catch {
    return null;
  }
}

/** Verify a Google ID token against the configured client ids. */
export async function verifyGoogle(idToken: string): Promise<OAuthIdentity> {
  if (env.googleClientIds.length === 0) {
    throw notConfigured('Google');
  }
  const lib = await optionalImport(GOOGLE_LIB);
  if (!lib) {
    throw notConfigured('Google');
  }
  const client = new lib.OAuth2Client();
  let payload: any;
  try {
    const ticket = await client.verifyIdToken({idToken, audience: env.googleClientIds});
    payload = ticket.getPayload();
  } catch {
    throw invalid('Google');
  }
  if (!payload?.sub) {
    throw invalid('Google');
  }
  return {
    provider: 'google',
    subject: String(payload.sub),
    email: payload.email ?? null,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
  };
}

/** Verify an Apple identity token against the configured bundle/service ids. */
export async function verifyApple(identityToken: string, fullName?: string): Promise<OAuthIdentity> {
  if (env.appleClientIds.length === 0) {
    throw notConfigured('Apple');
  }
  const mod = await optionalImport(APPLE_LIB);
  const appleSignin = mod?.default ?? mod;
  if (!appleSignin?.verifyIdToken) {
    throw notConfigured('Apple');
  }
  let claims: any;
  try {
    claims = await verifyAppleAudiences(appleSignin, identityToken, env.appleClientIds);
  } catch {
    throw invalid('Apple');
  }
  if (!claims?.sub) {
    throw invalid('Apple');
  }
  return {
    provider: 'apple',
    subject: String(claims.sub),
    email: claims.email ?? null,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: fullName ?? null,
    avatarUrl: null, // Apple never provides an avatar
  };
}

async function verifyAppleAudiences(appleSignin: any, identityToken: string, audiences: string[]): Promise<any> {
  let lastErr: unknown;
  for (const audience of audiences) {
    try {
      return await appleSignin.verifyIdToken(identityToken, {audience, ignoreExpiration: false});
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('apple verify failed');
}
