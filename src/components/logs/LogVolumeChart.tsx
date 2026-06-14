import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceArea,
} from "recharts";
import { Card, CardHeader, CardTitle, Button } from "../Core";
import { ChartTooltip } from "../ChartTooltip";
import { MousePointerClick, Maximize, X } from "lucide-react";

// Volume histogram with click-drag brush-to-zoom and a fullscreen toggle.
// Mirrors the ChartCard maximize pattern used across the app (e.g. ApmView):
// a single Content that is conditionally portaled and switched to `fixed inset-4`.
export const LogVolumeChart = ({
  data,
  axisFormatter,
  color,
  onZoom,
}: {
  data: { rawTime: string; count: number }[];
  axisFormatter: (s: string) => string;
  color: string;
  onZoom: (startISO: string, endISO: string) => void;
}) => {
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized((m) => !m);

  const commitZoom = () => {
    if (left && right && left !== right) {
      const a = new Date(left).getTime();
      const b = new Date(right).getTime();
      if (!isNaN(a) && !isNaN(b)) {
        const start = new Date(Math.min(a, b)).toISOString();
        const end = new Date(Math.max(a, b) + 1000).toISOString();
        onZoom(start, end);
      }
    }
    setLeft(null);
    setRight(null);
  };

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl" : "h-[300px]"}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 h-12 shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Log Volume</CardTitle>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <MousePointerClick className="h-3 w-3" /> drag to zoom
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={toggle}>
            {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <div className="flex-1 min-h-0 p-4 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onMouseDown={(e: any) => e?.activeLabel && setLeft(e.activeLabel)}
            onMouseMove={(e: any) => left && e?.activeLabel && setRight(e.activeLabel)}
            onMouseUp={commitZoom}
            onMouseLeave={() => { setLeft(null); setRight(null); }}
          >
            <defs>
              <linearGradient id="colorLogVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
            <XAxis dataKey="rawTime" hide />
            <YAxis hide />
            <RechartsTooltip content={<ChartTooltip labelFormatter={axisFormatter} />} />
            <Area type="monotone" dataKey="count" stroke={color} fill="url(#colorLogVolume)" strokeWidth={2} name="Logs" isAnimationActive={false} />
            {left && right && <ReferenceArea x1={left} x2={right} strokeOpacity={0.3} fill={color} fillOpacity={0.1} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <>
      {isMaximized && createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />,
        document.body,
      )}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};
