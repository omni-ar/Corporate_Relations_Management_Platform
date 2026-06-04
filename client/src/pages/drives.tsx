import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/auth";
import {
  Briefcase,
  Plus,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";

const PIPELINE_STAGES = [
  "CONTACTED",
  "INTERESTED",
  "PPT_SCHEDULED",
  "OA_SCHEDULED",
  "INTERVIEW_SCHEDULED",
  "COMPLETED",
] as const;

const STAGE_LABELS: Record<string, string> = {
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PPT_SCHEDULED: "PPT Scheduled",
  OA_SCHEDULED: "OA Scheduled",
  INTERVIEW_SCHEDULED: "Interview",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STAGE_COLORS: Record<string, string> = {
  CONTACTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  INTERESTED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PPT_SCHEDULED: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  OA_SCHEDULED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  INTERVIEW_SCHEDULED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

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

function PipelineStepper({ currentStatus }: { currentStatus: string }) {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus as any);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PIPELINE_STAGES.map((stage, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={stage} className="flex items-center shrink-0">
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1 : 1,
                opacity: isPast || isCurrent ? 1 : 0.4,
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                isCurrent
                  ? STAGE_COLORS[stage]
                  : isPast
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isPast && <Check className="h-3 w-3" />}
              <span className="hidden sm:inline">{STAGE_LABELS[stage]}</span>
              <span className="sm:hidden">{STAGE_LABELS[stage].split(" ")[0]}</span>
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRight className={`h-3 w-3 mx-0.5 shrink-0 ${
                isPast ? "text-emerald-400" : "text-muted-foreground/30"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DrivesPage() {
  const { data: drives = [], isLoading } = useDrives();
  const { data: companies = [] } = useCompanies();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [driveDate, setDriveDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [driveType, setDriveType] = useState("FTE");
  const [minCtc, setMinCtc] = useState("");
  const [maxCtc, setMaxCtc] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [conflictWarning, setConflictWarning] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        companyId,
        driveDate: driveDate || undefined,
        driveStartTime: startTime || undefined,
        driveEndTime: endTime || undefined,
        driveType,
        minCtc: minCtc ? parseInt(minCtc) : undefined,
        maxCtc: maxCtc ? parseInt(maxCtc) : undefined,
      };
      const res = await authFetch("/api/drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create drive");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast({ title: "Drive created", description: "Placement drive has been scheduled." });
      resetForm();
    },
    onError: (err: Error) => {
      if (err.message.includes("conflict")) {
        setConflictWarning(err.message);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const res = await authFetch(`/api/drives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update drive status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/drives/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete drive");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Drive deleted" });
    },
  });

  function resetForm() {
    setCompanyId("");
    setDriveDate("");
    setStartTime("");
    setEndTime("");
    setDriveType("FTE");
    setMinCtc("");
    setMaxCtc("");
    setConflictWarning("");
    setDialogOpen(false);
  }

  function getNextStatus(current: string) {
    const idx = PIPELINE_STAGES.indexOf(current as any);
    if (idx < 0 || idx >= PIPELINE_STAGES.length - 1) return null;
    return PIPELINE_STAGES[idx + 1];
  }

  function getCompanyName(id: string) {
    return companies.find((c: any) => c.id === id)?.name || "Unknown";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Placement Drives</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage recruitment drives through the placement pipeline.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setConflictWarning(""); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={companies.length === 0}>
              <Plus className="h-4 w-4" /> Schedule Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Placement Drive</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={driveDate} onChange={(e) => setDriveDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={driveType} onValueChange={setDriveType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FTE">FTE</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Min CTC (₹)</Label>
                  <Input type="number" value={minCtc} onChange={(e) => setMinCtc(e.target.value)} placeholder="e.g. 600000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Max CTC (₹)</Label>
                  <Input type="number" value={maxCtc} onChange={(e) => setMaxCtc(e.target.value)} placeholder="e.g. 1200000" />
                </div>
              </div>

              {conflictWarning && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {conflictWarning}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!companyId || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Drive"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              You need to add companies before scheduling drives.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading drives...</p>
      ) : drives.length === 0 && companies.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium">No placement drives yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Schedule your first placement drive to start tracking the recruitment pipeline.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Schedule First Drive
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {drives.map((drive: any) => {
              const nextStatus = getNextStatus(drive.status);
              return (
                <motion.div
                  key={drive.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium">{getCompanyName(drive.companyId)}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{drive.driveType}</Badge>
                              {drive.driveDate && (
                                <span className="text-xs text-muted-foreground">{drive.driveDate}</span>
                              )}
                              {drive.driveStartTime && drive.driveEndTime && (
                                <span className="text-xs text-muted-foreground">
                                  {drive.driveStartTime} – {drive.driveEndTime}
                                </span>
                              )}
                              {drive.minCtc && drive.maxCtc && (
                                <span className="text-xs text-muted-foreground">
                                  ₹{(drive.minCtc / 100000).toFixed(1)}L – ₹{(drive.maxCtc / 100000).toFixed(1)}L
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {nextStatus && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => advanceMutation.mutate({ id: drive.id, newStatus: nextStatus })}
                                disabled={advanceMutation.isPending}
                              >
                                <ChevronRight className="h-3 w-3" />
                                <span className="hidden sm:inline">{STAGE_LABELS[nextStatus]}</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(drive.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Pipeline stepper */}
                        <PipelineStepper currentStatus={drive.status} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
