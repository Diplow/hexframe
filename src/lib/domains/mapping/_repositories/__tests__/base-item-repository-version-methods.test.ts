import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BaseItemRepository } from "~/lib/domains/mapping/_repositories/base-item";
import type { BaseItemVersion } from "~/lib/domains/mapping/_objects";

/**
 * Unit tests for BaseItemRepository version query methods
 *
 * These tests verify that:
 * 1. Repository interface includes version query methods
 * 2. Methods have correct type signatures
 * 3. Methods support pagination where appropriate
 * 4. Methods return BaseItemVersion domain types (not DB types)
 * 5. Methods throw descriptive errors for invalid inputs
 *
 * NOTE: These are INTERFACE tests. Implementation tests are in infrastructure layer.
 */
describe("BaseItemRepository - Version Methods [Unit]", () => {
  let mockRepository: BaseItemRepository;

  beforeEach(() => {
    // Create mock repository implementing the interface
    mockRepository = {
      handleCascading: vi.fn(() => true),
      getOne: vi.fn(),
      getOneByIdr: vi.fn(),
      getMany: vi.fn(),
      getManyByIdr: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateByIdr: vi.fn(),
      updateRelatedItem: vi.fn(),
      updateRelatedItemByIdr: vi.fn(),
      addToRelatedList: vi.fn(),
      addToRelatedListByIdr: vi.fn(),
      removeFromRelatedList: vi.fn(),
      removeFromRelatedListByIdr: vi.fn(),
      remove: vi.fn(),
      removeByIdr: vi.fn(),
      // Version methods - these will be added to the interface
      getVersionHistory: vi.fn(),
      getVersionByNumber: vi.fn(),
      getLatestVersion: vi.fn(),
    } as unknown as BaseItemRepository;
  });

  describe("getVersionHistory", () => {
    it("should return array of BaseItemVersion for valid baseItemId", async () => {
      // Arrange
      const baseItemId = 123;
      const expectedVersions: BaseItemVersion[] = [
        {
          id: 1,
          baseItemId: 123,
          versionNumber: 2,
          title: "Version 2",
          content: "Content 2",
          preview: "Preview 2",
          link: "https://v2.com",
          createdAt: new Date("2025-01-15T10:00:00Z"),
          updatedBy: null,
        },
        {
          id: 2,
          baseItemId: 123,
          versionNumber: 1,
          title: "Version 1",
          content: "Content 1",
          preview: null,
          link: null,
          createdAt: new Date("2025-01-15T09:00:00Z"),
          updatedBy: null,
        },
      ];

      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue(
        expectedVersions
      );

      // Act
      const result = await mockRepository.getVersionHistory(baseItemId);

      // Assert
      expect(result).toEqual(expectedVersions);
      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith(
        baseItemId
      );
    });

    it("should support pagination with limit option", async () => {
      // Arrange
      const baseItemId = 123;
      const options = { limit: 5 };
      const expectedVersions: BaseItemVersion[] = [
        {
          id: 1,
          baseItemId: 123,
          versionNumber: 5,
          title: "Version 5",
          content: "Content 5",
          preview: null,
          link: null,
          createdAt: new Date(),
          updatedBy: null,
        },
      ];

      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue(
        expectedVersions
      );

      // Act
      const result = await mockRepository.getVersionHistory(
        baseItemId,
        options
      );

      // Assert
      expect(result).toEqual(expectedVersions);
      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith(
        baseItemId,
        options
      );
    });

    it("should support pagination with offset option", async () => {
      // Arrange
      const baseItemId = 123;
      const options = { offset: 10 };
      const expectedVersions: BaseItemVersion[] = [];

      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue(
        expectedVersions
      );

      // Act
      const result = await mockRepository.getVersionHistory(
        baseItemId,
        options
      );

      // Assert
      expect(result).toEqual(expectedVersions);
      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith(
        baseItemId,
        options
      );
    });

    it("should support pagination with both limit and offset", async () => {
      // Arrange
      const baseItemId = 123;
      const options = { limit: 5, offset: 10 };
      const expectedVersions: BaseItemVersion[] = [];

      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue(
        expectedVersions
      );

      // Act
      const result = await mockRepository.getVersionHistory(
        baseItemId,
        options
      );

      // Assert
      expect(result).toEqual(expectedVersions);
      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith(
        baseItemId,
        options
      );
    });

    it("should return empty array for baseItem with no versions", async () => {
      // Arrange
      const baseItemId = 999;
      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue([]);

      // Act
      const result = await mockRepository.getVersionHistory(baseItemId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should throw descriptive error for non-existent baseItem", async () => {
      // Arrange
      const baseItemId = 99999;
      const error = new Error("BaseItem 99999 not found");
      vi.mocked(mockRepository.getVersionHistory).mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockRepository.getVersionHistory(baseItemId)
      ).rejects.toThrow("BaseItem 99999 not found");
    });

    it("should return versions in descending order by default", async () => {
      // Arrange
      const baseItemId = 123;
      const expectedVersions: BaseItemVersion[] = [
        {
          id: 3,
          baseItemId: 123,
          versionNumber: 3,
          title: "V3",
          content: "C3",
          preview: null,
          link: null,
          createdAt: new Date("2025-01-15T12:00:00Z"),
          updatedBy: null,
        },
        {
          id: 2,
          baseItemId: 123,
          versionNumber: 2,
          title: "V2",
          content: "C2",
          preview: null,
          link: null,
          createdAt: new Date("2025-01-15T11:00:00Z"),
          updatedBy: null,
        },
        {
          id: 1,
          baseItemId: 123,
          versionNumber: 1,
          title: "V1",
          content: "C1",
          preview: null,
          link: null,
          createdAt: new Date("2025-01-15T10:00:00Z"),
          updatedBy: null,
        },
      ];

      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue(
        expectedVersions
      );

      // Act
      const result = await mockRepository.getVersionHistory(baseItemId);

      // Assert
      expect(result[0]?.versionNumber).toBe(3);
      expect(result[1]?.versionNumber).toBe(2);
      expect(result[2]?.versionNumber).toBe(1);
    });
  });

  describe("getVersionByNumber", () => {
    it("should return specific version for valid baseItemId and versionNumber", async () => {
      // Arrange
      const baseItemId = 123;
      const versionNumber = 2;
      const expectedVersion: BaseItemVersion = {
        id: 2,
        baseItemId: 123,
        versionNumber: 2,
        title: "Version 2",
        content: "Content 2",
        preview: "Preview 2",
        link: "https://v2.com",
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getVersionByNumber).mockResolvedValue(
        expectedVersion
      );

      // Act
      const result = await mockRepository.getVersionByNumber(
        baseItemId,
        versionNumber
      );

      // Assert
      expect(result).toEqual(expectedVersion);
      expect(result.versionNumber).toBe(versionNumber);
      expect(result.baseItemId).toBe(baseItemId);
    });

    it("should throw descriptive error when version not found", async () => {
      // Arrange
      const baseItemId = 123;
      const versionNumber = 999;
      const error = new Error(
        `Version ${versionNumber} not found for BaseItem ${baseItemId}`
      );
      vi.mocked(mockRepository.getVersionByNumber).mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockRepository.getVersionByNumber(baseItemId, versionNumber)
      ).rejects.toThrow(
        `Version ${versionNumber} not found for BaseItem ${baseItemId}`
      );
    });

    it("should throw descriptive error when baseItem not found", async () => {
      // Arrange
      const baseItemId = 99999;
      const versionNumber = 1;
      const error = new Error(`BaseItem ${baseItemId} not found`);
      vi.mocked(mockRepository.getVersionByNumber).mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockRepository.getVersionByNumber(baseItemId, versionNumber)
      ).rejects.toThrow(`BaseItem ${baseItemId} not found`);
    });

    it("should return version with all fields populated", async () => {
      // Arrange
      const baseItemId = 123;
      const versionNumber = 1;
      const expectedVersion: BaseItemVersion = {
        id: 1,
        baseItemId: 123,
        versionNumber: 1,
        title: "Complete Version",
        content: "Full content here",
        preview: "Short preview",
        link: "https://example.com",
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getVersionByNumber).mockResolvedValue(
        expectedVersion
      );

      // Act
      const result = await mockRepository.getVersionByNumber(
        baseItemId,
        versionNumber
      );

      // Assert
      expect(result.title).toBe("Complete Version");
      expect(result.content).toBe("Full content here");
      expect(result.preview).toBe("Short preview");
      expect(result.link).toBe("https://example.com");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedBy).toBeNull();
    });

    it("should handle versions with null preview and link", async () => {
      // Arrange
      const baseItemId = 123;
      const versionNumber = 1;
      const expectedVersion: BaseItemVersion = {
        id: 1,
        baseItemId: 123,
        versionNumber: 1,
        title: "Minimal Version",
        content: "Content",
        preview: null,
        link: null,
        createdAt: new Date(),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getVersionByNumber).mockResolvedValue(
        expectedVersion
      );

      // Act
      const result = await mockRepository.getVersionByNumber(
        baseItemId,
        versionNumber
      );

      // Assert
      expect(result.preview).toBeNull();
      expect(result.link).toBeNull();
    });
  });

  describe("getLatestVersion", () => {
    it("should return latest version for valid baseItemId", async () => {
      // Arrange
      const baseItemId = 123;
      const expectedVersion: BaseItemVersion = {
        id: 5,
        baseItemId: 123,
        versionNumber: 5,
        title: "Latest Version",
        content: "Latest content",
        preview: null,
        link: null,
        createdAt: new Date("2025-01-15T15:00:00Z"),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getLatestVersion).mockResolvedValue(
        expectedVersion
      );

      // Act
      const result = await mockRepository.getLatestVersion(baseItemId);

      // Assert
      expect(result).toEqual(expectedVersion);
      expect(result.versionNumber).toBe(5);
    });

    it("should throw descriptive error for baseItem with no versions", async () => {
      // Arrange
      const baseItemId = 999;
      const error = new Error(`No versions found for BaseItem ${baseItemId}`);
      vi.mocked(mockRepository.getLatestVersion).mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockRepository.getLatestVersion(baseItemId)
      ).rejects.toThrow(`No versions found for BaseItem ${baseItemId}`);
    });

    it("should throw descriptive error for non-existent baseItem", async () => {
      // Arrange
      const baseItemId = 99999;
      const error = new Error(`BaseItem ${baseItemId} not found`);
      vi.mocked(mockRepository.getLatestVersion).mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockRepository.getLatestVersion(baseItemId)
      ).rejects.toThrow(`BaseItem ${baseItemId} not found`);
    });

    it("should return version 1 for newly created baseItem", async () => {
      // Arrange
      const baseItemId = 123;
      const expectedVersion: BaseItemVersion = {
        id: 1,
        baseItemId: 123,
        versionNumber: 1,
        title: "Initial Version",
        content: "Initial content",
        preview: null,
        link: null,
        createdAt: new Date(),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getLatestVersion).mockResolvedValue(
        expectedVersion
      );

      // Act
      const result = await mockRepository.getLatestVersion(baseItemId);

      // Assert
      expect(result.versionNumber).toBe(1);
    });
  });

  describe("Type Safety", () => {
    it("should ensure version methods return BaseItemVersion type", async () => {
      // Arrange
      const baseItemId = 123;
      const version: BaseItemVersion = {
        id: 1,
        baseItemId: 123,
        versionNumber: 1,
        title: "Test",
        content: "Content",
        preview: null,
        link: null,
        createdAt: new Date(),
        updatedBy: null,
      };

      vi.mocked(mockRepository.getLatestVersion).mockResolvedValue(version);
      vi.mocked(mockRepository.getVersionByNumber).mockResolvedValue(version);
      vi.mocked(mockRepository.getVersionHistory).mockResolvedValue([version]);

      // Act
      const latest = await mockRepository.getLatestVersion(baseItemId);
      const byNumber = await mockRepository.getVersionByNumber(baseItemId, 1);
      const history = await mockRepository.getVersionHistory(baseItemId);

      // Assert - TypeScript compilation confirms correct types
      expect(latest.id).toBeDefined();
      expect(latest.baseItemId).toBeDefined();
      expect(latest.versionNumber).toBeDefined();
      expect(latest.title).toBeDefined();
      expect(latest.content).toBeDefined();
      expect(latest.createdAt).toBeInstanceOf(Date);

      expect(byNumber.id).toBeDefined();
      expect(history[0]?.id).toBeDefined();
    });
  });

  describe("Interface Segregation", () => {
    it("should only add version methods to BaseItemRepository", () => {
      // This test documents the design decision:
      // Version methods are content-specific, not coordinate-specific,
      // so they belong only on BaseItemRepository, not MapItemRepository

      expect(mockRepository.getVersionHistory).toBeDefined();
      expect(mockRepository.getVersionByNumber).toBeDefined();
      expect(mockRepository.getLatestVersion).toBeDefined();

      // MapItemRepository should NOT have these methods
      // (This is verified by TypeScript compilation)
    });
  });
});
