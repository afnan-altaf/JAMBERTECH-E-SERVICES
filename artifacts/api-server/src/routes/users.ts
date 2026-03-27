// Users routes - admin ke liye user management
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { AddBalanceBody } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /users - saare users list karna (Admin only)
router.get("/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      balance: usersTable.balance,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  // Password exclude karo response se
  const usersFormatted = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    balance: parseFloat(u.balance),
    role: u.role,
    createdAt: u.createdAt,
  }));

  res.json(usersFormatted);
});

// PATCH /users/balance - user ka balance add karna (Admin only)
router.patch("/users/balance", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = AddBalanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, amount } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "Amount must be greater than 0" });
    return;
  }

  // User dhundo
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Balance add karo - current balance + amount
  const [updated] = await db
    .update(usersTable)
    .set({
      balance: sql`${usersTable.balance} + ${amount}`,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  req.log.info({ userId, amount }, "Balance added to user");

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    balance: parseFloat(updated.balance),
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

export default router;
