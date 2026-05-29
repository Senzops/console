import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import md5 from "md5";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Spinner,
  Input,
  Badge,
  cn,
  Avatar,
} from "../../../components/Core";
import { useAuth, api } from "../../../lib/auth";
import { useOrg, Organization } from "../../../lib/org";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Copy,
  Shield,
  Crown,
  AlertTriangle,
  Trash2,
  CreditCard,
  Calendar,
  Activity,
  Clock,
  CheckCircle,
  ChevronRight,
  HardDrive,
  UserPlus,
  Plus,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Eye,
  Database,
  Receipt,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import { extractErrorMessage } from "@/utils/axiosError";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const getGravatar = (identifier: string) =>
  `https://www.gravatar.com/avatar/${md5(identifier.trim().toLowerCase())}?d=identicon`;

const formatBytes = (bytes: number = 0, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  admin: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  member: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  viewer: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <Users className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

// ============================================================================
// DETERMINISTIC COVER ART (Organization variant — matches profile page exactly)
// ============================================================================
const OrgCoverArt = ({ hash }: { hash: string }) => {
  const bytes = useMemo(() => Array.from({ length: 16 }, (_, i) => parseInt(hash.substring(i * 2, i * 2 + 2), 16)), [hash]);
  const palettes = [["#3b82f6", "#10b981"], ["#8b5cf6", "#06b6d4"], ["#f59e0b", "#ef4444"], ["#14b8a6", "#6366f1"], ["#64748b", "#94a3b8"]];
  const theme = palettes[bytes[0] % palettes.length];
  const c1 = theme[0], c2 = theme[1];

  const shapes = useMemo(() => Array.from({ length: 5 }).map((_, i) => {
    const b1 = bytes[(i * 3) % 16], b2 = bytes[(i * 3 + 1) % 16], b3 = bytes[(i * 3 + 2) % 16];
    return { type: b1 % 3, x: (b2 / 255) * 800, y: (b3 / 255) * 200, size: 30 + (b1 % 80), color: b3 % 2 === 0 ? c1 : c2, seed: b1 };
  }), [bytes, c1, c2]);

  const traceNodes = useMemo(() => [
    { x: 50 + (bytes[1] % 200), y: 30 + (bytes[2] % 140) },
    { x: 300 + (bytes[3] % 200), y: 30 + (bytes[4] % 140) },
    { x: 550 + (bytes[5] % 200), y: 30 + (bytes[6] % 140) },
  ], [bytes]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-muted/10 border-b border-border/40">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 200">
        <defs>
          <pattern id={`org-grid-${hash}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground/5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#org-grid-${hash})`} />
        {shapes.map((s, i) => {
          if (s.type === 0) return <circle key={i} cx={s.x} cy={s.y} r={s.size} fill={s.color} fillOpacity="0.02" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.2" />;
          if (s.type === 1) return <rect key={i} x={s.x - s.size / 2} y={s.y - s.size / 2} width={s.size} height={s.size} fill={s.color} fillOpacity="0.02" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.2" transform={`rotate(${s.seed} ${s.x} ${s.y})`} />;
          const p1 = `${s.x},${s.y - s.size}`; const p2 = `${s.x + s.size},${s.y + s.size / 2}`; const p3 = `${s.x - s.size},${s.y + s.size / 2}`;
          return <polygon key={i} points={`${p1} ${p2} ${p3}`} fill={s.color} fillOpacity="0.02" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.2" transform={`rotate(${s.seed * 2} ${s.x} ${s.y})`} />;
        })}
        <g opacity="0.5">
          <polyline points={`${traceNodes[0].x},${traceNodes[0].y} ${traceNodes[1].x},${traceNodes[1].y} ${traceNodes[2].x},${traceNodes[2].y}`} fill="none" stroke={c1} strokeWidth="1.5" strokeDasharray="4 4" />
          {traceNodes.map((n, i) => (<g key={i} transform={`translate(${n.x}, ${n.y})`}><circle cx="0" cy="0" r="4.5" fill="hsl(var(--background))" stroke={c1} strokeWidth="2" /><circle cx="0" cy="0" r="1.5" fill={c1} /></g>))}
        </g>
        <g transform={`translate(${600 + (bytes[7] % 100)}, ${120 + (bytes[8] % 40)})`} opacity="0.4">
          {Array.from({ length: 6 }).map((_, i) => { const h = 5 + (bytes[9 + i] % 25); return <rect key={i} x={i * 8} y={30 - h} width="4" height={h} fill={c2} rx="1" />; })}
          <line x1="-5" y1="32" x2="52" y2="32" stroke={c2} strokeWidth="1.5" opacity="0.4" />
        </g>
        <line x1="0" y1={bytes[12] % 200} x2="800" y2={bytes[12] % 200} stroke={c2} strokeWidth="1" opacity="0.25" strokeDasharray="15 10 5 10" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-90" />
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function OrganizationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { activeOrg, refreshOrgs, setActiveOrg, activeRole, canManageMembers, canManageBilling, isLoading: orgListLoading, isReady } = useOrg();

  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);

  // --- SWR Data Fetching (same as profile page) ---
  const { data: billingData, mutate: mutateBilling } = useSWR(activeOrg ? "/billing/subscription" : null, fetcher);
  const { data: storageData } = useSWR(activeOrg ? "/billing/storage-stats" : null, fetcher);
  const { data: txData } = useSWR(activeOrg ? "/billing/transactions" : null, fetcher);

  // --- Modal States ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedTargetPlanId, setSelectedTargetPlanId] = useState<string>("");
  const [changePlanBilling, setChangePlanBilling] = useState<"monthly" | "annual">("monthly");
  const [downloadingTx, setDownloadingTx] = useState<string | null>(null);

  useEffect(() => {
    if (!isChangePlanOpen) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/billing/plans`)
      .then((res) => res.json())
      .then((data) => { if (data.plans) setAvailablePlans(data.plans.filter((p: any) => p.id === "pro" || p.id === "business")); })
      .catch(() => {});
  }, [isChangePlanOpen]);

  // Gate: wait for org context to resolve before deciding which view to show.
  // Without this, there's a flicker: "No Organizations" empty state → then the actual
  // org detail view appears once activeOrg is restored from sessionStorage.
  if (!isReady || orgListLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  if (!activeOrg) {
    return <OrganizationsListView createOrgOpen={createOrgOpen} setCreateOrgOpen={setCreateOrgOpen} />;
  }

  const sub = billingData?.subscription;
  const plan = billingData?.plan;
  const isPaid = sub?.planId !== "starter";
  const isCanceled = sub?.status === "canceled";
  const maxBytes = plan?.maxIngestionBytes || 1;
  const currentBytes = sub?.currentMonthBytes || 0;
  const quotaPercent = Math.min((currentBytes / maxBytes) * 100, 100);
  const isNearLimit = quotaPercent > 85;
  const slugHash = md5(activeOrg.slug.trim().toLowerCase());
  const roleColors = ROLE_COLORS[activeRole || "viewer"];
  const canChangePlan = isPaid && !isCanceled && sub?.provider === "dodo" && sub?.status === "active";

  // --- Handlers (same as profile page) ---
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const res = await api.post("/billing/cancel");
      const msg = res.data?.immediateDowngrade
        ? "Subscription canceled. Downgraded to the Free Starter plan."
        : "Subscription canceled. Plan remains active until end of billing cycle.";
      toast.success(msg);
      setIsCancelModalOpen(false);
      mutateBilling();
    } catch (e: any) { toast.error(extractErrorMessage(e, "Failed to cancel subscription.")); }
    finally { setIsCanceling(false); }
  };

  const handleChangePlan = async () => {
    if (!selectedTargetPlanId) { toast.error("Please select a plan."); return; }
    const targetPlan = availablePlans.find((p: any) => p.id === selectedTargetPlanId);
    if (!targetPlan) return;
    const productId = changePlanBilling === "annual" ? targetPlan.dodoProductIdAnnual : targetPlan.dodoProductIdMonthly;
    if (!productId) { toast.error("Configuration error: Product ID missing."); return; }
    setChangePlanLoading(true);
    try {
      const res = await api.post("/billing/change-plan", { productId });
      toast.success(res.data.message || "Plan change initiated.");
      setIsChangePlanOpen(false);
      mutateBilling();
    } catch (e: any) { toast.error(extractErrorMessage(e, "Failed to change plan.")); }
    finally { setChangePlanLoading(false); }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    setDownloadingTx(transactionId);
    try {
      const res = await api.get(`/billing/transactions/${transactionId}/receipt`);
      if (res.data.url) window.open(res.data.url, "_blank");
    } catch (e: any) { toast.error(extractErrorMessage(e, "Receipt is still generating. Please check back shortly.")); }
    finally { setDownloadingTx(null); }
  };

  return (
    <>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-24">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your organization identity, view quotas, and download invoices.</p>
        </div>

        {/* 1. Identity Section — exact profile page pattern */}
        <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
          <div className="h-32 relative border-b border-border/40">
            <OrgCoverArt hash={slugHash} />
          </div>
          <CardContent className="p-6 md:p-8 pt-0 sm:pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12">
              <div className="relative shrink-0 p-1.5 bg-card rounded-2xl border border-border/60 shadow-sm">
                <img src={getGravatar(activeOrg._id)} alt="Avatar" className="h-20 w-20 rounded-xl bg-secondary object-cover" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 rounded-full bg-card items-center justify-center shadow-sm" title="Organization">
                  <Building2 className="h-4 w-4 text-primary" />
                </span>
              </div>

              <div className="flex-1 pb-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  {activeOrg.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-muted-foreground/70" />
                    <code className="text-xs font-mono bg-secondary/30 px-1.5 py-0.5 rounded">{activeOrg.slug}</code>
                    <button onClick={() => { navigator.clipboard.writeText(activeOrg.slug); toast.success("Slug copied"); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  <span className="hidden md:inline text-border/60">&bull;</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Shield className="w-4 h-4 text-muted-foreground/70" />
                    {activeRole === "owner" ? "Organization Owner" : `${activeRole?.charAt(0).toUpperCase()}${activeRole?.slice(1)}`}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-auto mt-4 md:mt-0 pb-1">
                <Badge variant="outline" className={cn("w-full md:w-auto justify-center py-2 px-5 font-semibold uppercase tracking-wider text-xs shadow-sm", roleColors?.bg, roleColors?.text, roleColors?.border)}>
                  {ROLE_ICONS[activeRole || "viewer"]}
                  <span className="ml-1.5">{activeRole}</span>
                </Badge>
              </div>
            </div>
          </CardContent>

          {/* Action Footer — same as profile page */}
          {canManageMembers && (
            <div className="border-t border-border/40 bg-muted/15 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground text-center sm:text-left leading-relaxed">
                Organization ID: <strong className="text-foreground">{activeOrg.ownerId}</strong>
              </p>
              <Button onClick={() => setEditOrgOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto border-border/60 hover:bg-secondary font-semibold text-xs h-9 px-4 shrink-0 shadow-sm">
                Edit Organization
              </Button>
            </div>
          )}
        </Card>

        {/* 2. Subscription & Quota (Decoupled Cycles) — exact profile page pattern */}
        <Card className="border-border/60 shadow-sm w-full overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-primary" /> Plan & Usage
            </CardTitle>
            {plan ? (
              <div className="flex items-center gap-2">
                {isCanceled && <Badge variant="outline" className="uppercase text-[10px] tracking-wider bg-destructive/10 text-destructive border-destructive/20 font-bold">Canceling</Badge>}
                <Badge variant="outline" className={cn("uppercase tracking-wider text-[10px] font-bold px-2.5 py-0.5 border shadow-sm", isPaid ? "bg-primary/10 text-primary border-primary/20" : "bg-background text-muted-foreground border-border/60")}>{plan.name} Tier</Badge>
              </div>
            ) : (<Spinner className="w-4 h-4 text-muted-foreground" />)}
          </CardHeader>

          <CardContent className="p-0">
            {(sub?.status === "on_hold" || sub?.status === "past_due") && (
              <div className="m-4 mb-0 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{sub.status === "on_hold" ? "Subscription On Hold" : "Payment Past Due"}</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1 leading-relaxed">
                    {sub.status === "on_hold" ? "Your most recent payment failed. Data ingestion is paused until resolved." : "Your subscription payment could not be processed. Data ingestion is paused."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/40">
              {/* Left: Billing Overview */}
              <div className="p-6 lg:w-1/2 flex flex-col bg-card">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">Billing Details</h3>
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> Subscription Status</span>
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", sub?.status === "active" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : sub?.status === "past_due" || sub?.status === "on_hold" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-destructive bg-destructive/10 border-destructive/20")}>
                      {sub?.status === "on_hold" ? "On Hold" : (sub?.status || "Unknown")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Billing Interval</span>
                    <span className="text-sm font-semibold capitalize text-foreground">{sub?.billingInterval || "Monthly"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Next Invoice Date</span>
                    <span className="text-sm font-semibold text-foreground">{sub?.billingCycleReset ? new Date(sub.billingCycleReset).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}</span>
                  </div>
                  {sub?.cancelEffectiveAt && (
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Cancels On</span>
                      <span className="text-sm font-semibold text-destructive">{new Date(sub.cancelEffectiveAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Created</span>
                    <span className="text-sm font-semibold text-foreground">{sub?.startedAt ? new Date(sub.startedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}</span>
                  </div>
                </div>

                {canManageBilling && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6">
                    {canChangePlan ? (
                      <Button variant="outline" className="w-full sm:w-auto flex-1 shadow-sm font-semibold" onClick={() => { setSelectedTargetPlanId(""); setChangePlanBilling(sub?.billingInterval || "monthly"); setIsChangePlanOpen(true); }}>
                        <ArrowUpDown className="w-3.5 h-3.5 mr-2" /> Change Plan
                      </Button>
                    ) : (
                      <Link href={isPaid ? "/pricing" : "/checkout"} className="w-full sm:w-auto flex-1">
                        <Button variant={isPaid ? "outline" : "default"} className="w-full shadow-sm font-semibold">{isPaid ? "View Plans" : "Upgrade to Pro"}</Button>
                      </Link>
                    )}
                    {isPaid && !isCanceled && (
                      <Button variant="ghost" className="w-full sm:w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium flex-1" onClick={() => setIsCancelModalOpen(true)}>Cancel Subscription</Button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Data Quota */}
              <div className="p-6 lg:w-1/2 flex flex-col bg-muted/5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">Data Ingestion Quota</h3>
                <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-2.5">
                      <span className="text-foreground font-medium flex items-center gap-1.5">Current Month Usage</span>
                      <span className="font-mono text-muted-foreground text-xs"><strong className="text-foreground font-bold text-sm">{formatBytes(currentBytes)}</strong>{" "}<span className="opacity-50">/</span>{" "}{formatBytes(maxBytes)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden border border-border/50 relative">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isNearLimit ? "bg-destructive" : "bg-primary"}`} style={{ width: `${quotaPercent}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</span>
                      {isNearLimit ? <span className="text-xs font-bold text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Approaching Limit</span> : <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Healthy</span>}
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Quota Resets On</span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">{sub?.quotaResetAt ? new Date(sub.quotaResetAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Pending"}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-6">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
                    <HardDrive className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Ingestion limits are pooled across all APM, RUM, Logs, and Tasks services under this organization. Usage automatically resets to zero on your quota reset date.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Data Breakdown (Full Width) — exact profile page pattern */}
        <Card className="border-border/60 shadow-sm w-full">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/40 flex items-center gap-2 font-bold text-lg text-foreground bg-muted/20">
              <Database className="w-5 h-5 text-blue-500" /> Data Breakdown
            </div>
            {!storageData ? (
              <div className="flex justify-center items-center h-[200px]"><Spinner className="w-6 h-6 text-muted-foreground" /></div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-foreground font-medium">Monthly Ingestion</span>
                    <span className="font-mono text-muted-foreground text-xs"><strong className="text-foreground font-bold text-sm">{formatBytes(storageData.currentMonthBytes)}</strong>{" "}<span className="opacity-50">/</span>{" "}{formatBytes(storageData.maxIngestionBytes)}</span>
                  </div>
                  <div className="flex h-2 w-full bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                    {storageData.totalCount === 0 ? <div className="w-full h-full bg-secondary/50" /> : storageData.stats.map((stat: any) => (
                      <div key={stat.service} style={{ width: `${(stat.count / storageData.totalCount) * 100}%`, backgroundColor: stat.color }} className="h-full transition-all duration-1000 ease-out" title={`${stat.service}: ${stat.count.toLocaleString()} records`} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  {storageData.stats.map((stat: any) => (
                    <div key={stat.service} className="flex flex-col p-3 rounded-lg border border-border/40 bg-card shadow-sm group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: stat.color }} />
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{stat.service}</span>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                        <span className="font-mono text-foreground font-bold text-sm">{stat.count.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs font-medium">records</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 border border-border/40 rounded-lg p-3 mt-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">Record counts reflect currently stored data across all services. Expired data is automatically purged by background TTL policies.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Billing History Table — exact profile page pattern */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center h-16 shrink-0 bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Receipt className="w-5 h-5 text-emerald-500" /> Billing History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Amount</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {!txData ? (
                  <tr><td colSpan={4} className="py-12"><Spinner className="w-6 h-6 mx-auto text-muted-foreground" /></td></tr>
                ) : txData.transactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Receipt className="w-10 h-10 opacity-20 mb-4" />
                      <p className="font-medium text-foreground">No transactions found</p>
                      <p className="text-xs mt-1">Invoices will appear here once you upgrade to a paid tier.</p>
                    </div>
                  </td></tr>
                ) : txData.transactions.map((tx: any) => (
                  <tr key={tx.transactionId} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">{new Date(tx.billedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="px-6 py-4 font-mono text-foreground whitespace-nowrap">${tx.amount.toFixed(2)} <span className="text-xs text-muted-foreground">{tx.currency}</span></td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-0", tx.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : tx.status === "refunded" ? "bg-amber-500/10 text-amber-500" : tx.status === "disputed" ? "bg-orange-500/10 text-orange-500" : "bg-destructive/10 text-destructive")}>{tx.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDownloadReceipt(tx.transactionId)} disabled={downloadingTx === tx.transactionId} className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
                        {downloadingTx === tx.transactionId ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching...</> : <>Download <ExternalLink className="w-3.5 h-3.5" /></>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 5. Members & Access (minimal section with link) */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
              <Users className="w-4 h-4 text-primary" /> Members & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Manage team members, invitations, roles, and granular resource permissions.
              </p>
              <div className="flex gap-3 shrink-0">
                <Link href="/dashboard/organization/members">
                  <Button variant="outline" className="shadow-sm font-semibold">
                    <Users className="w-3.5 h-3.5 mr-2" /> Manage Members
                    <ChevronRight className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Danger Zone — exact profile page pattern */}
        {activeRole === "owner" && (
          <div className="border border-destructive/30 rounded-xl overflow-hidden mt-12 bg-destructive/5 shadow-sm">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h3>
                <p className="text-sm text-destructive/80 mt-2 max-w-2xl leading-relaxed">
                  Permanently delete this organization, all members, invitations, and associated subscription. Resources owned by this organization will become inaccessible.{" "}
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0 transition-all font-semibold" onClick={() => setDeleteOrgOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Organization
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <EditOrgModal open={editOrgOpen} onClose={() => setEditOrgOpen(false)} org={activeOrg} onSuccess={refreshOrgs} />
      <DeleteOrgModal open={deleteOrgOpen} onClose={() => setDeleteOrgOpen(false)} org={activeOrg} />
      <CreateOrgModal open={createOrgOpen} onClose={() => setCreateOrgOpen(false)} />

      {/* Cancel Subscription Modal — exact profile page pattern */}
      <Dialog open={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Subscription">
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed shadow-sm">
            <strong className="block text-amber-600 dark:text-amber-500 mb-1 font-bold">Downgrade Confirmation</strong>
            Canceling your subscription will downgrade this organization to the Free Starter plan at the end of your current billing cycle. You will lose access to advanced features, extended retention, and increased ingestion limits.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} disabled={isCanceling}>Keep Plan</Button>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={handleCancelSubscription} disabled={isCanceling}>
              {isCanceling ? <><Spinner className="mr-2 w-4 h-4" /> Processing...</> : "Yes, Cancel Plan"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Change Plan Modal — exact profile page pattern */}
      <Dialog open={isChangePlanOpen} onClose={() => setIsChangePlanOpen(false)} title="Change Plan">
        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Billing Interval</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setChangePlanBilling("monthly")} className={cn("p-2.5 rounded-lg border text-left text-sm font-semibold transition-all", changePlanBilling === "monthly" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-foreground/30")}>Monthly</button>
              <button onClick={() => setChangePlanBilling("annual")} className={cn("p-2.5 rounded-lg border text-left text-sm font-semibold transition-all relative", changePlanBilling === "annual" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-foreground/30")}>
                Annual <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg">-20%</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Select Plan</label>
            <div className="space-y-2">
              {availablePlans.map((p: any) => {
                const isCurrent = p.id === sub?.planId && changePlanBilling === sub?.billingInterval;
                const displayPrice = changePlanBilling === "annual" ? Math.floor(p.priceAnnual / 12) : p.priceMonthly;
                return (
                  <button key={p.id} onClick={() => !isCurrent && setSelectedTargetPlanId(p.id)} disabled={isCurrent} className={cn("w-full p-4 rounded-lg border flex items-center justify-between transition-all", isCurrent ? "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed" : selectedTargetPlanId === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-foreground/30")}>
                    <div className="text-left">
                      <span className="font-bold text-sm text-foreground">{p.name}</span>
                      {isCurrent && <span className="ml-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">Current</span>}
                      <p className="text-xs text-muted-foreground mt-0.5">Up to {(p.maxIngestionBytes / (1024 * 1024 * 1024))}GB pooled ingestion</p>
                    </div>
                    <span className="font-bold text-foreground">${displayPrice}<span className="text-[10px] text-muted-foreground font-medium">/mo</span></span>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedTargetPlanId && (() => {
            const currentPlan = availablePlans.find((p: any) => p.id === sub?.planId);
            const targetPlan = availablePlans.find((p: any) => p.id === selectedTargetPlanId);
            if (!currentPlan || !targetPlan) return null;
            const isUpgrade = targetPlan.priceMonthly > currentPlan.priceMonthly;
            return (
              <div className={cn("p-3 rounded-lg border text-xs leading-relaxed", isUpgrade ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400")}>
                {isUpgrade ? "You will be charged a prorated amount for the remainder of your current billing cycle." : "Unused credit from your current plan will be applied to future renewals."}
              </div>
            );
          })()}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsChangePlanOpen(false)} disabled={changePlanLoading}>Cancel</Button>
            <Button onClick={handleChangePlan} disabled={changePlanLoading || !selectedTargetPlanId}>
              {changePlanLoading ? <><Spinner className="mr-2 w-4 h-4" /> Processing...</> : "Confirm Plan Change"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ============================================================================
// ORGANIZATIONS LIST VIEW (Personal Account — no org selected)
// ============================================================================

function OrganizationsListView({ createOrgOpen, setCreateOrgOpen }: { createOrgOpen: boolean; setCreateOrgOpen: (v: boolean) => void }) {
  const { organizations, setActiveOrg, refreshOrgs } = useOrg();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrgs();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header — APM pattern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
            {organizations.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background border-border/60">
                {organizations.length} org{organizations.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Create, manage, and switch between your team workspaces.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button onClick={() => setCreateOrgOpen(true)} className="font-semibold shrink-0 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Create Organization
          </Button>
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"><Building2 className="h-8 w-8 text-primary" /></div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Organizations Yet</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">Organizations let you share resources, collaborate with your team, and manage access permissions across all your observability services.</p>
            <Button onClick={() => setCreateOrgOpen(true)} className="font-semibold shadow-sm"><Building2 className="h-4 w-4 mr-2" /> Create Your First Organization</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider"><Building2 className="w-4 h-4 text-primary" /> Your Organizations</CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background border-border/60">{organizations.length} org{organizations.length !== 1 ? "s" : ""}</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Organization</th>
                  <th className="px-6 py-3.5 font-semibold">Your Role</th>
                  <th className="px-6 py-3.5 font-semibold">Created</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const rc = ROLE_COLORS[org.role || "viewer"];
                  return (
                    <tr key={org._id} className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setActiveOrg(org)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={getGravatar(org._id)} fallback={org.name.substring(0, 2).toUpperCase()} className="h-9 w-9" />
                          <div><p className="text-foreground font-semibold">{org.name}</p><p className="text-xs text-muted-foreground font-mono">{org.slug}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize", rc.bg, rc.text, rc.border)}>{ROLE_ICONS[org.role || "viewer"]}{org.role}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">{new Date(org.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold h-8 gap-1.5" onClick={(e) => { e.stopPropagation(); setActiveOrg(org); }}>Switch <ChevronRight className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <CreateOrgModal open={createOrgOpen} onClose={() => setCreateOrgOpen(false)} />
    </div>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function CreateOrgModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshOrgs, setActiveOrg } = useOrg();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50));
  };

  useEffect(() => { if (open) { setName(""); setSlug(""); setError(null); } }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/org", { name: name.trim(), slug: slug.trim() });
      toast.success("Organization created");
      await refreshOrgs();
      if (data.organization) setActiveOrg(data.organization);
      onClose();
    } catch (e: any) { setError(extractErrorMessage(e, "Failed to create organization")); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Organization">
      <div className="space-y-4">
        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization Name</label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Inc" maxLength={100} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">URL Slug</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="acme-inc" maxLength={50} />
          <p className="text-xs text-muted-foreground">Used in URLs. Lowercase, alphanumeric, hyphens only.</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !slug.trim()}>{loading ? <><Spinner className="mr-2 h-4 w-4" /> Creating...</> : "Create Organization"}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditOrgModal({ open, onClose, org, onSuccess }: { open: boolean; onClose: () => void; org: any; onSuccess: () => void }) {
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setName(org.name); setSlug(org.slug); setError(null); } }, [open, org]);

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try { await api.put(`/org/${org._id}`, { name: name.trim(), slug: slug.trim() }); toast.success("Organization updated"); onSuccess(); onClose(); }
    catch (e: any) { setError(extractErrorMessage(e, "Failed to update organization")); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit Organization">
      <div className="space-y-4">
        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        <div className="space-y-2"><label className="text-sm font-medium">Organization Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">URL Slug</label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={50} /></div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? <><Spinner className="mr-2 h-4 w-4" /> Saving...</> : "Save Changes"}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function DeleteOrgModal({ open, onClose, org }: { open: boolean; onClose: () => void; org: any }) {
  const [confirmSlug, setConfirmSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshOrgs, setActiveOrg } = useOrg();
  useEffect(() => { if (open) { setConfirmSlug(""); setError(null); } }, [open]);

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try { await api.delete(`/org/${org._id}`, { data: { confirmSlug } }); toast.success("Organization deleted"); setActiveOrg(null); await refreshOrgs(); onClose(); }
    catch (e: any) { setError(extractErrorMessage(e, "Failed to delete organization")); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Delete Organization">
      <div className="space-y-5">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm text-destructive leading-relaxed shadow-sm">
          <strong className="block mb-1 font-bold">Catastrophic Action Warning</strong>
          This will permanently delete the organization, remove all members, revoke all invitations, and delete the associated subscription. Resources owned by this organization will become inaccessible.
        </div>
        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">To confirm, type the organization slug: <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 select-all">{org.slug}</span></label>
          <Input placeholder={org.slug} value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} className="font-mono text-sm" autoComplete="off" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="bg-destructive hover:bg-destructive/90 text-white shadow-sm" onClick={handleSubmit} disabled={loading || confirmSlug !== org.slug}>{loading ? <><Spinner className="mr-2 h-4 w-4" /> Deleting...</> : "Permanently Delete"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
