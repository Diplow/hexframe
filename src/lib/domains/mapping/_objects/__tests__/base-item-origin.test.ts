import { describe, it, expect } from "vitest";
import { BaseItem, type BaseItemWithId } from "~/lib/domains/mapping/_objects/base-item";

describe("BaseItem - originId field", () => {
  describe("constructor", () => {
    it("should create BaseItem with originId", () => {
      const item = new BaseItem({
        attrs: {
          title: "Copied Item",
          content: "This is a copy",
          originId: 42,
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBe(42);
    });

    it("should create BaseItem without originId (original item)", () => {
      const item = new BaseItem({
        attrs: {
          title: "Original Item",
          content: "This is an original",
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBeUndefined();
    });

    it("should create BaseItem with null originId explicitly", () => {
      const item = new BaseItem({
        attrs: {
          title: "Item",
          content: "Content",
          originId: null,
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBeNull();
    });

    it("should preserve originId when creating BaseItem with all attributes", () => {
      const item = new BaseItem({
        attrs: {
          title: "Full Item",
          content: "Full content",
          preview: "Preview text",
          link: "https://example.com",
          originId: 123,
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBe(123);
      expect(item.attrs.title).toBe("Full Item");
      expect(item.attrs.content).toBe("Full content");
      expect(item.attrs.preview).toBe("Preview text");
      expect(item.attrs.link).toBe("https://example.com");
    });
  });

  describe("originId tracking for copy chains", () => {
    it("should maintain originId through multiple copy operations", () => {
      const originalId = 1;

      // First copy
      const firstCopy = new BaseItem({
        id: 2,
        attrs: {
          title: "First Copy",
          content: "Copy of original",
          originId: originalId,
        },
      }) as BaseItemWithId;

      // Second copy should reference the same original
      const secondCopy = new BaseItem({
        id: 3,
        attrs: {
          title: "Second Copy",
          content: "Another copy of original",
          originId: originalId,
        },
      }) as BaseItemWithId;

      expect(firstCopy.attrs.originId).toBe(originalId);
      expect(secondCopy.attrs.originId).toBe(originalId);
    });

    it("should allow originId to be different from id", () => {
      const item = new BaseItem({
        id: 100,
        attrs: {
          title: "Item",
          content: "Content",
          originId: 50,
        },
      }) as BaseItemWithId;

      expect(item.id).toBe(100);
      expect(item.attrs.originId).toBe(50);
      expect(item.id).not.toBe(item.attrs.originId);
    });
  });

  describe("originId type safety", () => {
    it("should accept number for originId", () => {
      const item = new BaseItem({
        attrs: {
          title: "Item",
          content: "Content",
          originId: 999,
        },
      }) as BaseItemWithId;

      expect(typeof item.attrs.originId).toBe("number");
      expect(item.attrs.originId).toBe(999);
    });

    it("should accept null for originId", () => {
      const item = new BaseItem({
        attrs: {
          title: "Item",
          content: "Content",
          originId: null,
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBeNull();
    });

    it("should accept undefined for originId (field not set)", () => {
      const item = new BaseItem({
        attrs: {
          title: "Item",
          content: "Content",
        },
      }) as BaseItemWithId;

      expect(item.attrs.originId).toBeUndefined();
    });
  });
});
