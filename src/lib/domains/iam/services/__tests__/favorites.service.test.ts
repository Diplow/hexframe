import { describe, it, expect, beforeEach, vi } from "vitest";
import { FavoritesService } from "~/lib/domains/iam/services/favorites.service";
import type { FavoritesRepository } from "~/lib/domains/iam/_repositories/favorites.repository";
import {
  DuplicateShortcutNameError,
  InvalidShortcutNameError,
  FavoriteNotFoundError,
} from "~/lib/domains/iam/types/errors";

// Type for a Favorite entity
interface Favorite {
  id: string;
  userId: string;
  mapItemId: number;
  shortcutName: string;
  createdAt: Date;
}

// Mock repository implementation
const createMockFavoritesRepository = (): FavoritesRepository => ({
  create: vi.fn(),
  delete: vi.fn(),
  findByUserAndShortcut: vi.fn(),
  findAllByUser: vi.fn(),
  existsByUserAndShortcut: vi.fn(),
  updateShortcutName: vi.fn(),
});

describe("FavoritesService", () => {
  let service: FavoritesService;
  let mockRepository: FavoritesRepository;

  beforeEach(() => {
    mockRepository = createMockFavoritesRepository();
    service = new FavoritesService(mockRepository);
  });

  describe("addFavorite", () => {
    const validInput = {
      userId: "user-123",
      mapItemId: 456,
      shortcutName: "my_project",
    };

    it("should create a favorite with valid shortcut name", async () => {
      const expectedFavorite: Favorite = {
        id: "fav-789",
        userId: validInput.userId,
        mapItemId: validInput.mapItemId,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

      const result = await service.addFavorite(validInput);

      expect(result).toEqual(expectedFavorite);
      expect(mockRepository.existsByUserAndShortcut).toHaveBeenCalledWith(
        validInput.userId,
        "my_project"
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: validInput.userId,
        mapItemId: validInput.mapItemId,
        shortcutName: "my_project",
      });
    });

    it("should normalize shortcut name to lowercase", async () => {
      const inputWithUppercase = {
        ...validInput,
        shortcutName: "My_Project",
      };

      const expectedFavorite: Favorite = {
        id: "fav-789",
        userId: inputWithUppercase.userId,
        mapItemId: inputWithUppercase.mapItemId,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

      const result = await service.addFavorite(inputWithUppercase);

      expect(result.shortcutName).toBe("my_project");
      expect(mockRepository.existsByUserAndShortcut).toHaveBeenCalledWith(
        inputWithUppercase.userId,
        "my_project"
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: inputWithUppercase.userId,
        mapItemId: inputWithUppercase.mapItemId,
        shortcutName: "my_project",
      });
    });

    it("should accept shortcut names with alphanumeric characters and underscores", async () => {
      const validNames = ["project1", "my_project_2", "test123", "a", "A1_b2_C3"];

      for (const shortcutName of validNames) {
        vi.clearAllMocks();

        const expectedFavorite: Favorite = {
          id: "fav-789",
          userId: validInput.userId,
          mapItemId: validInput.mapItemId,
          shortcutName: shortcutName.toLowerCase(),
          createdAt: new Date(),
        };

        (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

        const result = await service.addFavorite({
          ...validInput,
          shortcutName,
        });

        expect(result.shortcutName).toBe(shortcutName.toLowerCase());
      }
    });

    it("should reject shortcut names with spaces", async () => {
      const inputWithSpaces = {
        ...validInput,
        shortcutName: "my project",
      };

      await expect(service.addFavorite(inputWithSpaces)).rejects.toThrow(
        InvalidShortcutNameError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should reject shortcut names with special characters", async () => {
      const invalidNames = ["my-project", "my.project", "my@project", "my#project", "project!"];

      for (const shortcutName of invalidNames) {
        await expect(
          service.addFavorite({ ...validInput, shortcutName })
        ).rejects.toThrow(InvalidShortcutNameError);
      }

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should reject empty shortcut names", async () => {
      const inputWithEmptyName = {
        ...validInput,
        shortcutName: "",
      };

      await expect(service.addFavorite(inputWithEmptyName)).rejects.toThrow(
        InvalidShortcutNameError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should reject shortcut names that are only whitespace", async () => {
      const inputWithWhitespace = {
        ...validInput,
        shortcutName: "   ",
      };

      await expect(service.addFavorite(inputWithWhitespace)).rejects.toThrow(
        InvalidShortcutNameError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should reject duplicate shortcut names for same user", async () => {
      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(service.addFavorite(validInput)).rejects.toThrow(
        DuplicateShortcutNameError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should allow same tile with different shortcut names", async () => {
      const firstFavorite: Favorite = {
        id: "fav-001",
        userId: validInput.userId,
        mapItemId: validInput.mapItemId,
        shortcutName: "project_alpha",
        createdAt: new Date(),
      };

      const secondFavorite: Favorite = {
        id: "fav-002",
        userId: validInput.userId,
        mapItemId: validInput.mapItemId, // Same tile
        shortcutName: "project_beta",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      (mockRepository.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(firstFavorite)
        .mockResolvedValueOnce(secondFavorite);

      const result1 = await service.addFavorite({
        ...validInput,
        shortcutName: "project_alpha",
      });
      const result2 = await service.addFavorite({
        ...validInput,
        shortcutName: "project_beta",
      });

      expect(result1.shortcutName).toBe("project_alpha");
      expect(result2.shortcutName).toBe("project_beta");
      expect(result1.mapItemId).toBe(result2.mapItemId);
    });
  });

  describe("removeFavorite", () => {
    it("should remove a favorite successfully", async () => {
      const existingFavorite: Favorite = {
        id: "fav-789",
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingFavorite
      );
      (mockRepository.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.removeFavorite("user-123", "my_project");

      expect(mockRepository.findByUserAndShortcut).toHaveBeenCalledWith(
        "user-123",
        "my_project"
      );
      expect(mockRepository.delete).toHaveBeenCalledWith(existingFavorite.id);
    });

    it("should normalize shortcut name to lowercase when removing", async () => {
      const existingFavorite: Favorite = {
        id: "fav-789",
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingFavorite
      );
      (mockRepository.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.removeFavorite("user-123", "MY_PROJECT");

      expect(mockRepository.findByUserAndShortcut).toHaveBeenCalledWith(
        "user-123",
        "my_project"
      );
    });

    it("should throw FavoriteNotFoundError when removing non-existent favorite", async () => {
      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.removeFavorite("user-123", "nonexistent")
      ).rejects.toThrow(FavoriteNotFoundError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("getFavoriteByShortcut", () => {
    it("should return favorite when found", async () => {
      const existingFavorite: Favorite = {
        id: "fav-789",
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingFavorite
      );

      const result = await service.getFavoriteByShortcut("user-123", "my_project");

      expect(result).toEqual(existingFavorite);
      expect(mockRepository.findByUserAndShortcut).toHaveBeenCalledWith(
        "user-123",
        "my_project"
      );
    });

    it("should perform case-insensitive lookup", async () => {
      const existingFavorite: Favorite = {
        id: "fav-789",
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "my_project",
        createdAt: new Date(),
      };

      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingFavorite
      );

      await service.getFavoriteByShortcut("user-123", "MY_PROJECT");

      expect(mockRepository.findByUserAndShortcut).toHaveBeenCalledWith(
        "user-123",
        "my_project"
      );
    });

    it("should throw FavoriteNotFoundError when favorite does not exist", async () => {
      (mockRepository.findByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getFavoriteByShortcut("user-123", "nonexistent")
      ).rejects.toThrow(FavoriteNotFoundError);
    });
  });

  describe("listFavorites", () => {
    it("should return all favorites for a user", async () => {
      const favorites: Favorite[] = [
        {
          id: "fav-001",
          userId: "user-123",
          mapItemId: 111,
          shortcutName: "project_a",
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "fav-002",
          userId: "user-123",
          mapItemId: 222,
          shortcutName: "project_b",
          createdAt: new Date("2024-01-02"),
        },
        {
          id: "fav-003",
          userId: "user-123",
          mapItemId: 333,
          shortcutName: "project_c",
          createdAt: new Date("2024-01-03"),
        },
      ];

      (mockRepository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue(favorites);

      const result = await service.listFavorites("user-123");

      expect(result).toEqual(favorites);
      expect(result).toHaveLength(3);
      expect(mockRepository.findAllByUser).toHaveBeenCalledWith("user-123");
    });

    it("should return empty array when user has no favorites", async () => {
      (mockRepository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.listFavorites("user-123");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockRepository.findAllByUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("shortcut name validation", () => {
    it("should validate shortcut names starting with numbers", async () => {
      const inputWithNumberStart = {
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "123project",
      };

      const expectedFavorite: Favorite = {
        id: "fav-789",
        userId: inputWithNumberStart.userId,
        mapItemId: inputWithNumberStart.mapItemId,
        shortcutName: "123project",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

      // Numbers at start should be valid per spec (alphanumeric + underscore)
      const result = await service.addFavorite(inputWithNumberStart);
      expect(result.shortcutName).toBe("123project");
    });

    it("should validate shortcut names starting with underscore", async () => {
      const inputWithUnderscoreStart = {
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "_private",
      };

      const expectedFavorite: Favorite = {
        id: "fav-789",
        userId: inputWithUnderscoreStart.userId,
        mapItemId: inputWithUnderscoreStart.mapItemId,
        shortcutName: "_private",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

      // Underscore at start should be valid per spec (alphanumeric + underscore)
      const result = await service.addFavorite(inputWithUnderscoreStart);
      expect(result.shortcutName).toBe("_private");
    });

    it("should validate shortcut names with consecutive underscores", async () => {
      const inputWithConsecutiveUnderscores = {
        userId: "user-123",
        mapItemId: 456,
        shortcutName: "my__project",
      };

      const expectedFavorite: Favorite = {
        id: "fav-789",
        userId: inputWithConsecutiveUnderscores.userId,
        mapItemId: inputWithConsecutiveUnderscores.mapItemId,
        shortcutName: "my__project",
        createdAt: new Date(),
      };

      (mockRepository.existsByUserAndShortcut as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expectedFavorite);

      // Consecutive underscores should be valid per spec (alphanumeric + underscore)
      const result = await service.addFavorite(inputWithConsecutiveUnderscores);
      expect(result.shortcutName).toBe("my__project");
    });
  });
});
