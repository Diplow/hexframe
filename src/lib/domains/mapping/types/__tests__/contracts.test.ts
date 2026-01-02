import { describe, it, expect } from "vitest";
import {
  baseItemVersionDomainToContractAdapter,
  mapItemDomainToContractAdapter,
  baseItemDomainToContractAdapter,
  adapt,
  type BaseItemVersionContract,
  type ItemHistoryContract,
} from "~/lib/domains/mapping/types/contracts";
import type { BaseItemVersion } from "~/lib/domains/mapping/_objects";
import { BaseItem, MapItem, MapItemType } from "~/lib/domains/mapping/_objects";
import { Direction } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";

// Helper to create a BaseItemWithId for testing
function createTestBaseItem(id: number, title: string, content: string, preview: string | null = null, link = "") {
  const baseItem = new BaseItem({ attrs: { title, content, preview: preview ?? undefined, link } });
  return Object.assign(baseItem, { id });
}

// Helper to create a MapItemWithId for testing
function createTestMapItem(
  id: number,
  coords: Coord,
  itemType: MapItemType,
  baseItemId: number,
  title: string,
  content: string,
  preview: string | null = null,
  link = "",
  parentId: number | null = null
) {
  const baseItem = createTestBaseItem(baseItemId, title, content, preview, link);
  const mapItem = new MapItem({
    attrs: { coords, itemType, parentId, originId: null },
    ref: baseItem,
    neighbors: [],
  });
  return Object.assign(mapItem, { id });
}

describe("baseItemVersionDomainToContractAdapter", () => {
  describe("happy path", () => {
    it("should adapt domain BaseItemVersion to contract", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 3,
        title: "Version Title",
        content: "Version content",
        preview: "Preview text",
        link: "https://example.com",
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: "user@example.com",
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract).toEqual({
        versionNumber: 3,
        title: "Version Title",
        content: "Version content",
        preview: "Preview text",
        link: "https://example.com",
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: "user@example.com",
      });
    });

    it("should preserve null values for optional fields", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 1,
        title: "Title",
        content: "Content",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: null,
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract.preview).toBeNull();
      expect(contract.link).toBeNull();
      expect(contract.updatedBy).toBeNull();
    });

    it("should preserve Date objects for createdAt", () => {
      const timestamp = new Date("2025-01-15T10:30:00Z");
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 1,
        title: "Title",
        content: "Content",
        preview: null,
        link: null,
        createdAt: timestamp,
        updatedBy: null,
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract.createdAt).toBe(timestamp);
      expect(contract.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("security", () => {
    it("should NOT expose internal database ID", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 1,
        title: "Title",
        content: "Content",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: null,
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract).not.toHaveProperty("id");
      expect(contract).not.toHaveProperty("baseItemId");
    });
  });

  describe("edge cases", () => {
    it("should handle version number 1 (initial version)", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 1,
        title: "Initial",
        content: "First version",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: null,
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract.versionNumber).toBe(1);
    });

    it("should handle large version numbers", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 9999,
        title: "Many updates",
        content: "Content",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: null,
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract.versionNumber).toBe(9999);
    });

    it("should handle empty strings in optional fields", () => {
      const version: BaseItemVersion = {
        id: 123,
        baseItemId: 456,
        versionNumber: 1,
        title: "",
        content: "",
        preview: "",
        link: "",
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: "",
      };

      const contract = baseItemVersionDomainToContractAdapter(version);

      expect(contract.title).toBe("");
      expect(contract.content).toBe("");
      expect(contract.preview).toBe("");
      expect(contract.link).toBe("");
      expect(contract.updatedBy).toBe("");
    });
  });
});

