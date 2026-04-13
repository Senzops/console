import React, { useState, useMemo } from "react";
import { Badge, cn, Button } from "../Core";
import {
  Database,
  Globe,
  Box,
  Clock,
  Terminal,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
  LayoutList,
  ChevronRight,
  Tag,
  ArrowRightCircle,
  Server,
} from "lucide-react";
import { useRouter } from "next/router";

interface Span {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  status?: number;
  meta?: any;
  spanId?: string; // For linking
}

interface WaterfallProps {
  spans: Span[];
  totalDuration: number;
  childrenTraces?: any[]; // Restored
}

// --- Theme Helpers ---
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

export const TraceWaterfall = ({
  spans,
  totalDuration,
  childrenTraces,
}: WaterfallProps) => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const router = useRouter();

  // 1. Calculate View Duration (Async Span Support)
  const { sortedSpans, viewDuration } = useMemo(() => {
    const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
    let maxEnd = totalDuration;

    // Check if any span goes beyond the main request duration
    sorted.forEach((s) => {
      const end = s.startTime + s.duration;
      if (end > maxEnd) maxEnd = end;
    });

    // Add 2% buffer for visual breathing room
    return { sortedSpans: sorted, viewDuration: maxEnd * 1.02 };
  }, [spans, totalDuration]);

  // Show "Response Sent" marker if async tasks exist
  const showResponseLine = viewDuration > totalDuration * 1.05;

  // Helper to find child traces
  const getChildTrace = (spanId: string) => {
    if (!childrenTraces || !spanId) return undefined;
    return childrenTraces.find((c) => c.parentSpanId === spanId);
  };

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
        <div className="flex-1 overflow-y-auto p-4 space-y-1 relative z-10">
          {sortedSpans.map((span, i) => {
            const theme = getSpanTheme(span.type, span.status);
            const linkedChild = getChildTrace(
              (span as any).spanId || span.meta?.spanId,
            );

            // Calculation based on viewDuration (handling async)
            const startPct = (span.startTime / viewDuration) * 100;
            const widthPct = (span.duration / viewDuration) * 100;
            const isInstant = span.duration < 0.1;
            const safeWidth = Math.max(widthPct, 0.2);

            return (
              <div
                key={i}
                onClick={() => setSelectedSpan(span)}
                className="relative flex flex-col gap-1.5 py-2 px-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors group border border-transparent hover:border-border/40 z-10"
              >
                {/* Row 1: Header Info */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <div
                      className={cn(
                        "p-1 rounded shrink-0",
                        theme.bg,
                        theme.text,
                      )}
                    >
                      {theme.icon}
                    </div>
                    <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors max-w-[400px]">
                      {span.name}
                    </span>
                    {/* Link Badge */}
                    {linkedChild && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[9px] border-blue-500/30 text-blue-500 bg-blue-500/5 gap-1"
                      >
                        <Zap className="w-2 h-2" /> Linked
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-background/50 px-1.5 rounded border border-border/20">
                    {span.duration.toFixed(3)}ms
                  </span>
                </div>

                {/* Row 2: Waterfall Bar */}
                <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden relative mt-1">
                  <div
                    className={cn(
                      "absolute h-full rounded-full opacity-80 group-hover:opacity-100 transition-opacity",
                      theme.bar,
                    )}
                    style={{
                      left: `${startPct}%`,
                      width: isInstant ? "4px" : `${safeWidth}%`,
                      minWidth: isInstant ? "4px" : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
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
            {/* Linked Service Card (Restored) */}
            {(() => {
              const linkedChild = getChildTrace(
                (selectedSpan as any).spanId || selectedSpan.meta?.spanId,
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
