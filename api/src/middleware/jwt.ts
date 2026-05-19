import { Context, Next } from 'hono';
import { SignJWT, jwtVerify } from 'jose';

function getSecret(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

export async function generateToken(
  payload: { userId: number; telegramId: string; role: string },
  jwtSecret: string
): Promise<string> {
  const secret = getSecret(jwtSecret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function jwtAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    const jwtSecret = c.env?.JWT_SECRET as string;
    if (!jwtSecret) {
      return c.json({ error: 'Server configuration error' }, 500);
    }
    const secret = getSecret(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

export function requireRole(role: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as { role?: string } | undefined;
    if (!user || user.role !== role) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
