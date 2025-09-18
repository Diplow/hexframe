import { createMcpHandler, experimental_withMcpAuth } from '@vercel/mcp-adapter';
import { mcpTools } from '~/app/services/mcp/handlers/tools';
import { auth } from '~/server/auth';

// Create the MCP handler with all our tools
const handler = createMcpHandler(
  (server) => {
    // Register all tools from our shared handler
    mcpTools.forEach(tool => {
      server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        async (args) => {
          try {
            const result = await tool.handler(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
            };
          }
        }
      );
    });
  },
  {},
  { basePath: '/api' }
);

// Authentication handler using our existing better-auth API key system
async function authHandler(request: Request, bearerToken?: string) {
  try {
    // Try to get API key from x-api-key header first
    const apiKeyHeader = request.headers.get('x-api-key');
    let apiKey = apiKeyHeader;

    // If no x-api-key header, try to extract from bearer token
    if (!apiKey && bearerToken) {
      // Bearer token might be the API key itself
      apiKey = bearerToken;
    }

    if (!apiKey) {
      console.error('[MCP HTTP] No API key provided in x-api-key header or bearer token');
      return undefined;
    }

    // Validate API key using better-auth
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey }
    });

    if (!result.valid || !result.key) {
      console.error('[MCP HTTP] Invalid API key');
      return undefined;
    }

    // The key object should have userId information
    const userId = result.key.userId;
    console.log('[MCP HTTP] API key validated for user:', userId);

    // Set environment variable for the request so our handlers can access the key
    process.env.HEXFRAME_API_KEY = apiKey;

    // Return AuthInfo that matches the expected interface
    return {
      token: apiKey,
      clientId: userId,
      scopes: ['read', 'write'], // Basic scopes for API access
    };

  } catch (error) {
    console.error('[MCP HTTP] Auth error:', error);
    return undefined;
  }
}

// Wrap the handler with authentication
export const POST = experimental_withMcpAuth(handler, authHandler);

// Health check endpoint
export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'Hexframe MCP Server',
      status: 'healthy',
      version: '1.0.0',
      endpoints: {
        mcp: '/api/mcp',
      },
      documentation: 'https://github.com/ModelContextProtocol/mcp',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}