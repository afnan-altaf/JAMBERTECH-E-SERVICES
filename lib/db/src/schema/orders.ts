// Orders table - user ke orders track karte hain
import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { servicesTable } from "./services";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "in_progress",
  "completed",
  "partial",
  "canceled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  // Kis user ka order hai
  userId: integer("user_id").notNull().references(() => usersTable.id),
  // Kaunsi service order ki
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  // Provider se mila order ID (provider_order_id)
  providerOrderId: text("provider_order_id"),
  // Social media link ya URL jis pe order karna hai
  link: text("link").notNull(),
  quantity: integer("quantity").notNull(),
  // Charge jo user se deduct hua
  charge: numeric("charge", { precision: 10, scale: 4 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
