import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { getBot } from './bot.js';
import { reportHandler, reportCallbackHandler } from './handlers/report.js';
import {
  addAdminHandler,
  listAdminHandler,
  unAdminHandler,
  kickHandler,
  muteHandler,
  unmuteHandler,
  banHandler,
  unbanHandler,
  warnHandler,
  warningsHandler,
  clearWarnHandler,
} from './handlers/admin.js';
import { welcomeHandler, farewellHandler } from './handlers/welcome.js';
import { antiLinkMiddleware, antiSpamMiddleware, antiToxicMiddleware } from './handlers/moderation.js';
import { loggerMiddleware } from './middleware/logger.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { checkRegisteredMiddleware } from './middleware/checkRegistered.js';
import { initDb } from './utils/db.js';
import { App } from './ui/App.js';

async function main(): Promise<void> {
  try {
    await initDb();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  const bot = getBot();

  bot.command('report', reportHandler);
  bot.command('addadmin', addAdminHandler);
  bot.command('listadmin', listAdminHandler);
  bot.command('unadmin', unAdminHandler);
  bot.command('kick', kickHandler);
  bot.command('mute', muteHandler);
  bot.command('unmute', unmuteHandler);
  bot.command('ban', banHandler);
  bot.command('unban', unbanHandler);
  bot.command('warn', warnHandler);
  bot.command('warnings', warningsHandler);
  bot.command('clearwarn', clearWarnHandler);

  bot.on('callback_query:data', reportCallbackHandler);

  bot.on('my_chat_member', welcomeHandler);
  bot.on('my_chat_member', farewellHandler);

  bot.use(rateLimitMiddleware);
  bot.use(antiLinkMiddleware);
  bot.use(antiToxicMiddleware);
  bot.use(antiSpamMiddleware);
  bot.use(checkRegisteredMiddleware);
  bot.use(loggerMiddleware);

  render(React.createElement(App));

  try {
    await bot.start({
      drop_pending_updates: true,
      onStart: (botInfo) => {
        console.log(`Bot started as @${botInfo.username}`);
      },
    });
  } catch (error) {
    console.error('Bot polling error:', error);
    console.log('Attempting to restart in 5 seconds...');
    setTimeout(() => {
      main().catch((e) => {
        console.error('Fatal restart error:', e);
        process.exit(1);
      });
    }, 5000);
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
