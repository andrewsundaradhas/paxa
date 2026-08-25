/**
 * Per-feature rate limiters. Expensive or abusable endpoints get their own
 * bucket so one hot path can't exhaust another's budget, and so a single user
 * can't spam requests/uploads/AI. Limits are keyed by authenticated user id
 * when available (falls back to IP for unauthenticated auth routes), and are
 * generously relaxed outside production so the API test suite runs clean.
 *
 * Product note: limits are tuned to never bite normal interactive use — a
 * person tapping through the app stays far under these ceilings.
 */
import rateLimit, {type Options} from 'express-rate-limit';
import type {Request} from 'express';
import {env} from '../env';

interface MaybeAuthed extends Request {
  user?: {id: string};
}

/** Rate-limit key: the user id if authenticated, else the client IP. */
function userOrIp(req: Request): string {
  const uid = (req as MaybeAuthed).user?.id;
  return uid ? `u:${uid}` : `ip:${req.ip}`;
}

/** Build a limiter; `max` is the production ceiling (20x in dev). */
function make(windowMs: number, max: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    max: env.isProd ? max : max * 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userOrIp,
    message: {code: 'rate_limited', message: 'Too many requests, please slow down'},
    ...extra,
  });
}

const MIN = 60_000;

/** Auth endpoints (login/signup/refresh/reset) — keyed by IP, brute-force guard. */
export const authLimiter = make(15 * MIN, 30, {keyGenerator: req => `ip:${req.ip}`});

/** Creating settlements / payment requests — money-moving intents. */
export const paymentLimiter = make(MIN, 30);

/** Uploading / posting scanned receipts. */
export const receiptLimiter = make(MIN, 20);

/** AI / insight generation — the most expensive per call. */
export const aiLimiter = make(MIN, 15);

/** Notification actions (mark read, remind). */
export const notificationLimiter = make(MIN, 60);
