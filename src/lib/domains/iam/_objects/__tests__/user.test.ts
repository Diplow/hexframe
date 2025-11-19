import { describe, it, expect } from "vitest";
import { User } from "~/lib/domains/iam/_objects/user";

describe("User Entity", () => {
  const validProps = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  describe("create", () => {
    it("should create a valid user", () => {
      const user = User.create(validProps);

      expect(user.id).toBe(validProps.id);
      expect(user.email).toBe(validProps.email);
      expect(user.name).toBe(validProps.name);
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("should lowercase email addresses", () => {
      const user = User.create({
        ...validProps,
        email: "Test@EXAMPLE.com",
      });

      expect(user.email).toBe("test@example.com");
    });

    it("should trim name", () => {
      const user = User.create({
        ...validProps,
        name: "  Test User  ",
      });

      expect(user.name).toBe("Test User");
    });

    it("should throw error for invalid email", () => {
      expect(() =>
        User.create({
          ...validProps,
          email: "invalid-email",
        })
      ).toThrow("Invalid email");
    });

    it("should throw error for missing ID", () => {
      expect(() =>
        User.create({
          ...validProps,
          id: "",
        })
      ).toThrow("User ID is required");
    });

    it("should throw error for missing name", () => {
      expect(() =>
        User.create({
          ...validProps,
          name: "",
        })
      ).toThrow("User name is required");
    });
  });

  describe("displayName", () => {
    it("should return name when available", () => {
      const user = User.create(validProps);
      expect(user.displayName).toBe("Test User");
    });

    it("should return email prefix when name is not available", () => {
      const user = User.create({
        ...validProps,
        name: undefined,
      });
      expect(user.displayName).toBe("test");
    });
  });

  describe("updateProfile", () => {
    it("should update name", () => {
      const user = User.create(validProps);
      const updated = user.updateProfile({ name: "New Name" });

      expect(updated.name).toBe("New Name");
      expect(updated.id).toBe(user.id);
      expect(updated.email).toBe(user.email);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        user.updatedAt.getTime()
      );
    });

    it("should update image", () => {
      const user = User.create(validProps);
      const updated = user.updateProfile({ image: "https://example.com/avatar.jpg" });

      expect(updated.image).toBe("https://example.com/avatar.jpg");
    });

    it("should trim updated name", () => {
      const user = User.create(validProps);
      const updated = user.updateProfile({ name: "  New Name  " });

      expect(updated.name).toBe("New Name");
    });

    it("should return same instance if no changes", () => {
      const user = User.create({ ...validProps, emailVerified: true });
      const updated = user.verifyEmail();

      expect(updated).toBe(user);
    });
  });

  describe("verifyEmail", () => {
    it("should mark email as verified", () => {
      const user = User.create(validProps);
      expect(user.emailVerified).toBe(false);

      const verified = user.verifyEmail();
      expect(verified.emailVerified).toBe(true);
      expect(verified.updatedAt.getTime()).toBeGreaterThanOrEqual(
        user.updatedAt.getTime()
      );
    });

    it("should not change if already verified", () => {
      const user = User.create({ ...validProps, emailVerified: true });
      const verified = user.verifyEmail();

      expect(verified).toBe(user); // Same instance
    });
  });

  describe("toJSON", () => {
    it("should return all properties", () => {
      const user = User.create(validProps);
      const json = user.toJSON();

      expect(json).toMatchObject({
        id: validProps.id,
        email: validProps.email,
        name: validProps.name,
        emailVerified: false,
      });
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });
});