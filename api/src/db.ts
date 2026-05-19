import { createClient } from '@libsql/client/web';

export interface Env {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
  BOT_SECRET: string;
  BOT_TOKEN: string;
  CORS_ORIGINS?: string;
}

let client: ReturnType<typeof createClient> | null = null;

export function getClient(env: Env) {
  if (!client) {
    client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function migrateDatabase(env: Env) {
  const db = getClient(env);
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      telegram_id TEXT UNIQUE NOT NULL,
      telegram_username TEXT,
      telegram_first_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      telegram_username TEXT,
      added_by TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL,
      reason TEXT,
      warned_by TEXT NOT NULL,
      warned_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id TEXT NOT NULL,
      reported_id TEXT NOT NULL,
      message_text TEXT,
      reason TEXT,
      chat_id TEXT NOT NULL,
      chat_title TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS mod_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      reason TEXT,
      performed_at TEXT DEFAULT (datetime('now'))
    )`,
  ];
  for (const sql of queries) {
    await db.execute(sql);
  }
}
