import { Hono } from 'hono';
import { getClient, Env } from '../db';
import { jwtAuth, requireRole } from '../middleware/jwt';

const app = new Hono<{ Bindings: Env }>();

app.post('/', jwtAuth, requireRole('superadmin'), async (c) => {
  try {
    const body = await c.req.json();
    const { telegram_id, telegram_username } = body;

    if (!telegram_id) {
      return c.json({ error: 'telegram_id is required' }, 400);
    }

    const user = c.get('user') as { userId: number };
    const db = getClient(c.env);

    const result = await db.execute({
      sql: 'INSERT INTO admins (telegram_id, telegram_username, added_by) VALUES (?, ?, ?)',
      args: [String(telegram_id), telegram_username || null, String(user.userId)],
    });

    return c.json({
      success: true,
      admin: {
        id: Number(result.lastInsertRowid),
        telegram_id,
        telegram_username: telegram_username || null,
      },
    }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'Admin already exists' }, 409);
    }
    console.error('Add admin error:', msg);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/', jwtAuth, async (c) => {
  try {
    const db = getClient(c.env);
    const result = await db.execute('SELECT * FROM admins ORDER BY added_at DESC');
    return c.json({ success: true, admins: result.rows });
  } catch (err: unknown) {
    console.error('List admins error:', err instanceof Error ? err.message : String(err));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/:telegramId', jwtAuth, requireRole('superadmin'), async (c) => {
  try {
    const telegramId = c.req.param('telegramId');
    const db = getClient(c.env);

    await db.execute({
      sql: 'DELETE FROM admins WHERE telegram_id = ?',
      args: [telegramId],
    });

    return c.json({ success: true });
  } catch (err: unknown) {
    console.error('Remove admin error:', err instanceof Error ? err.message : String(err));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
