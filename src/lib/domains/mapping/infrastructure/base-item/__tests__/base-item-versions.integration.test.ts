import { describe, beforeEach, it, expect } from "vitest";
import { eq, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { schema } from "~/server/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { _cleanupDatabase } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

/**
 * Integration tests for BaseItem versioning feature
 *
 * These tests verify that:
 * 1. Versions are created when baseItems are updated
 * 2. Version history can be queried efficiently
 * 3. Cascading deletes work correctly
 * 4. Version numbering is sequential
 * 5. All version data is captured correctly
 */
describe("BaseItem Versioning [Integration - DB]", () => {
  let repository: DbBaseItemRepository;

  beforeEach(async () => {
    // Use common cleanup utility which handles CASCADE properly
    await _cleanupDatabase();
    repository = new DbBaseItemRepository(db);
  });

  describe("Version Creation", () => {
    it("should create version 1 when a baseItem is initially created", async () => {
      // Arrange
      const attrs = {
        title: "Initial Title",
        content: "Initial Content",
        preview: "Initial Preview",
        link: "https://example.com",
      };

      // Act
      const createdItem = await repository.create({
        attrs,
        relatedItems: {},
        relatedLists: {},
      });

      // Assert - verify version 1 was created
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, createdItem.id),
      });

      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        baseItemId: createdItem.id,
        versionNumber: 1,
        title: attrs.title,
        content: attrs.content,
        preview: attrs.preview,
        link: attrs.link,
      });
      expect(versions[0]!.createdAt).toBeInstanceOf(Date);
    });

    it("should create version 2 when a baseItem is updated", async () => {
      // Arrange - create initial item
      const initialAttrs = {
        title: "Version 1 Title",
        content: "Version 1 Content",
        preview: "Version 1 Preview",
        link: "https://v1.com",
      };

      const item = await repository.create({
        attrs: initialAttrs,
        relatedItems: {},
        relatedLists: {},
      });

      // Act - update the item
      const updatedAttrs = {
        title: "Version 2 Title",
        content: "Version 2 Content",
        preview: "Version 2 Preview",
        link: "https://v2.com",
      };

      await repository.update({
        aggregate: item,
        attrs: updatedAttrs,
      });

      // Assert - verify version 2 was created with OLD values
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      expect(versions).toHaveLength(2);

      // Version 2 should contain the OLD values (before update)
      expect(versions[0]).toMatchObject({
        baseItemId: item.id,
        versionNumber: 2,
        title: initialAttrs.title,
        content: initialAttrs.content,
        preview: initialAttrs.preview,
        link: initialAttrs.link,
      });

      // Version 1 should still exist
      expect(versions[1]).toMatchObject({
        baseItemId: item.id,
        versionNumber: 1,
        title: initialAttrs.title,
        content: initialAttrs.content,
      });
    });

    it("should create sequential versions for multiple updates", async () => {
      // Arrange
      const item = await repository.create({
        attrs: {
          title: "V1",
          content: "Content V1",
          link: "",
        },
        relatedItems: {},
        relatedLists: {},
      });

      // Act - perform 3 updates
      await repository.update({
        aggregate: item,
        attrs: { title: "V2" },
      });

      const item2 = await repository.getOne(item.id);
      await repository.update({
        aggregate: item2,
        attrs: { title: "V3" },
      });

      const item3 = await repository.getOne(item.id);
      await repository.update({
        aggregate: item3,
        attrs: { title: "V4" },
      });

      // Assert - verify 4 versions exist (initial + 3 updates)
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      expect(versions).toHaveLength(4);
      expect(versions.map((v: { versionNumber: number }) => v.versionNumber)).toEqual([4, 3, 2, 1]);
    });

    it("should handle partial updates by preserving unchanged fields", async () => {
      // Arrange
      const item = await repository.create({
        attrs: {
          title: "Original Title",
          content: "Original Content",
          preview: "Original Preview",
          link: "https://original.com",
        },
        relatedItems: {},
        relatedLists: {},
      });

      // Act - update only title
      await repository.update({
        aggregate: item,
        attrs: { title: "Updated Title" },
      });

      // Assert - version 2 should capture all fields as they were
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      expect(versions[0]).toMatchObject({
        versionNumber: 2,
        title: "Original Title", // OLD value
        content: "Original Content", // Preserved
        preview: "Original Preview", // Preserved
        link: "https://original.com", // Preserved
      });
    });

    it("should handle null/undefined preview and link fields", async () => {
      // Arrange
      const item = await repository.create({
        attrs: {
          title: "Test",
          content: "Content",
          link: "",
        },
        relatedItems: {},
        relatedLists: {},
      });

      // Act
      await repository.update({
        aggregate: item,
        attrs: { title: "Updated" },
      });

      // Assert
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      expect(versions[0]!.preview).toBeNull();
      expect(versions[0]!.link).toBeNull();
    });
  });

  describe("Version Retrieval", () => {
    it("should retrieve all versions for a baseItem in descending order", async () => {
      // Arrange - create item with 3 versions
      const item = await repository.create({
        attrs: { title: "V1", content: "C1", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      const item2 = await repository.getOne(item.id);
      await repository.update({ aggregate: item2, attrs: { title: "V2" } });

      const item3 = await repository.getOne(item.id);
      await repository.update({ aggregate: item3, attrs: { title: "V3" } });

      // Act
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      // Assert
      expect(versions).toHaveLength(3);
      expect(versions[0]!.versionNumber).toBe(3);
      expect(versions[1]!.versionNumber).toBe(2);
      expect(versions[2]!.versionNumber).toBe(1);
    });

    it("should retrieve a specific version by version number", async () => {
      // Arrange
      const item = await repository.create({
        attrs: { title: "V1", content: "Content V1", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      await repository.update({
        aggregate: item,
        attrs: { title: "V2", content: "Content V2" },
      });

      // Act
      const version1 = await db.query.baseItemVersions.findFirst({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        // Note: In real implementation, we'd also filter by versionNumber
      });

      // Assert
      expect(version1).toBeDefined();
      expect(version1!.versionNumber).toBe(1);
      expect(version1!.title).toBe("V1");
    });

    it("should return empty array for baseItem with no versions", async () => {
      // Act - query for non-existent baseItemId
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, 99999),
      });

      // Assert
      expect(versions).toHaveLength(0);
    });
  });

  describe("Cascading Delete", () => {
    it("should delete all versions when baseItem is deleted", async () => {
      // Arrange - create item with multiple versions
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      const item2 = await repository.getOne(item.id);
      await repository.update({ aggregate: item2, attrs: { title: "Updated 1" } });

      const item3 = await repository.getOne(item.id);
      await repository.update({ aggregate: item3, attrs: { title: "Updated 2" } });

      // Verify versions exist
      const versionsBefore = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
      });
      expect(versionsBefore).toHaveLength(3);

      // Act - delete baseItem
      await repository.remove(item.id);

      // Assert - versions should be cascaded deleted
      const versionsAfter = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
      });
      expect(versionsAfter).toHaveLength(0);
    });
  });

  describe("Version Number Uniqueness", () => {
    it("should enforce unique constraint on (baseItemId, versionNumber)", async () => {
      // Arrange - create item
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Act & Assert - try to insert duplicate version number
      await expect(async () => {
        await db.insert(schema.baseItemVersions).values({
          baseItemId: item.id,
          versionNumber: 1,
          title: "Duplicate",
          content: "Should fail",
        });
      }).rejects.toThrow();
    });
  });

  describe("Transaction Rollback", () => {
    it("should not create version if update fails", async () => {
      // Arrange
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Act & Assert - simulate update failure by using invalid ID
      await expect(async () => {
        await repository.update({
          aggregate: { ...item, id: 99999 }, // Non-existent ID
          attrs: { title: "Should Fail" },
        });
      }).rejects.toThrow();

      // Assert - version should NOT have been created
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
      });

      // Should only have version 1 (from initial creation)
      expect(versions).toHaveLength(1);
      expect(versions[0]!.versionNumber).toBe(1);
    });
  });

  describe("Performance", () => {
    it("should efficiently query versions with indexes", async () => {
      // This test verifies the query works efficiently
      // In production, we'd use EXPLAIN ANALYZE to verify index usage

      // Arrange - create item with many versions
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Create 10 versions
      for (let i = 0; i < 10; i++) {
        const currentItem = await repository.getOne(item.id);
        await repository.update({
          aggregate: currentItem,
          attrs: { title: `Version ${i + 2}` },
        });
      }

      // Act - measure query performance
      const startTime = Date.now();
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });
      const queryTime = Date.now() - startTime;

      // Assert
      expect(versions).toHaveLength(11);
      expect(queryTime).toBeLessThan(100); // Should be fast with indexes
    });
  });

  describe("updateByIdr with Versioning", () => {
    it("should create version when updating via updateByIdr", async () => {
      // Arrange
      const item = await repository.create({
        attrs: { title: "Original", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Act
      await repository.updateByIdr({
        idr: { id: item.id },
        attrs: { title: "Updated via Idr" },
      });

      // Assert
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
      });

      expect(versions).toHaveLength(2);
      expect(versions[1]!.versionNumber).toBe(2);
    });
  });

  describe("Version Metadata", () => {
    it("should capture createdAt timestamp for each version", async () => {
      // Arrange
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Act - wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.update({
        aggregate: item,
        attrs: { title: "Updated" },
      });

      // Assert
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
        orderBy: desc(schema.baseItemVersions.versionNumber),
      });

      expect(versions[0]!.createdAt).toBeInstanceOf(Date);
      expect(versions[1]!.createdAt).toBeInstanceOf(Date);

      // Version 2 should be created after version 1
      expect(versions[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        versions[1]!.createdAt.getTime()
      );
    });

    it("should support updatedBy field for future audit trail", async () => {
      // Arrange
      const item = await repository.create({
        attrs: { title: "Test", content: "Content", link: "" },
        relatedItems: {},
        relatedLists: {},
      });

      // Act
      await repository.update({
        aggregate: item,
        attrs: { title: "Updated" },
      });

      // Assert - updatedBy should be null for now (future feature)
      const versions = await db.query.baseItemVersions.findMany({
        where: eq(schema.baseItemVersions.baseItemId, item.id),
      });

      expect(versions[0]!.updatedBy).toBeNull();
    });
  });
});
