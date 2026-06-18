/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../../../lib/auth";
import {
  Button,
  Card,
  Badge,
  CardContent,
} from "../../../../../components/Core";
import { DetailPageSkeleton } from "../../../../../components/Skeletons";
import {
  ArrowLeft,
  Clock,
  Layers,
  Code,
  Calendar,
  FileWarning,
  Activity,
  Zap,
  Layout,
  MousePointer2,
  MousePointerClick,
  Laptop,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { TraceWaterfall } from "../../../../../components/TraceWaterfall";
import { SmartAnimatedValue } from "@/components/Tween";
import { TraceErrors } from "@/components/TraceErrors";
import { TraceLogs } from "@/components/TraceLogs";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- HELPERS ---
const formatMs = (ms: number) =>
  ms !== undefined && ms !== null ? `${Math.round(ms)}ms` : "-";
const formatSec = (ms: number) =>
  ms !== undefined && ms !== null ? `${(ms / 1000).toFixed(2)}s` : "-";
const formatScore = (val: number) =>
  val !== undefined && val !== null ? val.toFixed(3) : "-";

const getVitalColor = (metric: "lcp" | "inp" | "cls", value: number) => {
  if (value === 0 || value === undefined)
    return "text-muted-foreground bg-muted/50 border-border";
  if (metric === "lcp")
    return value <= 2500
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : value <= 4000
        ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
        : "text-red-500 bg-red-500/10 border-red-500/20";
  if (metric === "inp")
    return value <= 200
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : value <= 500
        ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
        : "text-red-500 bg-red-500/10 border-red-500/20";
  if (metric === "cls")
    return value <= 0.1
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : value <= 0.25
        ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
        : "text-red-500 bg-red-500/10 border-red-500/20";
  return "text-foreground bg-secondary border-border";
};

// --- COMPONENTS ---
const StatCard = ({ label, value, sub, icon: Icon, colorClass }: any) => {
  // Extract text color from the composite colorClass (e.g., "text-emerald-500 bg-emerald-500/10 ...")
  const textColor =
    colorClass.split(" ").find((c: string) => c.startsWith("text-")) ||
    "text-foreground";

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-lg ${colorClass}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">
            {label}
          </div>
          <div className="text-xl font-bold text-foreground">
            {value !== "-" ? <SmartAnimatedValue value={value} /> : "-"}
          </div>
          {sub && (
            <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function RumTraceDetail() {
  const router = useRouter();
  const { id, traceId } = router.query;
  const { token } = useAuth();

  // Fetch the RUM trace and its associated JS exceptions
  const { data, error } = useSWR(
    token && id && traceId ? `/rum/${id}/trace/${traceId}` : null,
    fetcher,
  );

  if (!data && !error)
    return <DetailPageSkeleton badgeInline chart table label="Loading trace waterfall" />;

  if (error || !data?.trace)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="p-8 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            Failed to load Trace. It may have expired or does not exist.
          </div>
        </div>
      </>
    );

  const { trace, childrenTraces } = data;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col">
        {/* --- Header & Navigation --- */}
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 w-fit hover:bg-transparent hover:text-pink-500 -ml-2 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>

          {/* Main Info Card (Mirrors APM Trace Detail) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-4 rounded-xl border border-border shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <Badge
                  variant="outline"
                  className={`font-mono text-xs px-2 py-0.5 border truncate ${
                    trace.traceType === "initial_load"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  }`}
                >
                  {trace.traceType === "initial_load"
                    ? "HARD LOAD"
                    : "SPA ROUTE"}
                </Badge>
                <h1
                  className="text-xl font-bold font-mono text-foreground truncate"
                  title={trace.path}
                >
                  {trace.path}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5 font-mono px-2 rounded">
                  <Code className="h-3 w-3" />
                  <span
                    className="truncate max-w-[150px]"
                    title={trace.traceId}
                  >
                    {trace.traceId}
                  </span>
                </div>
                {trace.sessionId && (
                  <div className="flex items-center gap-1.5 font-mono px-2 rounded">
                    <Hash className="h-3 w-3" />
                    <span>Session: {trace.sessionId.substring(0, 8)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2 rounded">
                  <Calendar className="h-3 w-3" />{" "}
                  {new Date(trace.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 px-2 rounded">
                  <Laptop className="h-3 w-3" /> {trace.browser || "Unknown"} on{" "}
                  {trace.os || "Unknown"}
                </div>
              </div>
            </div>

            {/* Right Side Metrics */}
            <div className="flex items-center gap-6 border-t md:border-t-0 border-border/50 pt-4 md:pt-0 md:pl-6">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                  Duration
                </div>
                <div className="text-2xl font-mono font-medium text-pink-500">
                  {trace.duration.toFixed(2)}
                  <span className="text-sm text-pink-500/70 ml-0.5">ms</span>
                </div>
              </div>
              <div className="h-10 w-px bg-border/60 hidden md:block"></div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                  Network Spans
                </div>
                <div className="text-2xl font-mono font-medium text-foreground">
                  {trace.spans?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Core Web Vitals & Frustrations Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            label="LCP (Loading)"
            value={formatSec(trace.vitals?.lcp)}
            sub="Largest Contentful Paint"
            icon={Layout}
            colorClass={getVitalColor("lcp", trace.vitals?.lcp)}
          />
          <StatCard
            label="INP (Interactivity)"
            value={formatMs(trace.vitals?.inp)}
            sub="Interaction to Next Paint"
            icon={Zap}
            colorClass={getVitalColor("inp", trace.vitals?.inp)}
          />
          <StatCard
            label="CLS (Stability)"
            value={formatScore(trace.vitals?.cls)}
            sub="Cumulative Layout Shift"
            icon={MousePointer2}
            colorClass={getVitalColor("cls", trace.vitals?.cls)}
          />
          <StatCard
            label="Frustrations"
            value={(
              (trace.frustration?.rageClicks || 0) +
              (trace.frustration?.deadClicks || 0)
            ).toString()}
            sub="Rage & Dead Clicks"
            icon={MousePointerClick}
            colorClass={
              trace.frustration?.rageClicks > 0 ||
              trace.frustration?.deadClicks > 0
                ? "text-orange-500 bg-orange-500/10 border-orange-500/20"
                : "text-muted-foreground bg-muted/50 border-border"
            }
          />
        </div>

        {/* --- Navigation Timings (Only present on Hard Loads) --- */}
        {trace.traceType === "initial_load" && trace.timings && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                DNS Lookup
              </div>
              <div className="font-mono text-sm">
                {trace.timings.dns?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                TCP Connect
              </div>
              <div className="font-mono text-sm">
                {trace.timings.tcp?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                SSL/TLS
              </div>
              <div className="font-mono text-sm">
                {trace.timings.ssl?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                TTFB
              </div>
              <div className="font-mono text-sm">
                {trace.timings.ttfb?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                DOM Interactive
              </div>
              <div className="font-mono text-sm">
                {trace.timings.domInteractive?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="p-3 border border-border/50 rounded-lg bg-card/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                DOM Complete
              </div>
              <div className="font-mono text-sm">
                {trace.timings.domComplete?.toFixed(0) || 0}ms
              </div>
            </div>
          </div>
        )}

        {/* --- Network Waterfall --- */}
        <div className="flex-1 min-h-0 relative">
          <TraceWaterfall
            spans={trace.spans}
            totalDuration={trace.duration}
            childrenTraces={childrenTraces || []}
          />
        </div>

        {/* --- Global Unified Trace Errors Component --- */}
        <TraceErrors apmId={id as string} traceId={trace.traceId as string} />

        <TraceLogs
          serviceId={id as string}
          traceId={trace.traceId}
          serviceType="rum"
        />
      </div>
    </>
  );
}
