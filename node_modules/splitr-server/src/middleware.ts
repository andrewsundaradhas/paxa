import type {Request, Response, NextFunction} from 'express';
import {and, eq} from 'drizzle-orm';
import {ZodError} from 'zod';
import {db} from './db/client';
import {groupMembers} from './db/schema';
import {verifyAccessToken} from './lib/auth';
import {AppError, unauthorized, forbidden} from './lib/http';

/** Attaches the authenticated user to req.user, or 401s. */
export interface AuthedRequest extends Request {
  user?: {id: string; email: string};
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(unauthorized('Missing bearer token'));
  }
  try {
    const claims = verifyAccessToken(token);
    req.user = {id: claims.sub, email: claims.email};
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

/** Ensures req.user is a member of :groupId. Use after requireAuth. */
export async function requireGroupMember(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const groupId = req.params.groupId;
  const userId = req.user?.id;
  if (!userId || !groupId) {
    return next(unauthorized());
  }
  try {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (!member) {
      return next(forbidden('Not a member of this group'));
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Central error → JSON translator. Last middleware mounted. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({code: 'validation_error', errors: err.flatten()});
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({code: err.code, message: err.message});
    return;
  }
  // Body-parser JSON parse failure (malformed request body).
  const httpErr = err as {type?: string; status?: number};
  if (httpErr.type === 'entity.parse.failed' && httpErr.status === 400) {
    res.status(400).json({code: 'bad_request', message: 'Invalid JSON body'});
    return;
  }
  // Unique-violation etc. from Postgres
  const pgCode = (err as {code?: string})?.code;
  if (pgCode === '23505') {
    res.status(409).json({code: 'conflict', message: 'Already exists'});
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({code: 'internal_error', message: 'Something went wrong'});
}
