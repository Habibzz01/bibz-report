import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { migrateDatabase, Env } from './db';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import adminsRoutes from './routes/admins';

const app = new Hono<{ Bindings: Env }>();

let migrated = false;
async function ensureMigrated(env: Env) {
  if (!migrated) {
    migrated = true;
    try {
      await migrateDatabase(env);
    } catch (e) {
      console.error('Migration failed:', e);
      migrated = false; // retry next time
    }
  }
}

app.use('*', corsMiddleware);

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

app.use('*', async (c, next) => {
  await ensureMigrated(c.env);
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
  } else {
    entry.count += 1;
    if (entry.count > 60) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  }

  await next();
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/auth', authRoutes);
app.route('/users', usersRoutes);
app.route('/admins', adminsRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: object, ctx: ExecutionContext) {
    ctx.waitUntil(migrateDatabase(env as { TURSO_URL: string; TURSO_AUTH_TOKEN: string }));
  },
};
