import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/store";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ListOrdered, 
  Settings, 
  Users, 
  LogOut, 
  Menu,
  X,
  Database,
  Box
} from "lucide-react";
import { useState, useEffect } from "react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { formatCurrency } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, token, setAuth, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Validate session
  const { data: meData, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false
    }
  });

  const logoutMutation = useLogout();

  useEffect(() => {
    if (meData) {
      setAuth(token!, meData);
    }
    if (isError || (!token && location !== "/login" && location !== "/register")) {
      logout();
      setLocation("/login");
    }
  }, [meData, isError, token, location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation("/login");
      }
    });
  };

  if (!user) return null; // Or a beautiful loading spinner

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, role: "user" },
    { name: "New Order", href: "/new-order", icon: ShoppingCart, role: "user" },
    { name: "Orders History", href: "/orders", icon: ListOrdered, role: "user" },
    
    // Admin only
    { name: "Admin Dashboard", href: "/admin", icon: Settings, role: "admin" },
    { name: "Providers", href: "/admin/providers", icon: Database, role: "admin" },
    { name: "Services", href: "/admin/services", icon: Box, role: "admin" },
    { name: "Manage Users", href: "/admin/users", icon: Users, role: "admin" },
    { name: "All Orders", href: "/admin/orders", icon: ListOrdered, role: "admin" },
  ];

  const visibleNavItems = navItems.filter(item => 
    item.role === "user" || (item.role === "admin" && user.role === "admin")
  );

  const NavLinks = () => (
    <>
      <div className="mb-8 px-6 hidden lg:block">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-8 h-8" />
          <h1 className="text-xl font-display font-bold text-foreground tracking-wider">JAMBER<span className="text-primary">TECH</span></h1>
        </div>
      </div>
      <nav className="space-y-2 flex-1 px-4">
        {visibleNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block">
              <div
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                  ${isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 ${isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
                <span className="font-medium relative z-10">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="glass-panel p-4 rounded-xl mb-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(user.balance)}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex selection:bg-primary/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-sidebar pt-8 z-20">
        <NavLinks />
      </aside>

      {/* Mobile Header & Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-6 h-6" />
          <h1 className="text-lg font-display font-bold">JAMBER<span className="text-primary">TECH</span></h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 flex flex-col pt-4 overflow-y-auto pb-20">
           <NavLinks />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 h-screen overflow-y-auto">
        <header className="hidden lg:flex h-20 items-center justify-between px-8 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Welcome back, {user.name}</h2>
            <p className="text-sm text-muted-foreground">Manage your SMM services efficiently.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
