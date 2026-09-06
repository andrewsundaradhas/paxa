/**
 * Per-feature rate limiters. Expensive or abusable endpoints get their own
 * bucket so one hot path can't exhaust another's budget, and so a single user
 * can't spam requests/uploads/AI. Limits are keyed by authenticated user id
 * when available (falls back to IP for unauthenticated auth routes), and are
 * generously relaxed outside production so the API test suite runs clean.
 *
 * STORE: when `REDIS_URL` is set the counters live in Redis, so limits hold
 * ACROSS every server instance and survive restarts — required once you run
 * more than one process for "hundreds of concurrent users". Without `REDIS_URL`
 * (local dev) it falls back to per-process memory. The Redis client + store
 * library are loaded lazily so the API boots even before they're installed.
 */
import rateLimit, {type Options, type Store} from 'express-rate-limit';
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

// ── Redis wiring (optional, lazy) ──────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-var-requires */
let redisClient: any = null;
let RedisStoreCtor: any = null;
let redisReady = false;

function initRedis(): void {
  if (redisReady || !process.env.REDIS_URL) {
    return;
  }
  redisReady = true; // only attempt once
  try {
    const IORedis = require('ioredis');
    RedisStoreCtor = require('rate-limit-redis').RedisStore ?? require('rate-limit-redis').default;
    redisClient = new IORedis(process.env.REDIS_URL, {maxRetriesPerRequest: 2, enableOfflineQueue: false});
    redisClient.on('error', (err: Error) => console.error('rate-limit redis error:', err.message));
    console.log('Rate limiting: using shared Redis store');
  } catch (err) {
    console.warn('Rate limiting: REDIS_URL set but redis libs missing — falling back to in-memory:', (err as Error).message);
    redisClient = null;
    RedisStoreCtor = null;
  }
}
initRedis();

/** A distinct Redis-backed store per limiter (unique key prefix), or undefined. */
function storeFor(name: string): Store | undefined {
  if (!redisClient || !RedisStoreCtor) {
    return undefined; // express-rate-limit uses its default MemoryStore
  }
  return new RedisStoreCtor({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: `rl:${name}:`,
  });
}

/** Build a named limiter; `max` is the production ceiling (20x in dev). */
function make(name: string, windowMs: number, max: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    max: env.isProd ? max : max * 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userOrIp,
    store: storeFor(name),
    message: {code: 'rate_limited', message: 'Too many requests, please slow down'},
    ...extra,
  });
}

const MIN = 60_000;

/** Auth endpoints (login/signup/refresh/reset) — keyed by IP, brute-force guard. */
export const authLimiter = make('auth', 15 * MIN, 30, {keyGenerator: req => `ip:${req.ip}`});

/** Creating settlements / payment requests — money-moving intents. */
export const paymentLimiter = make('payment', MIN, 30);

/** Uploading / posting scanned receipts. */
export const receiptLimiter = make('receipt', MIN, 20);

/** AI / insight generation — the most expensive per call. */
export const aiLimiter = make('ai', MIN, 15);

/** Notification actions (mark read, remind). */
export const notificationLimiter = make('notification', MIN, 60);
