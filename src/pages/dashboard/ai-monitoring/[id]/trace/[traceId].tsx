/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { api, useAuth } from "../../../../../lib/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "../../../../../components/Core";
import { TraceDetailSkeleton } from "../../../../../components/Skeletons";
import {
  ArrowLeft, ArrowUpRight, DollarSign, Hash, Clock, Layers, Calendar, Code, Bot,
} from "lucide-react";
import { SmartAnimatedValue } from "@/components/Tween";
import { AiTraceTree } from "@/components/AiTraceTree";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatUsd = (v: number) => (!v ? "$0.00" : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`);
const formatTokens = (v: number) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
};
const formatMs = (v: number) => (v == null ? "0ms" : v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`);

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

// --- Multi-agent graph: agents as nodes, handoffs as directed edges ---
interface AgentNode { name: string; cost: number; calls: number; error: boolean; firstSeen: number }
interface AgentEdge { from?: string; to: string; reason?: string }

const buildAgentGraph = (gens: any[]): { nodes: AgentNode[]; edges: AgentEdge[] } => {
  const nodes = new Map<string, AgentNode>();
  const edges: AgentEdge[] = [];
  const ensure = (name: string, seen = Number.MAX_SAFE_INTEGER) => {
    let n = nodes.get(name);
    if (!n) { n = { name, cost: 0, calls: 0, error: false, firstSeen: seen }; nodes.set(name, n); }
    else if (seen < n.firstSeen) n.firstSeen = seen;
    return n;
  };
  for (const g of gens) {
    if (g.type === "agent" && g.agent?.name) {
      const n = ensure(g.agent.name, g.startTime || 0);
      n.calls += 1;
      n.cost += g.subtreeCostUsd ?? g.costUsd ?? 0;
      if (g.status === "error") n.error = true;
    }
    if (g.type === "handoff" && g.handoff?.to) {
      if (g.handoff.from) ensure(g.handoff.from, g.startTime || 0);
      ensure(g.handoff.to, g.startTime || 0);
      edges.push({ from: g.handoff.from, to: g.handoff.to, reason: g.handoff.reason });
    }
  }
  return { nodes: [...nodes.values()].sort((a, b) => a.firstSeen - b.firstSeen), edges };
};

const NODE_W = 168, NODE_H = 58, GAP = 52, ARC_H = 64, PAD = 16;

const AgentGraph = ({ nodes, edges }: { nodes: AgentNode[]; edges: AgentEdge[] }) => {
  const idx = new Map(nodes.map((n, i) => [n.name, i]));
  const xOf = (i: number) => PAD + i * (NODE_W + GAP);
  const width = Math.max(PAD * 2 + nodes.length * NODE_W + Math.max(0, nodes.length - 1) * GAP, 320);
  const height = PAD + ARC_H + NODE_H + PAD;
  const nodeTop = PAD + ARC_H;

  return (
    <div className="overflow-x-auto p-4">
      <div className="relative" style={{ width, height }}>
        {/* Edges (handoffs) drawn behind the nodes */}
        <svg className="absolute inset-0 text-violet-500/50" width={width} height={height} style={{ pointerEvents: "none" }}>
          <defs>
            <marker id="ag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          {edges.map((e, k) => {
            const si = e.from != null ? idx.get(e.from) : undefined;
            const ti = idx.get(e.to);
            if (ti == null) return null;
            const tx = xOf(ti) + NODE_W / 2;
            if (si == null) return null;
            const sx = xOf(si) + NODE_W / 2;
            const lift = nodeTop - (ARC_H - 10);
            return (
              <path key={k} d={`M ${sx} ${nodeTop} C ${sx} ${lift}, ${tx} ${lift}, ${tx} ${nodeTop}`}
                fill="none" stroke="currentColor" strokeWidth={1.5} markerEnd="url(#ag-arrow)">
                {e.reason && <title>{e.reason}</title>}
              </path>
            );
          })}
        </svg>
        {/* Agent nodes */}
        {nodes.map((n, i) => (
          <div key={n.name} className={`absolute rounded-lg border bg-card shadow-sm flex flex-col justify-center px-3 ${n.error ? "border-red-500/40" : "border-indigo-500/30"}`}
            style={{ left: xOf(i), top: nodeTop, width: NODE_W, height: NODE_H }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot className={`h-3.5 w-3.5 shrink-0 ${n.error ? "text-red-500" : "text-indigo-500"}`} />
              <span className="text-xs font-medium text-foreground truncate" title={n.name}>{n.name}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{formatUsd(n.cost)} · {n.calls} call{n.calls === 1 ? "" : "s"}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AiTraceDetail() {
  const router = useRouter();
  const { id, traceId } = router.query;
  const { token } = useAuth();
  const ready = typeof id === "string" && typeof traceId === "string";
  const url = ready ? `/ai/observability/${id}/trace/${traceId}` : null;
  const { data, error } = useSWR(token && url ? url : null, fetcher);

  if (!data && !error) return <TraceDetailSkeleton />;
  if (error || !data?.trace)
    return <div className="h-full flex items-center justify-center p-8 text-destructive">Failed to load trace.</div>;

  const { trace, generations, scores } = data;
  const totalDuration = trace.latencyMs || generations.reduce((m: number, g: any) => Math.max(m, (g.startTime || 0) + (g.latencyMs || 0)), 0);
  const graph = buildAgentGraph(generations);
  const isMultiAgent = graph.nodes.length >= 2 || graph.edges.length >= 1;

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
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cost" value={formatUsd(trace.totalCostUsd)} sub="Total spend" icon={DollarSign} color="bg-violet-500" />
        <StatCard label="Generations" value={trace.generationCount || generations.length} sub="Model calls" icon={Layers} color="bg-blue-500" />
        <StatCard label="Tokens" value={formatTokens(trace.totalTokens)} sub="Input + output" icon={Hash} color="bg-emerald-500" />
        <StatCard label="Duration" value={formatMs(totalDuration)} sub="End to end" icon={Clock} color="bg-cyan-500" />
      </div>

      {/* Multi-agent graph — only when the trace involves multiple agents / handoffs */}
      {isMultiAgent && (
        <Card className="flex flex-col">
          <CardHeader className="py-4 border-b border-border/40 h-14 shrink-0"><CardTitle className="text-sm font-medium text-muted-foreground">Agent graph ({graph.nodes.length} agent{graph.nodes.length === 1 ? "" : "s"}{graph.edges.length ? `, ${graph.edges.length} handoff${graph.edges.length === 1 ? "" : "s"}` : ""})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <AgentGraph nodes={graph.nodes} edges={graph.edges} />
          </CardContent>
        </Card>
      )}

      {/* Trace tree (agent → tool / mcp / generation) */}
      <AiTraceTree generations={generations} totalDuration={totalDuration} />

      {/* Quality & Feedback — read-only; scores are submitted by the end user / evals via the SDK */}
      {scores?.length > 0 && (
        <Card className="flex flex-col">
          <CardHeader className="py-4 border-b border-border/40 h-14 shrink-0"><CardTitle className="text-sm font-medium text-muted-foreground">Quality &amp; Feedback</CardTitle></CardHeader>
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
    </div>
  );
}
