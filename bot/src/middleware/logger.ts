import { EventEmitter } from 'events';
import type { BotContext } from '../bot.js';
import type { LogEntry } from '../types.js';

export const logEmitter = new EventEmitter();

export function loggerMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  const start = Date.now();
  return next().finally(() => {
    const ms = Date.now() - start;
    const msg = ctx.message;

    if (msg) {
      const user = msg.from;
      const username = user?.username
        ? `@${user.username}`
        : user?.first_name ?? 'Unknown';
      const chat = ctx.chat;
      const chatName = chat && 'title' in chat ? chat.title : 'Private';

      let logText = `[${ms}ms] ${username} in ${chatName}`;
      if (msg.text) {
        logText += `: ${msg.text.slice(0, 100)}`;
      } else if (msg.sticker) {
        logText += ': [Sticker]';
      } else if (msg.photo) {
        logText += ': [Photo]';
      } else if (msg.document) {
        logText += ': [Document]';
      } else {
        logText += ': [Other]';
      }

      logEmitter.emit('log', {
        timestamp: new Date().toISOString(),
        type: 'message',
        text: logText,
      } satisfies LogEntry);
    }
  });
}

export function logToTerminal(log: LogEntry): string {
  const icons: Record<string, string> = {
    message: '📨',
    warning: '⚠️',
    delete: '🚫',
    report: '📋',
    join: '👋',
    leave: '👋',
    mute: '🔇',
    kick: '🔨',
    ban: '💀',
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  const icon = icons[log.type] ?? '📨';
  return `${icon} ${log.timestamp.split('T')[1]?.split('.')[0] ?? ''} ${log.text}`;
}
