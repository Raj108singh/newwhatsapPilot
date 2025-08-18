import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User, LoginCredentials } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "whatsapp-pro-secret-key-2025";
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Verify password by username (for current password verification)
  async verifyPasswordByUsername(username: string, password: string): Promise<boolean> {
    const user = await storage.getUserByUsername(username);
    if (!user) return false;
    return await bcrypt.compare(password, user.password);
  }

  // Generate JWT token
  generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  }

  // Verify JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Initialize default admin user
  async initializeDefaultUser(): Promise<void> {
    try {
      const existingAdmin = await storage.getUserByUsername("admin");
      
      if (!existingAdmin) {
        const hashedPassword = await this.hashPassword("admin123");
        await storage.createUser({
          username: "admin",
          password: hashedPassword,
          email: "admin@whatsapppro.com",
          name: "Administrator",
          role: "admin",
          isActive: true,
        });
        console.log("Default admin user created: username=admin, password=admin123");
      }
    } catch (error) {
      console.error("Error initializing default user:", error);
    }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user) {
        return {
          success: false,
          message: "Invalid username or password",
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          message: "Account is deactivated. Please contact administrator.",
        };
      }

      const isPasswordValid = await this.verifyPassword(credentials.password, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid username or password",
        };
      }

      // Update last login
      await storage.updateUser(user.id, {
        lastLogin: new Date(),
      });

      // Generate token
      const token = this.generateToken(user);

      // Create session
      await storage.createUserSession({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "An error occurred during login",
      };
    }
  }

  // Get user from token
  async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = this.verifyToken(token);
      
      if (!decoded) {
        return null;
      }

      // Check if session exists and is active
      const session = await storage.getUserSession(token);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      const user = await storage.getUser(decoded.id);
      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
      };
    } catch (error) {
      console.error("Error getting user from token:", error);
      return null;
    }
  }

  // Logout user
  async logout(token: string): Promise<boolean> {
    try {
      return await storage.deleteUserSession(token);
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  // Update user password
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await storage.updateUser(userId, { password: hashedPassword });
  }

  // Update user profile
  async updateUserProfile(userId: string, profileData: { name: string; email: string; username: string }): Promise<User | null> {
    const updatedUser = await storage.updateUser(userId, profileData);
    return updatedUser || null;
  }

  // Find user by username or email (for checking duplicates)
  async findUserByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    try {
      const userByUsername = await storage.getUserByUsername(username);
      if (userByUsername) return userByUsername;

      // Check by email using getAllUsers since getUserByEmail doesn't exist
      const allUsers = await storage.getUsers();
      const userByEmail = allUsers.find(u => u.email === email);
      if (userByEmail) return userByEmail;

      return null;
    } catch (error) {
      return null;
    }
  }

  // Middleware to check authentication
  async authenticate(token: string): Promise<AuthUser | null> {
    if (!token) {
      return null;
    }

    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    return await this.getUserFromToken(cleanToken);
  }
}

export const authService = new AuthService();