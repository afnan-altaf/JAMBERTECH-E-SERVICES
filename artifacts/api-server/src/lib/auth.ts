// Auth helper functions - JWT token banana aur verify karna
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// JWT secret - production mein environment variable se lena chahiye
const JWT_SECRET = process.env.JWT_SECRET || "jambertech-super-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Password hash karna
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Password verify karna
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT token banana
export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT token verify karna
export function verifyToken(token: string): { userId: number; role: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
}

// Request type extend karna user ke saath
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email: string;
        balance: string;
        role: string;
        emailVerified: boolean;
      };
    }
  }
}

// Middleware: Authentication check karna
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Authorization header se token nikaalna
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Database se fresh user data lena
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Request mein user attach karna
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (err) {
    req.log.warn({ err }, "Auth middleware failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware: Admin check karna
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// Optional auth - agar token hai to user set karo, nahi hai to bhi chalne do
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        role: user.role,
      };
    }
  } catch {
    // Token invalid hai to ignore karo
  }
  next();
}
