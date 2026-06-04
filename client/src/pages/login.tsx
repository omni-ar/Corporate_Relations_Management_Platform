import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Briefcase, Building2, BarChart3, Shield } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.ok) {
        toast({
          title: "Welcome back",
          description: "You have been signed in successfully.",
        });
        setLocation("/");
      } else {
        toast({
          title: "Sign in failed",
          description: result.message || "Invalid username or password",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Sign in failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
              T
            </div>
            <span className="text-lg font-semibold">TPO-Ops</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              Corporate Relations &<br />
              Placement Platform
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/70 max-w-md leading-relaxed">
              Streamline placement operations for your university. Track company drives,
              manage recruitment pipelines, and gain actionable insights — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
              <Briefcase className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Drive Management</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">Track placement pipelines end-to-end</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
              <Building2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Company Registry</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">Centralized recruiter database</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
              <BarChart3 className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Placement Analytics</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">CTC trends and conversion funnels</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
              <Shield className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Audit Trail</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">Complete traceability of all actions</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40">
          © 2026 TPO-Ops. Built for university placement offices.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                T
              </div>
              <span className="text-lg font-semibold">TPO-Ops</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9"
                  data-testid="input-username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  data-testid="input-password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Corporate Relations & Placement Platform
          </p>
        </div>
      </div>
    </div>
  );
}
