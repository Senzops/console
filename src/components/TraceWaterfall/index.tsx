import React, { useState } from "react";
import { Card, Badge, cn } from "../Core";
import {
  Database,
  Globe,
  Box,
  Clock,
  AlertCircle,
  Terminal,
  X,
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

const getSpanColor = (type: string, status?: number) => {
  if (status && status >= 400)
    return "bg-red-500/20 border-red-500 text-red-500";
  switch (type) {
    case "db":
      return "bg-blue-500/20 border-blue-500 text-blue-500";
    case "http":
      return "bg-emerald-500/20 border-emerald-500 text-emerald-500";
    case "function":
      return "bg-purple-500/20 border-purple-500 text-purple-500";
    default:
      return "bg-secondary/50 border-secondary-foreground/20 text-muted-foreground";
  }
};

const getSpanIcon = (type: string) => {
  switch (type) {
    case "db":
      return <Database className="w-3 h-3" />;
    case "http":
      return <Globe className="w-3 h-3" />;
    case "function":
      return <Terminal className="w-3 h-3" />;
    default:
      return <Box className="w-3 h-3" />;
  }
};

export const TraceWaterfall = ({ spans, totalDuration }: WaterfallProps) => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  // Sort by start time
  const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Invocation Waterfall</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {totalDuration.toFixed(2)}ms Total
        </Badge>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Timeline Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
          {/* Grid Lines (25%, 50%, 75%) */}
          <div className="absolute inset-0 pointer-events-none flex w-full h-full px-4">
            <div className="w-1/4 border-r border-border/20 h-full" />
            <div className="w-1/4 border-r border-border/20 h-full" />
            <div className="w-1/4 border-r border-border/20 h-full" />
            <div className="w-1/4 h-full" />
          </div>

          {sortedSpans.map((span, i) => {
            const left = (span.startTime / totalDuration) * 100;
            const width = Math.max((span.duration / totalDuration) * 100, 0.5); // Min width visibility

            return (
              <div
                key={i}
                className="relative h-8 group cursor-pointer"
                onClick={() => setSelectedSpan(span)}
              >
                {/* Row Hover Bg */}
                <div className="absolute inset-0 -mx-4 group-hover:bg-muted/20 transition-colors" />

                {/* The Bar */}
                <div
                  className={cn(
                    "absolute h-6 top-1 rounded flex items-center px-2 text-xs font-medium border whitespace-nowrap overflow-hidden transition-all hover:brightness-110",
                    getSpanColor(span.type, span.status),
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getSpanIcon(span.type)}
                    <span className="truncate">{span.name}</span>
                  </div>
                </div>

                {/* Label to right if bar is too small */}
                {width < 10 && (
                  <div
                    className="absolute top-1 text-[10px] text-muted-foreground flex items-center h-6 pl-2 pointer-events-none"
                    style={{ left: `${left + width}%` }}
                  >
                    {span.duration.toFixed(1)}ms
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Details Panel (Slide Over) */}
        {selectedSpan && (
          <div className="w-80 border-l border-border bg-card absolute right-0 top-0 bottom-0 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-bold text-lg break-words">
                  {selectedSpan.name}
                </h4>
                <Badge variant="outline" className="mt-2 capitalize">
                  {selectedSpan.type}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedSpan(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">
                    Duration
                  </div>
                  <div className="font-mono text-sm">
                    {selectedSpan.duration.toFixed(2)}ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">
                    Start Offset
                  </div>
                  <div className="font-mono text-sm">
                    +{selectedSpan.startTime.toFixed(2)}ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold mb-1">
                    Status
                  </div>
                  <div
                    className={cn(
                      "font-mono text-sm",
                      selectedSpan.status && selectedSpan.status >= 400
                        ? "text-red-500"
                        : "text-emerald-500",
                    )}
                  >
                    {selectedSpan.status || "OK"}
                  </div>
                </div>
              </div>

              {/* Metadata Viewer */}
              {selectedSpan.meta &&
                Object.keys(selectedSpan.meta).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-bold mb-2">
                      Metadata
                    </div>
                    <pre className="bg-muted p-3 rounded-lg text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedSpan.meta, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
