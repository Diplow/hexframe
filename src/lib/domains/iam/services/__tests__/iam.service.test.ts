import { describe, it, expect, beforeEach, vi } from "vitest";
import { IAMService } from "../iam.service";
import { User } from "../../_objects/user";
import type { UserRepository } from "../../_repositories/user.repository";
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

      vi.mocked(mockUserRepo.emailExists).mockResolvedValue(false);
      vi.mocked(mockUserRepo.create).mockResolvedValue(mockUser);

      const result = await service.register(validInput);

      expect(result).toBe(mockUser);
      expect(vi.mocked(mockUserRepo.emailExists)).toHaveBeenCalledWith(validInput.email);
      expect(vi.mocked(mockUserRepo.create)).toHaveBeenCalledWith({
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
      expect(vi.mocked(mockUserRepo.create)).not.toHaveBeenCalled();
    });

    it("should throw EmailAlreadyExistsError for duplicate emails", async () => {
      vi.mocked(mockUserRepo.emailExists).mockResolvedValue(true);

      await expect(service.register(validInput)).rejects.toThrow(
        EmailAlreadyExistsError
      );
      expect(vi.mocked(mockUserRepo.create)).not.toHaveBeenCalled();
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
        session: {
          id: "session-123",
          token: "token-123",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      };

      vi.mocked(mockUserRepo.authenticate).mockResolvedValue(mockAuthResult);

      const result = await service.login(loginInput);

      expect(result.user.email).toBe(loginInput.email);
      expect(result.session.id).toBe("session-123");
      expect(vi.mocked(mockUserRepo.authenticate)).toHaveBeenCalledWith({
        email: loginInput.email,
        password: loginInput.password,
      });
    });

    it("should throw InvalidCredentialsError on failed authentication", async () => {
      vi.mocked(mockUserRepo.authenticate).mockRejectedValue(
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

      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);

      const result = await service.getUserById("user-123");

      expect(result).toBe(mockUser);
      expect(vi.mocked(mockUserRepo.findById)).toHaveBeenCalledWith("user-123");
    });

    it("should throw UserNotFoundError when user not found", async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

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

      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepo.update).mockResolvedValue(updatedUser);

      const result = await service.updateProfile("user-123", {
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
      expect(vi.mocked(mockUserRepo.update)).toHaveBeenCalled();
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