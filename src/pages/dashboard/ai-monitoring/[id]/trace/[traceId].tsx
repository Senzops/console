/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { api, useAuth } from "../../../../../lib/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "../../../../../components/Core";
import { TraceDetailSkeleton } from "../../../../../components/Skeletons";
import {
  ArrowLeft, ArrowUpRight, ChevronRight, ChevronDown,
  DollarSign, Hash, Clock, Layers, Calendar, Code, Star, ThumbsUp, ThumbsDown, FileWarning,
} from "lucide-react";
import { SmartAnimatedValue } from "@/components/Tween";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatUsd = (v: number) => (!v ? "$0.00" : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`);
const formatTokens = (v: number) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
};
const formatMs = (v: number) => (v == null ? "0ms" : v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`);

const TYPE_COLORS: Record<string, string> = {
  generation: "border-violet-500/30 text-violet-500 bg-violet-500/10",
  tool: "border-amber-500/30 text-amber-500 bg-amber-500/10",
  retrieval: "border-blue-500/30 text-blue-500 bg-blue-500/10",
  embedding: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
  span: "border-border text-muted-foreground bg-muted/30",
};

// --- Stat card (icon box) — mirrors APM trace detail ---
const StatCard = ({ label, value, sub, icon: Icon, color }: any) => (
  <Card className="hover:border-foreground/20 transition-colors">
    <CardContent className="p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color.replace("bg-", "text-")}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">{label}</div>
        <div className="text-xl font-bold text-foreground truncate"><SmartAnimatedValue value={value} /></div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </div>
    </CardContent>
  </Card>
);

