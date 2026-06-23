/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Badge, cn, Button } from "../Core";
import {
  Sparkles, Bot, Wrench, Server, Search, Hash, GitBranch, Brain, Workflow,
  ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, X, Layers, Tag, Copy, Check,
} from "lucide-react";

// ============================================================================
// AI Trace Tree
// ----------------------------------------------------------------------------
// The agent/tool/MCP/generation tree for one AI trace. Visually mirrors the APM
// TraceWaterfall (recursive nested rows + tree connectors, icon-in-box, a thin
// waterfall bar, collapsible accordions, and a slide-over detail drawer) but is
// AI-aware: it surfaces tokens, cost, reasoning, tool args/result, MCP calls and
// handoffs instead of HTTP/DB span semantics. Read-only — the drawer's "Copy
// request" only exports the captured request for the user to re-run themselves.
// ============================================================================

const formatUsd = (v: number) => (!v ? "$0.00" : v < 0.01 ? `$${v.toFixed(4)}` : v < 1000 ? `$${v.toFixed(2)}` : `$${(v / 1000).toFixed(1)}K`);
const formatTokens = (v: number) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
};
const formatMs = (v: number) => (v == null ? "0ms" : v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`);

const MAX_NESTING_DEPTH = 8;

const STRUCTURAL_TYPES = new Set(["agent", "tool", "mcp", "handoff", "chain", "guardrail", "span", "retrieval"]);

const getObsTheme = (type: string, isError: boolean) => {
  if (isError) return { bg: "bg-red-500/10", text: "text-red-500", bar: "bg-red-500", icon: AlertCircle };
  switch (type) {
    case "agent": return { bg: "bg-indigo-500/10", text: "text-indigo-500", bar: "bg-indigo-500", icon: Bot };
    case "tool": return { bg: "bg-amber-500/10", text: "text-amber-500", bar: "bg-amber-500", icon: Wrench };
    case "mcp": return { bg: "bg-sky-500/10", text: "text-sky-500", bar: "bg-sky-500", icon: Server };
    case "retrieval": return { bg: "bg-blue-500/10", text: "text-blue-500", bar: "bg-blue-500", icon: Search };
    case "embedding": return { bg: "bg-emerald-500/10", text: "text-emerald-500", bar: "bg-emerald-500", icon: Hash };
    case "handoff": return { bg: "bg-pink-500/10", text: "text-pink-500", bar: "bg-pink-500", icon: GitBranch };
    case "reasoning": return { bg: "bg-slate-400/10", text: "text-slate-400", bar: "bg-slate-400", icon: Brain };
    case "chain": return { bg: "bg-teal-500/10", text: "text-teal-500", bar: "bg-teal-500", icon: Workflow };
    case "guardrail": return { bg: "bg-rose-500/10", text: "text-rose-500", bar: "bg-rose-500", icon: ShieldCheck };
    default: return { bg: "bg-violet-500/10", text: "text-violet-500", bar: "bg-violet-500", icon: Sparkles };
  }
};

const nodeLabel = (g: any): string => {
  switch (g.type) {
    case "tool": return g.tool?.name || g.name || "tool";
    case "mcp": return g.mcp?.toolName ? `${g.mcp.server} · ${g.mcp.toolName}` : (g.mcp?.server || g.name || "mcp");
    case "agent": return g.agent?.name || g.name || "agent";
    case "handoff": return `${g.handoff?.from || "?"} → ${g.handoff?.to || "?"}`;
    default: return g.responseModel || g.requestModel || g.name;
  }
};

// --- Tree building (nested, cycle-guarded, siblings ordered by start) ---------
interface TreeNode { gen: any; children: TreeNode[]; depth: number }

const buildTree = (gens: any[]): TreeNode[] => {
  const byId = new Map<string, TreeNode>();
  for (const gen of gens) byId.set(gen.generationId, { gen, children: [], depth: 0 });

  const childKeys = new Set<string>();
  for (const node of byId.values()) {
    const pid = node.gen.parentGenerationId;
    if (pid && pid !== node.gen.generationId && byId.has(pid)) {
      byId.get(pid)!.children.push(node);
      childKeys.add(node.gen.generationId);
    }
  }

  const roots = [...byId.values()].filter((n) => !childKeys.has(n.gen.generationId));
  const byStart = (a: TreeNode, b: TreeNode) => (a.gen.startTime || 0) - (b.gen.startTime || 0);
  const visited = new Set<string>();
  const assignDepth = (nodes: TreeNode[], depth: number) => {
    nodes.sort(byStart);
    for (const n of nodes) {
      if (visited.has(n.gen.generationId)) continue;
      visited.add(n.gen.generationId);
      n.depth = Math.min(depth, MAX_NESTING_DEPTH);
      assignDepth(n.children, depth + 1);
    }
  };
  assignDepth(roots, 0);
  return roots.sort(byStart);
};

const countDescendants = (node: TreeNode): number =>
  node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);

// --- Span row (recursive) -----------------------------------------------------
const SpanRow = ({ node, viewDuration, selectedKey, collapsedKeys, hasNesting, onSelect, onToggle }: any) => {
  const { gen, children, depth } = node;
  const isError = gen.status === "error";
  const theme = getObsTheme(gen.type, isError);
  const Icon = theme.icon;
  const key = gen.generationId;
  const isSelected = selectedKey === key;
  const isCollapsed = collapsedKeys.has(key);
  const hasChildren = children.length > 0;
  const isStructural = STRUCTURAL_TYPES.has(gen.type);

  const startPct = Math.min(100, ((gen.startTime || 0) / viewDuration) * 100);
  const widthPct = Math.max(0.4, ((gen.latencyMs || 0) / viewDuration) * 100);
  const isInstant = (gen.latencyMs || 0) < 0.1;
  const cost = isStructural && gen.subtreeCostUsd != null ? gen.subtreeCostUsd : gen.costUsd;

  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSelected && rowRef.current) rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isSelected]);

  return (
    <div>
      <div
        ref={rowRef}
        onClick={() => onSelect(gen)}
        className={cn(
          "relative flex flex-col gap-1.5 py-2 px-3 rounded-lg cursor-pointer transition-colors group z-10",
          isSelected ? "bg-secondary/80 border border-border/50" : "border border-transparent hover:bg-muted/30 hover:border-border/40",
        )}
      >
        {/* Row 1 — identity */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            {hasChildren ? (
              <div className="flex items-center shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(key); }}
                  className="p-0.5 rounded-md text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", !isCollapsed && "rotate-90")} />
                </button>
                <span className="text-[9px] font-mono text-muted-foreground/70 tabular-nums ml-0.5 select-none">{countDescendants(node)}</span>
              </div>
            ) : hasNesting ? (
              <div className="w-[22px] shrink-0" />
            ) : null}

            <div className={cn("p-1 rounded shrink-0", theme.bg, theme.text)}><Icon className="w-3.5 h-3.5" /></div>
            <span className={cn("text-xs truncate transition-colors max-w-[420px]", isSelected ? "text-foreground font-semibold" : "text-foreground font-medium group-hover:text-violet-500")} title={nodeLabel(gen)}>
              {nodeLabel(gen)}
            </span>
            {!isStructural && gen.provider && <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">{gen.provider}</span>}
            {gen.reasoningTokens > 0 && (
              <span className="text-[10px] text-slate-400 shrink-0 hidden lg:inline-flex items-center gap-1" title="Reasoning tokens"><Brain className="h-3 w-3" />{formatTokens(gen.reasoningTokens)}</span>
            )}
            {isError && <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-500/30 text-red-500 bg-red-500/10 shrink-0">ERR</Badge>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-medium text-foreground" title={isStructural ? "Rolled-up subtree cost" : "Cost"}>{formatUsd(cost)}</span>
            <span className={cn("text-[10px] font-mono px-1.5 rounded border", isSelected ? "text-foreground bg-secondary border-border/40" : "text-muted-foreground bg-background/50 border-border/20")}>
              {formatMs(gen.latencyMs)}
            </span>
          </div>
        </div>

        {/* Row 2 — waterfall bar */}
        <div className="h-2 w-full bg-muted-foreground/10 rounded-full overflow-hidden relative mt-1">
          <div
            className={cn("absolute h-full rounded-full transition-opacity", theme.bar, isSelected ? "opacity-100" : "opacity-80 group-hover:opacity-100")}
            style={{ left: `${startPct}%`, width: isInstant ? "4px" : `${Math.min(100 - startPct, widthPct)}%`, minWidth: isInstant ? "4px" : undefined }}
          />
        </div>
      </div>

      {/* Children — animated accordion with tree connector */}
      {hasChildren && (
        <div className={cn("grid transition-all duration-300 ease-in-out", !isCollapsed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden">
            <div className="ml-5 pl-3 border-l-2 border-border/30 flex flex-col gap-0.5 py-0.5">
              {children.map((child: TreeNode) => (
                <SpanRow key={child.gen.generationId} node={child} viewDuration={viewDuration} selectedKey={selectedKey} collapsedKeys={collapsedKeys} hasNesting={hasNesting} onSelect={onSelect} onToggle={onToggle} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Drawer building blocks ---------------------------------------------------
const Metric = ({ label, value, sub }: any) => (
  <div className="p-4 rounded-xl bg-card border border-border/60">
    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className="text-xl font-mono font-medium text-foreground truncate">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
  </div>
);

const ContentBlock = ({ title, value }: any) => (
  <div className="space-y-1.5">
    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</div>
    <pre className="text-xs bg-card border border-border/60 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  </div>
);

// Read-only export of the captured request — the user re-runs it in THEIR own
// tooling. Senzor never executes anything.
const CopyRequestButton = ({ gen }: any) => {
  const [copied, setCopied] = useState(false);
  const payload = {
    provider: gen.provider,
    model: gen.requestModel || gen.responseModel,
    operation: gen.operation,
    params: gen.params,
    input: gen.tool?.args !== undefined ? gen.tool.args : gen.input,
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={copy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy request"}
    </Button>
  );
};

// --- Detail drawer ------------------------------------------------------------
const SpanDrawer = ({ gen, onClose }: any) => {
  const isError = gen.status === "error";
  const theme = getObsTheme(gen.type, isError);
  const Icon = theme.icon;
  const isStructural = STRUCTURAL_TYPES.has(gen.type);
  const tokens = (gen.tokensIn || 0) + (gen.tokensOut || 0);
  const canCopy = gen.input !== undefined || gen.params || gen.tool?.args !== undefined;

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded", theme.bg, theme.text)}><Icon className="w-3.5 h-3.5" /></div>
          <span className="font-semibold text-sm capitalize">{gen.type} details</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Name + copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{isStructural ? "Operation" : "Model"}</label>
            {canCopy && <CopyRequestButton gen={gen} />}
          </div>
          <div className="text-sm font-mono break-all bg-card p-3 rounded-lg border border-border shadow-sm text-foreground">{nodeLabel(gen)}</div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Latency" value={formatMs(gen.latencyMs)} sub={gen.streaming && gen.timeToFirstTokenMs != null ? `TTFT ${formatMs(gen.timeToFirstTokenMs)}` : undefined} />
          <Metric label={isStructural ? "Subtree cost" : "Cost"} value={formatUsd(isStructural && gen.subtreeCostUsd != null ? gen.subtreeCostUsd : gen.costUsd)} sub={gen.costEstimated ? "estimated" : undefined} />
          {!isStructural && <Metric label="Tokens" value={formatTokens(tokens)} sub={`${formatTokens(gen.tokensIn || 0)} in · ${formatTokens(gen.tokensOut || 0)} out`} />}
          {gen.reasoningTokens > 0 && <Metric label="Reasoning" value={formatTokens(gen.reasoningTokens)} sub="reasoning tokens" />}
          <Metric label="Start offset" value={`+${formatMs(gen.startTime || 0)}`} />
          {gen.provider && !isStructural && <Metric label="Provider" value={gen.provider} sub={gen.operation} />}
        </div>

        {/* Status */}
        <div className={cn("flex items-center justify-between p-4 rounded-xl border", isError ? "bg-red-500/5 border-red-500/20 text-red-500" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-500")}>
          <div className="flex items-center gap-3">
            {isError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <div className="text-sm font-bold">{isError ? "Error" : "OK"}</div>
          </div>
          <div className="font-mono text-sm">{gen.finishReason || (isError ? gen.statusCode || "error" : "ok")}</div>
        </div>

        {isError && gen.errorMessage && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-mono break-words">{gen.errorType}: {gen.errorMessage}</div>
        )}

        {/* MCP identity */}
        {gen.mcp && (
          <div className="grid gap-2">
            {[["server", gen.mcp.server], ["transport", gen.mcp.transport], ["method", gen.mcp.method], ["tool", gen.mcp.toolName], ["resource", gen.mcp.resourceUri]].filter(([, v]) => v).map(([k, v]: any) => (
              <div key={k} className="bg-card border border-border/40 rounded-lg p-3">
                <div className="text-[10px] font-bold text-muted-foreground mb-1 font-mono uppercase opacity-70">{k}</div>
                <div className="font-mono text-xs break-all text-foreground/90">{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Agent / handoff */}
        {gen.agent?.role && <div className="text-xs text-muted-foreground">Role: <span className="text-foreground/80">{gen.agent.role}</span></div>}
        {gen.handoff?.reason && <div className="text-xs text-muted-foreground">Reason: <span className="text-foreground/80">{gen.handoff.reason}</span></div>}

        {/* Content + tool payloads */}
        {gen.tool?.args !== undefined && <ContentBlock title="Tool args" value={gen.tool.args} />}
        {gen.tool?.result !== undefined && <ContentBlock title="Tool result" value={gen.tool.result} />}
        {gen.input !== undefined && <ContentBlock title="Input" value={gen.input} />}
        {gen.output !== undefined && <ContentBlock title="Output" value={gen.output} />}
        {gen.toolCalls?.length > 0 && <ContentBlock title="Tool calls" value={gen.toolCalls} />}

        {/* Params */}
        {gen.params && Object.keys(gen.params).length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider"><Tag className="w-3.5 h-3.5" /> Parameters</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {Object.entries(gen.params).map(([k, v]) => <span key={k}><span className="font-mono text-foreground/70">{k}</span>: {String(v)}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main component -----------------------------------------------------------
export const AiTraceTree = ({ generations, totalDuration }: { generations: any[]; totalDuration: number }) => {
  const [selected, setSelected] = useState<any | null>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const { tree, viewDuration, hasNesting } = useMemo(() => {
    const t = buildTree(generations || []);
    let maxEnd = totalDuration || 0;
    for (const g of generations || []) maxEnd = Math.max(maxEnd, (g.startTime || 0) + (g.latencyMs || 0));
    return { tree: t, viewDuration: (maxEnd || 1) * 1.02, hasNesting: t.some((n) => n.children.length > 0) };
  }, [generations, totalDuration]);

  const onToggle = useCallback((key: string) => {
    setCollapsedKeys((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }, []);

  if (!generations || generations.length === 0) {
    return (
      <div className="flex flex-col min-h-[300px] bg-card rounded-xl border border-border shadow-sm overflow-hidden items-center justify-center text-center p-8">
        <div className="h-16 w-16 rounded-full bg-secondary/40 flex items-center justify-center mb-4"><Layers className="h-8 w-8 text-muted-foreground/50" /></div>
        <h3 className="text-lg font-semibold text-foreground">No observations</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">This trace has no recorded generations, tools or agent steps yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[400px] max-h-[800px] bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
      {/* Header */}
      <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0 select-none">
        <span className="font-semibold text-sm text-foreground">Trace tree</span>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="outline" className="font-mono text-[10px]">{generations.length} observations</Badge>
          <span className="font-mono text-muted-foreground">{formatMs(viewDuration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 relative bg-background/20 flex flex-col overflow-hidden">
        {/* Vertical guide lines */}
        <div className="absolute inset-0 pointer-events-none flex w-full h-full px-4 z-0">
          {[0, 0.25, 0.5, 0.75].map((_, i) => <div key={i} className="flex-1 border-l border-dashed border-border/10 h-full first:border-l-0" />)}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 relative z-10">
          {tree.map((node) => (
            <SpanRow key={node.gen.generationId} node={node} viewDuration={viewDuration} selectedKey={selected?.generationId ?? null} collapsedKeys={collapsedKeys} hasNesting={hasNesting} onSelect={setSelected} onToggle={onToggle} />
          ))}
        </div>
      </div>

      {selected && <SpanDrawer gen={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default AiTraceTree;
