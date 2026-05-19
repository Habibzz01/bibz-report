import type { BotContext } from '../bot.js';
import { isToxic } from '../utils/toxicFilter.js';
import { addWarning, addModAction, getAdmin } from '../utils/db.js';
import { logEmitter } from '../middleware/logger.js';

interface UserMessageEntry {
  texts: Array<{ text: string; time: number }>;
  timestamps: number[];
}

const userMessages = new Map<number, UserMessageEntry>();
const SPAM_MAX_MSG = 5;
const SPAM_WINDOW_MS = 10_000;
const FLOOD_SAME_TEXT = 3;
const FLOOD_WINDOW_MS = 30_000;
const AUTO_MUTE_MINUTES = 5;

const WHITELIST_DOMAINS = [process.env.WHITELIST_DOMAIN || 'bibzreport.vercel.app'];

function isAdmin(userId: number): boolean {
  return String(userId) === (process.env.SUPER_ADMIN_ID ?? '');
}

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)|(t\.me\/[^\s]+)|@(\w+)/gi;
  const matches = text.match(urlRegex);
  return matches ?? [];
}

function isWhitelisted(url: string): boolean {
  for (const domain of WHITELIST_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

export async function antiLinkMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  try {
    const msg = ctx.message;
    if (!msg || !msg.text || msg.chat.type === 'private') {
      return next();
    }

    const userId = msg.from?.id;
    if (!userId) return next();

    if (isAdmin(userId)) return next();

    const adminEntry = await getAdmin(String(userId));
    if (adminEntry) return next();

    const urls = extractUrls(msg.text);
    const badUrls = urls.filter((u) => !isWhitelisted(u));

    if (badUrls.length > 0) {
      try {
        await ctx.deleteMessage();
      } catch {
        // ignore
      }

      await addWarning(String(userId), `Anti-link: ${badUrls.join(', ')}`, 'bot');
      await addModAction('anti-link', String(userId), 'bot', badUrls.join(', '));

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'delete',
        text: `Anti-link: ${msg.from?.username ?? msg.from?.first_name} sent ${badUrls[0]} in ${'title' in msg.chat ? msg.chat.title : 'chat'}`,
      });

      return;
    }

    return next();
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `antiLink error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
    return next();
  }
}

export async function antiSpamMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  try {
    const msg = ctx.message;
    if (!msg || !msg.text || msg.chat.type === 'private') {
      return next();
    }

    const userId = msg.from?.id;
    if (!userId) return next();

    if (isAdmin(userId)) return next();

    const adminEntry = await getAdmin(String(userId));
    if (adminEntry) return next();

    const now = Date.now();
    let entry = userMessages.get(userId);

    if (!entry) {
      entry = { texts: [], timestamps: [] };
      userMessages.set(userId, entry);
    }

    entry.timestamps.push(now);
    entry.texts.push({ text: msg.text, time: now });

    entry.timestamps = entry.timestamps.filter((t) => now - t < SPAM_WINDOW_MS);
    entry.texts = entry.texts.filter((t) => now - t.time < SPAM_WINDOW_MS);

    if (entry.timestamps.length > SPAM_MAX_MSG) {
      try {
        const untilDate = Math.floor(now / 1000) + AUTO_MUTE_MINUTES * 60;
        await ctx.api.restrictChatMember(msg.chat.id, userId, {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false,
          until_date: untilDate,
        });
      } catch {
        // ignore
      }

      await addWarning(String(userId), 'Spam: terlalu banyak pesan', 'bot');
      await addModAction('mute', String(userId), 'bot', 'Auto-mute spam');

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'mute',
        text: `Auto-mute: ${msg.from?.username ?? msg.from?.first_name} spam in ${'title' in msg.chat ? msg.chat.title : 'chat'}`,
      });

      return;
    }

    const recentTexts = entry.texts.filter((t) => now - t.time < FLOOD_WINDOW_MS);
    const sameTextCount = recentTexts.filter((t) => t.text === msg.text).length;

    if (sameTextCount >= FLOOD_SAME_TEXT) {
      try {
        await ctx.deleteMessage();
      } catch {
        // ignore
      }

      await addWarning(String(userId), 'Flood: pesan sama berulang', 'bot');
      await addModAction('warn', String(userId), 'bot', 'Flood detection');

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'warning',
        text: `Flood: ${msg.from?.username ?? msg.from?.first_name} repeated text in ${'title' in msg.chat ? msg.chat.title : 'chat'}`,
      });

      return;
    }

    return next();
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `antiSpam error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
    return next();
  }
}

export async function antiToxicMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  try {
    const msg = ctx.message;
    if (!msg || !msg.text || msg.chat.type === 'private') {
      return next();
    }

    const userId = msg.from?.id;
    if (!userId) return next();

    if (isAdmin(userId)) return next();

    const adminEntry = await getAdmin(String(userId));
    if (adminEntry) return next();

    if (isToxic(msg.text)) {
      try {
        await ctx.deleteMessage();
      } catch {
        // ignore
      }

      await addWarning(String(userId), 'Kata toxic: ' + msg.text.slice(0, 50), 'bot');
      await addModAction('toxic', String(userId), 'bot', msg.text.slice(0, 100));

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'delete',
        text: `Anti-toxic: ${msg.from?.username ?? msg.from?.first_name} toxic message deleted in ${'title' in msg.chat ? msg.chat.title : 'chat'}`,
      });

      return;
    }

    return next();
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `antiToxic error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
    return next();
  }
}
