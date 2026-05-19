import { Bot } from 'grammy';
import type { Context } from 'grammy';

export type BotContext = Context;

let botInstance: Bot<BotContext> | null = null;

export function getBot(): Bot<BotContext> {
  if (!botInstance) {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new Error('BOT_TOKEN environment variable is required');
    }
    botInstance = new Bot<BotContext>(token);

    botInstance.command('start', (ctx) => {
      return ctx.reply(
        '🤖 <b>Bibz Report Bot</b>\nGunakan /report untuk melaporkan pesan yang melanggar aturan.',
        { parse_mode: 'HTML' }
      );
    });
  }
  return botInstance;
}
