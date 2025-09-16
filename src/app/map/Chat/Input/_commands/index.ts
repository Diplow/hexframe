import { debugCommands } from '~/app/map/Chat/Input/_commands/debug-commands';
import { createNavigationCommands } from '~/app/map/Chat/Input/_commands/navigation-commands';
import { authCommands } from '~/app/map/Chat/Input/_commands/auth-commands';
import { mcpCommands } from '~/app/map/Chat/Input/_commands/mcp-commands';
import { settingsCommands } from '~/app/map/Chat/Input/_commands/settings-commands';

export interface Command {
  description: string;
  action?: () => string;
}

export const getAllCommands = (center: string | null): Record<string, Command> => ({
  ...debugCommands,
  ...createNavigationCommands(center),
  ...authCommands,
  ...mcpCommands,
  ...settingsCommands,
});

export { debugCommands, createNavigationCommands, authCommands, mcpCommands, settingsCommands };