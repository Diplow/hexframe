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
  getUserMapItemsHandler,
  getItemByCoordsHandler,
  addItemHandler,
  updateItemHandler,
} from "~/app/services/mcp/services/map-items";
// Context wrapper no longer needed - context is in tool descriptions

// Create MCP server instance
const server = new Server(
  {
    name: "hexframe-mcp-server",
    version: "1.0.0",
    description: "Hexframe MCP Server - Access hierarchical knowledge maps",
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
    tools: [
      {
        name: "getItemsForRootItem",
        description: `Get hierarchical tile structure for a user's Hexframe map.

HEXFRAME CONTEXT: You're working with a hexagonal knowledge mapping system where:
- Tiles are hexagonal units organized hierarchically around a center
- Coordinates: {userId: 1, groupId: 0, path: [0,1]} where path=directions from root
- Directions: 0=Center, 1=NorthWest, 2=NorthEast, 3=East, 4=SouthEast, 5=SouthWest, 6=West
- Empty path=[] means root/center tile
- Each tile can have up to 6 children in different directions

This tool returns nested structure with children[] arrays showing the knowledge hierarchy.`,
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "number",
              description: "The user ID to fetch map items for",
            },
            groupId: {
              type: "number",
              description: "The group ID (default: 0)",
              default: 0,
            },
            depth: {
              type: "number",
              description: "How many levels deep to fetch (default: 3, max: 10)",
              default: 3,
              minimum: 1,
              maximum: 10,
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "getItemByCoords",
        description: "Get a single Hexframe tile by its coordinates. Use this to read specific tiles when you know their exact location in the hexagonal hierarchy.",
        inputSchema: {
          type: "object",
          properties: {
            coords: {
              type: "object",
              description: "The coordinates of the tile to fetch",
              properties: {
                userId: { type: "number" },
                groupId: { type: "number" },
                path: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of directions from root (empty for root tile)"
                }
              },
              required: ["userId", "groupId", "path"]
            }
          },
          required: ["coords"],
        },
      },
      {
        name: "addItem",
        description: "Create a new Hexframe tile at specified coordinates. The tile will be created as a child of the parent at the given direction. For root tiles, use empty path=[].",
        inputSchema: {
          type: "object",
          properties: {
            coords: {
              type: "object",
              description: "The coordinates where to create the new tile",
              properties: {
                userId: { type: "number" },
                groupId: { type: "number" },
                path: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of directions from root"
                }
              },
              required: ["userId", "groupId", "path"]
            },
            title: {
              type: "string",
              description: "The title of the new tile"
            },
            descr: {
              type: "string",
              description: "The content/description of the new tile (optional)"
            },
            url: {
              type: "string",
              description: "Optional URL for the tile"
            }
          },
          required: ["coords", "title"],
        },
      },
      {
        name: "updateItem",
        description: "Update an existing Hexframe tile's content (title, description, or URL). Use coordinates to specify which tile to modify.",
        inputSchema: {
          type: "object",
          properties: {
            coords: {
              type: "object",
              description: "The coordinates of the tile to update",
              properties: {
                userId: { type: "number" },
                groupId: { type: "number" },
                path: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of directions from root"
                }
              },
              required: ["userId", "groupId", "path"]
            },
            updates: {
              type: "object",
              description: "The fields to update",
              properties: {
                title: { type: "string" },
                descr: { type: "string" },
                url: { type: "string" }
              }
            }
          },
          required: ["coords", "updates"],
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "getItemsForRootItem": {
        const userId = args?.userId as number;
        const groupId = (args?.groupId as number) ?? 0;
        const depth = (args?.depth as number) ?? 3;

        const result = await getUserMapItemsHandler(userId, groupId, depth);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "getItemByCoords": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        if (!coords) throw new Error("coords parameter is required");

        const result = await getItemByCoordsHandler(coords);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "addItem": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        const title = args?.title as string;
        const descr = args?.descr as string | undefined;
        const url = args?.url as string | undefined;

        if (!coords || !title) {
          throw new Error("coords and title parameters are required");
        }

        const result = await addItemHandler(coords, title, descr, url);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "updateItem": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        const updates = args?.updates as { title?: string; descr?: string; url?: string };

        if (!coords || !updates) {
          throw new Error("coords and updates parameters are required");
        }

        const result = await updateItemHandler(coords, updates);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
});

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with protocol messages
  console.error("Hexframe MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});