import React from "react";
import {
  Server,
  Globe,
  Activity,
  Code,
  Workflow,
  Database,
  Terminal,
  LayoutTemplate,
  BellRing,
  AlertOctagon,
  Bot,
  Zap,
  CheckCircle2,
  Search,
  Box,
  MousePointerClick,
  Layout,
  Layers,
  Mail,
  ArrowUpRight,
  TrendingUp,
  Flame,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureData {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly points: readonly string[];
  readonly diagramId: string;
  readonly href: string;
  readonly colorClasses: string;
}

// ============================================================================
// DIAGRAM PRIMITIVES — Reusable building blocks mirroring the actual product UI
// ============================================================================

/** Status badge style presets matching the real Senzor dashboard */
const BADGE_STYLE = {
  online: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  live: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  active: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  tracking: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  custom: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  armed: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  duration: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  uptime: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
} as const;

/** Clean card frame matching the real product dashboard cards */
const DiagramFrame = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`w-full h-full bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:scale-[1.015] hover:border-border transition-all duration-300 ease-out ${className}`}
  >
    {children}
  </div>
);

/** Card header bar with title, optional leading icon, and status badge */
const FrameHeader = ({
  title,
  icon,
  badge,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: { label: string; style: string; pulse?: boolean };
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20 shrink-0">
    <div className="flex items-center gap-2 min-w-0">
      {icon}
      <span className="text-xs font-semibold font-mono text-foreground truncate">
        {title}
      </span>
    </div>
    {badge && (
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1.5 shrink-0 ${badge.style}`}
      >
        {badge.pulse && <PulseDot />}
        {badge.label}
      </span>
    )}
  </div>
);

/** Animated pulsing dot for live/active status indicators */
const PulseDot = ({ className }: { className?: string } = {}) => {
  const bg = className || "bg-[currentColor]";
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bg}`}
      />
      <span
        className={`relative inline-flex rounded-full h-1.5 w-1.5 ${bg}`}
      />
    </span>
  );
};

/** Progress bar metric row — mirrors CPU/Memory/Disk rows in server dashboard */
const MetricRow = ({
  label,
  value,
  percent,
  barClass,
  valueClass,
  delay = 0,
}: {
  label: string;
  value: string;
  percent: number;
  barClass: string;
  valueClass: string;
  delay?: number;
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs font-mono text-muted-foreground">
      <span>{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full origin-left animate-[diag-fill-x_0.8s_ease-out_both] ${barClass}`}
        style={{ width: `${percent}%`, animationDelay: `${delay}s` }}
      />
    </div>
  </div>
);

/** Compact stat card for metric grids — mirrors the ApmView stat cards */
const StatCard = ({
  label,
  value,
  valueClass = "text-foreground",
  icon,
  trend,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) => (
  <div className="bg-background border border-border/50 rounded-lg p-2.5 flex flex-col gap-1 shadow-sm">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="flex items-end gap-1.5">
      <span
        className={`text-lg font-bold font-mono leading-none ${valueClass}`}
      >
        {value}
      </span>
      {trend && (
        <span
          className={`text-[8px] font-bold flex items-center gap-0.5 mb-0.5 ${trend.positive ? "text-emerald-500" : "text-red-500"}`}
        >
          <ArrowUpRight
            className={`w-2.5 h-2.5 ${!trend.positive ? "rotate-90" : ""}`}
          />
          {trend.value}
        </span>
      )}
    </div>
  </div>
);

/** Shimmer overlay that sweeps across a container for a polished live-data feel */
const ShimmerOverlay = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
    <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent animate-[diag-shimmer_6s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
  </div>
);

// ============================================================================
// DIAGRAM DATA CONSTANTS
// ============================================================================

const TRAFFIC_HEIGHTS = [40, 70, 45, 90, 65, 80, 55];
const TRAFFIC_COLORS = [
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-rose-500",
];

const QUERY_LATENCIES = [12, 15, 14, 45, 80, 22, 14, 13, 15, 12, 110, 14, 12];

const TRACE_SPANS = [
  {
    offset: 0,
    width: 100,
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    label: "GET /api/checkout/process",
  },
  {
    offset: 10,
    width: 25,
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    label: "AUTH.validateToken",
  },
  {
    offset: 35,
    width: 15,
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    label: "CACHE.getSession",
  },
  {
    offset: 50,
    width: 35,
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    label: "DB.query.users",
  },
  {
    offset: 55,
    width: 15,
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "HTTP /stripe/charge",
  },
  {
    offset: 85,
    width: 10,
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    label: "PUBLISH.event",
  },
];

const RUM_WATERFALL = [
  {
    label: "document",
    offset: 0,
    width: 55,
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "styles.css",
    offset: 12,
    width: 22,
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "app.js",
    offset: 18,
    width: 42,
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "/api/user",
    offset: 38,
    width: 30,
    bg: "bg-purple-500/20",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  {
    label: "fonts.woff2",
    offset: 48,
    width: 20,
    bg: "bg-pink-500/20",
    border: "border-pink-500/30",
    text: "text-pink-600 dark:text-pink-400",
  },
];

const OTEL_SERVICES = [
  {
    label: "Go Service",
    color: "text-blue-500",
    hoverBorder: "hover:border-blue-500/50",
  },
  {
    label: "Java Service",
    color: "text-orange-500",
    hoverBorder: "hover:border-orange-500/50",
  },
  {
    label: "Python Worker",
    color: "text-yellow-500",
    hoverBorder: "hover:border-yellow-500/50",
  },
];

const MCP_ORBIT_NODES: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pos: string;
}[] = [
  { icon: Database, color: "text-blue-500", pos: "top-[12%] left-[18%]" },
  { icon: Server, color: "text-emerald-500", pos: "bottom-[18%] left-[12%]" },
  { icon: Globe, color: "text-pink-500", pos: "top-[8%] right-[22%]" },
  {
    icon: Workflow,
    color: "text-indigo-500",
    pos: "bottom-[12%] right-[18%]",
  },
  { icon: Code, color: "text-orange-500", pos: "top-[42%] left-[6%]" },
  {
    icon: LayoutTemplate,
    color: "text-teal-500",
    pos: "top-[42%] right-[6%]",
  },
  { icon: BellRing, color: "text-rose-500", pos: "bottom-[38%] right-[25%]" },
  { icon: Terminal, color: "text-amber-500", pos: "bottom-[35%] left-[25%]" },
];

// ============================================================================
// ENTERPRISE DIAGRAM COMPONENTS — Each mirrors the actual Senzor dashboard
// ============================================================================

/** Saved Views — Mini dashboard canvas with stat cards, bar chart, and donut */
const DiagramViews = () => (
  <DiagramFrame className="relative">
    <ShimmerOverlay />
    <FrameHeader
      title="Production Overview"
      badge={{ label: "CUSTOM", style: BADGE_STYLE.custom }}
    />
    <div className="flex-1 p-3 grid grid-cols-3 grid-rows-[auto_1fr] gap-2.5">
      <StatCard
        label="Requests"
        value="14.2k"
        icon={<Zap className="w-3 h-3 text-orange-500" />}
        trend={{ value: "12%", positive: true }}
      />
      <StatCard
        label="Error Rate"
        value="0.4%"
        valueClass="text-emerald-500"
        icon={<AlertOctagon className="w-3 h-3 text-red-500" />}
        trend={{ value: "0.1%", positive: false }}
      />
      <StatCard
        label="Avg Latency"
        value="124ms"
        valueClass="text-blue-500"
        icon={<Activity className="w-3 h-3 text-blue-500" />}
        trend={{ value: "8ms", positive: false }}
      />

      {/* 7-Day Traffic bar chart with grow animation */}
      <div className="col-span-2 bg-background border border-border/50 rounded-lg p-3 flex flex-col shadow-sm">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          7-Day Traffic
        </span>
        <div className="flex-1 flex items-end gap-1.5">
          {TRAFFIC_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={`flex-1 ${TRAFFIC_COLORS[i]} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity origin-bottom animate-[diag-bar-grow_0.6s_ease-out_both]`}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Uptime donut */}
      <div className="col-span-1 bg-background border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center shadow-sm">
        <div className="relative w-14 h-14">
          <svg
            viewBox="0 0 36 36"
            className="w-full h-full fill-transparent"
            strokeWidth="3.5"
            strokeLinecap="round"
          >
            <circle cx="18" cy="18" r="16" className="stroke-muted" />
            <circle
              cx="18"
              cy="18"
              r="16"
              className="stroke-teal-500"
              strokeDasharray="75 100"
              style={{
                strokeDashoffset: 75,
                animation: "diag-line-draw 1.2s ease-out 0.3s forwards",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-600 dark:text-teal-400">
            75%
          </div>
        </div>
        <span className="text-[8px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">
          Uptime
        </span>
      </div>
    </div>
  </DiagramFrame>
);

/** APM — Trace waterfall with animated span bars and type colors */
const DiagramApm = () => (
  <DiagramFrame>
    <FrameHeader
      title="Trace: a8f9c0e2..."
      badge={{ label: "124.5ms", style: BADGE_STYLE.duration }}
    />
    <div className="flex-1 p-4 flex flex-col gap-2 justify-center overflow-hidden">
      {TRACE_SPANS.map((span, i) => (
        <div key={i} className="relative h-[22px] w-full flex items-center">
          <div
            className={`absolute h-[18px] ${span.bg} ${span.border} border rounded-sm origin-left animate-[diag-fill-x_0.5s_ease-out_both]`}
            style={{
              left: `${span.offset}%`,
              width: `${span.width}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
          <span
            className={`absolute text-[10px] font-mono font-bold ${span.text} truncate animate-[diag-fade-in-up_0.3s_ease-out_both]`}
            style={{
              left: `${span.offset + 2}%`,
              maxWidth: `${Math.max(span.width - 4, 0)}%`,
              animationDelay: `${i * 0.1 + 0.2}s`,
            }}
          >
            {span.label}
          </span>
        </div>
      ))}
    </div>
  </DiagramFrame>
);

