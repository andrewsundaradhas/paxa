import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {eq, and, isNull} from 'drizzle-orm';
import {db} from '../db/client';
import {refreshTokens} from '../db/schema';
import {env} from '../env';

// ---------------------------------------------------------------------------
// Passwords (bcrypt; swap to argon2id for a stronger KDF once native build is
// available in your deploy environment).
// ---------------------------------------------------------------------------
export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// ---------------------------------------------------------------------------
// Access token (short-lived JWT). The refresh token is an opaque random string
// (NOT a JWT) so it can be revoked server-side; only its SHA-256 hash is stored.
// ---------------------------------------------------------------------------
export type AccessClaims = {sub: string; email: string};

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.jwtAccessSecret, {expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn']});
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.jwtAccessSecret) as AccessClaims;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Mint a refresh token, persist its hash, return the raw token to the client. */
export async function issueRefreshToken(userId: string, deviceId?: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({userId, tokenHash: sha256(raw), deviceId, expiresAt});
  return raw;
}

/**
 * Validate + ROTATE a refresh token: the presented token is revoked and a fresh
 * one issued (rotation defends against replay/theft). Returns the user id and
 * the new raw token, or null if the token is invalid/expired/revoked.
 */
export async function rotateRefreshToken(raw: string): Promise<{userId: string; token: string} | null> {
  const hash = sha256(raw);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  await db.update(refreshTokens).set({revokedAt: new Date()}).where(eq(refreshTokens.id, row.id));
  const token = await issueRefreshToken(row.userId, row.deviceId ?? undefined);
  return {userId: row.userId, token};
}

/** Revoke a specific refresh token (logout this device). */
export async function revokeRefreshToken(raw: string): Promise<void> {
  await db.update(refreshTokens).set({revokedAt: new Date()}).where(eq(refreshTokens.tokenHash, sha256(raw)));
}
