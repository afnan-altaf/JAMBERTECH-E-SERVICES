// Services table - provider se sync ki gayi services + hamare custom rates
import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";

export const serviceStatusEnum = pgEnum("service_status", ["active", "inactive"]);

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  // Provider ke saath ki unique service ID (provider ki taraf se)
  providerServiceId: text("provider_service_id").notNull(),
  // Kaunse provider se aai hai ye service
  providerId: integer("provider_id").notNull().references(() => providersTable.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull().default("Default"),
  // Provider ka original rate (uski currency/format mein)
  originalRate: numeric("original_rate", { precision: 10, scale: 4 }).notNull(),
  // Hamara sell rate: original_rate + (original_rate * 0.035)
  sellRate: numeric("sell_rate", { precision: 10, scale: 4 }).notNull(),
  min: integer("min").notNull().default(10),
  max: integer("max").notNull().default(10000),
  status: serviceStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