/** OpenTelemetry — Service→Collector ingestion flow with animated data dots */
const DiagramOTel = () => (
  <DiagramFrame className="relative">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px]" />

    <div className="flex-1 flex w-full items-center justify-between px-6 relative z-10 max-w-sm mx-auto">
      {/* Service nodes */}
      <div className="flex flex-col gap-3.5">
        {OTEL_SERVICES.map((svc, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 bg-background border border-border rounded-md text-[10px] font-mono font-bold shadow-sm flex items-center gap-2 transition-colors hover:shadow-md ${svc.hoverBorder} animate-[diag-fade-in-up_0.4s_ease-out_both]`}
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <Box className={`w-3 h-3 ${svc.color}`} /> {svc.label}
          </div>
        ))}
      </div>

      {/* Dashed connection lines with animated flow dots */}
      <div className="flex-1 flex flex-col justify-center items-center mx-2 relative">
        <svg
          className="w-full h-24 text-blue-500 opacity-30"
          preserveAspectRatio="none"
          viewBox="0 0 100 96"
        >
          <path
            d="M0,20 Q50,48 100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M0,48 L100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M0,76 Q50,48 100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      {/* OTLP Ingest collector */}
      <div className="px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex flex-col items-center gap-1 text-white animate-[diag-fade-in-up_0.5s_ease-out_both]">
        <Activity className="w-5 h-5" />
        <span className="text-[10px] font-bold tracking-wider">
          OTLP INGEST
        </span>
      </div>
    </div>
  </DiagramFrame>
);

/** Infrastructure — Server monitoring with animated progress bars and sparkline */
const DiagramInfra = () => (
  <DiagramFrame className="relative">
    <ShimmerOverlay />
    <FrameHeader
      title="prod-database-01"
      icon={<Server className="w-3.5 h-3.5 text-emerald-500" />}
      badge={{ label: "ONLINE", style: BADGE_STYLE.online, pulse: true }}
    />
    <div className="flex-1 p-4 flex flex-col gap-3.5 justify-center">
      <MetricRow
        label="CPU Load"
        value="82%"
        percent={82}
        barClass="bg-orange-500"
        valueClass="text-orange-500"
        delay={0}
      />
      <MetricRow
        label="Memory (RAM)"
        value="4.2 / 8 GB"
        percent={52}
        barClass="bg-blue-500"
        valueClass="text-blue-500"
        delay={0.1}
      />
      <MetricRow
        label="Disk Usage"
        value="45%"
        percent={45}
        barClass="bg-emerald-500"
        valueClass="text-emerald-500"
        delay={0.2}
      />

      {/* Network I/O sparkline with draw animation */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>Network I/O</span>
          <span className="text-emerald-500 font-bold">15 MB/s</span>
        </div>
        <div className="h-8 w-full bg-emerald-500/5 rounded-md relative overflow-hidden border border-emerald-500/20">
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 32"
          >
            <path
              d="M0,26 L10,22 L25,24 L40,12 L55,18 L70,8 L85,16 L100,6 L100,32 L0,32 Z"
              fill="rgb(16,185,129)"
              opacity="0.1"
            />
            <path
              d="M0,26 L10,22 L25,24 L40,12 L55,18 L70,8 L85,16 L100,6"
              stroke="rgb(16,185,129)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="200"
              strokeDashoffset="200"
              style={{
                animation: "diag-line-draw 1.5s ease-out 0.4s forwards",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Top processes micro-table */}
      <div className="flex gap-2 text-[9px] font-mono text-muted-foreground">
        <div className="flex-1 flex items-center justify-between bg-muted/30 px-2 py-1 rounded border border-border/30">
          <span className="truncate">nginx</span>
          <span className="text-orange-500 font-bold">34%</span>
        </div>
        <div className="flex-1 flex items-center justify-between bg-muted/30 px-2 py-1 rounded border border-border/30">
          <span className="truncate">mongod</span>
          <span className="text-blue-500 font-bold">28%</span>
        </div>
      </div>
    </div>
  </DiagramFrame>
);

/** Database — Query latency profiling with animated threshold-colored bars */
const DiagramDatabase = () => (
  <DiagramFrame>
    <FrameHeader
      title="prod-mongo-01"
      icon={<Database className="w-3.5 h-3.5 text-indigo-500" />}
      badge={{ label: "ACTIVE", style: BADGE_STYLE.online, pulse: true }}
    />
    <div className="flex-1 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Query Latency (ms)
        </span>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          Last 1h
        </span>
      </div>

      {/* Latency bars with grow animation and threshold line */}
      <div className="flex-1 flex items-end gap-1.5 px-1 relative">
        {/* Threshold line at 50ms */}
        <div className="absolute left-0 right-0 border-t border-dashed border-orange-500/40 pointer-events-none z-10" style={{ bottom: "50%" }}>
          <span className="absolute -top-3.5 right-0 text-[8px] font-mono text-orange-500/60">
            50ms
          </span>
        </div>
        {QUERY_LATENCIES.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity origin-bottom animate-[diag-bar-grow_0.5s_ease-out_both] ${
              h > 50 ? "bg-orange-500" : "bg-indigo-500"
            }`}
            style={{
              height: `${Math.min(h, 100)}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40">
        <span>
          Avg: <span className="text-indigo-500 font-bold">24ms</span>
        </span>
        <span>
          Pool: <span className="text-foreground font-bold">42</span>
        </span>
        <span>
          Max: <span className="text-orange-500 font-bold">110ms</span>
        </span>
      </div>
    </div>
  </DiagramFrame>
);

/** Web Analytics — Full-width area chart with animated draw and stats */
const DiagramWeb = () => (
  <DiagramFrame className="relative">
    <ShimmerOverlay />
    <FrameHeader
      title="senzor.dev"
      icon={<Globe className="w-3.5 h-3.5 text-cyan-500" />}
      badge={{ label: "TRACKING", style: BADGE_STYLE.tracking }}
    />
    <div className="flex-1 p-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Visitors"
          value="12.4k"
          valueClass="text-cyan-500"
          icon={<MousePointerClick className="w-3 h-3 text-cyan-500" />}
          trend={{ value: "18%", positive: true }}
        />
        <StatCard
          label="Pageviews"
          value="45.2k"
          valueClass="text-blue-500"
          icon={<Layout className="w-3 h-3 text-blue-500" />}
          trend={{ value: "9%", positive: true }}
        />
        <StatCard
          label="Bounce"
          value="32%"
          valueClass="text-amber-500"
          icon={<TrendingUp className="w-3 h-3 text-amber-500" />}
        />
      </div>

      {/* Traffic trend — full-bleed area chart with line draw animation */}
      <div className="flex-1 bg-background border border-border/50 rounded-lg relative overflow-hidden shadow-sm">
        <span className="absolute top-2.5 left-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider z-10">
          Traffic Trend
        </span>
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 200 80"
        >
          <defs>
            <linearGradient
              id="diag-web-grad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="rgb(6,182,212)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="rgb(6,182,212)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <path
            d="M0,65 L20,58 L40,62 L60,48 L80,52 L100,38 L120,42 L140,28 L160,34 L180,20 L200,15 L200,80 L0,80 Z"
            fill="url(#diag-web-grad)"
          />
          <path
            d="M0,65 L20,58 L40,62 L60,48 L80,52 L100,38 L120,42 L140,28 L160,34 L180,20 L200,15"
            stroke="rgb(6,182,212)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="400"
            strokeDashoffset="400"
            style={{
              animation: "diag-line-draw 2s ease-out 0.3s forwards",
            }}
          />
        </svg>
      </div>
    </div>
  </DiagramFrame>
);

/** RUM — Core Web Vitals + network waterfall with text inside spans */
const DiagramRum = () => (
  <DiagramFrame>
    {/* Browser chrome header */}
    <div className="h-7 bg-muted/40 border-b border-border/40 flex items-center px-3 gap-1.5 shrink-0">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      <div className="w-2 h-2 rounded-full bg-yellow-400" />
      <div className="w-2 h-2 rounded-full bg-emerald-400" />
      <div className="flex-1 mx-3 h-4 bg-background/60 rounded-sm border border-border/30 px-2 flex items-center">
        <span className="text-[8px] text-muted-foreground font-mono truncate">
          https://app.example.com
        </span>
      </div>
    </div>

    <div className="flex-1 p-3 flex flex-col gap-2">
      {/* Core Web Vitals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background border border-border/50 rounded-lg p-2 text-center flex flex-col justify-center shadow-sm">
          <span className="text-[8px] text-muted-foreground font-bold uppercase">
            LCP
          </span>
          <span className="text-base font-bold text-emerald-500 font-mono">
            1.2s
          </span>
          <span className="text-[7px] text-emerald-500 font-bold uppercase">
            Good
          </span>
        </div>
        <div className="bg-background border border-border/50 rounded-lg p-2 text-center flex flex-col justify-center shadow-sm">
          <span className="text-[8px] text-muted-foreground font-bold uppercase">
            CLS
          </span>
          <span className="text-base font-bold text-amber-500 font-mono">
            0.14
          </span>
          <span className="text-[7px] text-amber-500 font-bold uppercase">
            Fair
          </span>
        </div>
        <div className="bg-background border border-border/50 rounded-lg p-2 text-center flex flex-col justify-center shadow-sm">
          <span className="text-[8px] text-muted-foreground font-bold uppercase">
            FID
          </span>
          <span className="text-base font-bold text-emerald-500 font-mono">
            12ms
          </span>
          <span className="text-[7px] text-emerald-500 font-bold uppercase">
            Good
          </span>
        </div>
      </div>

      {/* Network waterfall — text inside bars, like APM trace waterfall */}
      <div className="flex-1 bg-background border border-border/50 rounded-lg p-2.5 flex flex-col shadow-sm overflow-hidden">
        <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">
          Network Waterfall
        </span>
        <div className="flex-1 flex flex-col gap-1 justify-center">
          {RUM_WATERFALL.map((span, i) => (
            <div key={i} className="relative h-[18px] w-full flex items-center">
              <div
                className={`absolute h-[14px] ${span.bg} ${span.border} border rounded-sm origin-left animate-[diag-fill-x_0.5s_ease-out_both]`}
                style={{
                  left: `${span.offset}%`,
                  width: `${span.width}%`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
              <span
                className={`absolute text-[8px] font-mono font-bold ${span.text} truncate animate-[diag-fade-in-up_0.3s_ease-out_both]`}
                style={{
                  left: `${span.offset + 1.5}%`,
                  maxWidth: `${Math.max(span.width - 3, 0)}%`,
                  animationDelay: `${i * 0.08 + 0.15}s`,
                }}
              >
                {span.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* JS Exception */}
      <div className="bg-red-500/5 rounded-lg border border-red-500/20 p-2 flex items-center gap-2.5">
        <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-[9px] font-bold text-red-600 dark:text-red-400">
            TypeError
          </span>
          <span className="text-[9px] font-mono text-red-600/70 dark:text-red-400/70 truncate">
            Cannot read properties of undefined
          </span>
        </div>
      </div>
    </div>
  </DiagramFrame>
);

/** Background Tasks — Queue→Worker→Success flow with animated pipeline */
const DiagramTasks = () => (
  <DiagramFrame>
    <FrameHeader
      title="worker-payments"
      badge={{ label: "ACTIVE", style: BADGE_STYLE.active, pulse: true }}
    />
    <div className="flex-1 p-5 flex flex-col justify-center gap-5">
      {/* Pipeline flow: Queue → Worker Node → Success */}
      <div className="flex items-center justify-between w-full max-w-sm mx-auto relative">
        <div className="flex flex-col items-center gap-1.5 animate-[diag-fade-in-up_0.4s_ease-out_both]">
          <div className="w-11 h-11 rounded-lg border border-border bg-background shadow-sm flex items-center justify-center">
            <Layers className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase">
            Queue
          </span>
        </div>

        <div className="flex-1 h-px bg-border mx-3 relative">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rotate-45 border-t border-r border-border" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <PulseDot className="bg-violet-500" />
          </div>
        </div>

        {/* Accent Worker Node */}
        <div className="flex flex-col items-center gap-1.5 animate-[diag-fade-in-up_0.4s_ease-out_both]" style={{ animationDelay: "0.15s" }}>
          <div className="w-12 h-12 rounded-xl border border-violet-500 bg-violet-600 shadow-lg shadow-violet-500/20 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] font-bold text-violet-500 uppercase">
            Worker
          </span>
        </div>

        <div className="flex-1 h-px bg-emerald-500/50 mx-3 relative">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rotate-45 border-t border-r border-emerald-500/50" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <PulseDot className="bg-emerald-500" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 animate-[diag-fade-in-up_0.4s_ease-out_both]" style={{ animationDelay: "0.3s" }}>
          <div className="w-11 h-11 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[9px] font-bold text-emerald-500 uppercase">
            Done
          </span>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="w-full max-w-sm mx-auto flex justify-between px-3 py-2 text-[10px] font-mono text-muted-foreground bg-background border border-border/50 shadow-sm rounded-md animate-[diag-fade-in-up_0.4s_ease-out_both]" style={{ animationDelay: "0.4s" }}>
        <span>
          Depth: <span className="text-foreground font-bold">42</span>
        </span>
        <span>
          Delay: <span className="text-foreground font-bold">1.2s</span>
        </span>
        <span className="text-emerald-500 font-bold">99.9% OK</span>
      </div>
    </div>
  </DiagramFrame>
);

/** Global Error Tracking — Theme-compliant stack trace with error trend */
const DiagramErrors = () => (
  <DiagramFrame>
    {/* Error summary header with trend sparkline */}
    <div className="bg-red-500/5 p-3.5 border-b border-red-500/20 flex flex-col gap-1.5 shrink-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
            TypeError
          </span>
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
            14 occurrences
          </span>
        </div>
      </div>
      <span className="text-sm text-foreground font-medium truncate px-0.5">
        Cannot read properties of undefined (reading &apos;id&apos;)
      </span>
    </div>

    {/* Stack trace — real-world Node.js/Express trace, theme-aware */}
    <div className="p-3.5 bg-muted/30 flex-1 overflow-hidden border-t border-border/20">
      <div className="text-[10px] font-mono leading-relaxed flex flex-col gap-0.5">
        <div className="text-muted-foreground animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.05s" }}>
          at <span className="text-purple-500 dark:text-purple-400">processData</span>{" "}
          (/src/services/data.ts:<span className="text-blue-500 dark:text-blue-400">42</span>:<span className="text-blue-500 dark:text-blue-400">15</span>)
        </div>
        <div className="text-red-600 dark:text-red-400 font-bold bg-red-500/10 px-1.5 -mx-1.5 rounded border-l-2 border-red-500 dark:border-red-400 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.1s" }}>
          at <span className="text-purple-500 dark:text-purple-400">UserController.get</span>{" "}
          (/src/controllers/user.ts:<span className="text-blue-500 dark:text-blue-400">18</span>:<span className="text-blue-500 dark:text-blue-400">22</span>)
        </div>
        <div className="text-muted-foreground animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.15s" }}>
          at <span className="text-purple-500 dark:text-purple-400">asyncHandler</span>{" "}
          (/src/middleware/async.ts:<span className="text-blue-500 dark:text-blue-400">8</span>:<span className="text-blue-500 dark:text-blue-400">5</span>)
        </div>
        <div className="text-muted-foreground animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.2s" }}>
          at <span className="text-purple-500 dark:text-purple-400">Layer.handle</span>{" "}
          (/node_modules/express/lib/router/layer.js:<span className="text-blue-500 dark:text-blue-400">95</span>:<span className="text-blue-500 dark:text-blue-400">5</span>)
        </div>
        <div className="text-muted-foreground/70 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.25s" }}>
          at next (/node_modules/express/lib/router/route.js:<span className="text-blue-500/70 dark:text-blue-400/70">144</span>:<span className="text-blue-500/70 dark:text-blue-400/70">13</span>)
        </div>
        <div className="text-muted-foreground/70 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.3s" }}>
          at <span className="text-purple-500/70 dark:text-purple-400/70">Route.dispatch</span>{" "}
          (/node_modules/express/lib/router/route.js:<span className="text-blue-500/70 dark:text-blue-400/70">114</span>:<span className="text-blue-500/70 dark:text-blue-400/70">3</span>)
        </div>
        <div className="text-muted-foreground/50 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.35s" }}>
          at <span className="text-purple-500/50 dark:text-purple-400/50">Function.process_params</span>{" "}
          (/node_modules/express/lib/router/index.js:<span className="text-blue-500/50 dark:text-blue-400/50">346</span>:<span className="text-blue-500/50 dark:text-blue-400/50">12</span>)
        </div>
        <div className="text-muted-foreground/40 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.4s" }}>
          at /node_modules/express/lib/router/index.js:<span className="text-blue-500/40 dark:text-blue-400/40">280</span>:<span className="text-blue-500/40 dark:text-blue-400/40">7</span>
        </div>
        <div className="text-muted-foreground/40 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.43s" }}>
          at <span className="text-purple-500/40 dark:text-purple-400/40">Function.handle</span>{" "}
          (/node_modules/express/lib/router/index.js:<span className="text-blue-500/40 dark:text-blue-400/40">175</span>:<span className="text-blue-500/40 dark:text-blue-400/40">3</span>)
        </div>
        <div className="text-muted-foreground/30 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.46s" }}>
          at router (/node_modules/express/lib/router/index.js:<span className="text-blue-500/30 dark:text-blue-400/30">47</span>:<span className="text-blue-500/30 dark:text-blue-400/30">12</span>)
        </div>
        <div className="text-muted-foreground/30 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.49s" }}>
          at /node_modules/express/lib/application.js:<span className="text-blue-500/30 dark:text-blue-400/30">168</span>:<span className="text-blue-500/30 dark:text-blue-400/30">10</span>
        </div>
        <div className="text-muted-foreground/25 animate-[diag-fade-in-up_0.3s_ease-out_both]" style={{ animationDelay: "0.52s" }}>
          at <span className="text-purple-500/25 dark:text-purple-400/25">Server.emit</span>{" "}
          (node:events:<span className="text-blue-500/25 dark:text-blue-400/25">519</span>:<span className="text-blue-500/25 dark:text-blue-400/25">28</span>)
        </div>
      </div>
    </div>
  </DiagramFrame>
);

/** Centralized Log Management — Theme-compliant live tail with animated entries */
const DiagramLogs = () => (
  <DiagramFrame>
    {/* MQL search header */}
    <div className="h-9 border-b border-border/40 px-4 flex items-center justify-between bg-muted/30 shrink-0">
      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
        <span>level:error OR level:warn</span>
        <span className="animate-pulse text-blue-500 dark:text-blue-400 font-bold">
          |
        </span>
      </div>
      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider border border-emerald-500/20 inline-flex items-center gap-1.5">
        <PulseDot className="bg-emerald-500" />
        LIVE TAIL
      </span>
    </div>

    {/* Log lines — real-world payment flow scenario, theme-aware */}
    <div className="px-3 py-2 flex flex-col gap-0.5 flex-1 font-mono text-[10px] bg-muted/10 overflow-hidden">
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.05s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:01.001</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Request received POST /api/checkout
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.1s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:01.015</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        User session validated uid=8294
      </div>
      <div className="text-muted-foreground/70 animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.15s" }}>
        <span className="text-blue-500/70 dark:text-blue-400/70 mr-2">10:42:01.089</span>
        <span className="text-muted-foreground font-bold inline-block w-11">DEBUG</span>{" "}
        Cart items fetched (3 items, $142.50)
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.2s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:02.401</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Payment intent created pi_3Nk8s2...
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.25s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:05.421</span>
        <span className="text-amber-600 dark:text-amber-400 font-bold inline-block w-11">WARN</span>{" "}
        High latency on payment gateway (3.2s)
      </div>
      <div className="text-foreground bg-red-500/10 -mx-3 px-3 py-0.5 border-l-2 border-red-500 dark:border-red-400 animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.3s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:09.912</span>
        <span className="text-red-600 dark:text-red-400 font-bold inline-block w-11">ERROR</span>{" "}
        Database connection timeout on primary
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.35s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:10.004</span>
        <span className="text-amber-600 dark:text-amber-400 font-bold inline-block w-11">WARN</span>{" "}
        Failover to read replica initiated
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.4s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:11.001</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Connection pool rebuilt (12 active)
      </div>
      <div className="text-muted-foreground/70 animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.44s" }}>
        <span className="text-blue-500/70 dark:text-blue-400/70 mr-2">10:42:11.203</span>
        <span className="text-muted-foreground font-bold inline-block w-11">DEBUG</span>{" "}
        Read replica latency: 12ms
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.48s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:11.450</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Checkout total recalculated $142.50
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.52s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:12.001</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Charge confirmed ch_1Oj2kA...
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.56s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:12.089</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Order #ORD-20240823-4921 created
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.6s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:12.102</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-block w-11">INFO</span>{" "}
        Confirmation email queued uid=8294
      </div>
      <div className="text-muted-foreground animate-[diag-fade-in-up_0.25s_ease-out_both]" style={{ animationDelay: "0.64s" }}>
        <span className="text-blue-500 dark:text-blue-400 mr-2">10:42:12.340</span>
        <span className="text-amber-600 dark:text-amber-400 font-bold inline-block w-11">WARN</span>{" "}
        POST /api/checkout completed 11.3s
      </div>
    </div>
  </DiagramFrame>
);

/** Uptime Monitoring — Animated status bars with response time sparkline */
const DiagramUptime = () => (
  <DiagramFrame className="relative">
    <ShimmerOverlay />
    <FrameHeader
      title="api.production.com"
      badge={{ label: "99.9% UP", style: BADGE_STYLE.uptime }}
    />
    <div className="flex-1 p-5 flex flex-col justify-center gap-4">
      {/* 30-bar status grid with staggered grow animation */}
      <div className="flex items-center gap-0.5 h-7 bg-muted/30 p-1 rounded-md">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm h-full origin-bottom animate-[diag-bar-grow_0.4s_ease-out_both] ${
              i === 22
                ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                : "bg-emerald-500/70 hover:bg-emerald-500"
            }`}
            style={{ animationDelay: `${i * 0.02}s` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>24 hours ago</span>
        <span>Now</span>
      </div>

      {/* Response time sparkline with draw animation */}
      <div className="bg-background border border-border/50 rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Response Time
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-500">
            142ms avg
          </span>
        </div>
        <div className="h-8 relative">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 32"
          >
            <path
              d="M0,20 L8,18 L16,22 L24,16 L32,19 L40,14 L48,17 L56,10 L64,15 L72,12 L80,16 L88,8 L96,14 L100,11"
              stroke="rgb(16,185,129)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="200"
              strokeDashoffset="200"
              style={{
                animation: "diag-line-draw 1.5s ease-out 0.6s forwards",
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  </DiagramFrame>
);

/** Alerts & Incident Routing — Evaluation rule with animated routing */
const DiagramAlerts = () => (
  <DiagramFrame>
    <FrameHeader
      title="Alert Policy"
      icon={<BellRing className="w-3.5 h-3.5 text-rose-500" />}
      badge={{ label: "ARMED", style: BADGE_STYLE.armed }}
    />
    <div className="flex-1 p-4 flex flex-col items-center justify-center gap-3">
      {/* Evaluation rule card */}
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 flex flex-col gap-1.5 w-full max-w-xs shadow-sm animate-[diag-fade-in-up_0.4s_ease-out_both]">
        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
          Evaluation Rule
        </span>
        <div className="font-mono text-xs text-foreground">
          COUNT(status == 500){" "}
          <span className="text-rose-500 font-bold">{">"} 50</span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono bg-muted/50 w-fit px-1.5 py-0.5 rounded">
          in the last 5 minutes
        </span>
      </div>

      {/* Dashed trigger line with pulsing indicator */}
      <div className="h-6 w-0 border-l-2 border-dashed border-rose-500/40 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-card border border-rose-500/40 rounded-full flex items-center justify-center">
          <PulseDot className="bg-rose-500" />
        </div>
      </div>

      {/* Notification targets */}
      <div className="flex justify-center gap-2.5 animate-[diag-fade-in-up_0.4s_ease-out_both]" style={{ animationDelay: "0.2s" }}>
        <div className="bg-background border border-border/50 shadow-sm rounded-lg p-2 flex items-center gap-2 hover:shadow-md transition-shadow">
          <div className="p-1 bg-blue-500/10 rounded">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-[10px] font-bold text-foreground">Slack</span>
        </div>
        <div className="bg-background border border-border/50 shadow-sm rounded-lg p-2 flex items-center gap-2 hover:shadow-md transition-shadow">
          <div className="p-1 bg-orange-500/10 rounded">
            <Terminal className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-[10px] font-bold text-foreground">
            Webhook
          </span>
        </div>
        <div className="bg-background border border-border/50 shadow-sm rounded-lg p-2 flex items-center gap-2 hover:shadow-md transition-shadow">
          <div className="p-1 bg-rose-500/10 rounded">
            <Mail className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className="text-[10px] font-bold text-foreground">Email</span>
        </div>
      </div>
    </div>
  </DiagramFrame>
);

/** MCP Server — AI hub with connecting lines and animated glow */
const DiagramMcp = () => (
  <DiagramFrame className="relative">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,132,252,0.06)_0%,transparent_70%)]" />

    <div className="flex-1 flex items-center justify-center relative">
      {/* Concentric orbital rings + central AI node */}
      <div className="relative w-44 h-44 border border-fuchsia-500/15 rounded-full flex items-center justify-center border-dashed">
        <div className="w-28 h-28 border border-fuchsia-500/25 rounded-full flex items-center justify-center">
          <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-600 to-indigo-600 border border-indigo-400/50 rounded-2xl flex items-center justify-center shadow-lg animate-[diag-glow-pulse_3s_ease-in-out_infinite]">
            <Bot className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Orbiting tool nodes */}
      {MCP_ORBIT_NODES.map((node, i) => (
        <div
          key={i}
          className={`absolute bg-card border border-border/50 shadow-sm p-1.5 rounded-md hover:shadow-md transition-shadow animate-[diag-fade-in-up_0.3s_ease-out_both] ${node.pos}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <node.icon className={`w-3.5 h-3.5 ${node.color}`} />
        </div>
      ))}
    </div>
  </DiagramFrame>
);

/** Firebase Monitoring — Auth metrics dashboard with provider distribution */
const DiagramFirebase = () => (
  <DiagramFrame className="relative">
    <ShimmerOverlay />
    <FrameHeader
      title="my-production-app"
      icon={<Flame className="w-3.5 h-3.5 text-amber-500" />}
      badge={{ label: "MONITORING", style: BADGE_STYLE.armed, pulse: true }}
    />
    <div className="flex-1 p-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Total Users"
          value="24.8k"
          valueClass="text-blue-500"
          icon={<Users className="w-3 h-3 text-blue-500" />}
          trend={{ value: "12%", positive: true }}
        />
        <StatCard
          label="Signups 24h"
          value="147"
          valueClass="text-emerald-500"
          icon={<UserPlus className="w-3 h-3 text-emerald-500" />}
          trend={{ value: "8%", positive: true }}
        />
        <StatCard
          label="MFA Rate"
          value="68%"
          valueClass="text-purple-500"
          icon={<ShieldCheck className="w-3 h-3 text-purple-500" />}
          trend={{ value: "3%", positive: true }}
        />
      </div>

      {/* Provider distribution bars */}
      <div className="bg-background border border-border/50 rounded-lg p-3 shadow-sm flex-1 flex flex-col gap-2">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Auth Providers
        </span>
        {[
          { name: "Google", pct: 62, color: "bg-red-500" },
          { name: "Email", pct: 28, color: "bg-blue-500" },
          { name: "GitHub", pct: 7, color: "bg-purple-500" },
          { name: "Phone", pct: 3, color: "bg-emerald-500" },
        ].map((p, i) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono w-10 shrink-0">{p.name}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${p.color} origin-left animate-[diag-fill-x_0.8s_ease-out_both]`}
                style={{ width: `${p.pct}%`, animationDelay: `${i * 0.1}s` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-foreground w-7 text-right">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  </DiagramFrame>
);

// ============================================================================
// DIAGRAM RENDERER
// ============================================================================

export const renderDiagram = (id: string): React.ReactNode => {
  switch (id) {
    case "views":
      return <DiagramViews />;
    case "infra":
      return <DiagramInfra />;
    case "database":
      return <DiagramDatabase />;
    case "web":
      return <DiagramWeb />;
    case "rum":
      return <DiagramRum />;
    case "apm":
      return <DiagramApm />;
    case "otel":
      return <DiagramOTel />;
    case "tasks":
      return <DiagramTasks />;
    case "errors":
      return <DiagramErrors />;
    case "logs":
      return <DiagramLogs />;
    case "mcp":
      return <DiagramMcp />;
    case "alerts":
      return <DiagramAlerts />;
    case "uptime":
      return <DiagramUptime />;
    case "firebase":
      return <DiagramFirebase />;
    default:
      return (
        <div className="w-full h-full bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center">
          <Box className="w-6 h-6 text-muted-foreground opacity-30" />
        </div>
      );
  }
};

// ============================================================================
// FEATURE DATA DEFINITIONS — Content unchanged, types hardened
// ============================================================================

export const FEATURES_DATA: FeatureData[] = [
  {
    id: "views",
    title: "Saved Views",
    subtitle: "Your operational data, perfectly organized.",
    description:
      "Construct bespoke control panels by aggregating metrics, logs, and traces across your entire stack. Drag, drop, and resize visualizations in a unified canvas.",
    points: [
      "Cross-service data aggregation",
      "Interactive time-series and categorical charts",
      "Native Safe MQL filtering engine",
      "Strict tenant data isolation",
    ],
    diagramId: "views",
    href: "/features/views",
    colorClasses: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
  {
    id: "server",
    title: "Infrastructure Monitoring",
    subtitle: "Complete visibility into your compute fleet.",
    description:
      "Track the health of your servers, containers, and virtual machines. Monitor CPU, memory, disk I/O, and network throughput with high-fidelity, low-footprint agents.",
    points: [
      "Real-time CPU and Memory utilization",
      "Storage and Disk I/O analytics",
      "Per-process resource tracking",
      "Secure, outbound-only telemetry",
    ],
    diagramId: "infra",
    href: "/features/server",
    colorClasses: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "database",
    title: "Database Observability",
    subtitle: "Optimize your persistent storage layer.",
    description:
      "Uncover slow queries, monitor connection pools, and track operations per second. Gain deep insights into how your applications interact with your databases.",
    points: [
      "Query latency profiling",
      "Active connection monitoring",
      "Throughput and operations mapping",
      "Support for MongoDB & Redis",
    ],
    diagramId: "database",
    href: "/features/database",
    colorClasses: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "firebase",
    title: "Firebase Monitoring",
    subtitle: "Complete visibility into your Firebase Auth layer.",
    description:
      "Monitor your Firebase Authentication infrastructure in real time. Track user growth, sign-in activity, MFA adoption, and auth provider distribution with encrypted, agentless credential polling.",
    points: [
      "User growth and signup trend analytics",
      "Daily and monthly active user tracking",
      "MFA enrollment and email verification rates",
      "Auth provider distribution breakdown",
    ],
    diagramId: "firebase",
    href: "/features/firebase",
    colorClasses: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "web-analytics",
    title: "Web Analytics",
    subtitle: "Privacy-first traffic insights.",
    description:
      "Understand your audience without compromising their privacy. Track page views, unique visitors, referrers, and geographic distribution with zero cookies.",
    points: [
      "Cookie-less, GDPR-compliant tracking",
      "Real-time visitor analytics",
      "Geographic and device breakdowns",
      "Referrer and acquisition mapping",
    ],
    diagramId: "web",
    href: "/features/web-analytics",
    colorClasses: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "rum",
    title: "Real User Monitoring",
    subtitle: "Measure exactly what your users experience.",
    description:
      "Capture client-side performance bottlenecks. Monitor Core Web Vitals, network call latency, and frontend JavaScript exceptions directly from the browser.",
    points: [
      "Core Web Vitals (LCP, FID, CLS)",
      "Global geographic latency mapping",
      "Frontend JavaScript error tracking",
      "Rage click & UX frustration metrics",
    ],
    diagramId: "rum",
    href: "/features/rum",
    colorClasses: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  {
    id: "apm",
    title: "Application Performance Monitoring",
    subtitle: "Trace requests across distributed architectures.",
    description:
      "Follow every request as it traverses your microservices. Identify latency bottlenecks, analyze upstream dependencies, and optimize your backend logic.",
    points: [
      "Zero-configuration distributed tracing",
      "End-to-end trace waterfall visualizations",
      "Automatic framework instrumentation",
      "Database and external API profiling",
    ],
    diagramId: "apm",
    href: "/features/apm",
    colorClasses: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "tasks",
    title: "Background Task Monitoring",
    subtitle: "Secure your asynchronous workloads.",
    description:
      "Ensure your queues, cron jobs, and background workers are operating reliably. Track execution times, monitor failure rates, and analyze retry behaviors.",
    points: [
      "Queue depth and processing latency",
      "Job failure and retry analytics",
      "Worker node health tracking",
      "Dead-letter queue detection",
    ],
    diagramId: "tasks",
    href: "/features/tasks",
    colorClasses: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "errors",
    title: "Global Error Tracking",
    subtitle: "Catch exceptions before your users do.",
    description:
      "Automatically capture, fingerprint, and group unhandled exceptions across your entire stack. View full stack traces and contextual environment data.",
    points: [
      "Intelligent error fingerprinting",
      "Full stack trace terminal capture",
      "Cross-service impact analysis",
      "Resolution state tracking",
    ],
    diagramId: "errors",
    href: "/features/errors",
    colorClasses: "text-red-500 bg-red-500/10 border-red-500/20",
  },
  {
    id: "logs",
    title: "Centralized Log Management",
    subtitle: "Search millions of logs in milliseconds.",
    description:
      "Aggregate logs from every service and server into a single, searchable stream. Use our powerful query engine to filter by severity, trace context, or custom attributes.",
    points: [
      "High-throughput log ingestion",
      "Advanced filtering engine (MQL)",
      "Automatic trace correlation",
      "Live-tail streaming capability",
    ],
    diagramId: "logs",
    href: "/features/logs",
    colorClasses: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
  {
    id: "uptime",
    title: "Uptime Monitoring",
    subtitle: "Verify external availability.",
    description:
      "Continuously verify that your APIs and web properties are accessible from the outside world. Track response times globally.",
    points: [
      "High-frequency synthetic checks",
      "Global latency tracking",
      "Endpoint health validation",
      "Downtime incident recording",
    ],
    diagramId: "uptime",
    href: "/features/uptime",
    colorClasses: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  {
    id: "mcp",
    title: "MCP Server",
    subtitle: "AI-driven operational intelligence.",
    description:
      "Seamlessly integrate your telemetry data with advanced Large Language Models. Use the Model Context Protocol to query, summarize, and analyze incidents using natural language.",
    points: [
      "Secure Model Context Protocol integration",
      "Natural language telemetry querying",
      "Automated incident summarization",
      "Granular API key access controls",
    ],
    diagramId: "mcp",
    href: "/features/mcp",
    colorClasses: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
  },
  {
    id: "alerts",
    title: "Alerts & Incident Routing",
    subtitle: "Know immediately when things break.",
    description:
      "Define complex alert policies across all your telemetry streams. Route critical incidents to your team via Webhooks, Slack, or Email before customers notice.",
    points: [
      "Multi-condition threshold evaluation",
      "Cross-channel notification routing",
      "Incident lifecycle management",
      "MQL-based custom alert triggers",
    ],
    diagramId: "alerts",
    href: "/features/alerts",
    colorClasses: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "opentelemetry",
    title: "Native OpenTelemetry Support",
    subtitle: "Vendor-neutral telemetry ingestion.",
    description:
      "Stream traces and metrics directly from your Go, Java, Python, or Rust applications without proprietary agents. We natively translate OTLP payloads into our specialized dashboard schemas.",
    points: [
      "OTLP HTTP compatible endpoints",
      "Automatic trace and log translation",
      "Zero-config APM & Task monitoring",
      "Standard Semantic Conventions support",
    ],
    diagramId: "otel",
    href: "/features/opentelemetry",
    colorClasses: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
];
