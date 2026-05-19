import React from 'react';
import chalk from 'chalk';
import { Box, Text } from 'ink';

interface HeaderProps {
  status: 'online' | 'offline';
}

export function Header({ status }: HeaderProps): React.JSX.Element {
  const banner = chalk.cyan(`
╔═══╗╔╗ ╔╗╔═══╗╔══╗╔═══╗
║╔══╝║║ ║║║╔══╝╚╣╠╝║╔══╝
║╚══╗║║ ║║║╚══╗ ║║ ║╚══╗
║╔══╝║║ ║║║╔══╝ ║║ ║╔══╝
║║   ║╚═╝║║╚══╗╔╣╠╗║╚══╗
╚╝   ╚═══╝╚═══╝╚══╝╚═══╝
`);

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Text>{banner}</Text>
      <Box justifyContent="space-between">
        <Text>
          <Text color={status === 'online' ? 'green' : 'red'}>
            ● {status === 'online' ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </Text>
        <Text color="cyan">@XbibzOfficial</Text>
      </Box>
      <Box borderStyle="single" borderColor="cyan" marginTop={0} marginBottom={0}>
        <Text> </Text>
      </Box>
    </Box>
  );
}
