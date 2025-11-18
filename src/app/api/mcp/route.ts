import { mcpTools } from '~/app/services/mcp';
import { createContext, createCaller } from '~/server/api';

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

export async function POST(request: Request): Promise<Response> {
  try {
    // Parse JSON-RPC request
    const body = await request.text();
    const jsonRpcRequest = JSON.parse(body) as JsonRpcRequest;

    // Create tRPC context from the request
    // The context creation will handle API key validation via headers
    const ctx = await createContext({
      req: request as unknown as Parameters<typeof createContext>[0]['req'],
      res: null as unknown as Parameters<typeof createContext>[0]['res'],
      info: {} as Parameters<typeof createContext>[0]['info'],
    });

    // Create tRPC caller with the context
    const caller = createCaller(ctx);

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
        // Execute tool with tRPC caller - no HTTP overhead!
        const result = await tool.handler(toolArgs, caller);

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
        // Log the error for debugging
        console.error('[MCP] Tool execution error:', {
          tool: toolName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        return Response.json(errorResponse, { status: 500 });
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

  } catch (error) {
    // Log the error for debugging
    console.error('[MCP] Request processing error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

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