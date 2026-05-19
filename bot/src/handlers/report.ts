import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../bot.js';
import { addReport, addModAction, addWarning, getWarnings } from '../utils/db.js';
import { formatReport, formatUser } from '../utils/format.js';
import { getBot } from '../bot.js';
import { logEmitter } from '../middleware/logger.js';

export async function reportHandler(ctx: BotContext): Promise<void> {
  try {
    const replyTo = ctx.message?.reply_to_message;

    if (!replyTo) {
      await ctx.reply('❌ Balas pesan yang ingin kamu laporkan, lalu ketik /report');
      return;
    }

    const reporter = ctx.from;
    const reported = replyTo.from;
    if (!reporter || !reported) {
      await ctx.reply('❌ Tidak dapat memproses laporan.');
      return;
    }

    const reason = ctx.match as string || null;
    const messageText = replyTo.text || replyTo.caption || null;
    const chat = ctx.chat;
    if (!chat) {
      await ctx.reply('❌ Tidak dapat memproses laporan.');
      return;
    }

    const chatTitle = 'title' in chat ? chat.title ?? null : null;
    const chatId = String(chat.id);
    const reporterStr = formatUser(reporter);
    const reportedStr = formatUser(reported);

    const reportId = await addReport(
      String(reporter.id),
      String(reported.id),
      messageText,
      reason,
      chatId,
      chatTitle
    );

    const formatted = formatReport({
      id: reportId,
      reporter: reporterStr,
      reported: reportedStr,
      messageText,
      reason,
      chatTitle,
    });

    const keyboard = new InlineKeyboard()
      .text('🚫 Kick', `kick:${reported.id}:${chatId}:${reportId}`)
      .text('🔇 Mute 1h', `mute:${reported.id}:${chatId}:60:${reportId}`)
      .text('⚠️ Warn', `warn:${reported.id}:${chatId}:${reportId}`)
      .row()
      .text('✅ Dismiss', `dismiss:${reportId}`);

    const superAdminId = process.env.SUPER_ADMIN_ID ?? '';
    if (superAdminId) {
      try {
        const bot = getBot();
        await bot.api.sendMessage(superAdminId, formatted, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } catch {
        logEmitter.emit('log', {
          timestamp: new Date().toISOString(),
          type: 'error',
          text: 'Gagal mengirim laporan ke SUPER_ADMIN',
        });
      }
    }

    await ctx.reply('✅ Laporan kamu telah dikirim ke admin.');

    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'report',
      text: `Laporan #${reportId}: ${reporterStr} melaporkan ${reportedStr} di ${chatTitle ?? 'Unknown'}`,
    });
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `Error reportHandler: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}

export async function reportCallbackHandler(ctx: BotContext): Promise<void> {
  try {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const parts = callbackData.split(':');
    const action = parts[0];

    const bot = getBot();

    if (action === 'dismiss') {
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      await ctx.answerCallbackQuery({ text: 'Laporan diabaikan.' });
      return;
    }

    const targetId = Number(parts[1]);
    const chatId = parts[2];
    const reportId = Number(parts[3]);

    const adminId = ctx.from?.id;
    if (!adminId) {
      await ctx.answerCallbackQuery({ text: 'Gagal memverifikasi admin.' });
      return;
    }

    try {
      switch (action) {
        case 'kick': {
          await bot.api.kickChatMember(chatId, targetId);
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
          await ctx.answerCallbackQuery({ text: 'User berhasil dikick!' });
          await addModAction('kick', String(targetId), String(adminId), `Laporan #${reportId}`);
          break;
        }
        case 'mute': {
          const durationMinutes = Number(parts[3]);
          const untilDate = Math.floor(Date.now() / 1000) + durationMinutes * 60;
          await bot.api.restrictChatMember(chatId, targetId, {
            can_send_messages: false,
            until_date: untilDate,
          });
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
          await ctx.answerCallbackQuery({ text: `User dimute ${durationMinutes} menit!` });
          await addModAction('mute', String(targetId), String(adminId), `Laporan #${reportId}`);
          break;
        }
        case 'warn': {
          await addWarning(String(targetId), `Laporan #${reportId}`, String(adminId));
          const warnings = await getWarnings(String(targetId));
          if (warnings.length >= 3) {
            await bot.api.kickChatMember(chatId, targetId);
            await addModAction('ban', String(targetId), String(adminId), '3 warnings otomatis');
            await ctx.answerCallbackQuery({ text: 'User diwarn & otomatis diban (3 warnings)!' });
          } else {
            await ctx.answerCallbackQuery({ text: `User diwarn (${warnings.length}/3)!` });
          }
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
          break;
        }
        default: {
          await ctx.answerCallbackQuery({ text: 'Aksi tidak dikenal.' });
        }
      }
    } catch {
      await ctx.answerCallbackQuery({ text: 'Gagal menjalankan aksi.' });
    }
  } catch (error) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'error',
      text: `Error reportCallbackHandler: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }
}
