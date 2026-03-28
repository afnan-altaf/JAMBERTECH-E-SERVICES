// Email service - Resend integration se emails bhejna
// Uses Replit's Resend connector - no hardcoded API keys
import { Resend } from "resend";
import { logger } from "./logger";

// Resend client ko Replit connector se credentials leke banana
async function getResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    // Fallback: direct API key from env (for non-Replit environments)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("No Resend credentials found. Set RESEND_API_KEY or use Replit connector.");
    }
    return {
      client: new Resend(apiKey),
      fromEmail: process.env.FROM_EMAIL || "noreply@jambertech.com",
    };
  }

  // Replit connector se credentials lao
  const connectionSettings = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings?.settings?.api_key) {
    throw new Error("Resend not connected via Replit connector");
  }

  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: connectionSettings.settings.from_email || "noreply@jambertech.com",
  };
}

// 6-digit random OTP generate karna
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email verification OTP bhejana
export async function sendVerificationEmail(email: string, otp: string, name: string): Promise<void> {
  try {
    const { client, fromEmail } = await getResendClient();

    await client.emails.send({
      from: `JamberTech E-SERVICES <${fromEmail}>`,
      to: email,
      subject: "Verify Your Email - JamberTech E-SERVICES",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:30px;text-align:center;">
                      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">
                        JAMBER<span style="color:#7dd3fc;">TECH</span>
                      </h1>
                      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">E-SERVICES</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 30px;">
                      <h2 style="color:#e2e8f0;margin:0 0 10px;font-size:20px;">Hello, ${name}!</h2>
                      <p style="color:#94a3b8;margin:0 0 30px;font-size:15px;line-height:1.6;">
                        Thank you for registering with JamberTech E-SERVICES. Please use the OTP below to verify your email address.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:#0f172a;border:2px solid #0ea5e9;border-radius:10px;padding:24px;text-align:center;margin:0 0 30px;">
                        <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                        <p style="color:#0ea5e9;margin:0;font-size:42px;font-weight:700;letter-spacing:10px;">${otp}</p>
                      </div>
                      <p style="color:#94a3b8;margin:0 0 8px;font-size:14px;">
                        ⏰ This code expires in <strong style="color:#e2e8f0;">15 minutes</strong>.
                      </p>
                      <p style="color:#94a3b8;margin:0;font-size:14px;">
                        🔒 Do not share this code with anyone. JamberTech staff will never ask for your OTP.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#0f172a;padding:20px 30px;text-align:center;border-top:1px solid #1e293b;">
                      <p style="color:#475569;margin:0;font-size:12px;">
                        © 2026 JamberTech E-SERVICES. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logger.info({ email }, "Verification email sent");
  } catch (err) {
    logger.error({ err, email }, "Failed to send verification email");
    throw err;
  }
}

// Password reset OTP bhejana
export async function sendPasswordResetEmail(email: string, otp: string, name: string): Promise<void> {
  try {
    const { client, fromEmail } = await getResendClient();

    await client.emails.send({
      from: `JamberTech E-SERVICES <${fromEmail}>`,
      to: email,
      subject: "Reset Your Password - JamberTech E-SERVICES",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#ef4444,#f97316);padding:30px;text-align:center;">
                      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">
                        JAMBER<span style="color:#fde68a;">TECH</span>
                      </h1>
                      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Password Reset Request</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 30px;">
                      <h2 style="color:#e2e8f0;margin:0 0 10px;font-size:20px;">Hello, ${name}!</h2>
                      <p style="color:#94a3b8;margin:0 0 30px;font-size:15px;line-height:1.6;">
                        We received a request to reset your password. Use the OTP below to set a new password.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:#0f172a;border:2px solid #ef4444;border-radius:10px;padding:24px;text-align:center;margin:0 0 30px;">
                        <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Password Reset Code</p>
                        <p style="color:#ef4444;margin:0;font-size:42px;font-weight:700;letter-spacing:10px;">${otp}</p>
                      </div>
                      <p style="color:#94a3b8;margin:0 0 8px;font-size:14px;">
                        ⏰ This code expires in <strong style="color:#e2e8f0;">15 minutes</strong>.
                      </p>
                      <p style="color:#94a3b8;margin:0;font-size:14px;">
                        ⚠️ If you didn't request a password reset, please ignore this email. Your account is safe.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#0f172a;padding:20px 30px;text-align:center;border-top:1px solid #1e293b;">
                      <p style="color:#475569;margin:0;font-size:12px;">
                        © 2026 JamberTech E-SERVICES. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logger.info({ email }, "Password reset email sent");
  } catch (err) {
    logger.error({ err, email }, "Failed to send password reset email");
    throw err;
  }
}
