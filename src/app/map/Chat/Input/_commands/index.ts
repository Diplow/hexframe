import { debugCommands } from '~/app/map/Chat/Input/_commands/debug-commands';
import { createNavigationCommands } from '~/app/map/Chat/Input/_commands/navigation-commands';
import { authCommands } from '~/app/map/Chat/Input/_commands/auth-commands';
import { mcpCommands } from '~/app/map/Chat/Input/_commands/mcp-commands';

export interface Command {
  description: string;
  action?: () => string;
}

export const getAllCommands = (center: string | null): Record<string, Command> => ({
  ...debugCommands,
  ...createNavigationCommands(center),
  ...authCommands,
  ...mcpCommands,
});

export { debugCommands, createNavigationCommands, authCommands, mcpCommands };