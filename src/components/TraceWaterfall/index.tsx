import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Badge, cn, Button } from "../Core";
import {
  Database,
  Globe,
  Terminal,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
  LayoutList,
  ChevronRight,
  Tag,
  Server,
} from "lucide-react";
import { useRouter } from "next/router";

// --- Interfaces ---

interface Span {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  status?: number;
  meta?: any;
  spanId?: string;
  parentSpanId?: string;
}

interface SpanTreeNode {
  span: Span;
  children: SpanTreeNode[];
  depth: number;
}

interface WaterfallProps {
  spans: Span[];
  totalDuration: number;
  childrenTraces?: any[];
}

// --- Constants ---

const MAX_NESTING_DEPTH = 6;

// --- Helpers ---

const getSpanKey = (span: Span): string =>
  span.spanId || `${span.name}::${span.startTime}::${span.duration}`;

const getSpanParentId = (span: Span): string | undefined =>
  span.parentSpanId || span.meta?.parentSpanId;

const getSpanTheme = (type: string, status?: number) => {
  if (status && status >= 400) {
    return {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      bar: "bg-red-500",
      text: "text-red-500",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
  }
  switch (type) {
    case "db":
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        bar: "bg-blue-500",
        text: "text-blue-500",
        icon: <Database className="w-3.5 h-3.5" />,
      };
    case "http":
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        bar: "bg-emerald-500",
        text: "text-emerald-500",
        icon: <Globe className="w-3.5 h-3.5" />,
      };
    default:
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        bar: "bg-purple-500",
        text: "text-purple-500",
        icon: <Terminal className="w-3.5 h-3.5" />,
      };
  }
};

// --- Tree Building ---

const buildSpanTree = (spans: Span[]): SpanTreeNode[] => {
  const nodes: SpanTreeNode[] = spans.map((span) => ({
    span,
    children: [],
    depth: 0,
  }));

  const spanIdToNode = new Map<string, SpanTreeNode>();
  for (const node of nodes) {
    if (node.span.spanId) {
      spanIdToNode.set(node.span.spanId, node);
    }
  }

  const childNodes = new Set<SpanTreeNode>();
  for (const node of nodes) {
    const parentId = getSpanParentId(node.span);
    if (parentId && parentId !== node.span.spanId) {
      const parent = spanIdToNode.get(parentId);
      if (parent && parent !== node) {
        parent.children.push(node);
        childNodes.add(node);
      }
    }
  }

  const roots = nodes.filter((n) => !childNodes.has(n));

  const assignDepths = (
    treeNodes: SpanTreeNode[],
    depth: number,
    visited = new Set<SpanTreeNode>(),
  ) => {
    treeNodes.sort((a, b) => a.span.startTime - b.span.startTime);
    for (const node of treeNodes) {
      if (visited.has(node)) continue;
      visited.add(node);
      node.depth = Math.min(depth, MAX_NESTING_DEPTH);
      assignDepths(node.children, depth + 1, visited);
    }
  };
  assignDepths(roots, 0);

  return roots;
};

const findAncestorKeys = (
  targetKey: string,
  nodes: SpanTreeNode[],
): Set<string> => {
  const ancestors = new Set<string>();
  const search = (searchNodes: SpanTreeNode[]): boolean => {
    for (const node of searchNodes) {
      const key = getSpanKey(node.span);
      if (key === targetKey) return true;
      if (node.children.length > 0 && search(node.children)) {
        ancestors.add(key);
        return true;
      }
    }
    return false;
  };
  search(nodes);
  return ancestors;
};

// --- Span Row Component ---

