import crypto from 'crypto';
import {Router} from 'express';
import {eq, and, isNull} from 'drizzle-orm';
import {z} from 'zod';
import {signupSchema, loginSchema, refreshSchema, googleAuthSchema, appleAuthSchema} from '@splitr/shared';
import {db} from '../db/client';
import {users, passwordResetTokens, refreshTokens} from '../db/schema';
import {hashPassword, verifyPassword, signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken} from '../lib/auth';
import {asyncHandler, badRequest, unauthorized, notFound, conflict, audit} from '../lib/http';
import {verifyGoogle, verifyApple, type OAuthIdentity} from '../lib/oauth';
import {requireAuth, type AuthedRequest} from '../middleware';
import {env} from '../env';

export const authRouter = Router();

/** POST /auth/signup → create account, return access + refresh tokens. */
authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const {email, password, displayName, deviceId} = signupSchema.parse(req.body);

    const [existing] = await db.select({id: users.id}).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      throw conflict('An account with that email already exists');
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({email, passwordHash, displayName}).returning();

    const accessToken = signAccessToken({sub: user.id, email: user.email});
    const refreshToken = await issueRefreshToken(user.id, deviceId);
    await audit(user.id, 'signup', 'user', user.id);

    res.status(201).json({accessToken, refreshToken, user: publicUser(user)});
  }),
);

/** POST /auth/login → verify credentials, return tokens. */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const {email, password, deviceId} = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // Constant-ish work whether or not the user (or a password) exists — don't
    // leak which emails are registered, or which accounts are social-only.
    const dummyHash = '$2a$12$' + 'x'.repeat(53);
    const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    if (!user || !user.passwordHash || !ok) {
      throw unauthorized('Invalid email or password');
    }
    const accessToken = signAccessToken({sub: user.id, email: user.email});
    const refreshToken = await issueRefreshToken(user.id, deviceId);
    await audit(user.id, 'login', 'user', user.id);
    res.json({accessToken, refreshToken, user: publicUser(user)});
  }),
);

/**
 * Find-or-create a user from a verified social identity, linking to an existing
 * account by matching provider-subject first, then verified email. Runs in a
 * transaction so two concurrent first-time sign-ins can't create duplicates.
 */
async function upsertOAuthUser(identity: OAuthIdentity): Promise<UserRow> {
  const subCol = identity.provider === 'google' ? users.googleSub : users.appleSub;
  return db.transaction(async tx => {
    // 1) Already linked by provider subject.
    const [bySub] = await tx.select().from(users).where(eq(subCol, identity.subject)).limit(1);
    if (bySub) {
      return bySub;
    }
    // 2) Link to an existing account with the same (verified) email.
    if (identity.email) {
      const [byEmail] = await tx.select().from(users).where(eq(users.email, identity.email)).limit(1);
      if (byEmail) {
        const [linked] = await tx
          .update(users)
          .set({
            googleSub: identity.provider === 'google' ? identity.subject : byEmail.googleSub,
            appleSub: identity.provider === 'apple' ? identity.subject : byEmail.appleSub,
            avatarUrl: byEmail.avatarUrl ?? identity.avatarUrl,
            emailVerified: byEmail.emailVerified || identity.emailVerified,
            updatedAt: new Date(),
          })
          .where(eq(users.id, byEmail.id))
          .returning();
        return linked;
      }
    }
    // 3) Brand-new social account.
    const email = identity.email ?? `${identity.provider}_${identity.subject}@users.paxa.app`;
    const [created] = await tx
      .insert(users)
      .values({
        email,
        passwordHash: null,
        displayName: identity.name?.trim() || email.split('@')[0],
        emailVerified: identity.emailVerified,
        authProvider: identity.provider,
        googleSub: identity.provider === 'google' ? identity.subject : null,
        appleSub: identity.provider === 'apple' ? identity.subject : null,
        avatarUrl: identity.avatarUrl,
      })
      .returning();
    return created;
  });
}

/** Issue tokens for a resolved user and shape the auth response. */
async function issueSession(user: UserRow, deviceId: string | undefined, res: import('express').Response) {
  const accessToken = signAccessToken({sub: user.id, email: user.email});
  const refreshToken = await issueRefreshToken(user.id, deviceId);
  res.json({accessToken, refreshToken, user: publicUser(user)});
}

/** POST /auth/google → verify a Google ID token, sign in / link / create. */
authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    const {idToken, deviceId} = googleAuthSchema.parse(req.body);
    const identity = await verifyGoogle(idToken);
    const user = await upsertOAuthUser(identity);
    await audit(user.id, 'oauth_login', 'user', user.id, {provider: 'google'});
    await issueSession(user, deviceId, res);
  }),
);

