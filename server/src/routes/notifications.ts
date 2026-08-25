import {Router} from 'express';
import {and, desc, eq, isNull} from 'drizzle-orm';
import {db} from '../db/client';
import {notifications} from '../db/schema';
import {asyncHandler, notFound} from '../lib/http';
import {requireAuth, type AuthedRequest} from '../middleware';
import {notificationLimiter} from '../lib/rateLimits';

/** /notifications — persistent in-app notifications for the caller. */
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

/** GET /notifications → recent notifications + unread count. */
notificationsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, me))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    const unread = rows.filter(r => !r.readAt).length;
    res.json({notifications: rows, unread});
  }),
);

/** POST /notifications/:id/read → mark one read. */
notificationsRouter.post(
  '/:id/read',
  notificationLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = req.user!.id;
    const [row] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, me)))
      .limit(1);
    if (!row) {
      throw notFound();
    }
    if (!row.readAt) {
      await db.update(notifications).set({readAt: new Date()}).where(eq(notifications.id, row.id));
    }
    res.json({ok: true});
  }),
);

/** POST /notifications/read-all → mark every unread notification read. */
notificationsRouter.post(
  '/read-all',
  notificationLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .update(notifications)
      .set({readAt: new Date()})
      .where(and(eq(notifications.userId, req.user!.id), isNull(notifications.readAt)));
    res.json({ok: true});
  }),
);
