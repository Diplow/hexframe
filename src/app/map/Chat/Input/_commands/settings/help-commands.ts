interface Command {
  description: string;
  action?: () => string;
}

export const helpCommands: Record<string, Command> = {
  '/settings': {
    description: 'Chat settings help (use /settings/messages or /settings/messages/status)',
  },
  '/settings/messages': {
    description: 'Message settings help (use /settings/messages/status or /settings/messages/toggle/*)',
  },
  '/settings/messages/toggle': {
    description: 'Toggle message types (use /settings/messages/toggle/tile/* or /settings/messages/toggle/debug)',
  },
  '/settings/messages/toggle/tile': {
    description: 'Toggle tile message types (use /settings/messages/toggle/tile/edit, create, delete, move, swap)',
  }
};