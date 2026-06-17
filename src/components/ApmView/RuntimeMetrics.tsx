/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner } from '../Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Line } from 'recharts';
import { Maximize, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatAxisDate } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';
import { useShareApi, useShareMode } from '../../lib/share';


// --- Maximizable Chart Card (matches ApmView ChartCard pattern exactly) ---
const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
      <div className="flex items-center gap-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {actions}
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={toggle}>
        {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-[400px]'}`}>
      {Header}
      <CardContent className="flex-1 min-h-0 relative px-0 pb-0">
        <div className="w-full h-full relative">{children}</div>
      </CardContent>
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

interface RuntimeMetricsProps {
  serviceId: string;
  range: string;
  spanMs: number;
}

export default function RuntimeMetrics({ serviceId, range, spanMs }: RuntimeMetricsProps) {
  const { token } = useAuth();
  const { isMono } = useTheme();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const [chartMode, setChartMode] = useState<'eventloop' | 'memory' | 'gc' | 'cpu'>('eventloop');

  const endpoint = `/apm/${serviceId}/runtime?${range}`;
  const { data, error } = useSWR(
    (token || readOnly) && serviceId ? endpoint : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const axisFormatter = useMemo(
    () => (str: string) => formatAxisDate(str, spanMs),
    [spanMs],
  );

  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  if (!data && !error) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Spinner className="h-6 w-6 text-emerald-500" />
          <span className="ml-2 text-sm text-muted-foreground">Loading runtime metrics...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  // -------------------------------------------------------------------------
  // Guard: Only render when real runtime metrics data exists.
  //
  // The backend zero-fills timeSeries via fillTimeGaps(), so even a service
  // with no runtime metrics returns a full array of zero-valued buckets.
  // Rendering that is pure noise — flat lines at zero.
  //
  // Two-layer check:
  //   1. `current === null` → no RuntimeMetric document exists at all
  //   2. timeSeries has no bucket with any meaningful non-zero value
  //      (defense-in-depth against edge cases)
  // -------------------------------------------------------------------------
  const { current, timeSeries } = data;

  const hasRealData = (() => {
    // Primary check: backend sets `current` only when ≥1 real snapshot exists
    if (current != null) return true;

    // Secondary check: scan timeSeries for any non-zero signal
    if (!timeSeries || timeSeries.length === 0) return false;

    // Key metrics that indicate real runtime data was collected.
    // We check a representative subset rather than every field — any one
    // non-zero value means the SDK has sent actual metrics.
    const signalKeys = [
      'eventLoopLagMs',
      'eventLoopLagP99Ms',
      'eventLoopUtilizationPercent',
      'heapUsedBytes',
      'rssBytes',
      'gcTotalCount',
      'cpuUserUs',
      'cpuSystemUs',
      'uptimeSeconds',
    ] as const;

    return timeSeries.some((point: any) =>
      signalKeys.some((key) => {
        const v = point[key];
        return typeof v === 'number' && v > 0;
      }),
    );
  })();

  if (!hasRealData) return null;

  // Process time series for charts
  const chartData = timeSeries?.map((point: any) => ({
    ...point,
    rawTime: point.time,
    heapUsedMB: (point.heapUsedBytes || 0) / 1048576,
    heapTotalMB: (point.heapTotalBytes || 0) / 1048576,
    rssMB: (point.rssBytes || 0) / 1048576,
    cpuTotalMs: ((point.cpuUserUs || 0) + (point.cpuSystemUs || 0)) / 1000,
    cpuUserMs: (point.cpuUserUs || 0) / 1000,
    cpuSystemMs: (point.cpuSystemUs || 0) / 1000,
  })) || [];

  // Mode selector (shared across all modes via `actions` prop)
  const ModeSelector = (
    <div className="flex bg-muted/50 rounded-lg p-0.5">
      {(['eventloop', 'memory', 'gc', 'cpu'] as const).map(mode => (
        <button
          key={mode}
          onClick={() => setChartMode(mode)}
          className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${
            chartMode === mode
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {mode === 'eventloop' ? 'Event Loop' : mode === 'gc' ? 'GC' : mode === 'cpu' ? 'CPU' : 'Memory'}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard title="Runtime Health" actions={ModeSelector}>
      <div className="p-4 w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'eventloop' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#3b82f6')} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getColor('#3b82f6')} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorElu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#8b5cf6')} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getColor('#8b5cf6')} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="rawTime" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} unit="ms" />} />
              <Area type="monotone" dataKey="eventLoopLagMs" stroke={getColor('#3b82f6')} fill="url(#colorLag)" strokeWidth={2} name="Lag" />
              <Area type="monotone" dataKey="eventLoopLagP99Ms" stroke={getColor('#ef4444')} fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="P99 Lag" />
              <Line type="monotone" dataKey="eventLoopUtilizationPercent" stroke={getColor('#8b5cf6')} strokeWidth={1.5} dot={false} name="ELU %" yAxisId={0} />
            </AreaChart>
          ) : chartMode === 'memory' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorHeap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#10b981')} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getColor('#10b981')} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#f59e0b')} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor('#f59e0b')} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="rawTime" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} unit=" MB" />} />
              <Area type="monotone" dataKey="rssMB" stroke={getColor('#f59e0b')} fill="url(#colorRss)" strokeWidth={1.5} name="RSS" />
              <Area type="monotone" dataKey="heapTotalMB" stroke={getColor('#6b7280')} fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="Heap Total" />
              <Area type="monotone" dataKey="heapUsedMB" stroke={getColor('#10b981')} fill="url(#colorHeap)" strokeWidth={2} name="Heap Used" />
            </AreaChart>
          ) : chartMode === 'gc' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="rawTime" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} />} />
              <Bar dataKey="gcMinorCount" fill={getColor('#3b82f6')} name="Minor (Scavenge)" stackId="gc" radius={[0, 0, 0, 0]} />
              <Bar dataKey="gcMajorCount" fill={getColor('#ef4444')} name="Major (Mark-Sweep)" stackId="gc" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="gcTotalDurationMs" stroke={getColor('#f59e0b')} strokeWidth={2} dot={false} name="GC Duration (ms)" yAxisId={0} />
            </BarChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpuUser" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#3b82f6')} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getColor('#3b82f6')} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCpuSystem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor('#ef4444')} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor('#ef4444')} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="rawTime" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} unit="ms" />} />
              <Area type="monotone" dataKey="cpuUserMs" stroke={getColor('#3b82f6')} fill="url(#colorCpuUser)" strokeWidth={2} name="User CPU" stackId="cpu" />
              <Area type="monotone" dataKey="cpuSystemMs" stroke={getColor('#ef4444')} fill="url(#colorCpuSystem)" strokeWidth={1.5} name="System CPU" stackId="cpu" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