const SpanRow = ({
  node,
  viewDuration,
  selectedSpanKey,
  ancestorKeys,
  collapsedKeys,
  hasNesting,
  onSelect,
  onToggleCollapse,
  getChildTrace,
}: {
  node: SpanTreeNode;
  viewDuration: number;
  selectedSpanKey: string | null;
  ancestorKeys: Set<string>;
  collapsedKeys: Set<string>;
  hasNesting: boolean;
  onSelect: (span: Span) => void;
  onToggleCollapse: (key: string) => void;
  getChildTrace: (spanId: string | undefined) => any;
}) => {
  const { span, children, depth } = node;
  const theme = getSpanTheme(span.type, span.status);
  const spanKey = getSpanKey(span);
  const isSelected = selectedSpanKey === spanKey;
  const isCollapsed = collapsedKeys.has(spanKey);
  const hasChildren = children.length > 0;
  const linkedChild = getChildTrace(span.spanId || span.meta?.spanId);

  const startPct = (span.startTime / viewDuration) * 100;
  const widthPct = (span.duration / viewDuration) * 100;
  const isInstant = span.duration < 0.1;
  const safeWidth = Math.max(widthPct, 0.2);

  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div>
      <div
        ref={rowRef}
        onClick={() => onSelect(span)}
        className={cn(
          "relative flex flex-col gap-1.5 py-2 px-3 rounded-lg cursor-pointer transition-colors group z-10",
          isSelected
            ? "bg-secondary/80 border border-border/50"
            : "border border-transparent hover:bg-muted/30 hover:border-border/40",
        )}
      >
        {/* Row 1: Header Info */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            {hasChildren ? (
              <div className="flex items-center shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(spanKey);
                  }}
                  className="p-0.5 rounded-md text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      !isCollapsed && "rotate-90",
                    )}
                  />
                </button>
                <span className="text-[9px] font-mono text-muted-foreground/70 tabular-nums ml-0.5 select-none">
                  {children.length}
                </span>
              </div>
            ) : hasNesting ? (
              <div className="w-[22px] shrink-0" />
            ) : null}

            <div className={cn("p-1 rounded shrink-0", theme.bg, theme.text)}>
              {theme.icon}
            </div>
            <span
              className={cn(
                "text-xs truncate transition-colors max-w-[400px]",
                isSelected
                  ? "text-foreground font-semibold"
                  : "text-foreground font-medium group-hover:text-primary",
              )}
            >
              {span.name}
            </span>
            {linkedChild && (
              <Badge
                variant="outline"
                className="h-4 px-1 text-[9px] border-blue-500/30 text-blue-500 bg-blue-500/5 gap-1"
              >
                <Zap className="w-2 h-2" /> Linked
              </Badge>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-mono shrink-0 px-1.5 rounded border",
              isSelected
                ? "text-foreground bg-secondary border-border/40"
                : "text-muted-foreground bg-background/50 border-border/20",
            )}
          >
            {span.duration.toFixed(3)}ms
          </span>
        </div>

        {/* Row 2: Waterfall Bar */}
        <div className="h-2 w-full bg-muted-foreground/10 rounded-full overflow-hidden relative mt-1">
          <div
            className={cn(
              "absolute h-full rounded-full transition-opacity",
              theme.bar,
              isSelected
                ? "opacity-100"
                : "opacity-80 group-hover:opacity-100",
            )}
            style={{
              left: `${startPct}%`,
              width: isInstant ? "4px" : `${safeWidth}%`,
              minWidth: isInstant ? "4px" : undefined,
            }}
          />
        </div>
      </div>

      {/* Children Container (Animated Accordion with Tree Connector) */}
      {hasChildren && (
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            !isCollapsed
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "ml-5 pl-3 border-l-2 flex flex-col gap-0.5 py-0.5 transition-colors duration-300",
                ancestorKeys.has(spanKey)
                  ? "border-primary/50"
                  : "border-border/30",
              )}
            >
              {children.map((child) => (
                <SpanRow
                  key={getSpanKey(child.span)}
                  node={child}
                  viewDuration={viewDuration}
                  selectedSpanKey={selectedSpanKey}
                  ancestorKeys={ancestorKeys}
                  collapsedKeys={collapsedKeys}
                  hasNesting={hasNesting}
                  onSelect={onSelect}
                  onToggleCollapse={onToggleCollapse}
                  getChildTrace={getChildTrace}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export const TraceWaterfall = ({
  spans,
  totalDuration,
  childrenTraces,
}: WaterfallProps) => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const router = useRouter();

  const { spanTree, viewDuration, hasNesting } = useMemo(() => {
    const tree = buildSpanTree(spans);

    let maxEnd = totalDuration;
    const calcMaxEnd = (nodes: SpanTreeNode[]) => {
      for (const node of nodes) {
        const end = node.span.startTime + node.span.duration;
        if (end > maxEnd) maxEnd = end;
        calcMaxEnd(node.children);
      }
    };
    calcMaxEnd(tree);

    return {
      spanTree: tree,
      viewDuration: maxEnd * 1.02,
      hasNesting: tree.some((node) => node.children.length > 0),
    };
  }, [spans, totalDuration]);

  const selectedSpanKey = selectedSpan ? getSpanKey(selectedSpan) : null;

  const ancestorKeys = useMemo(() => {
    if (!selectedSpanKey) return new Set<string>();
    return findAncestorKeys(selectedSpanKey, spanTree);
  }, [selectedSpanKey, spanTree]);

  const showResponseLine = viewDuration > totalDuration * 1.05;

  const getChildTrace = useCallback(
    (spanId: string | undefined) => {
      if (!childrenTraces || !spanId) return undefined;
      return childrenTraces.find((c: any) => c.parentSpanId === spanId);
    },
    [childrenTraces],
  );

  const handleSelect = useCallback((span: Span) => {
    setSelectedSpan(span);
  }, []);

  const handleToggleCollapse = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // --- Empty State ---
  if (!spans || spans.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-[400px] bg-card rounded-xl border border-border shadow-sm overflow-hidden items-center justify-center text-center p-8">
        <div className="h-16 w-16 rounded-full bg-secondary/40 flex items-center justify-center mb-4">
          <LayoutList className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          No Internal Spans
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          This trace has no sub-operations recorded. Ensure you are using{" "}
          <code>Senzor.startSpan()</code> or automatic instrumentation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[800px] bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
      {/* --- 1. Global Header --- */}
      <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm text-foreground">
            Execution Breakdown
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="outline" className="font-mono text-[10px]">
            {spans.length} spans
          </Badge>
          <span className="font-mono text-muted-foreground">
            {viewDuration.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* --- 2. Main Content (Timeline) --- */}
      <div className="flex-1 relative bg-background/20 flex flex-col overflow-hidden">
        {/* Layer 1: Vertical Guide Lines (Fixed Background z-0) */}
        <div className="absolute inset-0 pointer-events-none flex w-full h-full px-4 z-0">
          {[0, 0.25, 0.5, 0.75].map((tick, i) => (
            <div
              key={i}
              className="flex-1 border-l border-dashed border-border/10 h-full first:border-l-0"
            />
          ))}
        </div>

        {/* Layer 2: Scrolling Content (z-10) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 relative z-10">
          {spanTree.map((node) => (
            <SpanRow
              key={getSpanKey(node.span)}
              node={node}
              viewDuration={viewDuration}
              selectedSpanKey={selectedSpanKey}
              ancestorKeys={ancestorKeys}
              collapsedKeys={collapsedKeys}
              hasNesting={hasNesting}
              onSelect={handleSelect}
              onToggleCollapse={handleToggleCollapse}
              getChildTrace={getChildTrace}
            />
          ))}
        </div>

        {/* Layer 3: Response Line Overlay (Fixed Foreground z-20) */}
        {showResponseLine && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none border-l-2 border-dotted border-red-500/50 z-0"
            style={{
              left: `calc(${(totalDuration / viewDuration) * 100}% + 16px)`,
            }}
          >
            {" "}
            <span className="text-[9px] text-red-500 font-bold bg-card/80 absolute top-0 -ml-5">
              {" "}
              Response{" "}
            </span>{" "}
          </div>
        )}
      </div>

      {/* --- 3. Details Drawer (Slide-Over) --- */}
      {selectedSpan && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
          {/* Simple Header */}
          <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Span Details</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setSelectedSpan(null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Linked Service Card */}
            {(() => {
              const linkedChild = getChildTrace(
                selectedSpan.spanId || selectedSpan.meta?.spanId,
              );
              if (linkedChild)
                return (
                  <div
                    className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors group relative overflow-hidden"
                    onClick={() =>
                      router.push(
                        `/dashboard/apm/${linkedChild.serviceId}/trace/${linkedChild._id}`,
                      )
                    }
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="w-12 h-12 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wider mb-2">
                      <Server className="w-3.5 h-3.5" /> Downstream Trace
                    </div>
                    <div className="font-bold text-base text-foreground">
                      {linkedChild.serviceName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
                      <span className="bg-background/50 px-1 rounded">
                        {linkedChild.method}
                      </span>
                      <span className="truncate">{linkedChild.route}</span>
                    </div>
                  </div>
                );
            })()}

            {/* Name Block */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Operation
              </label>
              <div className="text-sm font-mono break-all bg-card p-3 rounded-lg border border-border shadow-sm text-foreground flex items-start gap-2">
                <div
                  className={cn(
                    "mt-1",
                    getSpanTheme(selectedSpan.type, selectedSpan.status).text,
                  )}
                >
                  {getSpanTheme(selectedSpan.type, selectedSpan.status).icon}
                </div>
                {selectedSpan.name}
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Duration
                </div>
                <div className="text-xl font-mono font-medium text-foreground">
                  {selectedSpan.duration.toFixed(3)}
                  <span className="text-xs text-muted-foreground ml-0.5">
                    ms
                  </span>
                </div>
              </div>
              {/* Start Time moved here as requested */}
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Start Offset
                </div>
                <div className="text-xl font-mono font-medium text-muted-foreground">
                  +{selectedSpan.startTime.toFixed(2)}
                  <span className="text-xs ml-0.5">ms</span>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border",
                selectedSpan.status && selectedSpan.status >= 400
                  ? "bg-red-500/5 border-red-500/20 text-red-500"
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-500",
              )}
            >
              <div className="flex items-center gap-3">
                {selectedSpan.status && selectedSpan.status >= 400 ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <div className="text-sm font-bold">Response Status</div>
              </div>
              <div className="font-mono text-xl font-bold">
                {selectedSpan.status || "OK"}
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" /> Attributes
              </div>

              {selectedSpan.meta &&
              Object.keys(selectedSpan.meta).length > 0 ? (
                <div className="grid gap-2">
                  {Object.entries(selectedSpan.meta).map(([key, value]) => (
                    <div
                      key={key}
                      className="group bg-card border border-border/40 rounded-lg p-3 hover:border-primary/20 transition-colors"
                    >
                      <div className="text-[10px] font-bold text-muted-foreground mb-1.5 font-mono flex items-center gap-1.5 uppercase opacity-70">
                        {key}
                      </div>
                      <div className="font-mono text-xs break-all text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic p-4 bg-muted/20 rounded-lg text-center border border-dashed border-border/50">
                  No additional attributes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
