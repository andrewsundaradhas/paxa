import {Router} from 'express';
import {and, eq} from 'drizzle-orm';
import {registerDeviceSchema} from '@splitr/shared';
import {db} from '../db/client';
import {devicePushTokens} from '../db/schema';
import {asyncHandler} from '../lib/http';
import {requireAuth, type AuthedRequest} from '../middleware';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

/** POST /devices/register → upsert this device's FCM/APNs push token. */
devicesRouter.post(
  '/register',
  asyncHandler(async (req: AuthedRequest, res) => {
    const {pushToken, platform, deviceId} = registerDeviceSchema.parse(req.body);
    await db
      .insert(devicePushTokens)
      .values({userId: req.user!.id, pushToken, platform, deviceId})
      .onConflictDoUpdate({
        target: [devicePushTokens.userId, devicePushTokens.deviceId],
        set: {pushToken, platform, lastActiveAt: new Date()},
      });
    res.status(201).json({ok: true});
  }),
);

/** DELETE /devices/:deviceId → drop a device's push token (logout/uninstall). */
devicesRouter.delete(
  '/:deviceId',
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .delete(devicePushTokens)
      .where(and(eq(devicePushTokens.userId, req.user!.id), eq(devicePushTokens.deviceId, req.params.deviceId)));
    res.json({ok: true});
  }),
);
