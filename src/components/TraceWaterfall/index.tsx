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
  Server,
  LayoutList,
  ChevronRight,
  Tag,
} from "lucide-react";

interface Span {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  status?: number;
  meta?: any;
}

interface WaterfallProps {
  spans: Span[];
  totalDuration: number;
}

// --- Theme Helpers ---
const getSpanTheme = (type: string, status?: number) => {
  if (status && status >= 400) {
    return {
      bg: "bg-red-500/20",
      border: "border-red-500/40",
      bar: "bg-red-500",
      text: "text-red-500",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
  }
  switch (type) {
    case "db":
      return {
        bg: "bg-blue-500/20",
        border: "border-blue-500/40",
        bar: "bg-blue-500",
        text: "text-blue-500",
        icon: <Database className="w-3.5 h-3.5" />,
      };
    case "http":
      return {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/40",
        bar: "bg-emerald-500",
        text: "text-emerald-500",
        icon: <Globe className="w-3.5 h-3.5" />,
      };
    default: // function / internal
      return {
        bg: "bg-purple-500/20",
        border: "border-purple-500/40",
        bar: "bg-purple-500",
        text: "text-purple-500",
        icon: <Terminal className="w-3.5 h-3.5" />,
      };
  }
};

export const TraceWaterfall = ({ spans, totalDuration }: WaterfallProps) => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  // Sort by start time
  const sortedSpans = useMemo(() => {
    return [...spans].sort((a, b) => a.startTime - b.startTime);
  }, [spans]);

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
          <code>Senzor.startSpan()</code> or automatic instrumentation for
          DB/HTTP calls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[800px] bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
      {/* --- Header --- */}
      <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm text-foreground">
            Execution Breakdown
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="outline" className="font-mono">
            {spans.length} Ops
          </Badge>
          <span className="font-mono text-muted-foreground">
            {totalDuration.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* --- List Content --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative bg-background/20">
        {/* Vertical Guide Lines (Subtle) */}
        <div className="absolute inset-0 pointer-events-none flex w-full h-full px-4">
          <div className="w-1/4 border-r border-border/5 h-full" />
          <div className="w-1/4 border-r border-border/5 h-full" />
          <div className="w-1/4 border-r border-border/5 h-full" />
          <div className="w-1/4 h-full" />
        </div>

        {sortedSpans.map((span, i) => {
          const theme = getSpanTheme(span.type, span.status);

          // Calculation
          const startPct = (span.startTime / totalDuration) * 100;
          const widthPct = (span.duration / totalDuration) * 100;
          const safeWidth = Math.max(widthPct, 0.2); // Min visibility

          return (
            <div
              key={i}
              onClick={() => setSelectedSpan(span)}
              className="relative flex flex-col gap-1.5 py-2 px-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors group border border-transparent hover:border-border/40"
            >
              {/* Row 1: Header Info */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2 min-w-0 pr-4">
                  <div
                    className={cn("p-1 rounded shrink-0", theme.bg, theme.text)}
                  >
                    {theme.icon}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {span.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-background/50 px-1.5 rounded">
                  {span.duration.toFixed(2)}ms
                </span>
              </div>

              {/* Row 2: Waterfall Bar */}
              <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "absolute h-full rounded-full opacity-80 group-hover:opacity-100 transition-opacity",
                    theme.bar,
                  )}
                  style={{
                    left: `${startPct}%`,
                    width: `${safeWidth}%`,
                    minWidth: "4px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Details Drawer (Slide-Over) --- */}
      {selectedSpan && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[420px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
          {/* Refined Drawer Header */}
          <div className="flex items-start justify-between p-4 border-b border-border bg-muted/10 shrink-0">
            <div className="space-y-1 pr-4">
              <h4 className="font-bold text-base leading-tight text-foreground break-words">
                {selectedSpan.name}
              </h4>
              <div className="text-xs text-muted-foreground font-mono">
                Start: +{selectedSpan.startTime.toFixed(2)}ms
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setSelectedSpan(null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Duration
                </div>
                <div className="text-2xl font-mono font-medium">
                  {selectedSpan.duration.toFixed(3)}
                  <span className="text-sm text-muted-foreground ml-0.5">
                    ms
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "p-4 rounded-xl border flex flex-col justify-center",
                  selectedSpan.status && selectedSpan.status >= 400
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-emerald-500/5 border-emerald-500/20",
                )}
              >
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Status
                </div>
                <div
                  className={cn(
                    "text-xl font-mono font-bold flex items-center gap-2",
                    selectedSpan.status && selectedSpan.status >= 400
                      ? "text-red-500"
                      : "text-emerald-500",
                  )}
                >
                  {selectedSpan.status || "OK"}
                </div>
              </div>
            </div>

            {/* Type Badge */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Span Type
              </label>
              <Badge
                variant="outline"
                className="px-3 py-1 gap-2 text-sm capitalize"
              >
                {getSpanTheme(selectedSpan.type).icon}
                {selectedSpan.type} Operation
              </Badge>
            </div>

            {/* Attributes */}
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" /> Attributes
              </div>

              {selectedSpan.meta &&
              Object.keys(selectedSpan.meta).length > 0 ? (
                <div className="grid gap-3">
                  {Object.entries(selectedSpan.meta).map(([key, value]) => (
                    <div key={key} className="group">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1 font-mono flex items-center gap-1">
                        {key}
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50 font-mono text-xs break-all hover:border-primary/20 transition-colors text-foreground/90">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic p-4 bg-muted/20 rounded-lg text-center">
                  No metadata attributes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
