import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
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
} from "../../components/Core";
import { useAuth, api } from "../../lib/auth";
import { toast } from "sonner";
import {
  User as UserIcon,
  LogOut,
  CreditCard,
  Database,
  Receipt,
  AlertTriangle,
  Trash2,
  Download,
  ShieldAlert,
  HardDrive,
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle,
  Activity,
  Clock,
  RefreshCw,
  Mail,
  Shield,
} from "lucide-react";
import { extractErrorMessage } from "@/utils/axiosError";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Utility to format bytes beautifully
const formatBytes = (bytes: number = 0, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// ============================================================================
// ENTERPRISE GENERATIVE ART (Observability Blueprint)
// Generates a 100% unique, technical background banner for every user based
// on their email hash. Built using sharp, structural SVG mathematics.
// ============================================================================
const DeterministicCoverArt = ({ hash }: { hash: string }) => {
  // Parse the 32-character hex hash into an array of integers (0-255)
  const bytes = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) =>
      parseInt(hash.substring(i * 2, i * 2 + 2), 16),
    );
  }, [hash]);

  // Enterprise tech palettes
  const palettes = [
    ["#3b82f6", "#10b981"], // Blue/Emerald
    ["#8b5cf6", "#06b6d4"], // Violet/Cyan
    ["#f59e0b", "#ef4444"], // Amber/Red
    ["#14b8a6", "#6366f1"], // Teal/Indigo
    ["#64748b", "#94a3b8"], // Slate (Monochrome)
  ];

  const theme = palettes[bytes[0] % palettes.length];
  const c1 = theme[0];
  const c2 = theme[1];

  // Draw deterministic intersecting geometric SVG shapes (Stroked for Blueprint look)
  const shapes = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const b1 = bytes[(i * 3) % 16];
      const b2 = bytes[(i * 3 + 1) % 16];
      const b3 = bytes[(i * 3 + 2) % 16];

      const type = b1 % 3; // 0: circle, 1: rect, 2: polygon
      const x = (b2 / 255) * 800; // Map 0-255 to 0-800
      const y = (b3 / 255) * 200; // Map 0-255 to 0-200
      const size = 30 + (b1 % 80); // 30 to 110
      const color = b3 % 2 === 0 ? c1 : c2;

      return { type, x, y, size, color, seed: b1 };
    });
  }, [bytes, c1, c2]);

  // Distributed Tracing Nodes (3 connected nodes based on hash)
  const traceNodes = useMemo(() => {
    return [
      { x: 50 + (bytes[1] % 200), y: 30 + (bytes[2] % 140) },
      { x: 300 + (bytes[3] % 200), y: 30 + (bytes[4] % 140) },
      { x: 550 + (bytes[5] % 200), y: 30 + (bytes[6] % 140) },
    ];
  }, [bytes]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-muted/10 border-b border-border/40">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 200"
      >
        <defs>
          <pattern
            id={`grid-${hash}`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-foreground/5"
            />
          </pattern>
        </defs>

        {/* 1. BASE: Foundation Grid */}
        <rect width="100%" height="100%" fill={`url(#grid-${hash})`} />

        {/* 2. MID: Architectural Geometry (Hollow Blueprint Style) */}
        {shapes.map((s, i) => {
          if (s.type === 0) {
            return (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.size}
                fill={s.color}
                fillOpacity="0.02"
                stroke={s.color}
                strokeWidth="1.5"
                strokeOpacity="0.2"
              />
            );
          } else if (s.type === 1) {
            return (
              <rect
                key={i}
                x={s.x - s.size / 2}
                y={s.y - s.size / 2}
                width={s.size}
                height={s.size}
                fill={s.color}
                fillOpacity="0.02"
                stroke={s.color}
                strokeWidth="1.5"
                strokeOpacity="0.2"
                transform={`rotate(${s.seed} ${s.x} ${s.y})`}
              />
            );
          } else {
            const p1 = `${s.x},${s.y - s.size}`;
            const p2 = `${s.x + s.size},${s.y + s.size / 2}`;
            const p3 = `${s.x - s.size},${s.y + s.size / 2}`;
            return (
              <polygon
                key={i}
                points={`${p1} ${p2} ${p3}`}
                fill={s.color}
                fillOpacity="0.02"
                stroke={s.color}
                strokeWidth="1.5"
                strokeOpacity="0.2"
                transform={`rotate(${s.seed * 2} ${s.x} ${s.y})`}
              />
            );
          }
        })}

        {/* 3. FOREGROUND: Observability Elements */}

        {/* A. Distributed Tracing Graph */}
        <g opacity="0.5">
          <polyline
            points={`${traceNodes[0].x},${traceNodes[0].y} ${traceNodes[1].x},${traceNodes[1].y} ${traceNodes[2].x},${traceNodes[2].y}`}
            fill="none"
            stroke={c1}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {traceNodes.map((n, i) => (
            <g key={i} transform={`translate(${n.x}, ${n.y})`}>
              <circle
                cx="0"
                cy="0"
                r="4.5"
                fill="hsl(var(--background))"
                stroke={c1}
                strokeWidth="2"
              />
              <circle cx="0" cy="0" r="1.5" fill={c1} />
            </g>
          ))}
        </g>

        {/* B. Metrics Sparkline (Bar chart) */}
        <g
          transform={`translate(${600 + (bytes[7] % 100)}, ${120 + (bytes[8] % 40)})`}
          opacity="0.4"
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const h = 5 + (bytes[9 + i] % 25); // Heights between 5 and 30
            return (
              <rect
                key={i}
                x={i * 8}
                y={30 - h}
                width="4"
                height={h}
                fill={c2}
                rx="1"
              />
            );
          })}
          <line
            x1="-5"
            y1="32"
            x2="52"
            y2="32"
            stroke={c2}
            strokeWidth="1.5"
            opacity="0.4"
          />
        </g>

        {/* C. Terminal/Logs Context */}
        <g
          transform={`translate(${100 + (bytes[10] % 200)}, ${130 + (bytes[11] % 40)})`}
          opacity="0.3"
        >
          <text
            x="0"
            y="0"
            fontFamily="monospace"
            fontSize="24"
            fill={c1}
            fontWeight="bold"
          >{`{`}</text>
          <text
            x="25"
            y="0"
            fontFamily="monospace"
            fontSize="24"
            fill={c2}
            fontWeight="bold"
          >{`}`}</text>
          {/* Simulated syntax lines inside brackets */}
          <rect x="8" y="-12" width="12" height="2" fill={c1} opacity="0.5" />
          <rect x="8" y="-6" width="8" height="2" fill={c2} opacity="0.5" />
        </g>

        {/* D. Fast Data Stream Line */}
        <line
          x1="0"
          y1={bytes[12] % 200}
          x2="800"
          y2={bytes[12] % 200}
          stroke={c2}
          strokeWidth="1"
          opacity="0.25"
          strokeDasharray="15 10 5 10"
        />

        {/* E. Telemetry Crosshairs */}
        <g
          transform={`translate(${bytes[13] * 3}, ${bytes[14] % 200})`}
          opacity="0.5"
        >
          <line x1="-15" y1="0" x2="15" y2="0" stroke={c1} strokeWidth="1.5" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke={c1} strokeWidth="1.5" />
          <circle
            cx="0"
            cy="0"
            r="10"
            fill="none"
            stroke={c2}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </g>
      </svg>

      {/* 4. Vignette Fade into Card background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-90" />
    </div>
  );
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // --- SWR Data Fetching ---
  const { data: billingData, mutate: mutateBilling } = useSWR(
    "/billing/subscription",
    fetcher,
  );
  const { data: storageData } = useSWR("/billing/storage-stats", fetcher);
  const { data: txData } = useSWR("/billing/transactions", fetcher);

  // --- Modal States ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // --- Loading States ---
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [downloadingTx, setDownloadingTx] = useState<string | null>(null);

  if (!user) return null;

  const sub = billingData?.subscription;
  const plan = billingData?.plan;

  const isPaid = sub?.planId !== "starter";
  const isCanceled = sub?.status === "canceled";

  // Quota Calculations
  const maxBytes = plan?.maxIngestionBytes || 1; // Prevent division by zero
  const currentBytes = sub?.currentMonthBytes || 0;
  const quotaPercent = Math.min((currentBytes / maxBytes) * 100, 100);
  const isNearLimit = quotaPercent > 85;

  const emailHash = md5(
    (user.email || "guest@senzor.dev").trim().toLowerCase(),
  );
  const getGravatar = (email: string) =>
    `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

  // --- Handlers ---
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await api.post("/billing/cancel");
      toast.success("Subscription canceled successfully.");
      setIsCancelModalOpen(false);
      mutateBilling();
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to cancel subscription."));
    } finally {
      setIsCanceling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user.email) {
      toast.error("Email does not match.");
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete("/user/account", { data: { confirmEmail } });
      toast.success("Account permanently deleted.");
      setIsDeleteModalOpen(false);
      logout(); // This will automatically redirect to home
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to delete account."));
      setIsDeleting(false);
    }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    setDownloadingTx(transactionId);
    try {
      // The API handles both cached URLs and JIT Dodo Payments receipt fetching
      const res = await api.get(
        `/billing/transactions/${transactionId}/receipt`,
      );
      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (e: any) {
      toast.error(
        extractErrorMessage(
          e,
          "Receipt is still generating. Please check back shortly.",
        ),
      );
    } finally {
      setDownloadingTx(null);
    }
  };

  return (
    <>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your identity, view quotas, and download invoices.
          </p>
        </div>

        {/* 1. Identity Section */}
        <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
          {/* Dynamic Geometric Header */}
          <div className="h-32 relative border-b border-border/40">
            <DeterministicCoverArt hash={emailHash} />
          </div>
          <CardContent className="p-6 md:p-8 pt-0 sm:pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12">
              <div className="relative shrink-0 p-1.5 bg-card rounded-2xl border border-border/60 shadow-sm">
                <img
                  src={getGravatar(user.email || "")}
                  alt="Avatar"
                  className="h-20 w-20 rounded-xl bg-secondary object-cover"
                />
                {!user.isDemo && !user.emailVerified ? (
                  <span
                    className="absolute -top-2 -right-2 flex h-5 w-5 rounded-full bg-amber-500 border-2 border-card items-center justify-center shadow-sm"
                    title="Email Unverified"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  </span>
                ) : (
                  <span
                    className="absolute -top-2 -right-2 flex h-6 w-6 rounded-full bg-card items-center justify-center shadow-sm"
                    title="Verified Account"
                  >
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </span>
                )}
              </div>

              <div className="flex-1 pb-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  {user.displayName || "Senzor Administrator"}
                  {user.isDemo && (
                    <Badge
                      variant="warning"
                      className="text-[10px] uppercase tracking-wider py-0 h-5"
                    >
                      Demo Mode
                    </Badge>
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-4 h-4 text-muted-foreground/70" />
                    {user.email}
                  </span>
                  <span className="hidden md:inline text-border/60">•</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground/70" />
                    {user.isDemo ? "Demo Viewer" : "Organization Owner"}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-auto mt-4 md:mt-0 pb-1">
                {!user.isDemo && !user.emailVerified ? (
                  <Badge
                    variant="outline"
                    className="w-full md:w-auto justify-center bg-amber-500/10 text-amber-500 border-amber-500/20 py-2 px-5 font-semibold uppercase tracking-wider text-xs shadow-sm"
                  >
                    Verification Required
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="w-full md:w-auto justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-2 px-5 font-semibold uppercase tracking-wider text-xs shadow-sm"
                  >
                    Account Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>

          {/* Action Footer for Session Management */}
          <div className="border-t border-border/40 bg-muted/15 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left leading-relaxed">
              You are currently authenticated as{" "}
              <strong className="text-foreground">{user.email}</strong>. Sign
              out to end your session.
            </p>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-border/60 hover:bg-destructive hover:text-white hover:border-destructive transition-all font-semibold text-xs h-9 px-4 shrink-0 shadow-sm flex items-center justify-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </Card>

        {/* 2. Subscription & Quota (Decoupled Cycles) */}
        <Card className="border-border/60 shadow-sm w-full overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-primary" /> Plan & Usage
            </CardTitle>
            {plan ? (
              <div className="flex items-center gap-2">
                {isCanceled && (
                  <Badge
                    variant="outline"
                    className="uppercase text-[10px] tracking-wider bg-destructive/10 text-destructive border-destructive/20 font-bold"
                  >
                    Canceling
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "uppercase tracking-wider text-[10px] font-bold px-2.5 py-0.5 border shadow-sm",
                    isPaid
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-background text-muted-foreground border-border/60",
                  )}
                >
                  {plan.name} Tier
                </Badge>
              </div>
            ) : (
              <Spinner className="w-4 h-4 text-muted-foreground" />
            )}
          </CardHeader>

          <CardContent className="p-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/40">
            {/* Left: Billing Overview */}
            <div className="p-6 lg:w-1/2 flex flex-col bg-card">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">
                Billing Details
              </h3>

              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Subscription Status
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider",
                      sub?.status === "active"
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        : sub?.status === "past_due" || sub?.status === "on_hold"
                          ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                          : "text-destructive bg-destructive/10 border-destructive/20",
                    )}
                  >
                    {sub?.status === "on_hold" ? "On Hold" : (sub?.status || "Unknown")}
                  </Badge>
                </div>

                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Billing Interval
                  </span>
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {sub?.billingInterval || "Monthly"}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Next Invoice Date
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {sub?.billingCycleReset
                      ? new Date(sub.billingCycleReset).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )
                      : "N/A"}
                  </span>
                </div>

                {sub?.cancelEffectiveAt && (
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Cancels On
                    </span>
                    <span className="text-sm font-semibold text-destructive">
                      {new Date(sub.cancelEffectiveAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Member Since
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {sub?.startedAt
                      ? new Date(sub.startedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6">
                <Link href="/pricing" className="w-full sm:w-auto flex-1">
                  <Button
                    variant={isPaid ? "outline" : "default"}
                    className="w-full shadow-sm font-semibold"
                  >
                    {isPaid ? "View Available Plans" : "Upgrade to Pro"}
                  </Button>
                </Link>
                {isPaid && !isCanceled && (
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium flex-1"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Data Quota */}
            <div className="p-6 lg:w-1/2 flex flex-col bg-muted/5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">
                Data Ingestion Quota
              </h3>

              <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2.5">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      Current Month Usage
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      <strong className="text-foreground font-bold text-sm">
                        {formatBytes(currentBytes)}
                      </strong>{" "}
                      <span className="opacity-50">/</span>{" "}
                      {formatBytes(maxBytes)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden border border-border/50 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isNearLimit ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Status
                    </span>
                    {isNearLimit ? (
                      <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Approaching
                        Limit
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Healthy
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Quota Resets On
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {sub?.quotaResetAt
                        ? new Date(sub.quotaResetAt).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "short", day: "numeric" },
                          )
                        : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
                  <HardDrive className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ingestion limits are pooled across all APM, RUM, Logs, and
                    Tasks services. Usage automatically resets to zero on your
                    quota reset date.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Database Footprint Estimator (Full Width) */}
        <Card className="border-border/60 shadow-sm w-full">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/40 flex items-center gap-2 font-bold text-lg text-foreground bg-muted/20">
              <Database className="w-5 h-5 text-blue-500" /> Database Footprint
            </div>

            {!storageData ? (
              <div className="flex justify-center items-center h-[200px]">
                <Spinner className="w-6 h-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-foreground font-medium">
                      Estimated Disk Usage
                    </span>
                    <span className="font-mono text-foreground font-bold text-sm">
                      {formatBytes(storageData.totalCalculatedBytes)}
                    </span>
                  </div>
                  {/* Enterprise Stacked Progress Bar */}
                  <div className="flex h-2 w-full bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                    {storageData.totalCalculatedBytes === 0 ? (
                      <div className="w-full h-full bg-secondary/50" />
                    ) : (
                      storageData.stats.map((stat: any) => (
                        <div
                          key={stat.service}
                          style={{
                            width: `${(stat.bytes / storageData.totalCalculatedBytes) * 100}%`,
                            backgroundColor: stat.color,
                          }}
                          className="h-full transition-all duration-1000 ease-out"
                          title={`${stat.service}: ${formatBytes(stat.bytes)}`}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  {storageData.stats.map((stat: any) => (
                    <div
                      key={stat.service}
                      className="flex flex-col p-3 rounded-lg border border-border/40 bg-card shadow-sm group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {stat.service}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                        <span className="text-muted-foreground font-mono text-xs">
                          {stat.count.toLocaleString()} rows
                        </span>
                        <span className="font-mono text-foreground font-bold text-sm">
                          {formatBytes(stat.bytes, 1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/30 border border-border/40 rounded-lg p-3 mt-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Footprint represents actively stored data size on disk.
                    Expired data is automatically purged by background TTL
                    policies and will not reflect here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Billing History Table */}
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
                  <th className="px-6 py-3.5 text-right font-semibold">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody>
                {!txData ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <Spinner className="w-6 h-6 mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : txData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16">
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Receipt className="w-10 h-10 opacity-20 mb-4" />
                        <p className="font-medium text-foreground">
                          No transactions found
                        </p>
                        <p className="text-xs mt-1">
                          Invoices will appear here once you upgrade to a paid
                          tier.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  txData.transactions.map((tx: any) => (
                    <tr
                      key={tx.transactionId}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                        {new Date(tx.billedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-foreground whitespace-nowrap">
                        ${tx.amount.toFixed(2)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {tx.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-0",
                            tx.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : tx.status === "refunded"
                                ? "bg-amber-500/10 text-amber-500"
                                : tx.status === "disputed"
                                  ? "bg-orange-500/10 text-orange-500"
                                  : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            handleDownloadReceipt(tx.transactionId)
                          }
                          disabled={downloadingTx === tx.transactionId}
                          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingTx === tx.transactionId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                              Fetching...
                            </>
                          ) : (
                            <>
                              Download <ExternalLink className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 5. Danger Zone */}
        <div className="border border-destructive/30 rounded-xl overflow-hidden mt-12 bg-destructive/5 shadow-sm">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h3>
              <p className="text-sm text-destructive/80 mt-2 max-w-2xl leading-relaxed">
                Permanently delete your account, configuration planes, API keys,
                and trigger a cascade deletion of all operational telemetry.{" "}
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0 transition-all font-semibold"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Cancel Subscription Modal */}
      <Dialog
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed shadow-sm">
            <strong className="block text-amber-600 dark:text-amber-500 mb-1 font-bold">
              Downgrade Confirmation
            </strong>
            Canceling your subscription will downgrade you to the Free Starter
            plan at the end of your current billing cycle. You will lose access
            to advanced features, extended retention, and increased ingestion
            limits.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCanceling}
            >
              Keep Plan
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" /> Processing...
                </>
              ) : (
                "Yes, Cancel Plan"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-5">
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm text-destructive leading-relaxed shadow-sm">
            <strong className="block mb-1 font-bold">
              Catastrophic Action Warning
            </strong>
            This will permanently purge your user identity, billing data, API
            keys, and active configurations. Ingestion will halt immediately.
            All associated telemetry will be orphaned and purged automatically.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              To confirm, type your email:{" "}
              <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 select-all">
                {user.email}
              </span>
            </label>
            <Input
              placeholder={user.email || ""}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white shadow-sm"
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail !== user.email}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" /> Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