describe("ItemHistoryContract type", () => {
  it("should be compatible with expected structure", () => {
    const coords: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
    const currentVersion = createTestBaseItem(
      789,
      "Current Title",
      "Current content",
      "Current preview",
      "https://current.com"
    );

    const versions: BaseItemVersionContract[] = [
      {
        versionNumber: 2,
        title: "Version 2",
        content: "Content 2",
        preview: "Preview 2",
        link: "https://v2.com",
        createdAt: new Date("2025-01-15T10:30:00Z"),
        updatedBy: "user@example.com",
      },
      {
        versionNumber: 1,
        title: "Version 1",
        content: "Content 1",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-14T10:30:00Z"),
        updatedBy: null,
      },
    ];

    const history: ItemHistoryContract = {
      coords,
      currentVersion: baseItemDomainToContractAdapter(currentVersion),
      versions,
      totalCount: 2,
      hasMore: false,
    };

    expect(history.coords).toEqual(coords);
    expect(history.currentVersion.title).toBe("Current Title");
    expect(history.versions).toHaveLength(2);
    expect(history.totalCount).toBe(2);
    expect(history.hasMore).toBe(false);
  });

  it("should support pagination with hasMore flag", () => {
    const coords: Coord = { userId: "user-test-1", groupId: 0, path: [] };
    const currentVersion = createTestBaseItem(789, "Current", "Content", null, "");

    const history: ItemHistoryContract = {
      coords,
      currentVersion: baseItemDomainToContractAdapter(currentVersion),
      versions: [],
      totalCount: 100,
      hasMore: true,
    };

    expect(history.hasMore).toBe(true);
    expect(history.totalCount).toBe(100);
  });
});

describe("adapt object - centralized access", () => {
  it("should provide baseItemVersion adapter", () => {
    const version: BaseItemVersion = {
      id: 123,
      baseItemId: 456,
      versionNumber: 1,
      title: "Title",
      content: "Content",
      preview: null,
      link: null,
      createdAt: new Date("2025-01-15T10:30:00Z"),
      updatedBy: null,
    };

    const contract = adapt.baseItemVersion(version);

    expect(contract.versionNumber).toBe(1);
    expect(contract.title).toBe("Title");
  });

  it("should provide baseItem adapter", () => {
    const baseItem = createTestBaseItem(789, "Base Title", "Base content", "Base preview", "https://base.com");

    const contract = adapt.baseItem(baseItem);

    expect(contract.id).toBe("789");
    expect(contract.title).toBe("Base Title");
  });

  it("should provide mapItem adapter", () => {
    const coords: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
    const mapItem = createTestMapItem(
      123,
      coords,
      MapItemType.CONTEXT,
      456,
      "Map Item Title",
      "Map Item Content",
      "Map Item Preview",
      "https://mapitem.com",
      999 // parentId - BASE items need a parent
    );

    const contract = adapt.mapItem(mapItem, "user-test-1");

    expect(contract.id).toBe("123");
    expect(contract.title).toBe("Map Item Title");
  });

  it("should provide map adapter", () => {
    const coords: Coord = { userId: "user-test-1", groupId: 0, path: [] };
    const rootItem = createTestMapItem(
      1,
      coords,
      MapItemType.USER,
      100,
      "Root Title",
      "Root Content",
      null,
      ""
    );

    const contract = adapt.map(rootItem, []);

    expect(contract.id).toBe(1);
    expect(contract.title).toBe("Root Title");
  });
});

describe("adapter function purity", () => {
  it("should not mutate input BaseItemVersion", () => {
    const version: BaseItemVersion = {
      id: 123,
      baseItemId: 456,
      versionNumber: 1,
      title: "Title",
      content: "Content",
      preview: "Preview",
      link: "Link",
      createdAt: new Date("2025-01-15T10:30:00Z"),
      updatedBy: "user",
    };

    const originalVersion = { ...version };
    baseItemVersionDomainToContractAdapter(version);

    expect(version).toEqual(originalVersion);
  });

  it("should not mutate input BaseItem", () => {
    const baseItem = createTestBaseItem(789, "Base Title", "Base content", "Base preview", "https://base.com");

    const originalAttrs = { ...baseItem.attrs };
    baseItemDomainToContractAdapter(baseItem);

    expect(baseItem.attrs).toEqual(originalAttrs);
    expect(baseItem.id).toBe(789);
  });

  it("should not mutate input MapItem", () => {
    const coords: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
    const mapItem = createTestMapItem(
      123,
      coords,
      MapItemType.CONTEXT,
      456,
      "Map Item Title",
      "Map Item Content",
      "Map Item Preview",
      "https://mapitem.com",
      999 // parentId - BASE items need a parent
    );

    const originalAttrs = { ...mapItem.attrs };
    const originalRefAttrs = { ...mapItem.ref.attrs };
    mapItemDomainToContractAdapter(mapItem, "user-test-1");

    expect(mapItem.attrs).toEqual(originalAttrs);
    expect(mapItem.ref.attrs).toEqual(originalRefAttrs);
    expect(mapItem.id).toBe(123);
  });
});
