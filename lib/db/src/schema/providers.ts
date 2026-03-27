// Providers table - API providers jaise Socialsphare aur MK SMM Panel
import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerStatusEnum = pgEnum("provider_status", ["active", "inactive"]);

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Provider ka API URL, e.g. https://socialsphare.com/api/v2
  apiUrl: text("api_url").notNull(),
  // Provider ka secret API key - sensitive data hai
  apiKey: text("api_key").notNull(),
  status: providerStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProviderSchema = createInsertSchema(providersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providersTable.$inferSelect;
