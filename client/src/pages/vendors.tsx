import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Check,
  Clock,
  Download,
  FileUp,
  Filter,
  Loader2,
  LogOut,
  Mail,
  Map,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { format } from "date-fns";

const VendorMap = lazy(() => import("@/components/VendorMap"));
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

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
  branding: "Private Label" | "OEM" | "Distributor" | "Direct";
  qualityRating: string;
  approved: boolean;
  lastOrder: string | null;
  performance: "Excellent" | "Good" | "Watch" | "At Risk";
  remarks: string;
};

const categories = [
  "All",
  "Packaging",
  "Hardware",
  "Materials",
  "Manufacturing",
  "Services",
];

const performances: Array<Vendor["performance"] | "All"> = [
  "All",
  "Excellent",
  "Good",
  "Watch",
  "At Risk",
];

function scoreToLabel(score: number) {
  if (score >= 4.6) return "Elite";
  if (score >= 4.2) return "Strong";
  if (score >= 3.8) return "Stable";
  return "Needs Review";
}

function performanceTone(p: Vendor["performance"]) {
  switch (p) {
    case "Excellent":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "Good":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "Watch":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "At Risk":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  }
}

function priceTone(price: string) {
  if (price === "₹" || price === "$") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (price === "₹₹" || price === "$$") return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
  if (price === "₹₹₹" || price === "$$$") return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
  return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30";
}

