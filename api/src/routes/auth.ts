import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { getClient, Env } from '../db';
import { generateToken, jwtAuth } from '../middleware/jwt';

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

async function verifyTelegramAuth(data: TelegramAuthData, botToken: string): Promise<boolean> {
  try {
    // Check auth_date is not older than 5 minutes (replay protection)
    const authDate = data.auth_date;
    if (typeof authDate !== 'number' || authDate === 0) return false;
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) return false;

    const fields: string[] = [];
    const sorted = Object.entries(data)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [key, value] of sorted) {
      fields.push(`${key}=${value}`);
    }
    const dataCheckString = fields.join('\n');

    const encoder = new TextEncoder();

    const botTokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));

    const secretKey = await crypto.subtle.importKey(
      'raw',
      botTokenHash,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
    const hashArray = Array.from(new Uint8Array(signature));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHash === data.hash;
  } catch {
    return false;
  }
}

const app = new Hono<{ Bindings: Env }>();

app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { fullName, full_name, email, password, confirmPassword, telegramId, telegramUsername, telegramFirstName, telegramAuthData, telegramAuthDate, telegramHash } = body;

    const name = fullName || full_name;
    const confPass = confirmPassword;

    if (!name || !email || !password || !telegramId) {
      return c.json({ error: 'full_name, email, password, and telegramId are required' }, 400);
    }

    if (confPass && password !== confPass) {
      return c.json({ error: 'Passwords do not match' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const botToken = c.env?.BOT_TOKEN as string;
    const authData = telegramAuthData || (telegramHash ? { id: Number(telegramId), auth_date: telegramAuthDate, hash: telegramHash } : null);
    if (authData && botToken) {
      const valid = await verifyTelegramAuth(authData as TelegramAuthData, botToken);
      if (!valid) {
        return c.json({ error: 'Invalid Telegram authentication' }, 401);
      }
    }

    const db = getClient(c.env);
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await db.execute({
      sql: `INSERT INTO users (full_name, email, password_hash, telegram_id, telegram_username, telegram_first_name, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)`,
      args: [name, email, passwordHash, String(telegramId), telegramUsername || null, telegramFirstName || null],
    });

    const jwtSecret = c.env?.JWT_SECRET as string;
    const token = await generateToken(
      { userId: Number(result.lastInsertRowid), telegramId: String(telegramId), role: 'user' },
      jwtSecret
    );

    return c.json({
      success: true,
      token,
      user: {
        id: Number(result.lastInsertRowid),
        full_name,
        email,
        telegram_id: String(telegramId),
      },
    }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'Email or Telegram ID already registered' }, 409);
    }
    console.error('Register error:', msg);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = getClient(c.env);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });

    if (result.rows.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = result.rows[0] as unknown as {
      id: number;
      full_name: string;
      email: string;
      password_hash: string;
      telegram_id: string;
      telegram_username: string;
      telegram_first_name: string;
      created_at: string;
      is_active: number;
    };

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!user.is_active) {
      return c.json({ error: 'Account is banned' }, 403);
    }

    const jwtSecret = c.env?.JWT_SECRET as string;
    const token = await generateToken(
      { userId: user.id, telegramId: user.telegram_id, role: 'user' },
      jwtSecret
    );

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username,
        created_at: user.created_at,
        is_active: user.is_active,
      },
    });
  } catch (err: unknown) {
    console.error('Login error:', err instanceof Error ? err.message : String(err));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/me', jwtAuth, async (c) => {
  try {
    const userPayload = c.get('user') as { userId: number };
    const db = getClient(c.env);
    const result = await db.execute({
      sql: 'SELECT id, full_name, email, telegram_id, telegram_username, telegram_first_name, created_at, is_active FROM users WHERE id = ?',
      args: [userPayload.userId],
    });

    if (result.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ success: true, user: result.rows[0] });
  } catch (err: unknown) {
    console.error('Me error:', err instanceof Error ? err.message : String(err));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
