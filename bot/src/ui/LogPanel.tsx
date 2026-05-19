import React from 'react';
import { Box, Text } from 'ink';
import type { LogEntry } from '../types.js';

interface LogPanelProps {
  logs: LogEntry[];
}

interface TextStyle {
  color: 'white' | 'yellow' | 'red' | 'cyan' | 'green' | 'magenta' | 'blue' | 'gray';
  bold?: boolean;
}

const typeColors: Record<string, TextStyle> = {
  message: { color: 'white' },
  warning: { color: 'yellow' },
  delete: { color: 'red' },
  report: { color: 'cyan' },
  join: { color: 'green' },
  leave: { color: 'green' },
  mute: { color: 'magenta' },
  kick: { color: 'magenta' },
  ban: { color: 'magenta' },
  success: { color: 'green', bold: true },
  error: { color: 'red', bold: true },
  info: { color: 'blue' },
};

const typeIcons: Record<string, string> = {
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

export function LogPanel({ logs }: LogPanelProps): React.JSX.Element {
  const displayLogs = logs.slice(-100);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color="cyan">📋 LOG</Text>
      <Box borderStyle="single" borderColor="gray" flexGrow={1}>
        <Box flexDirection="column" paddingX={1}>
          {displayLogs.length === 0 ? (
            <Text color="gray">Menunggu log...</Text>
          ) : (
            displayLogs.map((log, i) => {
              const icon = typeIcons[log.type] ?? '📨';
              const style: TextStyle = typeColors[log.type] ?? { color: 'white' };
              const time = log.timestamp.split('T')[1]?.split('.')[0] ?? '';
              return (
                <Text key={i} color={style.color} bold={style.bold ?? false}>
                  {icon} {time} {log.text}
                </Text>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
