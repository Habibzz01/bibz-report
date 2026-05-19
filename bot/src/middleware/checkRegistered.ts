import type { BotContext } from '../bot.js';
import { checkUserRegistration } from '../handlers/auth.js';
import { logEmitter } from './logger.js';

export function checkRegisteredMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  return (async () => {
    try {
      const msg = ctx.message;
      if (!msg || !msg.from || msg.chat.type === 'private') {
        return next();
      }

      const telegramId = String(msg.from.id);
      const registration = await checkUserRegistration(telegramId);

      if (!registration.registered) {
        try {
          await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
        } catch {
          // ignore if can't delete
        }

        logEmitter.emit('log', {
          timestamp: new Date().toISOString(),
          type: 'delete',
          text: `Unregistered user ${msg.from.username ?? msg.from.first_name} blocked in ${'title' in msg.chat ? msg.chat.title : 'chat'}`,
        });

        return Promise.resolve();
      }

      return next();
    } catch {
      return next();
    }
  })();
}
