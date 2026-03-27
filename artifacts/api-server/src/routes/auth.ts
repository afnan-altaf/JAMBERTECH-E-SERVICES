// Auth routes - register, login, logout, me
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../lib/auth";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// POST /auth/register - naya user banana
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  // Check karo kya email already exists hai
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Password hash karo
  const hashedPassword = await hashPassword(password);

  // User create karo
  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashedPassword,
      balance: "0",
      role: "user",
    })
    .returning();

  // JWT token banao
  const token = signToken(user.id, user.role);

  req.log.info({ userId: user.id }, "New user registered");

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: parseFloat(user.balance),
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  });
});

// POST /auth/login - login karna
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  // User dhundo by email
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Password verify karo
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Token banao
  const token = signToken(user.id, user.role);

  req.log.info({ userId: user.id }, "User logged in");

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: parseFloat(user.balance),
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  });
});

// POST /auth/logout - logout karna
router.post("/auth/logout", async (req, res): Promise<void> => {
  // JWT stateless hai, client side se token delete karna hoga
  req.log.info("User logged out");
  res.json({ message: "Logged out successfully" });
});

// GET /auth/me - current user ka data lena
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fresh data DB se lao
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    balance: parseFloat(user.balance),
    role: user.role,
    createdAt: user.createdAt,
  });
});

export default router;
