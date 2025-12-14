interface Command {
  description: string;
  action?: () => string;
}

export const favoritesCommands: Record<string, Command> = {
  '/favorites': {
    description: 'Open/close favorites panel to manage tile shortcuts',
  },
};
