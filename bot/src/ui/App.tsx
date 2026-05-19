import React, { useState, useEffect, useCallback } from 'react';
import { Box, useInput } from 'ink';
import { Header } from './Header.js';
import { StatsBar } from './StatsBar.js';
import { LogPanel } from './LogPanel.js';
import { logEmitter } from '../middleware/logger.js';
import type { LogEntry, BotStats } from '../types.js';

export function App(): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<BotStats>({
    messages: 0,
    reports: 0,
    mutes: 0,
    bans: 0,
    activeUsers: 0,
    messagesPerMinute: 0,
  });
  const status = 'online' as const;
  const [messageCount, setMessageCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [muteCount, setMuteCount] = useState(0);
  const [banCount, setBanCount] = useState(0);
  const [activeUsersSet, setActiveUsersSet] = useState(() => new Set<number>());

  useInput((input) => {
    if (input === 'q' || input === 'Q') {
      process.exit(0);
    }
    if (input === 'c' || input === 'C') {
      setLogs([]);
    }
  });

  const onLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev.slice(-199), log]);

    if (log.type === 'message') {
      setMessageCount((c) => c + 1);
    }
    if (log.type === 'report') {
      setReportCount((c) => c + 1);
    }
    if (log.type === 'mute') {
      setMuteCount((c) => c + 1);
    }
    if (log.type === 'ban') {
      setBanCount((c) => c + 1);
    }
  }, []);

  useEffect(() => {
    logEmitter.on('log', onLog);
    return () => {
      logEmitter.off('log', onLog);
    };
  }, [onLog]);

  useEffect(() => {
    // Extract user IDs from log text to track active users
    // Log entries typically contain usernames or user IDs
    const userIdPattern = /\[id:(\d+)\]|user#\d+|ID:\s*\d+/g;

    const interval = setInterval(() => {
      const uniqueIds = new Set(activeUsersSet);
      // Scan recent logs for user IDs
      for (const log of logs.slice(-50)) {
        const matches = log.text.matchAll(userIdPattern);
        for (const match of matches) {
          if (match[1]) uniqueIds.add(Number(match[1]));
        }
      }

      setStats({
        messages: messageCount,
        reports: reportCount,
        mutes: muteCount,
        bans: banCount,
        activeUsers: uniqueIds.size,
        messagesPerMinute: Math.round(messageCount / (process.uptime() / 60) || 0),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [messageCount, reportCount, muteCount, banCount, activeUsersSet, logs]);

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Header status={status} />
      <StatsBar stats={stats} />
      <LogPanel logs={logs} />
    </Box>
  );
}
