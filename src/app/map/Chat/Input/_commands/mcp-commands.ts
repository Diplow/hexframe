interface Command {
  description: string;
  action?: () => string;
}

export const mcpCommands: Record<string, Command> = {
  '/mcp': {
    description: 'Open/close MCP API key management widget',
  },
};