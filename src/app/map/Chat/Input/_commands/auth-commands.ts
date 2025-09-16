interface Command {
  description: string;
  action?: () => string;
}

export const authCommands: Record<string, Command> = {
  '/login': {
    description: 'Open login form',
  },
  '/logout': {
    description: 'Log out and clear session',
  },
  '/register': {
    description: 'Open registration form',
  },
};