import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";
import { Building2, Briefcase, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";
import CompanyMap from "@/components/CompanyMap";

const CHART_COLORS = ["hsl(234, 89%, 56%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(215, 20%, 55%)", "hsl(0, 72%, 51%)"];

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
      const data = await res.json();
      // API returns count as string, Recharts needs numbers
      return data.map((d: any) => ({ ...d, count: Number(d.count) }));
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
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-0.5 text-xl font-semibold">{value}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Map major Indian cities to companies for visualization
const CITY_MAP: Record<string, string[]> = {
  Bangalore: ["Amazon", "Google", "Oracle", "Samsung R&D", "Accenture"],
  Hyderabad: ["Amazon", "Microsoft", "Google", "Deloitte"],
  Mumbai: ["JPMorgan Chase", "Goldman Sachs", "Deloitte", "Accenture"],
  Delhi: ["Adobe", "Samsung R&D", "Accenture"],
  Pune: ["Oracle", "Accenture", "Goldman Sachs"],
  Chennai: ["Amazon", "Accenture"],
  Gurgaon: ["Microsoft", "Adobe", "Deloitte"],
  Noida: ["Samsung R&D", "Oracle"],
  Kolkata: ["Accenture", "Deloitte"],
};

export default function AnalyticsPage() {
  const { data: overview } = useAnalyticsOverview();
  const { data: industryData = [] } = useAnalyticsIndustry();
  const { data: drives = [] } = useDrives();
  const { data: companies = [] } = useCompanies();

  const funnel = overview?.funnel || {};
  const funnelData = [
    { stage: "Appeared", value: Number(funnel.totalAppeared || 0) },
    { stage: "Shortlisted", value: Number(funnel.totalShortlisted || 0) },
    { stage: "Selected", value: Number(funnel.totalSelected || 0) },
  ];

  // Top recruiting companies
  const companyCounts: Record<string, { name: string; drives: number; offers: number }> = {};
  drives.forEach((d: any) => {
    const company = companies.find((c: any) => c.id === d.companyId);
    if (!company) return;
    if (!companyCounts[company.id]) {
      companyCounts[company.id] = { name: company.name, drives: 0, offers: 0 };
    }
    companyCounts[company.id].drives++;
    companyCounts[company.id].offers += Number(d.studentsSelected || 0);
  });
  const topCompanies = Object.values(companyCounts)
    .sort((a, b) => b.drives - a.drives)
    .slice(0, 8);

  // CTC distribution for completed drives
  const ctcData = drives
    .filter((d: any) => d.maxCtc && d.status === "COMPLETED")
    .map((d: any) => {
      const company = companies.find((c: any) => c.id === d.companyId);
      return {
        company: company?.name || "Unknown",
        ctc: Math.round(Number(d.maxCtc) / 100000),
      };
    })
    .sort((a: any, b: any) => b.ctc - a.ctc)
    .slice(0, 10);

  // Compute summary KPIs
  const completedDrives = drives.filter((d: any) => d.status === "COMPLETED");
  const totalSelected = completedDrives.reduce((sum: number, d: any) => sum + Number(d.studentsSelected || 0), 0);
  const totalAppeared = completedDrives.reduce((sum: number, d: any) => sum + Number(d.studentsAppeared || 0), 0);
  const selectionRate = totalAppeared > 0 ? ((totalSelected / totalAppeared) * 100).toFixed(1) : "—";
  const avgCtc = overview?.ctc?.avgCtc ? Math.round(Number(overview.ctc.avgCtc)) : 0;

  // Build company map data
  const mapCompanies = companies.flatMap((c: any) => {
    const cities = Object.entries(CITY_MAP)
      .filter(([_, names]) => names.includes(c.name))
      .map(([city]) => city);
    if (cities.length === 0) return [];
    return cities.map((city) => ({
      id: `${c.id}-${city}`,
      name: c.name,
      industry: c.industry,
      city,
    }));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Placement statistics, industry trends, and recruitment insights.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Companies" value={companies.length} icon={Building2} />
        <KPICard title="Total Drives" value={drives.length} icon={Briefcase} />
        <KPICard
          title="Average CTC"
          value={avgCtc ? `₹${(avgCtc / 100000).toFixed(1)}L` : "—"}
          icon={TrendingUp}
        />
        <KPICard
          title="Selection Rate"
          value={selectionRate === "—" ? "—" : `${selectionRate}%`}
          icon={Users}
          description={totalSelected > 0 ? `${totalSelected} selected / ${totalAppeared} appeared` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Industry Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="industry"
                      label={({ industry, percent }: any) => `${industry} ${(percent * 100).toFixed(0)}%`}
                    >
                      {industryData.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Placement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.every((d) => d.value === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No funnel data yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
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

        {/* CTC by Company */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">CTC by Company (₹ Lakhs)</CardTitle>
          </CardHeader>
          <CardContent>
            {ctcData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Complete drives to see CTC trends.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ctcData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="company" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `₹${v}L`} />
                    <Bar dataKey="ctc" fill="hsl(234, 89%, 56%)" radius={[0, 4, 4, 0]} name="Max CTC" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Recruiting Companies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Top Recruiting Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No company data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topCompanies.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-medium bg-muted text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.drives} drive(s)</span>
                      <Badge variant="secondary" className="text-xs">{c.offers} offers</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Geography Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Recruiting Companies by Region</CardTitle>
        </CardHeader>
        <CardContent>
          {mapCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Add companies to see geographic distribution.</p>
          ) : (
            <div className="h-96 rounded-lg overflow-hidden">
              <CompanyMap companies={mapCompanies} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
