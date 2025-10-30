import { describe, it, expect, beforeEach } from "vitest";
import type { BaseItemRepository } from "~/lib/domains/mapping/_repositories/base-item";
import type { MapItemAttributes } from "~/lib/domains/mapping/utils";
import {
  _cleanupDatabase,
  _createTestEnvironment,
  type TestEnvironment,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("BaseItemRepository - bulk createMany method", () => {
  let testEnv: TestEnvironment;
  let baseItemRepo: BaseItemRepository;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
    baseItemRepo = testEnv.repositories.baseItem;
  });

  describe("createMany", () => {
    it("should create multiple BaseItems in a single operation", async () => {
      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Item 1",
          content: "Content 1",
          link: "",
          preview: undefined,
        },
        {
          title: "Item 2",
          content: "Content 2",
          link: "",
          preview: undefined,
        },
        {
          title: "Item 3",
          content: "Content 3",
          link: "",
          preview: undefined,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(3);
      expect(createdItems[0]!.attrs.title).toBe("Item 1");
      expect(createdItems[1]!.attrs.title).toBe("Item 2");
      expect(createdItems[2]!.attrs.title).toBe("Item 3");

      // Each should have an ID
      expect(createdItems[0]!.id).toBeDefined();
      expect(createdItems[1]!.id).toBeDefined();
      expect(createdItems[2]!.id).toBeDefined();

      // IDs should be unique
      const ids = createdItems.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should create BaseItems with originId in bulk", async () => {
      // First create the original item
      const originalItem = await baseItemRepo.create({
        attrs: {
          title: "Original",
          content: "Original content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Copy 1",
          content: "Content 1",
          link: "",
          preview: undefined,
          originId: originalItem.id,
        },
        {
          title: "Copy 2",
          content: "Content 2",
          link: "",
          preview: undefined,
          originId: originalItem.id,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(2);
      expect(createdItems[0]!.attrs.originId).toBe(originalItem.id);
      expect(createdItems[1]!.attrs.originId).toBe(originalItem.id);
    });

    it("should handle empty array input", async () => {
      const createdItems = await baseItemRepo.createMany([]);

      expect(createdItems).toHaveLength(0);
      expect(createdItems).toEqual([]);
    });

    it("should create single item when array contains one element", async () => {
      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Single Item",
          content: "Single content",
          link: "",
          preview: undefined,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(1);
      expect(createdItems[0]!.attrs.title).toBe("Single Item");
      expect(createdItems[0]!.id).toBeDefined();
    });

    it("should preserve all attributes when creating multiple items", async () => {
      // First create originals for valid FK references
      const original1 = await baseItemRepo.create({
        attrs: {
          title: "Original 1",
          content: "Original 1 content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const original2 = await baseItemRepo.create({
        attrs: {
          title: "Original 2",
          content: "Original 2 content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Full Item 1",
          content: "Content with details",
          preview: "Preview text",
          link: "https://example.com/1",
          originId: original1.id,
        },
        {
          title: "Full Item 2",
          content: "More content",
          preview: "Another preview",
          link: "https://example.com/2",
          originId: original2.id,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(2);

      // First item
      expect(createdItems[0]!.attrs.title).toBe("Full Item 1");
      expect(createdItems[0]!.attrs.content).toBe("Content with details");
      expect(createdItems[0]!.attrs.preview).toBe("Preview text");
      expect(createdItems[0]!.attrs.link).toBe("https://example.com/1");
      expect(createdItems[0]!.attrs.originId).toBe(original1.id);

      // Second item
      expect(createdItems[1]!.attrs.title).toBe("Full Item 2");
      expect(createdItems[1]!.attrs.content).toBe("More content");
      expect(createdItems[1]!.attrs.preview).toBe("Another preview");
      expect(createdItems[1]!.attrs.link).toBe("https://example.com/2");
      expect(createdItems[1]!.attrs.originId).toBe(original2.id);
    });

    it("should handle mix of items with and without originId", async () => {
      // Create an original first for valid FK
      const original = await baseItemRepo.create({
        attrs: {
          title: "Original",
          content: "Original content",
          link: "",
          preview: undefined,
        },
        relatedItems: {},
        relatedLists: {},
      });

      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Original Item",
          content: "Original content",
          link: "",
          preview: undefined,
          // No originId - this is an original
        },
        {
          title: "Copied Item",
          content: "Copied content",
          link: "",
          preview: undefined,
          originId: original.id,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(2);
      expect(createdItems[0]!.attrs.originId).toBeUndefined();
      expect(createdItems[1]!.attrs.originId).toBe(original.id);
    });

    it("should create items with null originId when explicitly set", async () => {
      const itemsToCreate: MapItemAttributes[] = [
        {
          title: "Item with null origin",
          content: "Content",
          link: "",
          preview: undefined,
          originId: null,
        },
      ];

      const createdItems = await baseItemRepo.createMany(itemsToCreate);

      expect(createdItems).toHaveLength(1);
      // null in DB becomes undefined in domain model
      expect(createdItems[0]!.attrs.originId).toBeUndefined();
    });

    it("should handle large batch creation (performance test)", async () => {
      const itemCount = 50;
      const itemsToCreate: MapItemAttributes[] = Array.from({ length: itemCount }, (_, i) => ({
        title: `Bulk Item ${i + 1}`,
        content: `Content ${i + 1}`,
        link: "",
        preview: undefined,
      }));

      const startTime = Date.now();
      const createdItems = await baseItemRepo.createMany(itemsToCreate);
      const endTime = Date.now();

      expect(createdItems).toHaveLength(itemCount);

      // Verify first and last items
      expect(createdItems[0]!.attrs.title).toBe("Bulk Item 1");
      expect(createdItems[itemCount - 1]!.attrs.title).toBe(`Bulk Item ${itemCount}`);

      // Should be reasonably fast (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});
