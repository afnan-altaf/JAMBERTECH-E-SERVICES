// OTPs table - email verification aur password reset ke liye OTP codes store karna
import { pgTable, text, serial, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// OTP ka type - verify email ya reset password
export const otpTypeEnum = pgEnum("otp_type", ["email_verification", "password_reset"]);

export const otpsTable = pgTable("otps", {
  id: serial("id").primaryKey(),
  // Kaunse email pe OTP bheja gaya
  email: text("email").notNull(),
  // 6-digit OTP code
  code: text("code").notNull(),
  type: otpTypeEnum("type").notNull(),
  // OTP use ho gaya ya nahi
  used: boolean("used").notNull().default(false),
  // OTP 15 minute mein expire ho jaata hai
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtpSchema = createInsertSchema(otpsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type Otp = typeof otpsTable.$inferSelect;
