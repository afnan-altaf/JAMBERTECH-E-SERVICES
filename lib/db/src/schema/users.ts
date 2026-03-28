// Users table - JamberTech panel ke users store karte hain
import { pgTable, text, serial, timestamp, numeric, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Role enum - user ya admin ho sakta hai
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Password hashed store hogi - kabhi plain text nahi
  password: text("password").notNull(),
  // Balance default 0 se shuru hoga
  balance: numeric("balance", { precision: 10, scale: 4 }).notNull().default("0"),
  role: userRoleEnum("role").notNull().default("user"),
  // Email verified hai ya nahi - OTP se verify hone ke baad true hoga
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