// --- Generation waterfall row ---
const GenerationRow = ({ gen, totalDuration }: any) => {
  const [open, setOpen] = useState(false);
  const hasContent = gen.input !== undefined || gen.output !== undefined || (gen.toolCalls && gen.toolCalls.length) || gen.errorMessage;
  const span = totalDuration || 1;
  const left = Math.min(99, ((gen.startTime || 0) / span) * 100);
  const width = Math.max(1, Math.min(100 - left, ((gen.latencyMs || 0) / span) * 100));

  return (
    <div className="border-b border-border/40 last:border-0">
      <button type="button" onClick={() => hasContent && setOpen((v) => !v)} className={`w-full text-left px-4 py-3 hover:bg-muted/20 transition-colors ${hasContent ? "cursor-pointer" : "cursor-default"}`}>
        <div className="flex items-center gap-3">
          <div className="w-4 shrink-0 text-muted-foreground">{hasContent ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}</div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_COLORS[gen.type] || TYPE_COLORS.span}`}>{gen.type}</Badge>
          <span className="font-mono text-xs text-foreground truncate min-w-[120px] max-w-[260px]" title={gen.responseModel || gen.requestModel}>{gen.responseModel || gen.requestModel || gen.name}</span>
          <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">{gen.provider}</span>
          <div className="flex-1 h-2 bg-muted/40 rounded relative mx-2 min-w-[60px]">
            <div className={`absolute h-2 rounded ${gen.status === "error" ? "bg-red-500" : "bg-violet-500"}`} style={{ left: `${left}%`, width: `${width}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-16 text-right shrink-0 font-mono">{formatMs(gen.latencyMs)}</span>
          <span className="text-xs text-muted-foreground w-20 text-right shrink-0 font-mono hidden sm:inline">{formatTokens((gen.tokensIn || 0) + (gen.tokensOut || 0))} tok</span>
          <span className="text-xs font-medium w-16 text-right shrink-0 font-mono">{formatUsd(gen.costUsd)}</span>
          {gen.status === "error" && <Badge variant="outline" className="text-[10px] shrink-0 border-red-500/30 text-red-500 bg-red-500/10">ERR</Badge>}
        </div>
      </button>
      {open && hasContent && (
        <div className="px-12 pb-4 space-y-3">
          {gen.errorMessage && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 font-mono">{gen.errorType}: {gen.errorMessage}</div>}
          {gen.input !== undefined && <ContentBlock title="Input" value={gen.input} />}
          {gen.output !== undefined && <ContentBlock title="Output" value={gen.output} />}
          {gen.toolCalls?.length > 0 && <ContentBlock title="Tool calls" value={gen.toolCalls} />}
          {gen.params && Object.keys(gen.params).length > 0 && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(gen.params).map(([k, v]) => <span key={k}><span className="font-mono text-foreground/70">{k}</span>: {String(v)}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ContentBlock = ({ title, value }: any) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
    <pre className="text-xs bg-muted/40 border border-border/40 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words text-foreground/90">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  </div>
);

export default function AiTraceDetail() {
  const router = useRouter();
  const { id, traceId } = router.query;
  const { token } = useAuth();
  const ready = typeof id === "string" && typeof traceId === "string";
  const url = ready ? `/ai/observability/${id}/trace/${traceId}` : null;
  const { data, error, mutate } = useSWR(token && url ? url : null, fetcher);

  if (!data && !error) return <TraceDetailSkeleton />;
  if (error || !data?.trace)
    return <div className="h-full flex items-center justify-center p-8 text-destructive">Failed to load trace.</div>;

  const { trace, generations, scores } = data;
  const totalDuration = trace.latencyMs || generations.reduce((m: number, g: any) => Math.max(m, (g.startTime || 0) + (g.latencyMs || 0)), 0);

  const submitFeedback = async (value: number) => {
    try {
      await api.post(`/ai/observability/${id}/score`, { traceId, name: "user_feedback", dataType: "boolean", value });
      toast.success("Feedback recorded");
      mutate();
    } catch { toast.error("Failed to record feedback"); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push(`/dashboard/ai-monitoring/${id}`)} className="pl-0 w-fit hover:bg-transparent hover:text-violet-500 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Source
          </Button>
          {trace.apmTraceId && (
            <Link href="/dashboard/apm">
              <Button variant="outline" size="sm" className="h-8 gap-2 border-orange-500/30 text-orange-500 hover:bg-orange-500/10">
                <ArrowUpRight className="h-3.5 w-3.5" /> Linked APM trace
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-4 rounded-xl border border-border shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-xl font-bold text-foreground truncate" title={trace.name}>{trace.name || "ai.trace"}</h1>
              <Badge variant="outline" className={`font-mono text-xs ${trace.status === "error" ? "border-red-500/30 text-red-500 bg-red-500/10" : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"}`}>{(trace.status || "ok").toUpperCase()}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono"><Code className="h-3 w-3" /><span className="truncate max-w-[180px]" title={trace.traceId}>{trace.traceId}</span></div>
              <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(trace.timestamp).toLocaleString()}</div>
              {trace.sessionId && <Badge variant="secondary" className="text-[10px]">session: {trace.sessionId}</Badge>}
              {trace.userId && <Badge variant="secondary" className="text-[10px]">user: {trace.userId}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-6 border-t md:border-t-0 border-border/50 pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Cost</div>
              <div className="text-2xl font-mono font-medium text-violet-500">{formatUsd(trace.totalCostUsd)}</div>
            </div>
            <div className="h-10 w-px bg-border/60 hidden md:block" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Rate</span>
              <Button variant="outline" size="icon" className="h-8 w-8 hover:text-emerald-500" onClick={() => submitFeedback(1)} title="Good"><ThumbsUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8 hover:text-red-500" onClick={() => submitFeedback(0)} title="Bad"><ThumbsDown className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cost" value={formatUsd(trace.totalCostUsd)} sub="Total spend" icon={DollarSign} color="bg-violet-500" />
        <StatCard label="Generations" value={trace.generationCount || generations.length} sub="LLM / tool calls" icon={Layers} color="bg-blue-500" />
        <StatCard label="Tokens" value={formatTokens(trace.totalTokens)} sub="Input + output" icon={Hash} color="bg-emerald-500" />
        <StatCard label="Duration" value={formatMs(totalDuration)} sub="End to end" icon={Clock} color="bg-cyan-500" />
      </div>

      {/* Scores */}
      {scores?.length > 0 && (
        <Card className="flex flex-col">
          <CardHeader className="py-4 border-b border-border/40 h-14 shrink-0"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Quality &amp; Feedback</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium">Score</th><th className="px-4 py-2.5 font-medium">Value</th><th className="px-4 py-2.5 font-medium">Source</th><th className="px-4 py-2.5 font-medium">Comment</th><th className="px-4 py-2.5 font-medium text-right">When</th></tr></thead>
              <tbody>
                {scores.map((s: any) => (
                  <tr key={s._id} className="border-b border-border/40">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5">{s.dataType === "categorical" ? s.stringValue : s.dataType === "boolean" ? (s.value ? "👍" : "👎") : s.value}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.scoredBy}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[240px]">{s.comment || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground font-mono">{new Date(s.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Waterfall */}
      <Card className="flex flex-col">
        <CardHeader className="py-4 border-b border-border/40 h-14 shrink-0"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileWarning className="h-4 w-4 text-violet-500" /> Generation waterfall ({generations.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {generations.length
            ? generations.map((g: any) => <GenerationRow key={g.generationId} gen={g} totalDuration={totalDuration} />)
            : <div className="p-8 text-center text-sm text-muted-foreground">No generations recorded for this trace.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
