import { Hono } from 'hono';
import { getClient, Env } from '../db';

const app = new Hono<{ Bindings: Env }>();

app.get('/:telegramId', async (c) => {
  try {
    const botSecret = c.req.header('X-Bot-Secret');
    const envBotSecret = c.env?.BOT_SECRET as string;

    if (!botSecret || botSecret !== envBotSecret) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const telegramId = c.req.param('telegramId');
    const db = getClient(c.env);

    const result = await db.execute({
      sql: 'SELECT id, full_name, email, telegram_id, telegram_username, telegram_first_name, created_at, is_active FROM users WHERE telegram_id = ?',
      args: [telegramId],
    });

    if (result.rows.length === 0) {
      return c.json({ registered: false, user: null });
    }

    return c.json({ registered: true, user: result.rows[0] });
  } catch (err: unknown) {
    console.error('Get user error:', err instanceof Error ? err.message : String(err));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
