import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock,
  LogOut,
  Star,
  TrendingUp,
  AlertTriangle,
  Users,
  Package,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

type Vendor = {
  id: string;
  vendorName: string;
  category: string;
  productType: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  priceRange: string;
  leadTimeDays: number;
  paymentTerms: string;
  branding: string;
  qualityRating: string;
  approved: boolean;
  lastOrder: string | null;
  performance: string;
  remarks: string;
};

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function KPICard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  accent = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-stat rounded-xl p-5 ${accent ? "ring-2 ring-primary/20" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold title-serif">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`stat-icon-gradient rounded-lg p-3 ${accent ? "bg-primary/10" : ""}`}>
          <Icon className={`size-6 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <TrendingUp
            className={`size-4 ${
              trend === "up"
                ? "text-emerald-500"
                : trend === "down"
                  ? "text-rose-500 rotate-180"
                  : "text-muted-foreground"
            }`}
          />
          <span
            className={`text-xs ${
              trend === "up"
                ? "text-emerald-600"
                : trend === "down"
                  ? "text-rose-600"
                  : "text-muted-foreground"
            }`}
          >
            {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["auth-status"] });
        setLocation("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json() as Promise<Vendor[]>;
    },
  });

  const stats = useMemo(() => {
    const total = vendors.length;
    const approved = vendors.filter((v) => v.approved).length;
    const avgQuality =
      vendors.reduce((sum, v) => sum + parseFloat(v.qualityRating || "0"), 0) / (total || 1);
    const avgLeadTime =
      vendors.reduce((sum, v) => sum + (v.leadTimeDays || 0), 0) / (total || 1);

    const categoryData = Object.entries(
      vendors.reduce(
        (acc, v) => {
          acc[v.category] = (acc[v.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([name, value]) => ({ name, value }));

    const performanceData = [
      { name: "Excellent", count: vendors.filter((v) => v.performance === "Excellent").length },
      { name: "Good", count: vendors.filter((v) => v.performance === "Good").length },
      { name: "Watch", count: vendors.filter((v) => v.performance === "Watch").length },
      { name: "At Risk", count: vendors.filter((v) => v.performance === "At Risk").length },
    ];

    const cityData = Object.entries(
      vendors.reduce(
        (acc, v) => {
          acc[v.city] = (acc[v.city] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    )
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const qualityByCategory = Object.entries(
      vendors.reduce(
        (acc, v) => {
          if (!acc[v.category]) acc[v.category] = { sum: 0, count: 0 };
          acc[v.category].sum += parseFloat(v.qualityRating || "0");
          acc[v.category].count += 1;
          return acc;
        },
        {} as Record<string, { sum: number; count: number }>,
      ),
    ).map(([category, data]) => ({
      category,
      rating: data.count > 0 ? data.sum / data.count : 0,
    }));

    const atRiskVendors = vendors.filter(
      (v) => v.performance === "At Risk" || v.performance === "Watch",
    );

    const pendingApproval = vendors.filter((v) => !v.approved);

    return {
      total,
      approved,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(0) : "0",
      avgQuality,
      avgLeadTime,
      categoryData,
      performanceData,
      cityData,
      qualityByCategory,
      atRiskVendors,
      pendingApproval,
    };
  }, [vendors]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-hero-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-vendors">
                <ArrowLeft className="size-4" />
                Back to Vendors
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold title-serif sm:text-4xl" data-testid="text-dashboard-title">
              Performance <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="mt-2 text-muted-foreground" data-testid="text-dashboard-subtitle">
              Key performance indicators and analytics for your vendor network
            </p>
          </motion.div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            title="Total Vendors"
            value={stats.total}
            icon={Users}
            subtitle="Active in database"
            accent
          />
          <KPICard
            title="Approval Rate"
            value={`${stats.approvalRate}%`}
            icon={BadgeCheck}
            subtitle={`${stats.approved} of ${stats.total} approved`}
            trend={parseInt(stats.approvalRate) >= 80 ? "up" : "neutral"}
          />
          <KPICard
            title="Avg Quality Rating"
            value={stats.avgQuality.toFixed(1)}
            icon={Star}
            subtitle="Out of 5.0"
            trend={stats.avgQuality >= 4.2 ? "up" : stats.avgQuality < 3.5 ? "down" : "neutral"}
          />
          <KPICard
            title="Avg Lead Time"
            value={`${Math.round(stats.avgLeadTime)}d`}
            icon={Clock}
            subtitle="Days to delivery"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4" data-testid="text-chart-category">Vendors by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4" data-testid="text-chart-performance">Performance Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.performanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4" data-testid="text-chart-cities">Vendors by City</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.cityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4" data-testid="text-chart-quality">Quality Rating by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.qualityByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip formatter={(value: number) => value.toFixed(2)} />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-panel rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="size-5 text-amber-500" />
              <h3 className="text-lg font-semibold" data-testid="text-alert-atrisk">Vendors Needing Attention</h3>
            </div>
            {stats.atRiskVendors.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All vendors are performing well!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.atRiskVendors.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  >
                    <div>
                      <p className="font-medium text-sm">{v.vendorName}</p>
                      <p className="text-xs text-muted-foreground">{v.city}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        v.performance === "At Risk"
                          ? "bg-rose-500/15 text-rose-700"
                          : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {v.performance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-panel rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="size-5 text-sky-500" />
              <h3 className="text-lg font-semibold" data-testid="text-alert-pending">Pending Approvals</h3>
            </div>
            {stats.pendingApproval.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All vendors are approved!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.pendingApproval.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-sky-500/5 border border-sky-500/20"
                  >
                    <div>
                      <p className="font-medium text-sm">{v.vendorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.category} • {v.city}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-700">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
