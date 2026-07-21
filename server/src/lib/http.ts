import type {Request, Response, NextFunction} from 'express';
import {db} from '../db/client';
import {auditLog} from '../db/schema';

/** A thrown error with an HTTP status; the error middleware turns it into JSON. */
export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new AppError(400, msg, 'bad_request');
export const unauthorized = (msg = 'Unauthorized') => new AppError(401, msg, 'unauthorized');
export const forbidden = (msg = 'Forbidden') => new AppError(403, msg, 'forbidden');
export const notFound = (msg = 'Not found') => new AppError(404, msg, 'not_found');
export const conflict = (msg: string) => new AppError(409, msg, 'conflict');

/** Wrap async route handlers so rejected promises reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

/** Append an immutable audit record. Best-effort: never block the request on it. */
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({userId, action, entity, entityId, meta});
  } catch (err) {
    console.error('audit log failed', err);
  }
}
