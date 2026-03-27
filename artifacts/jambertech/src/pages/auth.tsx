import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from "lucide-react";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (isLogin) {
      loginMutation.mutate({ data: { email: formData.email, password: formData.password } }, {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          setLocation("/");
        },
        onError: (err: any) => {
          setErrorMsg(err?.data?.error || "Login failed. Check credentials.");
        }
      });
    } else {
      registerMutation.mutate({ data: formData }, {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          setLocation("/");
        },
        onError: (err: any) => {
          setErrorMsg(err?.data?.error || "Registration failed.");
        }
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel - Image/Branding */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
            alt="Abstract fintech background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-lg px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-4 mb-8">
              <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-12 h-12" />
              <h1 className="text-4xl font-display font-bold text-white tracking-wider">JAMBER<span className="text-primary">TECH</span></h1>
            </div>
            <h2 className="text-5xl font-display font-bold text-white leading-tight mb-6">
              The Premium <br/>
              <span className="text-gradient-primary">SMM Reseller</span> Panel.
            </h2>
            <p className="text-lg text-muted-foreground">
              Automate your social media growth with our high-speed, reliable, and deeply integrated API routing system.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl"
        >
          <div className="mb-8">
            <h3 className="text-3xl font-display font-bold text-foreground mb-2">
              {isLogin ? "Welcome back" : "Create an account"}
            </h3>
            <p className="text-muted-foreground">
              {isLogin ? "Enter your credentials to access your dashboard." : "Join us to start automating your growth."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    required 
                    className="pl-12" 
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  required 
                  type="email" 
                  className="pl-12" 
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-foreground">Password</label>
                {isLogin && <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  required 
                  type="password" 
                  className="pl-12" 
                  placeholder="••••••••"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center">
                {errorMsg}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg mt-4 group" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : (
                <>
                  {isLogin ? "Sign In" : "Register"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-primary font-medium hover:underline focus:outline-none"
            >
              {isLogin ? "Sign up now" : "Sign in instead"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