/** POST /auth/apple → verify an Apple identity token, sign in / link / create. */
authRouter.post(
  '/apple',
  asyncHandler(async (req, res) => {
    const {identityToken, fullName, deviceId} = appleAuthSchema.parse(req.body);
    const identity = await verifyApple(identityToken, fullName);
    const user = await upsertOAuthUser(identity);
    await audit(user.id, 'oauth_login', 'user', user.id, {provider: 'apple'});
    await issueSession(user, deviceId, res);
  }),
);

/** POST /auth/refresh → rotate refresh token, issue a new access token. */
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const {refreshToken} = refreshSchema.parse(req.body);
    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      throw unauthorized('Invalid or expired refresh token');
    }
    const [user] = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1);
    if (!user) {
      throw unauthorized();
    }
    const accessToken = signAccessToken({sub: user.id, email: user.email});
    res.json({accessToken, refreshToken: rotated.token, user: publicUser(user)});
  }),
);

/** POST /auth/logout → revoke the presented refresh token (this device). */
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await revokeRefreshToken(parsed.data.refreshToken);
    }
    res.json({ok: true});
  }),
);

/** GET /auth/me → the authenticated user. */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) {
      throw notFound('User not found');
    }
    res.json({user: publicUser(user)});
  }),
);

const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  payoutVpa: z.string().trim().max(128).nullable().optional(),
});

/** PATCH /auth/me → update display name or UPI payout VPA. */
authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const updates = updateMeSchema.parse(req.body);
    const hasUpdates = Object.values(updates).some(v => v !== undefined);
    if (!hasUpdates) {
      throw badRequest('No fields to update');
    }
    const [user] = await db
      .update(users)
      .set({...updates, updatedAt: new Date()})
      .where(eq(users.id, req.user!.id))
      .returning();
    await audit(req.user!.id, 'update_profile', 'user', req.user!.id);
    res.json({user: publicUser(user)});
  }),
);

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * POST /auth/forgot-password → issue a single-use reset token (30 min TTL).
 * Always responds 200 to prevent email enumeration.
 * In dev, logs the token to the console. In prod, wire up an email provider.
 */
authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const {email} = forgotPasswordSchema.parse(req.body);
    const [user] = await db.select({id: users.id, email: users.email}).from(users).where(eq(users.email, email)).limit(1);

    if (user) {
      // Invalidate any existing unused tokens for this user.
      await db.update(passwordResetTokens).set({usedAt: new Date()}).where(
        and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)),
      );

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      await db.insert(passwordResetTokens).values({userId: user.id, tokenHash, expiresAt});

      if (env.nodeEnv !== 'production') {
        // Dev: log the link so you can test without an email provider.
        console.log(`[DEV] Password reset link: /auth/reset-password?token=${rawToken}`);
      } else {
        // TODO: send email via your provider (Resend, Postmark, etc.)
        // await sendResetEmail(user.email, rawToken);
        console.log(`[PROD] Send reset email to ${user.email} — email provider not yet wired`);
      }
      await audit(user.id, 'forgot_password', 'user', user.id);
    }

    // Always 200 — don't reveal whether the email is registered.
    res.json({ok: true, message: 'If that email exists, a reset link has been sent.'});
  }),
);

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  newPassword: z.string().min(8).max(128),
});

/** POST /auth/reset-password → verify token, set new password, revoke all sessions. */
authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const {token, newPassword} = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw badRequest('Reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(newPassword);

    // Mark token used, update password, revoke all refresh tokens (force re-login everywhere).
    await db.transaction(async tx => {
      await tx.update(passwordResetTokens).set({usedAt: new Date()}).where(eq(passwordResetTokens.id, row.id));
      await tx.update(users).set({passwordHash, updatedAt: new Date()}).where(eq(users.id, row.userId));
      // Revoke all active refresh tokens so stolen sessions are cleared.
      await tx.update(refreshTokens).set({revokedAt: new Date()}).where(
        and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)),
      );
    });

    await audit(row.userId, 'reset_password', 'user', row.userId);
    res.json({ok: true, message: 'Password updated. Please log in again.'});
  }),
);

type UserRow = typeof users.$inferSelect;
const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  stickerColor: u.stickerColor,
  payoutVpa: u.payoutVpa,
  emailVerified: u.emailVerified,
  avatarUrl: u.avatarUrl,
  authProvider: u.authProvider,
});
