import type { BotContext } from '../bot.js';
import * as db from '../utils/db.js';
import { escapeHtml, formatDuration } from '../utils/format.js';
import { logEmitter } from '../middleware/logger.js';

function getSuperAdminId(): string {
  return process.env.SUPER_ADMIN_ID ?? '';
}

async function isSuperAdmin(ctx: BotContext): Promise<boolean> {
  const userId = ctx.from?.id;
  return String(userId) === getSuperAdminId();
}

async function isAdminOrSuper(ctx: BotContext): Promise<boolean> {
  if (await isSuperAdmin(ctx)) return true;
  const userId = String(ctx.from?.id ?? '');
  const admin = await db.getAdmin(userId);
  return admin !== null;
}

export async function addAdminHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isSuperAdmin(ctx))) {
      await ctx.reply('❌ Hanya super admin yang bisa menambah admin.');
      return;
    }

    const targetId = (ctx.match as string)?.trim();
    if (!targetId) {
      await ctx.reply('❌ Gunakan: /addadmin <telegram_id>');
      return;
    }

    await db.addAdmin(targetId, null, String(ctx.from?.id ?? ''));
    await ctx.reply(`✅ Admin ${escapeHtml(targetId)} berhasil ditambahkan.`);
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'info',
      text: `Admin added: ${targetId}`,
    });
  } catch (error) {
    await ctx.reply('❌ Gagal menambah admin.');
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `addAdmin error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function listAdminHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const admins = await db.getAllAdmins();
    if (admins.length === 0) {
      await ctx.reply('📋 Belum ada admin.');
      return;
    }

    const superId = getSuperAdminId();
    let text = '<b>👑 Daftar Admin:</b>\n\n';
    text += `• Super Admin: <code>${superId}</code>\n`;

    for (const admin of admins) {
      const username = admin.telegram_username
        ? `@${admin.telegram_username}`
        : '-';
      text += `• <code>${admin.telegram_id}</code> (${username}) - added by ${admin.added_by}\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply('❌ Gagal mengambil daftar admin.');
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `listAdmin error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function unAdminHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isSuperAdmin(ctx))) {
      await ctx.reply('❌ Hanya super admin yang bisa menghapus admin.');
      return;
    }

    const targetId = (ctx.match as string)?.trim();
    if (!targetId) {
      await ctx.reply('❌ Gunakan: /unadmin <telegram_id>');
      return;
    }

    await db.removeAdmin(targetId);
    await ctx.reply(`✅ Admin ${escapeHtml(targetId)} berhasil dihapus.`);
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'info',
      text: `Admin removed: ${targetId}`,
    });
  } catch (error) {
    await ctx.reply('❌ Gagal menghapus admin.');
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `unAdmin error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

function parseUsername(text: string): { username: string } | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('@')) {
    return { username: trimmed.slice(1) };
  }
  return null;
}

function parseUserId(text: string): number | null {
  const trimmed = text.trim();
  const id = parseInt(trimmed, 10);
  if (!isNaN(id) && id > 0) return id;
  return null;
}

async function resolveTarget(
  ctx: BotContext,
  chatId: number,
  arg: string | undefined,
): Promise<{ id: number; username?: string; firstName?: string } | null> {
  // Method 1: Reply to a message (works for ANY user in the chat)
  const replyTo = ctx.message?.reply_to_message;
  if (replyTo?.from) {
    return {
      id: replyTo.from.id,
      username: replyTo.from.username,
      firstName: replyTo.from.first_name,
    };
  }

  if (!arg) return null;

  // Method 2: Direct user ID
  const userId = parseUserId(arg);
  if (userId) {
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      return {
        id: member.user.id,
        username: member.user.username,
        firstName: member.user.first_name,
      };
    } catch {
      await ctx.reply(`❌ User dengan ID ${userId} tidak ditemukan di grup ini.`);
      return null;
    }
  }

  // Method 3: @username lookup (try chat admins first, then getChatMember)
  const parsed = parseUsername(arg);
  if (!parsed) return null;

  try {
    const admins = await ctx.api.getChatAdministrators(chatId);
    const target = admins.find(
      (m) => m.user.username?.toLowerCase() === parsed.username.toLowerCase(),
    );
    if (target) {
      return {
        id: target.user.id,
        username: target.user.username,
        firstName: target.user.first_name,
      };
    }
  } catch {
    // ignore
  }

  await ctx.reply(`❌ User @${parsed.username} tidak ditemukan. Gunakan reply pesan atau ID user.`);
  return null;
}

