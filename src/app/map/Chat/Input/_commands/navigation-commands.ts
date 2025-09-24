interface Command {
  description: string;
  action?: () => string;
}

export const createNavigationCommands = (_center: string | null): Record<string, Command> => ({
  '/home': {
    description: 'Navigate to root tile',
  },
});