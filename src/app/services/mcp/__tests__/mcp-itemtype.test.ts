import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock server-only module to allow importing MCP tools in test environment
vi.mock("server-only", () => ({}));

// Dynamic import to ensure mock is set up first
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type McpToolsType = typeof import("~/app/services/mcp/handlers/tools").mcpTools;
let mcpTools: McpToolsType;

beforeAll(async () => {
  const toolsModule = await import("~/app/services/mcp/handlers/tools");
  mcpTools = toolsModule.mcpTools;
});

describe("MCP Tools - ItemType Support", () => {
  describe("addItem tool - itemType parameter", () => {
    it("should have addItem tool defined", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");
      expect(addItemTool).toBeDefined();
    });

    it("should include optional itemType property in input schema", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");
      expect(addItemTool?.inputSchema.properties).toHaveProperty("itemType");
    });

    it("should define itemType as string with enum values", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");
      const itemTypeProperty = addItemTool?.inputSchema.properties?.itemType as {
        type?: string;
        enum?: string[];
        description?: string;
      };

      expect(itemTypeProperty).toBeDefined();
      expect(itemTypeProperty.type).toBe("string");
      expect(itemTypeProperty.enum).toEqual(["organizational", "context", "system"]);
    });

    it("should document itemType in description", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");
      const itemTypeProperty = addItemTool?.inputSchema.properties?.itemType as {
        description?: string;
      };

      expect(itemTypeProperty?.description).toBeDefined();
      expect(itemTypeProperty?.description).toContain("organizational");
      expect(itemTypeProperty?.description).toContain("context");
      expect(itemTypeProperty?.description).toContain("system");
    });

    it("should NOT include itemType in required fields (it is optional)", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");
      expect(addItemTool?.inputSchema.required).not.toContain("itemType");
    });
  });

  describe("updateItem tool - itemType parameter", () => {
    it("should have updateItem tool defined", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");
      expect(updateItemTool).toBeDefined();
    });

    it("should include optional itemType property in updates schema", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");
      const updatesProperty = updateItemTool?.inputSchema.properties?.updates as {
        properties?: Record<string, unknown>;
      };

      expect(updatesProperty?.properties).toHaveProperty("itemType");
    });

    it("should define itemType as string with enum values in updates", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");
      const updatesProperty = updateItemTool?.inputSchema.properties?.updates as {
        properties?: {
          itemType?: {
            type?: string;
            enum?: string[];
            description?: string;
          };
        };
      };

      const itemTypeProperty = updatesProperty?.properties?.itemType;

      expect(itemTypeProperty).toBeDefined();
      expect(itemTypeProperty?.type).toBe("string");
      expect(itemTypeProperty?.enum).toEqual(["organizational", "context", "system"]);
    });

    it("should document itemType in updates property description", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");
      const updatesProperty = updateItemTool?.inputSchema.properties?.updates as {
        properties?: {
          itemType?: {
            description?: string;
          };
        };
      };

      const itemTypeProperty = updatesProperty?.properties?.itemType;

      expect(itemTypeProperty?.description).toBeDefined();
      expect(itemTypeProperty?.description).toContain("organizational");
      expect(itemTypeProperty?.description).toContain("context");
      expect(itemTypeProperty?.description).toContain("system");
    });
  });

  describe("GET tools - itemType in fields enum", () => {
    const getToolNames = [
      "getItemsForRootItem",
      "getItemByCoords",
      "getAncestry",
      "getSiblings",
      "getComposedChildren",
      "getRegularChildren",
    ];

    it.each(getToolNames)("%s should include 'itemType' in fields enum", (toolName) => {
      const tool = mcpTools.find(t => t.name === toolName);
      expect(tool).toBeDefined();

      const fieldsProperty = tool?.inputSchema.properties?.fields as {
        items?: {
          enum?: string[];
        };
        default?: string[];
      };

      expect(fieldsProperty).toBeDefined();
      expect(fieldsProperty?.items?.enum).toContain("itemType");
    });

    // Only the main GET tools should include itemType in default fields
    // getItemsForRootItem and getItemByCoords are the primary tools agents use
    const mainGetTools = ["getItemsForRootItem", "getItemByCoords"];

    it.each(mainGetTools)("%s should include 'itemType' in default fields", (toolName) => {
      const tool = mcpTools.find(t => t.name === toolName);
      expect(tool).toBeDefined();

      const fieldsProperty = tool?.inputSchema.properties?.fields as {
        default?: string[];
      };

      expect(fieldsProperty?.default).toContain("itemType");
    });
  });

  describe("Tool descriptions - itemType documentation", () => {
    it("addItem tool description should mention itemType semantics", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");

      const itemTypeProperty = addItemTool?.inputSchema.properties?.itemType as {
        description?: string;
      };

      // The description should explain what each itemType value means
      expect(itemTypeProperty?.description).toBeDefined();
      // Should mention the tile classification purpose
      const descLower = itemTypeProperty?.description?.toLowerCase() ?? "";
      expect(
        descLower.includes("type") ||
        descLower.includes("classification") ||
        descLower.includes("tile")
      ).toBe(true);
    });

    it("updateItem tool should document itemType change semantics", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");

      const updatesProperty = updateItemTool?.inputSchema.properties?.updates as {
        properties?: {
          itemType?: {
            description?: string;
          };
        };
      };

      const itemTypeProperty = updatesProperty?.properties?.itemType;

      expect(itemTypeProperty?.description).toBeDefined();
    });
  });

  describe("itemType enum values - consistency check", () => {
    const validItemTypes = ["organizational", "context", "system"];

    it("addItem itemType enum should match expected values", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");

      const itemTypeProperty = addItemTool?.inputSchema.properties?.itemType as {
        enum?: string[];
      };

      expect(itemTypeProperty?.enum).toEqual(validItemTypes);
    });

    it("updateItem itemType enum should match expected values", () => {
      const updateItemTool = mcpTools.find(tool => tool.name === "updateItem");

      const updatesProperty = updateItemTool?.inputSchema.properties?.updates as {
        properties?: {
          itemType?: {
            enum?: string[];
          };
        };
      };

      expect(updatesProperty?.properties?.itemType?.enum).toEqual(validItemTypes);
    });

    it("should NOT include 'user' type (reserved for system-created root tiles)", () => {
      const addItemTool = mcpTools.find(tool => tool.name === "addItem");

      const itemTypeProperty = addItemTool?.inputSchema.properties?.itemType as {
        enum?: string[];
      };

      expect(itemTypeProperty?.enum).not.toContain("user");
    });
  });
});
