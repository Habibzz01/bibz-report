import { Context, Next } from 'hono';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim());

export async function corsMiddleware(c: Context, next: Next) {
  const requestOrigin = c.req.header('Origin') || '';

  let origin: string;
  if (ALLOWED_ORIGINS[0] === '*' || ALLOWED_ORIGINS.includes(requestOrigin)) {
    origin = requestOrigin || '*';
  } else {
    origin = ALLOWED_ORIGINS[0];
  }

  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bot-Secret');

  // Only allow credentials when origin is not wildcard
  if (origin !== '*') {
    c.header('Access-Control-Allow-Credentials', 'true');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
}
