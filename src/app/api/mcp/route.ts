import { mcpTools } from '~/app/services/mcp';
import { auth } from '~/server/auth';
import { runWithRequestContext } from '~/lib/utils/request-context';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: unknown;
    [key: string]: unknown;
  };
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

async function validateApiKey(request: Request): Promise<{ apiKey: string; userId: string } | null> {
  try {
    const apiKeyHeader = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');

    let apiKey = apiKeyHeader;

    // Try to extract from Bearer token if no x-api-key header
    if (!apiKey && authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7);
    }

    if (!apiKey) {
      return null;
    }

    const result = await auth.api.verifyApiKey({
      body: { key: apiKey }
    });

    if (!result.valid || !result.key) {
      return null;
    }

    const userId = result.key.userId;
    return { apiKey, userId };
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Parse JSON-RPC request
    const body = await request.text();
    const jsonRpcRequest = JSON.parse(body) as JsonRpcRequest;

    // Validate API key
    const authContext = await validateApiKey(request);
    if (!authContext) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        error: {
          code: -32001,
          message: 'Authentication failed'
        }
      };
      return Response.json(errorResponse, { status: 401 });
    }

    // Handle different MCP methods
    if (jsonRpcRequest.method === 'tools/list') {
      const result = {
        tools: mcpTools.map(tool => ({
          name: tool.name,
          description: tool.description,
        preview: undefined,
          inputSchema: tool.inputSchema
        }))
      };

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        result
      };

      return Response.json(response);
    }

    if (jsonRpcRequest.method === 'tools/call') {
      const toolName = jsonRpcRequest.params?.name;
      const toolArgs = jsonRpcRequest.params?.arguments;

      if (!toolName) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          error: {
            code: -32602,
            message: 'Missing tool name'
          }
        };
        return Response.json(errorResponse);
      }

      const tool = mcpTools.find(t => t.name === toolName);
      if (!tool) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        };
        return Response.json(errorResponse);
      }

      try {
        // Run tool handler with proper context
        const result = await runWithRequestContext(
          authContext,
          () => tool.handler(toolArgs)
        );

        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };

        return Response.json(response);
      } catch (error) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        return Response.json(errorResponse);
      }
    }

    // Handle initialization
    if (jsonRpcRequest.method === 'initialize') {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'hexframe-mcp-server',
            version: '1.0.0'
          }
        }
      };
      return Response.json(response);
    }

    // Method not supported
    const errorResponse: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: jsonRpcRequest.id,
      error: {
        code: -32601,
        message: `Method not found: ${jsonRpcRequest.method}`
      }
    };
    return Response.json(errorResponse);

  } catch {
    const errorResponse: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    return Response.json(errorResponse, { status: 400 });
  }
}

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