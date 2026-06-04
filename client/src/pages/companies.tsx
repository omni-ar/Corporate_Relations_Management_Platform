import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";
import { Building2, Plus, Trash2, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "IT / Software",
  "Consulting",
  "Finance / Banking",
  "Core Engineering",
  "E-Commerce",
  "Healthcare",
  "Analytics",
  "FMCG",
  "Automobile",
  "Other",
];

const STAGE_LABELS: Record<string, string> = {
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PPT_SCHEDULED: "PPT",
  OA_SCHEDULED: "OA",
  INTERVIEW_SCHEDULED: "Interview",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

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

type SortKey = "name" | "industry" | "drives";

export default function CompaniesPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const { data: drives = [] } = useDrives();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), industry }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create company");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company added", description: `${name} has been registered.` });
      setName("");
      setIndustry("");
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete company");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      toast({ title: "Company deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function getDriveCount(companyId: string) {
    return drives.filter((d: any) => d.companyId === companyId).length;
  }

  function getLatestDrive(companyId: string) {
    const companyDrives = drives
      .filter((d: any) => d.companyId === companyId)
      .sort((a: any, b: any) => {
        if (!a.driveDate || !b.driveDate) return 0;
        return new Date(b.driveDate).getTime() - new Date(a.driveDate).getTime();
      });
    return companyDrives[0] || null;
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c: any) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
      );
    }

    // Filter by industry
    if (filterIndustry !== "all") {
      result = result.filter((c: any) => c.industry === filterIndustry);
    }

    // Sort
    result.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "industry") cmp = a.industry.localeCompare(b.industry);
      else if (sortKey === "drives") cmp = getDriveCount(a.id) - getDriveCount(b.id);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [companies, searchQuery, filterIndustry, sortKey, sortAsc, drives]);

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage recruiting companies registered in the system.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amazon, Microsoft"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!name.trim() || !industry || createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add Company"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      {companies.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="pl-9"
            />
          </div>
          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading companies...</p>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium">No companies registered yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Start by adding the recruiting companies that visit your campus for placement drives.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add First Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortButton label="Company Name" field="name" /></TableHead>
                    <TableHead><SortButton label="Industry" field="industry" /></TableHead>
                    <TableHead className="text-center"><SortButton label="Drives" field="drives" /></TableHead>
                    <TableHead>Latest Drive</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: any) => {
                    const latest = getLatestDrive(company.id);
                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {company.industry}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{getDriveCount(company.id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {latest?.driveDate || "—"}
                        </TableCell>
                        <TableCell>
                          {latest ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {STAGE_LABELS[latest.status] || latest.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(company.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCompanies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No companies match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredCompanies.map((company: any) => {
              const latest = getLatestDrive(company.id);
              return (
                <Card key={company.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <Badge variant="secondary" className="text-xs font-normal mt-1">
                          {company.industry}
                        </Badge>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{getDriveCount(company.id)} drive(s)</span>
                          {latest && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {STAGE_LABELS[latest.status] || latest.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(company.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
