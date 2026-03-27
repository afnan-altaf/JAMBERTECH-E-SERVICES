import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthPage } from "@/pages/auth";
import { Dashboard } from "@/pages/dashboard";
import { NewOrder } from "@/pages/new-order";
import { OrdersHistory } from "@/pages/orders";
import { AdminProviders } from "@/pages/admin-providers";
import { AdminServices } from "@/pages/admin-services";
import { AdminUsers } from "@/pages/admin-users";
import { AppLayout } from "@/components/layout";
import { useAuthStore } from "@/lib/store";

const queryClient = new QueryClient();

// Simple role guard
const AdminRoute = ({ component: Component }: { component: any }) => {
  const { user } = useAuthStore();
  if (user?.role !== "admin") return <Redirect to="/" />;
  return <Component />;
};

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/new-order">
        <AppLayout><NewOrder /></AppLayout>
      </Route>
      <Route path="/orders">
        <AppLayout><OrdersHistory /></AppLayout>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AppLayout><AdminRoute component={Dashboard} /></AppLayout>
      </Route>
      <Route path="/admin/providers">
        <AppLayout><AdminRoute component={AdminProviders} /></AppLayout>
      </Route>
      <Route path="/admin/services">
        <AppLayout><AdminRoute component={AdminServices} /></AppLayout>
      </Route>
      <Route path="/admin/users">
        <AppLayout><AdminRoute component={AdminUsers} /></AppLayout>
      </Route>
      <Route path="/admin/orders">
        <AppLayout><AdminRoute component={OrdersHistory} /></AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
