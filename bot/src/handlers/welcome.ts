import type { BotContext } from '../bot.js';
import { checkUserRegistration } from './auth.js';
import { escapeHtml } from '../utils/format.js';
import { logEmitter } from '../middleware/logger.js';

export async function welcomeHandler(ctx: BotContext): Promise<void> {
  try {
    const update = ctx.update;
    if (!update.my_chat_member) return;

    const chat = update.my_chat_member.chat;
    if (chat.type === 'private') return;

    const newStatus = update.my_chat_member.new_chat_member.status;
    const oldStatus = update.my_chat_member.old_chat_member.status;

    if (newStatus === 'member' && (oldStatus === 'left' || oldStatus === 'kicked')) {
      const userName = ctx.from?.first_name ?? 'User';
      const escapedName = escapeHtml(userName);
      const groupName = 'title' in chat ? chat.title : 'Group';

      await ctx.reply(
        `🎉 <b>Selamat datang di ${escapeHtml(groupName)}!</b>\n\nHalo, ${escapedName}! ` +
        'Silakan daftar terlebih dahulu untuk menggunakan semua fitur bot.\n' +
        `📝 <a href="${process.env.WEB_URL || 'https://bibzreport.vercel.app'}">Daftar di sini</a>`,
        { parse_mode: 'HTML' }
      );

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'join',
        text: `${userName} joined ${groupName}`,
      });

      try {
        const registration = await checkUserRegistration(String(ctx.from?.id ?? ''));
        if (!registration.registered && ctx.from?.id) {
          const webUrl = process.env.WEB_URL || 'https://bibzreport.vercel.app';
          await ctx.api.sendMessage(
            ctx.from.id,
            `👋 Halo ${escapedName}!\n\n` +
            'Kamu belum terdaftar di sistem Bibz Report. ' +
            'Silakan daftar melalui link berikut:\n' +
            `${webUrl}\n\n` +
            'Setelah daftar, kamu bisa menggunakan bot di grup.',
            { parse_mode: 'HTML' }
          );
        }
      } catch {
        // can't DM user, ignore
      }
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `welcomeHandler error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function farewellHandler(ctx: BotContext): Promise<void> {
  try {
    const update = ctx.update;
    if (!update.my_chat_member) return;

    const chat = update.my_chat_member.chat;
    if (chat.type === 'private') return;

    const newStatus = update.my_chat_member.new_chat_member.status;
    const oldStatus = update.my_chat_member.old_chat_member.status;

    if (newStatus === 'left' && oldStatus === 'member') {
      const userName = ctx.from?.first_name ?? 'User';
      const groupName = 'title' in chat ? chat.title : 'Group';

      await ctx.reply(
        `👋 <b>Selamat tinggal, ${escapeHtml(userName)}!</b>`,
        { parse_mode: 'HTML' }
      );

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'leave',
        text: `${userName} left ${groupName}`,
      });
    }

    if (newStatus === 'kicked' && oldStatus === 'member') {
      const userName = ctx.from?.first_name ?? 'User';
      const groupName = 'title' in chat ? chat.title : 'Group';

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'ban',
        text: `${userName} was kicked from ${groupName}`,
      });
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `farewellHandler error: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}
