import { createClient } from '@libsql/client';
import type { AdminEntry, WarningEntry } from '../types.js';

const turso = createClient({
  url: process.env.TURSO_URL ?? '',
  authToken: process.env.TURSO_AUTH_TOKEN ?? '',
});

export async function initDb(): Promise<void> {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      telegram_id TEXT UNIQUE NOT NULL,
      telegram_username TEXT,
      telegram_first_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL,
      reason TEXT,
      warned_by TEXT NOT NULL,
      warned_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id TEXT NOT NULL,
      reported_id TEXT NOT NULL,
      message_text TEXT,
      reason TEXT,
      chat_id TEXT NOT NULL,
      chat_title TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS mod_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      reason TEXT,
      performed_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      telegram_username TEXT,
      added_by TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export async function getAdmin(telegramId: string): Promise<AdminEntry | null> {
  const result = await turso.execute({
    sql: 'SELECT * FROM admins WHERE telegram_id = ?',
    args: [telegramId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    telegram_id: row.telegram_id as string,
    telegram_username: row.telegram_username as string | null,
    added_by: row.added_by as string,
    added_at: row.added_at as string,
  };
}

export async function getAllAdmins(): Promise<AdminEntry[]> {
  const result = await turso.execute('SELECT * FROM admins ORDER BY added_at DESC');
  return result.rows.map((row) => ({
    id: row.id as number,
    telegram_id: row.telegram_id as string,
    telegram_username: row.telegram_username as string | null,
    added_by: row.added_by as string,
    added_at: row.added_at as string,
  }));
}

export async function addAdmin(
  telegramId: string,
  telegramUsername: string | null,
  addedBy: string
): Promise<void> {
  await turso.execute({
    sql: 'INSERT OR IGNORE INTO admins (telegram_id, telegram_username, added_by) VALUES (?, ?, ?)',
    args: [telegramId, telegramUsername, addedBy],
  });
}

export async function removeAdmin(telegramId: string): Promise<void> {
  await turso.execute({
    sql: 'DELETE FROM admins WHERE telegram_id = ?',
    args: [telegramId],
  });
}

export async function getWarnings(telegramId: string): Promise<WarningEntry[]> {
  const result = await turso.execute({
    sql: 'SELECT * FROM warnings WHERE telegram_id = ? ORDER BY warned_at DESC',
    args: [telegramId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    telegram_id: row.telegram_id as string,
    reason: row.reason as string | null,
    warned_by: row.warned_by as string,
    warned_at: row.warned_at as string,
  }));
}

export async function addWarning(
  telegramId: string,
  reason: string | null,
  warnedBy: string
): Promise<void> {
  await turso.execute({
    sql: 'INSERT INTO warnings (telegram_id, reason, warned_by) VALUES (?, ?, ?)',
    args: [telegramId, reason, warnedBy],
  });
}

export async function clearWarnings(telegramId: string): Promise<void> {
  await turso.execute({
    sql: 'DELETE FROM warnings WHERE telegram_id = ?',
    args: [telegramId],
  });
}

export async function addReport(
  reporterId: string,
  reportedId: string,
  messageText: string | null,
  reason: string | null,
  chatId: string,
  chatTitle: string | null
): Promise<number> {
  const result = await turso.execute({
    sql: 'INSERT INTO reports (reporter_id, reported_id, message_text, reason, chat_id, chat_title) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    args: [reporterId, reportedId, messageText, reason, chatId, chatTitle],
  });
  return result.rows[0].id as number;
}

export async function addModAction(
  actionType: string,
  targetId: string,
  performedBy: string,
  reason: string | null
): Promise<void> {
  await turso.execute({
    sql: 'INSERT INTO mod_actions (action_type, target_id, performed_by, reason) VALUES (?, ?, ?, ?)',
    args: [actionType, targetId, performedBy, reason],
  });
}
