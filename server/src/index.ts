import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {env} from './env';
import {requireAuth, errorHandler} from './middleware';
import {authRouter} from './routes/auth';
import {groupsRouter} from './routes/groups';
import {expensesRouter} from './routes/expenses';
import {settlementsRouter, settlementStatusRouter} from './routes/settlements';
import {devicesRouter} from './routes/devices';

const app = express();

app.set('trust proxy', 1); // behind a hosting proxy (Render/Railway/Fly) for correct client IPs
app.use(helmet());

// Structured request logging.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        reqId: req.headers['x-request-id'] ?? null,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
        ip: req.ip,
      }),
    );
  });
  next();
});
app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : false, // native app sends no Origin; web origins must be explicit
    credentials: true,
  }),
);
app.use(express.json({limit: '256kb'}));

// Global rate limit; auth endpoints get a stricter one. Limits are relaxed in dev so tests pass cleanly.
const isProd = env.nodeEnv === 'production';
app.use(rateLimit({windowMs: 60_000, max: isProd ? 120 : 2000, standardHeaders: true, legacyHeaders: false}));
const authLimiter = rateLimit({windowMs: 15 * 60_000, max: isProd ? 30 : 500, standardHeaders: true, legacyHeaders: false});

app.get('/health', (_req, res) => res.json({ok: true}));

app.use('/auth', authLimiter, authRouter);
app.use('/groups', groupsRouter);
// Nested resources are auth-guarded here, then membership-guarded inside the routers.
app.use('/groups/:groupId/expenses', requireAuth, expensesRouter);
app.use('/groups/:groupId/settlements', requireAuth, settlementsRouter);
app.use('/settlements', requireAuth, settlementStatusRouter);
app.use('/devices', devicesRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`paxa API listening on :${env.port} (${env.nodeEnv})`);
});
