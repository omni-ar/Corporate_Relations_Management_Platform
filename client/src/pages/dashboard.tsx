import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";
import {
  Building2,
  Briefcase,
  TrendingUp,
  IndianRupee,
  Calendar,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";

function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      const res = await authFetch("/api/analytics/overview");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });
}

function useAnalyticsIndustry() {
  return useQuery({
    queryKey: ["analytics", "industry"],
    queryFn: async () => {
      const res = await authFetch("/api/analytics/industry");
      if (!res.ok) throw new Error("Failed to fetch industry data");
      return res.json();
    },
  });
}

function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await authFetch("/api/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });
}

function useDrives() {
  return useQuery({
    queryKey: ["drives"],
    queryFn: async () => {
      const res = await authFetch("/api/drives");
      if (!res.ok) throw new Error("Failed to fetch drives");
      return res.json();
    },
  });
}

function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await authFetch("/api/audit-logs");
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });
}

function KPICard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PIPELINE_STAGES = [
  "CONTACTED",
  "INTERESTED",
  "PPT_SCHEDULED",
  "OA_SCHEDULED",
  "INTERVIEW_SCHEDULED",
  "COMPLETED",
];

const STAGE_LABELS: Record<string, string> = {
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PPT_SCHEDULED: "PPT",
  OA_SCHEDULED: "OA",
  INTERVIEW_SCHEDULED: "Interview",
  COMPLETED: "Completed",
};

const ACTION_LABELS: Record<string, string> = {
  DRIVE_CREATED: "Drive created",
  STATUS_CHANGE: "Status changed",
  DRIVE_UPDATED: "Drive updated",
  DRIVE_DELETED: "Drive deleted",
};

function formatTimeAgo(ts: string | null): string {
  if (!ts) return "";
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { data: overview } = useAnalyticsOverview();
  const { data: industryData = [] } = useAnalyticsIndustry();
  const { data: companiesData = [] } = useCompanies();
  const { data: drivesData = [] } = useDrives();
  const { data: auditData = [] } = useAuditLogs();

  const activeDrives = drivesData.filter(
    (d: any) => d.status !== "COMPLETED" && d.status !== "CANCELLED"
  );

  // Upcoming drives (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDrives = drivesData
    .filter((d: any) => {
      if (!d.driveDate) return false;
      const driveDate = new Date(d.driveDate);
      return driveDate >= now && driveDate <= weekFromNow;
    })
    .sort((a: any, b: any) => new Date(a.driveDate).getTime() - new Date(b.driveDate).getTime())
    .slice(0, 5);

  // Funnel data
  const funnel = overview?.funnel || {};

  // Pipeline summary
  const pipelineCounts = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: drivesData.filter((d: any) => d.status === stage).length,
  }));

  const avgCtc = overview?.ctc?.avgCtc ? Math.round(Number(overview.ctc.avgCtc)) : 0;
  const highestCtc = overview?.ctc?.highestCtc ? Number(overview.ctc.highestCtc) : 0;

  // Recent activity (last 8 audit logs)
  const recentActivity = auditData.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Placement operations overview and key metrics.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Companies"
          value={companiesData.length}
          icon={Building2}
          description="Registered in system"
        />
        <KPICard
          title="Active Drives"
          value={activeDrives.length}
          icon={Briefcase}
          description={`${drivesData.length} total drives`}
        />
        <KPICard
          title="Average CTC"
          value={avgCtc ? `₹${(avgCtc / 100000).toFixed(1)}L` : "—"}
          icon={TrendingUp}
          description="Across completed drives"
        />
        <KPICard
          title="Highest Package"
          value={highestCtc ? `₹${(highestCtc / 100000).toFixed(1)}L` : "—"}
          icon={IndianRupee}
          description="Maximum offered CTC"
        />
      </div>

      {/* Pipeline summary + Upcoming drives */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Drive Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pipelineCounts.map((item, i) => (
                <div key={item.stage} className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center rounded-lg border border-border px-4 py-2.5 min-w-[80px]">
                    <span className="text-xl font-semibold">{item.count}</span>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  {i < pipelineCounts.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming drives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Drives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDrives.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No drives scheduled in the next 7 days.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDrives.map((drive: any) => {
                  const company = companiesData.find((c: any) => c.id === drive.companyId);
                  return (
                    <div key={drive.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{company?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{drive.driveDate}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {STAGE_LABELS[drive.status] || drive.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Industry Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No industry data available yet.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="industry" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(234, 89%, 56%)" radius={[0, 4, 4, 0]} name="Companies" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placement Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Placement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {Number(funnel.totalAppeared || 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No placement data yet.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { stage: "Appeared", value: Number(funnel.totalAppeared || 0) },
                    { stage: "Shortlisted", value: Number(funnel.totalShortlisted || 0) },
                    { stage: "Selected", value: Number(funnel.totalSelected || 0) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm leading-tight">
                        <span className="font-medium">{log.companyName || "System"}</span>
                        {" — "}
                        {ACTION_LABELS[log.action] || log.action}
                        {log.previousStatus && log.newStatus && (
                          <span className="text-muted-foreground">
                            {" "}({log.previousStatus} → {log.newStatus})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTimeAgo(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
