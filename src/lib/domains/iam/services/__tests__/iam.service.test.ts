import { describe, it, expect, beforeEach, vi } from "vitest";
import { IAMService } from "~/lib/domains/iam/services/iam.service";
import { User } from "~/lib/domains/iam/_objects/user";
import type { UserRepository } from "~/lib/domains/iam/_repositories/user.repository";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  WeakPasswordError,
} from "../../types/errors";

// Mock repository implementation
const createMockUserRepository = (): UserRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByMappingId: vi.fn(),
  authenticate: vi.fn(),
  update: vi.fn(),
  ensureMappingId: vi.fn(),
  verifyEmail: vi.fn(),
  emailExists: vi.fn(),
});

describe("IAMService", () => {
  let service: IAMService;
  let mockUserRepo: UserRepository;

  beforeEach(() => {
    mockUserRepo = createMockUserRepository();
    service = new IAMService({ user: mockUserRepo });
  });

  describe("register", () => {
    const validInput = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    it("should register a new user successfully", async () => {
      const mockUser = User.create({
        id: "user-123",
        email: validInput.email,
        name: validInput.name,
        mappingId: 1,
      });

      (mockUserRepo.emailExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockUserRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.register(validInput);

      expect(result).toBe(mockUser);
      expect((mockUserRepo.emailExists as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(validInput.email);
      expect((mockUserRepo.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
        email: validInput.email,
        password: validInput.password,
        name: validInput.name,
      });
    });

    it("should throw WeakPasswordError for short passwords", async () => {
      const input = { ...validInput, password: "short" };

      await expect(service.register(input)).rejects.toThrow(
        WeakPasswordError
      );
      expect((mockUserRepo.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it("should throw EmailAlreadyExistsError for duplicate emails", async () => {
      (mockUserRepo.emailExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(service.register(validInput)).rejects.toThrow(
        EmailAlreadyExistsError
      );
      expect((mockUserRepo.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginInput = {
      email: "test@example.com",
      password: "password123",
    };

    it("should authenticate user successfully", async () => {
      const mockUser = User.create({
        id: "user-123",
        email: loginInput.email,
        mappingId: 1,
      });

      const mockAuthResult = {
        user: mockUser,
      };

      (mockUserRepo.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResult);

      const result = await service.login(loginInput);

      expect(result.email).toBe(loginInput.email);
      expect(result.id).toBe(mockUser.id);
      expect((mockUserRepo.authenticate as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
        email: loginInput.email,
        password: loginInput.password,
      });
    });

    it("should throw InvalidCredentialsError on failed authentication", async () => {
      (mockUserRepo.authenticate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invalid credentials")
      );

      await expect(service.login(loginInput)).rejects.toThrow(
        InvalidCredentialsError
      );
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      const mockUser = User.create({
        id: "user-123",
        email: "test@example.com",
        mappingId: 1,
      });

      (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.getUserById("user-123");

      expect(result).toBe(mockUser);
      expect((mockUserRepo.findById as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("user-123");
    });

    it("should throw UserNotFoundError when user not found", async () => {
      (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getUserById("user-123")).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      const mockUser = User.create({
        id: "user-123",
        email: "test@example.com",
        name: "Old Name",
        mappingId: 1,
      });

      const updatedUser = mockUser.updateProfile({ name: "New Name" });

      (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockUserRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

      const result = await service.updateProfile("user-123", {
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
      expect((mockUserRepo.update as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });

  describe("userToContract", () => {
    it("should convert User entity to contract format", () => {
      const user = User.create({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        mappingId: 1,
      });

      const contract = service.userToContract(user);

      expect(contract).toMatchObject({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        displayName: "Test User",
        mappingId: 1,
      });
      expect(typeof contract.createdAt).toBe("string");
      expect(typeof contract.updatedAt).toBe("string");
    });
  });
});