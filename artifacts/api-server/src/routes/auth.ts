// Auth routes - register (with OTP), verify email, login, forgot/reset password
import { Router, type IRouter } from "express";
import { db, usersTable, otpsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail, generateOtp } from "../lib/email";
import {
  RegisterBody,
  LoginBody,
  VerifyEmailBody,
  ResendOtpBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper: user object format karna response ke liye
function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: parseFloat(user.balance),
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

// Helper: naya OTP create karna aur DB mein save karna
async function createAndSaveOtp(email: string, type: "email_verification" | "password_reset"): Promise<string> {
  // Purane unused OTPs delete karo is email+type ke liye
  await db
    .delete(otpsTable)
    .where(and(eq(otpsTable.email, email), eq(otpsTable.type, type)));

  const otp = generateOtp();
  // OTP 15 minute baad expire hoga
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(otpsTable).values({
    email,
    code: otp,
    type,
    used: false,
    expiresAt,
  });

  return otp;
}

// POST /auth/register - naya user banana (OTP verification ke saath)
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  // Check karo kya email already exists hai
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (existing) {
    // Agar email hai aur verified nahi - phir se OTP bhejo
    if (!existing.emailVerified) {
      const otp = await createAndSaveOtp(email, "email_verification");
      try {
        await sendVerificationEmail(email, otp, existing.name);
      } catch (emailErr) {
        req.log.warn({ emailErr }, "Could not resend verification email");
      }
      res.status(409).json({
        error: "Email already registered but not verified. A new OTP has been sent.",
        requiresVerification: true,
      });
      return;
    }
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Password hash karo
  const hashedPassword = await hashPassword(password);

  // User create karo (emailVerified = false)
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, password: hashedPassword, balance: "0", role: "user", emailVerified: false })
    .returning();

  // OTP generate karo aur email bhejo
  const otp = await createAndSaveOtp(email, "email_verification");
  try {
    await sendVerificationEmail(email, otp, name);
    req.log.info({ userId: user.id }, "Verification email sent after registration");
  } catch (emailErr) {
    req.log.error({ emailErr }, "Failed to send verification email");
    // Email fail ho to bhi registration success maano - user baad mein resend kar sakta hai
  }

  res.status(201).json({
    message: "Registration successful! Please check your email for the OTP verification code.",
    requiresVerification: true,
    email,
  });
});

// POST /auth/verify-email - OTP se email verify karna aur token milna
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, otp } = parsed.data;
  const now = new Date();

  // Valid OTP dhundo
  const [otpRecord] = await db
    .select()
    .from(otpsTable)
    .where(
      and(
        eq(otpsTable.email, email),
        eq(otpsTable.code, otp),
        eq(otpsTable.type, "email_verification"),
        eq(otpsTable.used, false),
        gt(otpsTable.expiresAt, now)
      )
    );

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
    return;
  }

  // OTP use kar lo - mark as used
  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otpRecord.id));

  // User ka email verified mark karo
  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // JWT token banao - ab user login hai
  const token = signToken(user.id, user.role);

  req.log.info({ userId: user.id }, "Email verified successfully");

  res.json({ user: formatUser(user), token });
});

// POST /auth/resend-otp - verification OTP dobara bhejana
router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const parsed = ResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  // User dhundo
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    // Security ke liye: batao mat keh user exists hai ya nahi
    res.json({ message: "If this email is registered, an OTP has been sent." });
    return;
  }

  if (user.emailVerified) {
    res.status(400).json({ error: "Email is already verified." });
    return;
  }

  const otp = await createAndSaveOtp(email, "email_verification");
  try {
    await sendVerificationEmail(email, otp, user.name);
    req.log.info({ email }, "OTP resent");
  } catch (emailErr) {
    req.log.error({ emailErr }, "Failed to resend OTP");
    res.status(500).json({ error: "Failed to send email. Please try again later." });
    return;
  }

  res.json({ message: "Verification OTP has been sent to your email." });
});

// POST /auth/login - login karna (sirf verified users)
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  // User dhundo by email
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

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

  // Email verified check karo
  if (!user.emailVerified) {
    // Phir se OTP bhejo
    const otp = await createAndSaveOtp(email, "email_verification");
    try {
      await sendVerificationEmail(email, otp, user.name);
    } catch (_) {}
    res.status(403).json({
      error: "Please verify your email before logging in. A new OTP has been sent.",
      requiresVerification: true,
      email,
    });
    return;
  }

  // Token banao
  const token = signToken(user.id, user.role);
  req.log.info({ userId: user.id }, "User logged in");

  res.json({ user: formatUser(user), token });
});

// POST /auth/forgot-password - password reset OTP bhejana
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  // User dhundo
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Security ke liye: hamesha same message do
  if (!user) {
    res.json({ message: "If this email is registered, a password reset OTP has been sent." });
    return;
  }

  // OTP generate karo aur email bhejo
  const otp = await createAndSaveOtp(email, "password_reset");
  try {
    await sendPasswordResetEmail(email, otp, user.name);
    req.log.info({ email }, "Password reset OTP sent");
  } catch (emailErr) {
    req.log.error({ emailErr }, "Failed to send password reset email");
    res.status(500).json({ error: "Failed to send email. Please try again later." });
    return;
  }

  res.json({ message: "Password reset OTP has been sent to your email." });
});

// POST /auth/reset-password - OTP se password reset karna
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, otp, newPassword } = parsed.data;
  const now = new Date();

  // Valid OTP dhundo
  const [otpRecord] = await db
    .select()
    .from(otpsTable)
    .where(
      and(
        eq(otpsTable.email, email),
        eq(otpsTable.code, otp),
        eq(otpsTable.type, "password_reset"),
        eq(otpsTable.used, false),
        gt(otpsTable.expiresAt, now)
      )
    );

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
    return;
  }

  // OTP use kar lo
  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otpRecord.id));

  // Naya password hash karo
  const hashedPassword = await hashPassword(newPassword);

  // Password update karo
  const [user] = await db
    .update(usersTable)
    .set({ password: hashedPassword })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  req.log.info({ email }, "Password reset successfully");
  res.json({ message: "Password has been reset successfully. You can now log in." });
});

// POST /auth/logout - logout karna
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.log.info("User logged out");
  res.json({ message: "Logged out successfully" });
});

// GET /auth/me - current user ka data lena
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