export async function kickHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /kick @username, /kick <user_id>, atau reply pesan + /kick');
      return;
    }

    try {
      await ctx.api.kickChatMember(chatId, target.id);
      await db.addModAction('kick', String(target.id), String(ctx.from?.id ?? ''), null);
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      await ctx.reply(`✅ Berhasil meng-kick ${label}`);
      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'kick',
        text: `${ctx.from?.username ?? ctx.from?.first_name} kicked ${label}`,
      });
    } catch {
      await ctx.reply('❌ Gagal meng-kick user. Pastikan bot punya hak admin.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `kick error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function muteHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const matchText = (ctx.match as string)?.trim() || '';
    const args = matchText.split(/\s+/);

    // Parse duration: if replying to message, duration is in args[0]; if using arg, duration is in args[1]
    let durationMinutes = 60;
    let targetArg: string | undefined;

    if (ctx.message?.reply_to_message) {
      // Reply mode: first arg is optional duration
      if (args.length > 0 && args[0]) {
        const parsed = parseDuration(args[0]);
        if (parsed !== null) {
          durationMinutes = parsed;
          targetArg = undefined; // will use reply_to_message
        } else {
          targetArg = args[0];
        }
      }
    } else {
      // Arg mode: first arg is target, second is optional duration
      if (args.length < 1) {
        await ctx.reply('❌ Gunakan: /mute @username [duration] atau reply pesan + /mute [duration]');
        return;
      }
      targetArg = args[0];
      if (args.length > 1) {
        const parsed = parseDuration(args[1]);
        if (parsed !== null) durationMinutes = parsed;
      }
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, targetArg);
    if (!target) {
      await ctx.reply('❌ User tidak ditemukan. Gunakan: /mute @username, /mute <user_id>, atau reply pesan + /mute');
      return;
    }

    try {
      const permissions = {
        can_send_messages: false,
        can_send_polls: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
      };

      if (durationMinutes > 0) {
        const untilDate = Math.floor(Date.now() / 1000) + durationMinutes * 60;
        await ctx.api.restrictChatMember(chatId, target.id, permissions, {
          until_date: untilDate,
        });
        const durText = formatDuration(durationMinutes);
        const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
        await ctx.reply(`✅ ${label} dimute selama ${durText}`);
      } else {
        await ctx.api.restrictChatMember(chatId, target.id, permissions);
        const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
        await ctx.reply(`✅ ${label} dimute selamanya`);
      }

      await db.addModAction('mute', String(target.id), String(ctx.from?.id ?? ''), null);
      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'mute',
        text: `${ctx.from?.username ?? ctx.from?.first_name} muted ${target.username ? '@' + target.username : String(target.id)}`,
      });
    } catch {
      await ctx.reply('❌ Gagal memute user. Pastikan bot punya hak admin.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `mute error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

function parseDuration(str: string): number | null {
  const durStr = str.toLowerCase();
  if (durStr === 'forever') return 0;
  if (durStr.endsWith('h')) return parseInt(durStr, 10) * 60;
  if (durStr.endsWith('m')) return parseInt(durStr, 10);
  if (durStr.endsWith('d')) return parseInt(durStr, 10) * 1440;
  const n = parseInt(durStr, 10);
  return isNaN(n) ? null : n;
}

export async function unmuteHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /unmute @username, /unmute <user_id>, atau reply pesan + /unmute');
      return;
    }

    try {
      await ctx.api.restrictChatMember(chatId, target.id, {
        can_send_messages: true,
        can_send_polls: true,
        can_change_info: true,
        can_invite_users: true,
        can_pin_messages: true,
      });
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      await ctx.reply(`✅ ${label} berhasil di-unmute`);
    } catch {
      await ctx.reply('❌ Gagal meng-unmute user.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `unmute error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function banHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /ban @username, /ban <user_id>, atau reply pesan + /ban');
      return;
    }

    try {
      await ctx.api.banChatMember(chatId, target.id);
      await db.addModAction('ban', String(target.id), String(ctx.from?.id ?? ''), null);
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      await ctx.reply(`✅ ${label} berhasil di-ban`);
      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'ban',
        text: `${ctx.from?.username ?? ctx.from?.first_name} banned ${label}`,
      });
    } catch {
      await ctx.reply('❌ Gagal me-ban user.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `ban error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function unbanHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /unban @username, /unban <user_id>, atau reply pesan + /unban');
      return;
    }

    try {
      await ctx.api.unbanChatMember(chatId, target.id);
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      await ctx.reply(`✅ ${label} berhasil di-unban`);
    } catch {
      await ctx.reply('❌ Gagal meng-unban user.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `unban error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function warnHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const matchText = (ctx.match as string)?.trim() || '';
    const parts = matchText.split(/\s+/);

    let reason: string | null = null;
    let targetArg: string | undefined;

    if (ctx.message?.reply_to_message) {
      // Reply mode: everything is the reason
      reason = parts.length > 0 ? parts.join(' ') : null;
    } else {
      if (parts.length < 1) {
        await ctx.reply('❌ Gunakan: /warn @username [reason] atau reply pesan + /warn [reason]');
        return;
      }
      targetArg = parts[0];
      reason = parts.slice(1).join(' ') || null;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, targetArg);
    if (!target) {
      await ctx.reply('❌ User tidak ditemukan. Gunakan: /warn @username, /warn <user_id>, atau reply pesan + /warn');
      return;
    }

    try {
      const adminId = String(ctx.from?.id ?? '');
      await db.addWarning(String(target.id), reason, adminId);
      const warnings = await db.getWarnings(String(target.id));
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);

      if (warnings.length >= 3) {
        await ctx.api.kickChatMember(chatId, target.id);
        await db.addModAction('ban', String(target.id), adminId, '3 warnings otomatis');
        await ctx.reply(`⚠️ ${label} mendapat warn #3 dan otomatis di-ban!`);
      } else {
        await ctx.reply(`⚠️ ${label} diwarn (${warnings.length}/3)`);
      }

      await db.addModAction('warn', String(target.id), adminId, reason);
      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'warning',
        text: `${ctx.from?.username ?? ctx.from?.first_name} warned ${label}: ${reason ?? 'no reason'}`,
      });
    } catch {
      await ctx.reply('❌ Gagal memberi warning.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `warn error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function warningsHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /warnings @username, /warnings <user_id>, atau reply pesan + /warnings');
      return;
    }

    try {
      const warnings = await db.getWarnings(String(target.id));
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      let text = `<b>⚠️ Warnings ${label}:</b> ${warnings.length}/3\n`;
      for (const w of warnings) {
        text += `• ${w.warned_at}: ${w.reason ?? 'no reason'} (by ${w.warned_by})\n`;
      }
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Gagal mengambil data warnings.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `warnings error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function clearWarnHandler(ctx: BotContext): Promise<void> {
  try {
    if (!(await isAdminOrSuper(ctx))) {
      await ctx.reply('❌ Kamu tidak memiliki akses.');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const target = await resolveTarget(ctx, chatId, ctx.match as string | undefined);
    if (!target) {
      await ctx.reply('❌ Gunakan: /clearwarn @username, /clearwarn <user_id>, atau reply pesan + /clearwarn');
      return;
    }

    try {
      await db.clearWarnings(String(target.id));
      const label = target.username ? `@${target.username}` : target.firstName || String(target.id);
      await ctx.reply(`✅ Semua warning ${label} berhasil dibersihkan.`);
    } catch {
      await ctx.reply('❌ Gagal membersihkan warnings.');
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `clearWarn error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}
