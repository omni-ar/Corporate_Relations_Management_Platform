import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_LABELS: Record<string, string> = {
  DRIVE_CREATED: "Drive Created",
  DRIVE_UPDATED: "Drive Updated",
  DRIVE_DELETED: "Drive Deleted",
  STATUS_CHANGE: "Status Changed",
};

const ACTION_COLORS: Record<string, string> = {
  DRIVE_CREATED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  DRIVE_UPDATED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  DRIVE_DELETED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  STATUS_CHANGE: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

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

function formatTimestamp(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const { data: logs = [], isLoading } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete trail of all system actions for traceability and accountability.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium">No audit logs yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Actions like creating drives, changing statuses, and updating records will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Previous Status</TableHead>
                    <TableHead>New Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {log.companyName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-normal ${ACTION_COLORS[log.action] || ""}`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.previousStatus || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.newStatus || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs font-normal ${ACTION_COLORS[log.action] || ""}`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{log.companyName || "Unknown"}</p>
                  {(log.previousStatus || log.newStatus) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.previousStatus || "—"} → {log.newStatus || "—"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