function exportToCSV(vendors: Vendor[]) {
  const headers = [
    "Vendor Name",
    "Category",
    "Product Type",
    "Contact Person",
    "Phone",
    "Email",
    "City",
    "Price Range",
    "Lead Time (Days)",
    "Payment Terms",
    "Branding",
    "Quality Rating",
    "Approved",
    "Last Order",
    "Performance",
    "Remarks",
  ];

  const rows = vendors.map((v) => [
    v.vendorName,
    v.category,
    v.productType,
    v.contactPerson,
    v.phone,
    v.email,
    v.city,
    v.priceRange,
    v.leadTimeDays,
    v.paymentTerms,
    v.branding,
    v.qualityRating,
    v.approved ? "Yes" : "No",
    v.lastOrder || "",
    v.performance,
    v.remarks,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendors_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatLastOrder(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function NotificationsPopover({ vendors }: { vendors: Vendor[] }) {
  const notifications = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: "warning" | "danger" | "info";
      title: string;
      message: string;
      vendorId: string;
    }> = [];

    vendors.forEach((v) => {
      if (v.performance === "At Risk") {
        alerts.push({
          id: `atrisk-${v.id}`,
          type: "danger",
          title: "Performance Alert",
          message: `${v.vendorName} is at risk and needs attention`,
          vendorId: v.id,
        });
      }

      if (v.performance === "Watch") {
        alerts.push({
          id: `watch-${v.id}`,
          type: "warning",
          title: "Performance Watch",
          message: `${v.vendorName} is under performance watch`,
          vendorId: v.id,
        });
      }

      if (!v.approved) {
        alerts.push({
          id: `pending-${v.id}`,
          type: "info",
          title: "Pending Approval",
          message: `${v.vendorName} is awaiting approval`,
          vendorId: v.id,
        });
      }

      if (v.lastOrder) {
        const lastOrderDate = new Date(v.lastOrder);
        const daysSinceOrder = Math.floor(
          (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceOrder > 90) {
          alerts.push({
            id: `inactive-${v.id}`,
            type: "warning",
            title: "Inactive Vendor",
            message: `No orders from ${v.vendorName} in ${daysSinceOrder} days`,
            vendorId: v.id,
          });
        }
      }
    });

    return alerts;
  }, [vendors]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-12 px-5 gap-2 text-base border-primary/30 hover:bg-primary/5 relative"
          data-testid="button-notifications"
        >
          <Bell className="size-5" />
          Alerts
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Vendor Alerts</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Check className="mx-auto size-8 text-emerald-500 mb-2" />
              All vendors are in good standing
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg mb-2 last:mb-0 ${
                    n.type === "danger"
                      ? "bg-rose-500/10 border border-rose-500/20"
                      : n.type === "warning"
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-sky-500/10 border border-sky-500/20"
                  }`}
                  data-testid={`notification-${n.id}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`size-4 mt-0.5 shrink-0 ${
                        n.type === "danger"
                          ? "text-rose-500"
                          : n.type === "warning"
                            ? "text-amber-500"
                            : "text-sky-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function HeaderStat({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-stat rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80"
            data-testid={`text-stat-label-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {label}
          </div>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight ${accent ? "gradient-text" : ""}`}
            data-testid={`text-stat-value-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {value}
          </div>
        </div>
        <div className={`grid size-12 place-items-center rounded-2xl ${accent ? "bg-primary/10" : "stat-icon-gradient"}`}>
          <Icon className={`size-5 ${accent ? "text-primary" : "text-primary/80"}`} />
        </div>
      </div>
    </motion.div>
  );
}

function VendorForm({
  initial,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Vendor>;
  onSave: (v: Omit<Vendor, "id">) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Packaging");
  const [productType, setProductType] = useState(initial?.productType ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [priceRange, setPriceRange] = useState(initial?.priceRange ?? "₹₹");
  const [leadTimeDays, setLeadTimeDays] = useState<number>(
    initial?.leadTimeDays ?? 7,
  );
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "Net 30");
  const [branding, setBranding] = useState<Vendor["branding"]>(
    initial?.branding ?? "Direct",
  );
  const [qualityRating, setQualityRating] = useState<number>(
    initial?.qualityRating ? parseFloat(initial.qualityRating) : 4.2,
  );
  const [approved, setApproved] = useState<boolean>(initial?.approved ?? false);
  const [lastOrder, setLastOrder] = useState<string>(initial?.lastOrder ?? "");
  const [performance, setPerformance] = useState<Vendor["performance"]>(
    initial?.performance ?? "Good",
  );
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  function buildVendor(): Omit<Vendor, "id"> {
    return {
      vendorName: vendorName.trim() || "Untitled vendor",
      category,
      productType: productType.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      priceRange,
      leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : 0,
      paymentTerms: paymentTerms.trim(),
      branding,
      qualityRating: Math.max(0, Math.min(5, qualityRating)).toFixed(2),
      approved,
      lastOrder: lastOrder.trim() ? lastOrder.trim() : null,
      performance,
      remarks: remarks.trim(),
    };
  }

  return (
    <div className="flex flex-col">
      <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
        <div className="grid gap-5 pb-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="vendorName" className="text-sm font-medium" data-testid="label-vendor-name">
                Vendor Name *
              </Label>
              <Input
                id="vendorName"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g., Sharma Packaging Industries"
                className="h-11"
                data-testid="input-vendor-name"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium" data-testid="label-category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {["Packaging", "Hardware", "Materials", "Manufacturing", "Services"].map(
                    (c) => (
                      <SelectItem key={c} value={c} data-testid={`option-category-${c}`}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productType" className="text-sm font-medium" data-testid="label-product-type">
                Product Type
              </Label>
              <Input
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="e.g., Corrugated Boxes"
                className="h-11"
                data-testid="input-product-type"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactPerson" className="text-sm font-medium" data-testid="label-contact-person">
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., Rajesh Sharma"
                className="h-11"
                data-testid="input-contact-person"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-sm font-medium" data-testid="label-phone">
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-11"
                data-testid="input-phone"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium" data-testid="label-email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-11"
                data-testid="input-email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="city" className="text-sm font-medium" data-testid="label-city">
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Mumbai"
                className="h-11"
                data-testid="input-city"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium" data-testid="label-price-range">Price Range</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="h-11" data-testid="select-price-range">
                  <SelectValue placeholder="Select price" />
                </SelectTrigger>
                <SelectContent>
                  {["₹", "₹₹", "₹₹₹", "₹₹₹₹"].map((p) => (
                    <SelectItem key={p} value={p} data-testid={`option-price-${p}`}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leadTime" className="text-sm font-medium" data-testid="label-lead-time">
                Lead Time (days)
              </Label>
              <Input
                id="leadTime"
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value || "0", 10))}
                className="h-11"
                data-testid="input-lead-time"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentTerms" className="text-sm font-medium" data-testid="label-payment-terms">
                Payment Terms
              </Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30"
                className="h-11"
                data-testid="input-payment-terms"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium" data-testid="label-branding">Branding</Label>
              <Select value={branding} onValueChange={(v) => setBranding(v as Vendor["branding"])}>
                <SelectTrigger className="h-11" data-testid="select-branding">
                  <SelectValue placeholder="Select branding" />
                </SelectTrigger>
                <SelectContent>
                  {(["Direct", "Distributor", "OEM", "Private Label"] as const).map((b) => (
                    <SelectItem key={b} value={b} data-testid={`option-branding-${b}`}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qualityRating" className="text-sm font-medium" data-testid="label-quality-rating">
                Quality Rating (0–5)
              </Label>
              <Input
                id="qualityRating"
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={qualityRating}
                onChange={(e) => setQualityRating(parseFloat(e.target.value || "0"))}
                className="h-11"
                data-testid="input-quality-rating"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastOrder" className="text-sm font-medium" data-testid="label-last-order">
                Last Order (date)
              </Label>
              <Input
                id="lastOrder"
                type="date"
                value={lastOrder}
                onChange={(e) => setLastOrder(e.target.value)}
                className="h-11"
                data-testid="input-last-order"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium" data-testid="label-performance">Performance</Label>
              <Select value={performance} onValueChange={(v) => setPerformance(v as Vendor["performance"])}>
                <SelectTrigger className="h-11" data-testid="select-performance">
                  <SelectValue placeholder="Select performance" />
                </SelectTrigger>
                <SelectContent>
                  {(["Excellent", "Good", "Watch", "At Risk"] as const).map((p) => (
                    <SelectItem key={p} value={p} data-testid={`option-performance-${p}`}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border bg-gradient-to-r from-primary/5 to-accent/5 p-4">
            <div>
              <div className="text-sm font-semibold" data-testid="text-approved-title">
                Approved Vendor
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground" data-testid="text-approved-hint">
                Mark as approved for purchasing orders.
              </div>
            </div>
            <Switch
              checked={approved}
              onCheckedChange={setApproved}
              data-testid="switch-approved"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remarks" className="text-sm font-medium" data-testid="label-remarks">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes, minimum order qty, warranty details, etc."
              className="min-h-[100px] resize-none"
              data-testid="textarea-remarks"
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex flex-col-reverse gap-3 pt-6 border-t mt-6 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="h-11"
          data-testid="button-cancel-vendor"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onSave(buildVendor())}
          disabled={isLoading || !vendorName.trim()}
          className="h-11 btn-gradient border-0 text-white gap-2"
          data-testid="button-save-vendor"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="size-4" />
              Save Vendor
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function VendorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [category, setCategory] = useState<string>("All");
  const [performance, setPerformance] = useState<(typeof performances)[number]>("All");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["auth-status"] });
        setLocation("/login");
      }
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  const { data: vendors = [], isLoading, isFetching } = useQuery({
    queryKey: ["vendors", { query: debouncedQuery, category, performance, approvedOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("query", debouncedQuery);
      if (category !== "All") params.set("category", category);
      if (performance !== "All") params.set("performance", performance);
      if (approvedOnly) params.set("approvedOnly", "true");

      const res = await fetch(`/api/vendors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json() as Promise<Vendor[]>;
    },
    placeholderData: (prev) => prev,
  });

  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId],
  );

  const createMutation = useMutation({
    mutationFn: async (vendor: Omit<Vendor, "id">) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create vendor");
      }
      return res.json() as Promise<Vendor>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setSelectedId(created.id);
      setAddDialogOpen(false);
      toast({
        title: "Vendor created successfully",
        description: `${created.vendorName} has been added to your database.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      vendor,
    }: {
      id: string;
      vendor: Omit<Vendor, "id">;
    }) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update vendor");
      }
      return res.json() as Promise<Vendor>;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setEditDialogOpen(false);
      toast({
        title: "Vendor updated successfully",
        description: `${updated.vendorName} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete vendor");
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (selectedId === id) {
        setSelectedId(vendors.filter((v) => v.id !== id)[0]?.id ?? null);
      }
      toast({
        title: "Vendor deleted",
        description: "The vendor has been removed from your database.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vendors/bulk-import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import vendors");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setImportDialogOpen(false);
      setImportFile(null);
      toast({
        title: "Import Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totals = useMemo(() => {
    const approvedCount = vendors.filter((v) => v.approved).length;
    const avgQuality =
      vendors.reduce((sum, v) => sum + parseFloat(v.qualityRating), 0) /
      Math.max(1, vendors.length);
    const avgLead =
      vendors.reduce((sum, v) => sum + v.leadTimeDays, 0) / Math.max(1, vendors.length);

    return {
      vendorCount: vendors.length,
      approvedCount,
      avgQuality,
      avgLead,
    };
  }, [vendors]);

  if (isLoading) {
    return (
      <div className="min-h-screen app-hero-bg grid place-items-center">
        <div className="text-center">
          <div className="relative mx-auto size-16">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative grid size-16 place-items-center rounded-full bg-primary/10">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
          </div>
          <div className="mt-6 text-lg font-medium">Loading vendors...</div>
          <div className="mt-2 text-sm text-muted-foreground">Connecting to database</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-hero-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-8"
        >
          <header className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" />
                  <span data-testid="text-header-kicker">Aspire for Her | Procurement</span>
                </div>
                <h1
                  className="mt-4 title-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                  data-testid="text-page-title"
                >
                  <span className="gradient-text">Vendor</span> Database
                </h1>
                <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg" data-testid="text-page-subtitle">
                  Streamline your vendor information, track performance, and manage procurement with confidence.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="h-12 px-5 gap-2 text-base border-primary/30 hover:bg-primary/5"
                    data-testid="button-dashboard"
                  >
                    <BarChart3 className="size-5" />
                    Dashboard
                  </Button>
                </Link>
                <NotificationsPopover vendors={vendors} />
                <Button
                  variant="outline"
                  className="h-12 px-5 gap-2 text-base border-primary/30 hover:bg-primary/5"
                  onClick={() => exportToCSV(vendors)}
                  data-testid="button-export-csv"
                >
                  <Download className="size-5" />
                  Export CSV
                </Button>
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 px-5 gap-2 text-base border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      data-testid="button-import-csv"
                    >
                      <Upload className="size-5" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold" data-testid="text-dialog-title-import">
                        Import Vendors from CSV
                      </DialogTitle>
                      <DialogDescription data-testid="text-dialog-desc-import">
                        Upload a CSV file with vendor data. The file should have headers matching vendor fields.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          id="csv-upload"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          data-testid="input-csv-file"
                        />
                        <label
                          htmlFor="csv-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <FileUp className="size-10 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {importFile ? importFile.name : "Click to select CSV file"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            CSV format only
                          </span>
                        </label>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Required columns:</p>
                        <p>Vendor Name, Category, Product Type, Contact Person, Phone, Email, City</p>
                        <p className="font-medium mt-2">Optional columns:</p>
                        <p>Price Range, Lead Time Days, Payment Terms, Branding, Quality Rating, Approved, Performance, Remarks</p>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportDialogOpen(false);
                            setImportFile(null);
                          }}
                          data-testid="button-cancel-import"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="btn-gradient text-white"
                          disabled={!importFile || importMutation.isPending}
                          onClick={() => importFile && importMutation.mutate(importFile)}
                          data-testid="button-confirm-import"
                        >
                          {importMutation.isPending ? (
                            <>
                              <Loader2 className="size-4 animate-spin mr-2" />
                              Importing...
                            </>
                          ) : (
                            "Import Vendors"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="h-12 px-5 gap-2 text-base border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="size-5" />
                  Logout
                </Button>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-12 px-6 btn-gradient border-0 text-white gap-2 text-base" data-testid="button-add-vendor">
                      <Plus className="size-5" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold" data-testid="text-dialog-title-add">
                        Add New Vendor
                      </DialogTitle>
                      <DialogDescription data-testid="text-dialog-desc-add">
                        Fill in the vendor details below. Required fields are marked with *.
                      </DialogDescription>
                    </DialogHeader>
                    <VendorForm
                      onSave={(v) => createMutation.mutate(v)}
                      onCancel={() => setAddDialogOpen(false)}
                      isLoading={createMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <HeaderStat label="Total Vendors" value={`${totals.vendorCount}`} icon={Users} accent />
              <HeaderStat label="Approved" value={`${totals.approvedCount}`} icon={BadgeCheck} />
              <HeaderStat
                label="Avg Quality"
                value={`${totals.avgQuality.toFixed(1)}`}
                icon={Star}
              />
              <HeaderStat
                label="Avg Lead Time"
                value={`${Math.round(totals.avgLead)}d`}
                icon={Clock}
              />
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-panel rounded-3xl p-4 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10">
                    <Search className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" data-testid="text-filters-title">
                      Search & Filters
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid="text-filters-subtitle">
                      Find vendors by name, category, or status
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={approvedOnly ? "default" : "outline"}
                    size="sm"
                    className={`gap-2 h-9 ${approvedOnly ? "btn-gradient border-0 text-white" : ""}`}
                    onClick={() => setApprovedOnly((s) => !s)}
                    data-testid="button-filter-approved"
                  >
                    <BadgeCheck className="size-4" />
                    <span className="hidden sm:inline">Approved</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-9 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                      setPerformance("All");
                      setApprovedOnly(false);
                    }}
                    data-testid="button-filter-reset"
                  >
                    <X className="size-4" />
                    Reset
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3 lg:col-span-1">
                  <div className="relative">
                    {isFetching && !isLoading ? (
                      <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary animate-spin" />
                    ) : (
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search vendors..."
                      className="pl-10 h-11"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 gap-2" data-testid="select-filter-category">
                    <Filter className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} data-testid={`option-filter-category-${c}`}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={performance} onValueChange={(v) => setPerformance(v as any)}>
                  <SelectTrigger className="h-11 gap-2" data-testid="select-filter-performance">
                    <Star className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    {performances.map((p) => (
                      <SelectItem key={p} value={p} data-testid={`option-filter-performance-${p}`}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-5">
                <Tabs defaultValue="table">
                  <TabsList className="grid w-full grid-cols-3 h-11" data-testid="tabs-view">
                    <TabsTrigger value="table" className="gap-2" data-testid="tab-table">
                      <Tag className="size-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="cards" className="gap-2" data-testid="tab-cards">
                      <Building2 className="size-4" />
                      Cards
                    </TabsTrigger>
                    <TabsTrigger value="map" className="gap-2" data-testid="tab-map">
                      <Map className="size-4" />
                      Map
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-4">
                    <div className="rounded-2xl border bg-card/60 overflow-auto h-[60vh]">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-semibold" data-testid="th-vendor">Vendor</TableHead>
                              <TableHead className="font-semibold hidden sm:table-cell" data-testid="th-category">Category</TableHead>
                              <TableHead className="font-semibold hidden md:table-cell" data-testid="th-city">City</TableHead>
                              <TableHead className="font-semibold" data-testid="th-status">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {vendors.map((v, i) => {
                                const active = v.id === selectedId;
                                return (
                                  <motion.tr
                                    key={v.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.03 }}
                                    className={`vendor-row cursor-pointer border-b last:border-b-0 ${active ? "active" : ""}`}
                                    onClick={() => setSelectedId(v.id)}
                                    data-testid={`row-vendor-${v.id}`}
                                  >
                                    <TableCell className="py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-semibold text-sm shrink-0">
                                          {v.vendorName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <div
                                            className="truncate font-medium"
                                            data-testid={`text-vendor-name-${v.id}`}
                                          >
                                            {v.vendorName}
                                          </div>
                                          <div
                                            className="truncate text-xs text-muted-foreground"
                                            data-testid={`text-vendor-product-${v.id}`}
                                          >
                                            {v.productType || "—"}
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell" data-testid={`text-category-${v.id}`}>
                                      <Badge variant="secondary" className="font-normal">
                                        {v.category}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground" data-testid={`text-city-${v.id}`}>
                                      {v.city || "—"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1.5">
                                        <Badge
                                          className={"border text-xs " + performanceTone(v.performance)}
                                          variant="secondary"
                                          data-testid={`badge-performance-${v.id}`}
                                        >
                                          {v.performance}
                                        </Badge>
                                        {v.approved && (
                                          <Badge
                                            className="border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs"
                                            variant="secondary"
                                          >
                                            <Check className="size-3 mr-1" />
                                            Approved
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>

                            {vendors.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  <div
                                    className="py-16 text-center"
                                    data-testid="empty-state"
                                  >
                                    <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10">
                                      <Building2 className="size-8 text-primary/60" />
                                    </div>
                                    <div className="mt-4 text-lg font-medium">No vendors found</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                      Add your first vendor to get started
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="cards" className="mt-4">
                    <div className="h-[60vh] overflow-auto pr-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <AnimatePresence>
                          {vendors.map((v, i) => {
                            const active = v.id === selectedId;
                            return (
                              <motion.button
                                key={v.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.03 }}
                                type="button"
                                className={`vendor-card text-left rounded-2xl border bg-card/80 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "active" : ""}`}
                                onClick={() => setSelectedId(v.id)}
                                data-testid={`card-vendor-${v.id}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-semibold shrink-0">
                                      {v.vendorName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate font-semibold" data-testid={`text-card-name-${v.id}`}>
                                        {v.vendorName}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground mt-0.5">
                                        {v.category} • {v.city || "—"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={"border text-xs " + priceTone(v.priceRange)}
                                    data-testid={`badge-price-${v.id}`}
                                  >
                                    {v.priceRange}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={"border text-xs " + performanceTone(v.performance)}
                                    data-testid={`badge-performance-card-${v.id}`}
                                  >
                                    {v.performance}
                                  </Badge>
                                  {v.approved && (
                                    <Badge
                                      className="border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs"
                                      variant="secondary"
                                      data-testid={`badge-approved-${v.id}`}
                                    >
                                      <Check className="size-3 mr-1" />
                                      Approved
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{v.leadTimeDays}d lead time</span>
                                  <span>{parseFloat(v.qualityRating).toFixed(1)} rating</span>
                                </div>
                              </motion.button>
                            );
                          })}
                        </AnimatePresence>
                        {vendors.length === 0 && (
                          <div className="col-span-2 rounded-2xl border bg-card/40 p-16 text-center" data-testid="empty-state-cards">
                            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10">
                              <Building2 className="size-8 text-primary/60" />
                            </div>
                            <div className="mt-4 text-lg font-medium">No vendors found</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Add your first vendor to get started
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="map" className="mt-4">
                    <div className="rounded-2xl border bg-card/60 overflow-hidden h-[400px]">
                      <Suspense
                        fallback={
                          <div className="flex h-full items-center justify-center">
                            <Loader2 className="size-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <VendorMap vendors={vendors} />
                      </Suspense>
                    </div>
                    {vendors.length === 0 && (
                      <div className="mt-4 rounded-2xl border bg-card/40 p-8 text-center" data-testid="empty-state-map">
                        <Map className="mx-auto size-12 text-primary/40" />
                        <div className="mt-3 text-lg font-medium">No vendors to display</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Add vendors with city information to see them on the map
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="glass-panel rounded-3xl p-4 sm:p-6 lg:sticky lg:top-6 lg:self-start"
            >
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                            {selected.vendorName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h2
                              className="truncate text-xl font-bold"
                              data-testid="text-vendor-detail-name"
                            >
                              {selected.vendorName}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                              {selected.approved ? (
                                <Badge
                                  variant="secondary"
                                  className="border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  data-testid="badge-detail-approved"
                                >
                                  <Check className="size-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="border"
                                  data-testid="badge-detail-pending"
                                >
                                  Pending
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={"border " + performanceTone(selected.performance)}
                                data-testid="badge-detail-performance"
                              >
                                {selected.performance}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 h-10 gap-2" data-testid="button-edit-vendor">
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-semibold" data-testid="text-dialog-title-edit">
                              Edit Vendor
                            </DialogTitle>
                            <DialogDescription data-testid="text-dialog-desc-edit">
                              Update the vendor details below.
                            </DialogDescription>
                          </DialogHeader>
                          <VendorForm
                            initial={selected}
                            onSave={(v) =>
                              updateMutation.mutate({ id: selected.id, vendor: v })
                            }
                            onCancel={() => setEditDialogOpen(false)}
                            isLoading={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        className="h-10 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete ${selected.vendorName}?`
                            )
                          ) {
                            deleteMutation.mutate(selected.id);
                          }
                        }}
                        data-testid="button-delete-vendor"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="overflow-auto max-h-[400px] lg:max-h-[calc(100vh-400px)]">
                      <div className="grid gap-3 pr-2">
                        <div className="detail-card rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold" data-testid="text-detail-section-contact">
                            <Phone className="size-4 text-primary" />
                            Contact Information
                          </div>
                          <div className="mt-3 grid gap-2.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Person</span>
                              <span className="font-medium text-right" data-testid="text-detail-contact-person">{selected.contactPerson || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Phone</span>
                              <span className="font-medium text-right" data-testid="text-detail-contact-phone">{selected.phone || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Email</span>
                              <span className="font-medium text-right truncate max-w-[180px]" data-testid="text-detail-contact-email">{selected.email || "—"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="detail-card rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold" data-testid="text-detail-section-procurement">
                            <WalletCards className="size-4 text-primary" />
                            Procurement Details
                          </div>
                          <div className="mt-3 grid gap-2.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Payment Terms</span>
                              <span className="font-medium" data-testid="text-detail-payment-terms">{selected.paymentTerms || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Lead Time</span>
                              <span className="font-medium" data-testid="text-detail-lead">{selected.leadTimeDays} days</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Price Range</span>
                              <Badge variant="secondary" className={"border " + priceTone(selected.priceRange)} data-testid="badge-detail-price">
                                {selected.priceRange}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Last Order</span>
                              <span className="font-medium" data-testid="text-detail-last-order">{formatLastOrder(selected.lastOrder)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="detail-card rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold" data-testid="text-detail-section-profile">
                            <MapPin className="size-4 text-primary" />
                            Vendor Profile
                          </div>
                          <div className="mt-3 grid gap-2.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">City</span>
                              <span className="font-medium" data-testid="text-detail-city">{selected.city || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Category</span>
                              <Badge variant="secondary" data-testid="text-detail-category">{selected.category}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Product Type</span>
                              <span className="font-medium text-right" data-testid="text-detail-product-type">{selected.productType || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Branding</span>
                              <span className="font-medium" data-testid="text-detail-branding">{selected.branding}</span>
                            </div>
                          </div>
                        </div>

                        <div className="detail-card rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold" data-testid="text-detail-section-quality">
                            <Star className="size-4 text-primary" />
                            Quality & Notes
                          </div>
                          <div className="mt-3 grid gap-2.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Rating</span>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`size-4 ${
                                        star <= Math.round(parseFloat(selected.qualityRating))
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-muted-foreground/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-medium" data-testid="text-detail-quality">
                                  {parseFloat(selected.qualityRating).toFixed(1)}
                                </span>
                              </div>
                            </div>
                            {selected.remarks && (
                              <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed" data-testid="text-detail-remarks">
                                {selected.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center"
                  >
                    <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-primary/10">
                      <Mail className="size-10 text-primary/60" />
                    </div>
                    <div className="mt-6 text-xl font-semibold" data-testid="text-empty-detail-title">
                      Select a Vendor
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground max-w-[200px] mx-auto" data-testid="text-empty-detail-subtitle">
                      Click on a vendor from the list to view their details
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          </div>

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card/40 p-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2" data-testid="text-footer-left">
              <div className="size-2 rounded-full bg-emerald-500 pulse-ring" />
              Connected to database • All changes saved automatically
            </div>
            <div className="flex items-center gap-2" data-testid="text-footer-right">
              <Calendar className="size-4" />
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </div>
          </motion.footer>
        </motion.div>
      </div>
    </div>
  );
}
