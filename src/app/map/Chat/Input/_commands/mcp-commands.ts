interface Command {
  description: string;
  action?: () => string;
}

export const mcpCommands: Record<string, Command> = {
  '/mcp': {
    description: 'MCP server integration help',
  },
  '/mcp/key': {
    description: 'Open MCP API key management widget',
  },
  '/mcp/key/create': {
    description: 'Open MCP API key management widget',
  },
  '/mcp/key/list': {
    description: 'Open MCP API key management widget',
  },
  '/mcp/key/revoke': {
    description: 'Open MCP API key management widget',
  },
  '/mcp/status': {
    description: 'Check MCP server connection and configuration',
    action: () => {
      return `**MCP Server Status**

To use MCP with Hexframe:

1. **Create an API key**: Use \`/mcp/key/create\` 
2. **Configure Claude Code**: 
   \`\`\`bash
   claude mcp add hexframe "node dist/mcp-server.js" --env HEXFRAME_API_KEY=your_key_here
   \`\`\`
3. **Build MCP server**: \`pnpm mcp:build\`
4. **Test connection**: Try using MCP tools in Claude Code

**Available MCP Tools:**
- \`getItemsForRootItem\` - Get hierarchical tile structure
- \`getItemByCoords\` - Get single tile by coordinates  
- \`addItem\` - Create new tile (requires API key)
- \`updateItem\` - Update existing tile (requires API key)

For more help, use \`/mcp/key/create\` to get started.`;
    }
  }
};