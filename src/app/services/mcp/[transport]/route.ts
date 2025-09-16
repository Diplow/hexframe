import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  mapItemsListHandler,
  mapItemHandler,
} from "~/app/services/mcp/services/map-items";

// Create MCP server instance
const server = new Server(
  {
    name: "vde-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
    },
  },
);

// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "map://items/{rootId}",
        name: "Map Items Hierarchy",
        description: "Get hierarchical structure of map items from a root",
        mimeType: "application/json",
      },
      {
        uri: "map://item/{itemId}",
        name: "Single Map Item",
        description: "Get a single map item with context",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uriString = request.params.uri;
  const uri = new URL(uriString);

  if (uri.protocol === "map:") {
    if (uri.pathname.startsWith("//items/")) {
      const rootId = uri.pathname.slice(8); // Remove "//items/"
      return mapItemsListHandler(uri, rootId);
    } else if (uri.pathname.startsWith("//item/")) {
      const itemId = uri.pathname.slice(7); // Remove "//item/"
      return mapItemHandler(uri, itemId);
    }
  }

  throw new Error(`Unknown resource: ${uriString}`);
});

// For Next.js App Router, we need to export route handlers
// Note: The actual MCP protocol would typically use stdio transport,
// but for Next.js integration, we're exposing HTTP endpoints
export async function GET() {
  return new Response("MCP server is running", { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    // TODO: Implement proper MCP message handling over HTTP
    // This would require adapting the stdio-based protocol to HTTP
    return Response.json({ message: "MCP endpoint", body });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
