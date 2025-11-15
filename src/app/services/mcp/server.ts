#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  mapItemsListHandler,
  mapItemHandler,
} from "~/app/services/mcp/services/map-items";
import { mcpTools, executeTool } from "~/app/services/mcp";
// Context wrapper no longer needed - context is in tool descriptions

// Create MCP server instance
const server = new Server(
  {
    name: "hexframe-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
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
        description: "Get hierarchical structure of map items from a root. Replace {rootId} with a coordinate ID like '1,0' or '1,0:1,2,3'",
        mimeType: "application/json",
      },
      {
        uri: "map://item/{itemId}",
        name: "Single Map Item",
        description: "Get a single map item with context. Replace {itemId} with a coordinate ID",
        preview: undefined,
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
    // For map://items/1,0 - hostname is "items", pathname is "/1,0"
    if (uri.hostname === "items") {
      const rootId = uri.pathname.slice(1); // Remove leading "/"
      return mapItemsListHandler(uri, rootId);
    } else if (uri.hostname === "item") {
      const itemId = uri.pathname.slice(1); // Remove leading "/"
      return mapItemHandler(uri, itemId);
    }
  }

  throw new Error(`Unknown resource: ${uriString}`);
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
        preview: undefined,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await executeTool(name, args);
});

// Start the server with stdio transport
async function main() {
  console.error("=== MCP SERVER STARTING ===");
  console.error("Environment check:", {
    API_KEY: process.env.HEXFRAME_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.cwd()
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with protocol messages
  console.error("Hexframe MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});