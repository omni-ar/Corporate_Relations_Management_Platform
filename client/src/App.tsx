import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VendorsPage from "@/pages/vendors";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { queryClient } from "./lib/queryClient";

function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/status", { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 30000,
    retry: false,
  });
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data, isLoading } = useAuthStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100">
        <div className="text-sky-600">Loading...</div>
      </div>
    );
  }

  if (!data?.authenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function LoginRoute() {
  const { data, isLoading } = useAuthStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100">
        <div className="text-sky-600">Loading...</div>
      </div>
    );
  }

  if (data?.authenticated) {
    return <Redirect to="/" />;
  }

  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/">
        <ProtectedRoute component={VendorsPage} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
