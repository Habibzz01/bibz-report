import React from 'react';
import { Box, Text } from 'ink';
import type { BotStats } from '../types.js';

interface StatsBarProps {
  stats: BotStats;
}

export function StatsBar({ stats }: StatsBarProps): React.JSX.Element {
  return (
    <Box borderStyle="single" borderColor="cyan" marginY={0}>
      <Box flexGrow={1} justifyContent="space-around">
        <Text color="white">💬 <Text bold>{stats.messages}</Text> msgs</Text>
        <Text color="cyan">📋 <Text bold>{stats.reports}</Text> reports</Text>
        <Text color="magenta">🔇 <Text bold>{stats.mutes}</Text> mutes</Text>
        <Text color="red">💀 <Text bold>{stats.bans}</Text> bans</Text>
        <Text color="green">👤 <Text bold>{stats.activeUsers}</Text> active</Text>
        <Text color="yellow">⚡ <Text bold>{stats.messagesPerMinute}</Text> msg/m</Text>
      </Box>
    </Box>
  );
}
