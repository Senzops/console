/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../../../lib/auth";
import { useTheme } from "../../../../../lib/theme";
import { DashboardLayout } from "../../../../../components/Layout";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Spinner,
  DataError,
} from "../../../../../components/Core";
import { ErrorEventList } from "../../../../../components/TraceErrors";
import { TraceWaterfall } from "../../../../../components/TraceWaterfall";
import { SmartAnimatedValue } from "@/components/Tween";
import {
  ArrowLeft,
  Clock,
  Activity,
  Box,
  Terminal,
  Timer,
  Copy,
  Check,
  RefreshCw,
  Link as LinkIcon,
  Server,
  AlertOctagon,
  Braces,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- HELPERS ---
const formatDuration = (ms: number) => {
  if (!ms && ms !== 0) return "-";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

// --- COMPONENTS ---

// Strictly mirrors the ApmView.tsx StatCard
const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? "text-[hsl(var(--chart-mono))]" : color;
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
          </p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">
          <SmartAnimatedValue value={value} />
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
};

const MetadataExplorer = ({ metadata }: { metadata: any }) => {
  const [copied, setCopied] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const jsonString = JSON.stringify(metadata, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("Metadata copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2 px-1">
        <Braces className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Job Metadata & Arguments</h3>
      </div>
      <div className="relative group rounded-xl overflow-hidden bg-[#0d1117] border border-border/60 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> Payload JSON
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <div className="p-4 overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
          <pre className="text-xs leading-relaxed font-mono text-[#c9d1d9]">
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default function TaskRunDetail() {
  const router = useRouter();
  const { id, runId } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const { data, error, mutate, isLoading } = useSWR(
    token && id && runId ? `/task/${id}/run/${runId}` : null,
    fetcher,
  );

  if (isLoading || !data)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Task Execution...</p>
        </div>
      </DashboardLayout>
    );
  if (error)
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center p-8">
          <DataError onRetry={() => mutate()} />
        </div>
      </DashboardLayout>
    );

  const { run, errors } = data;
  const isFailed = run.status === "failed";

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* --- Top Navigation --- */}
        <Button
          variant="ghost"
          onClick={() =>
            router.push(
              `/dashboard/task/${id}/entity/${encodeURIComponent(run.taskName)}`,
            )
          }
          className="pl-0 w-fit hover:bg-transparent hover:text-indigo-500 -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Task Entity
        </Button>

        {/* --- Pristine Trace Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-4 md:p-4 rounded-xl border border-border/60 shadow-sm">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="font-mono text-[10px] px-2 py-0.5 border-indigo-500/30 text-indigo-500 bg-indigo-500/10 uppercase tracking-wider"
              >
                {run.taskType}
              </Badge>
              <h1
                className="text-xl md:text-2xl font-bold text-foreground truncate max-w-[60vw]"
                title={run.taskName}
              >
                {run.taskName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono pl-1">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-500" /> Run ID:{" "}
                {run.runId}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />{" "}
                {new Date(run.timestamp).toLocaleString()} (
                {formatDistanceToNow(new Date(run.timestamp))} ago)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0 border-t border-border/50 md:border-t-0 pt-4 md:pt-0 pl-1 md:pl-0">
            <div className="text-left md:text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Duration
              </p>
              <p className="text-2xl font-mono font-medium text-foreground">
                {formatDuration(run.duration)}
              </p>
            </div>
            <div className="h-10 w-px bg-border/60 hidden md:block"></div>
            <div className="text-left md:text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Status
              </p>
              <p
                className={`text-2xl font-mono font-bold capitalize tracking-tight ${isFailed ? "text-destructive" : "text-emerald-500"}`}
              >
                {isFailed ? "Failed" : "Success"}
              </p>
            </div>
          </div>
        </div>

        {/* --- Standardized Stat Grid --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Execution Time"
            value={formatDuration(run.duration)}
            sub="Total processing duration"
            icon={Timer}
            color="text-emerald-500"
            isMono={isMono}
          />
          <StatCard
            title="Queue Delay"
            value={formatDuration(run.queueDelay || 0)}
            sub="Time spent waiting"
            icon={Clock}
            color="text-orange-500"
            isMono={isMono}
          />
          <StatCard
            title="Retry Attempts"
            value={run.attempts || 1}
            sub="Current attempt count"
            icon={RefreshCw}
            color="text-blue-500"
            isMono={isMono}
          />
          <StatCard
            title="Trigger Origin"
            value={run.triggerTraceId ? "APM Trace" : "Worker"}
            sub={
              run.triggerTraceId
                ? "Spawned by API request"
                : "Standalone execution"
            }
            icon={run.triggerTraceId ? LinkIcon : Server}
            color="text-indigo-500"
            isMono={isMono}
          />
        </div>

        {/* --- Execution Waterfall --- */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2 px-1">
            <Activity className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold text-sm">Execution Waterfall</h3>
          </div>
          <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-sm">
            {run.spans && run.spans.length > 0 ? (
              <TraceWaterfall spans={run.spans} totalDuration={run.duration} />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-12 text-center">
                <div className="p-4 rounded-full bg-secondary/50 mb-4">
                  <Activity className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No internal spans captured
                </p>
                <p className="text-xs mt-2 max-w-xs">
                  To see database queries or external API calls, ensure you
                  enable auto-instrumentation in your SDK.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- Job Metadata --- */}
        <MetadataExplorer metadata={run.metadata} />

        {/* --- Captured Exceptions --- */}
        {errors && errors.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-border/40">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-destructive" />
              Captured Exceptions ({errors.length})
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The following exceptions were thrown and captured during this
              specific task execution.
            </p>
            <ErrorEventList events={errors} showGroupLink={true} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
