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
  Hash,
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

// --- Theme Logic ---
const getSpanTheme = (type: string, status?: number) => {
  // Error State
  if (status && status >= 400) {
    return {
      bar: "bg-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-500",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
  }
  // Success States
  switch (type) {
    case "db":
      return {
        bar: "bg-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-500",
        icon: <Database className="w-3.5 h-3.5" />,
      };
    case "http":
      return {
        bar: "bg-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-500",
        icon: <Globe className="w-3.5 h-3.5" />,
      };
    default: // function / internal
      return {
        bar: "bg-purple-500",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-500",
        icon: <Terminal className="w-3.5 h-3.5" />,
      };
  }
};

export const TraceWaterfall = ({ spans, totalDuration }: WaterfallProps) => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  // Sorting
  const sortedSpans = useMemo(() => {
    return [...spans].sort((a, b) => a.startTime - b.startTime);
  }, [spans]);

  return (
    <div className="flex flex-col max-h-[30rem] min-h-[20rem] bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
      {/* --- Component Header --- */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary text-foreground">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Timeline Breakdown
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {spans.length} spans recorded
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1">
          Total: {totalDuration.toFixed(2)}ms
        </Badge>
      </div>

      {/* --- Timeline Area --- */}
      <div className="flex-1 relative overflow-y-auto bg-background/30">
        {/* Grid & Ruler Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none flex z-0 px-4 pt-8">
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <div
              key={i}
              className="flex-1 border-l border-dashed border-border/30 h-full relative first:border-l-0"
            >
              <span className="absolute -top-6 -left-3 text-[9px] font-mono text-muted-foreground bg-muted/20 px-1.5 rounded">
                {(totalDuration * tick).toFixed(0)}ms
              </span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="relative z-10 pt-10 pb-4 px-4 space-y-1 min-w-[600px]">
          {sortedSpans.map((span, i) => {
            const theme = getSpanTheme(span.type, span.status);

            // Math
            const startPct = (span.startTime / totalDuration) * 100;
            const widthPct = (span.duration / totalDuration) * 100;
            // Ensure visibility for 0ms spans (Instant)
            const isInstant = span.duration < 0.1;
            const safeWidth = Math.max(widthPct, 0.5);

            return (
              <div
                key={i}
                onClick={() => setSelectedSpan(span)}
                className="group relative h-9 flex items-center hover:bg-muted/40 rounded-md -mx-2 px-2 transition-all cursor-pointer"
              >
                {/* The Timeline Bar */}
                <div className="w-full h-6 relative">
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded-[3px] flex items-center shadow-sm transition-all group-hover:shadow-md border",
                      theme.bg,
                      theme.border,
                    )}
                    style={{
                      left: `${startPct}%`,
                      width: isInstant ? "4px" : `${safeWidth}%`,
                      minWidth: "4px",
                    }}
                  >
                    {/* Progress Fill */}
                    <div
                      className={cn("absolute inset-0 opacity-20", theme.bar)}
                    />
                    {isInstant && (
                      <div
                        className={cn("absolute inset-0 opacity-80", theme.bar)}
                      />
                    )}
                  </div>

                  {/* Label: Always visible, smart positioning */}
                  <div
                    className="absolute top-0 h-full flex items-center whitespace-nowrap pointer-events-none"
                    style={{
                      // If bar is wide (>20%), label goes inside. Else, outside right.
                      left:
                        widthPct > 20
                          ? `${startPct}%`
                          : `calc(${startPct}% + ${safeWidth}% + 8px)`,
                      width: widthPct > 20 ? `${safeWidth}%` : "auto",
                      paddingLeft: widthPct > 20 ? "8px" : "0",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("shrink-0 opacity-80", theme.text)}>
                        {theme.icon}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate max-w-[300px] drop-shadow-sm">
                        {span.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground opacity-70">
                        {span.duration.toFixed(2)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- 3. Details Drawer (Fixed Overlay) --- */}
      {selectedSpan && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[500px] bg-background border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
          {/* Header with Theme Color Context */}
          <div
            className={cn(
              "flex flex-col p-2 border-b border-border relative overflow-hidden",
              getSpanTheme(selectedSpan.type, selectedSpan.status).bg,
            )}
          >
            {/* Decorative Background Icon */}
            <div
              className={cn(
                "absolute -right-6 -top-6 opacity-10 pointer-events-none transform rotate-12",
                getSpanTheme(selectedSpan.type, selectedSpan.status).text,
              )}
            >
              {/* We clone the icon element to increase size for background effect */}
              {React.cloneElement(
                getSpanTheme(selectedSpan.type, selectedSpan.status)
                  .icon as React.ReactElement,
              )}
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg border bg-background/50 backdrop-blur-sm h-max",
                    getSpanTheme(selectedSpan.type, selectedSpan.status).border,
                    getSpanTheme(selectedSpan.type, selectedSpan.status).text,
                  )}
                >
                  {getSpanTheme(selectedSpan.type, selectedSpan.status).icon}
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className="mb-2 bg-background/50 backdrop-blur-sm capitalize font-mono text-[10px] h-5 px-2"
                  >
                    {selectedSpan.type} Span
                  </Badge>
                  <h4 className="font-bold text-lg leading-tight text-foreground break-all mr-8">
                    {selectedSpan.name}
                  </h4>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background/50 rounded-full"
                onClick={() => setSelectedSpan(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  <Clock className="w-3 h-3" /> Duration
                </div>
                <div className="text-xl font-mono font-medium">
                  {selectedSpan.duration.toFixed(2)}
                  <span className="text-sm text-muted-foreground ml-0.5">
                    ms
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  <Zap className="w-3 h-3" /> Offset
                </div>
                <div className="text-xl font-mono font-medium">
                  +{selectedSpan.startTime.toFixed(2)}
                  <span className="text-sm text-muted-foreground ml-0.5">
                    ms
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-center",
                  selectedSpan.status && selectedSpan.status >= 400
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-emerald-500/5 border-emerald-500/20",
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
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

            {/* Metadata Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <LayoutList className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Attributes</h4>
              </div>

              {selectedSpan.meta &&
              Object.keys(selectedSpan.meta).length > 0 ? (
                <div className="grid gap-3">
                  {Object.entries(selectedSpan.meta).map(([key, value]) => (
                    <div key={key} className="group">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1 font-mono flex items-center gap-1">
                        <Tag className="w-3 h-3 opacity-50" /> {key}
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50 font-mono text-xs break-all hover:border-primary/20 transition-colors">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic py-4 bg-muted/20 rounded-lg text-center border border-dashed border-border">
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
