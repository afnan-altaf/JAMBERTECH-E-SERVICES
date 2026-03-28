import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, User as UserIcon, ArrowRight, Loader2,
  ShieldCheck, KeyRound, RefreshCw, ChevronLeft
} from "lucide-react";

// Har API call ke liye helper — window.location.origin use karo absolute URL ke liye
async function apiPost(path: string, body: object) {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error("Network error:", networkErr);
    throw { error: "Network error. Please check your connection and try again." };
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", res.status, text.slice(0, 300));
    throw { error: `Server error (${res.status}). Please try again.` };
  }

  if (!res.ok) throw data;
  return data;
}

// 4 screens: login | register | verify-otp | forgot-password | reset-password
type Screen = "login" | "register" | "verify-otp" | "forgot-password" | "reset-password";

export function AuthPage() {
  const [screen, setScreen] = useState<Screen>("login");
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reset = () => { setError(""); setSuccess(""); };

  // ─── REGISTER ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      await apiPost("/auth/register", { name, email, password });
      setSuccess("OTP sent to your email! Please check your inbox.");
      setScreen("verify-otp");
    } catch (err: any) {
      const msg = err?.error || "Registration failed.";
      if (err?.requiresVerification) {
        setError(msg);
        setScreen("verify-otp");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── VERIFY OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      const data = await apiPost("/auth/verify-email", { email, otp });
      setAuth(data.token, data.user);
      setLocation("/");
    } catch (err: any) {
      setError(err?.error || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ─── RESEND OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    reset();
    setLoading(true);
    try {
      await apiPost("/auth/resend-otp", { email });
      setSuccess("New OTP sent to your email!");
    } catch (err: any) {
      setError(err?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      const data = await apiPost("/auth/login", { email, password });
      setAuth(data.token, data.user);
      setLocation("/");
    } catch (err: any) {
      if (err?.requiresVerification) {
        setError("Please verify your email first. A new OTP has been sent.");
        setScreen("verify-otp");
      } else {
        setError(err?.error || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      const data = await apiPost("/auth/forgot-password", { email });
      setSuccess(data.message);
      setScreen("reset-password");
    } catch (err: any) {
      setError(err?.error || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // ─── RESET PASSWORD ──────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      const data = await apiPost("/auth/reset-password", { email, otp, newPassword });
      setSuccess(data.message);
      setTimeout(() => { setScreen("login"); setSuccess(""); setOtp(""); setNewPassword(""); }, 2000);
    } catch (err: any) {
      setError(err?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP INPUT boxes UI ─────────────────────────────────────────────────────
  const OtpInput = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground ml-1">6-Digit OTP Code</label>
      <div className="relative">
        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          required
          className="pl-12 text-center text-2xl font-bold tracking-[0.5em] h-14"
          placeholder="000000"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
    </div>
  );

  const screenConfig: Record<Screen, { title: string; subtitle: string }> = {
    login: { title: "Welcome back", subtitle: "Enter your credentials to access your dashboard." },
    register: { title: "Create an account", subtitle: "Join us to start automating your growth." },
    "verify-otp": { title: "Check your email", subtitle: `We sent a 6-digit OTP to ${email}` },
    "forgot-password": { title: "Forgot password?", subtitle: "Enter your email and we'll send you a reset code." },
    "reset-password": { title: "Reset password", subtitle: `Enter the OTP sent to ${email} and your new password.` },
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
            alt="Background"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-lg px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-4 mb-8">
              <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-12 h-12" />
              <h1 className="text-4xl font-display font-bold text-white tracking-wider">
                JAMBER<span className="text-primary">TECH</span>
              </h1>
            </div>
            <h2 className="text-5xl font-display font-bold text-white leading-tight mb-6">
              The Premium <br />
              <span className="text-gradient-primary">SMM Reseller</span> Panel.
            </h2>
            <p className="text-lg text-muted-foreground">
              Automate your social media growth with our high-speed, reliable, and deeply integrated API routing system.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl"
          >
            {/* Back button for non-login screens */}
            {screen !== "login" && screen !== "register" && (
              <button
                onClick={() => { setScreen("login"); reset(); setOtp(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to login
              </button>
            )}

            <div className="mb-8">
              <h3 className="text-3xl font-display font-bold text-foreground mb-2">
                {screenConfig[screen].title}
              </h3>
              <p className="text-muted-foreground text-sm">{screenConfig[screen].subtitle}</p>
            </div>

            {/* ── ERROR / SUCCESS BANNERS ── */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                {success}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {screen === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="email" className="pl-12" placeholder="name@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <button type="button" onClick={() => { setScreen("forgot-password"); reset(); }}
                      className="text-xs text-primary hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="password" className="pl-12" placeholder="••••••••" minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base mt-4 group" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <> Sign In <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> </>
                  )}
                </Button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {screen === "register" && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required className="pl-12" placeholder="John Doe"
                      value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="email" className="pl-12" placeholder="name@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="password" className="pl-12" placeholder="••••••••" minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base mt-4 group" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <> Create Account <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> </>
                  )}
                </Button>
              </form>
            )}

            {/* ── VERIFY OTP FORM ── */}
            {screen === "verify-otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpInput />
                <Button type="submit" className="w-full h-12 text-base group" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <> <ShieldCheck className="mr-2 h-5 w-5" /> Verify Email </>
                  )}
                </Button>
                <button type="button" onClick={handleResendOtp} disabled={loading}
                  className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" /> Resend OTP
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {screen === "forgot-password" && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="email" className="pl-12" placeholder="name@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base group" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <> Send Reset OTP <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> </>
                  )}
                </Button>
              </form>
            )}

            {/* ── RESET PASSWORD FORM ── */}
            {screen === "reset-password" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <OtpInput />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input required type="password" className="pl-12" placeholder="••••••••" minLength={6}
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base group" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <> <KeyRound className="mr-2 h-5 w-5" /> Reset Password </>
                  )}
                </Button>
                <button type="button" onClick={handleForgotPassword} disabled={loading}
                  className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" /> Resend OTP
                </button>
              </form>
            )}

            {/* ── SWITCH LOGIN / REGISTER ── */}
            {(screen === "login" || screen === "register") && (
              <div className="mt-8 text-center text-sm text-muted-foreground">
                {screen === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setScreen(screen === "login" ? "register" : "login"); reset(); }}
                  className="text-primary font-medium hover:underline focus:outline-none"
                >
                  {screen === "login" ? "Sign up now" : "Sign in instead"}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
