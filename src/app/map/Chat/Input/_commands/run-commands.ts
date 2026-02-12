interface Command {
  description: string;
  action?: () => string;
}

export const runCommands: Record<string, Command> = {
  '/run': {
    description: 'Show runs list or open run for specific tile (e.g., /run userId,0:1,2)',
  },
};
