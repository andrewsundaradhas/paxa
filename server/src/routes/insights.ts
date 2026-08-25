import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../lib/http';
import {requireAuth, type AuthedRequest} from '../middleware';
import {aiLimiter} from '../lib/rateLimits';
import {getInsights} from '../services/insights';

/** /insights — AI-style spending dashboard, computed from the caller's history. */
export const insightsRouter = Router();
insightsRouter.use(requireAuth);

const querySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  refresh: z.enum(['0', '1', 'true', 'false']).optional(),
});

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** GET /insights?period=YYYY-MM&refresh=1 → monthly totals, categories, insights. */
insightsRouter.get(
  '/',
  aiLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const {period, refresh} = querySchema.parse(req.query);
    const refreshBool = refresh === '1' || refresh === 'true';
    const payload = await getInsights(req.user!.id, period ?? currentPeriod(), refreshBool);
    res.json(payload);
  }),
);
