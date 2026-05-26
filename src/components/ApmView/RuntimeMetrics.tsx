/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '../Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { Activity, Cpu, HardDrive, Gauge, Timer, RefreshCw, Layers } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

const formatMs = (ms: number) => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatPercent = (val: number) => `${val.toFixed(1)}%`;

const formatUptime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
};

const CustomTooltip = ({ active, payload, label, unit = '', labelFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{labelFormatter ? labelFormatter(label) : label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2"
            style={{ color: entry.color || entry.stroke || entry.fill }}>
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value?.toFixed(2) : entry.value}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Stat Card ---
const StatCard = ({ icon: Icon, label, value, subValue, color }: {
  icon: any; label: string; value: string; subValue?: string; color: string;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-bold font-mono">{value}</p>
          {subValue && <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface RuntimeMetricsProps {
  serviceId: string;
  range: string;
}

export default function RuntimeMetrics({ serviceId, range }: RuntimeMetricsProps) {
  const { token } = useAuth();
  const { isMono } = useTheme();
  const [chartMode, setChartMode] = useState<'eventloop' | 'memory' | 'gc' | 'cpu'>('eventloop');

  const endpoint = `/apm/${serviceId}/runtime?range=${range}`;
  const { data, error, isValidating, mutate } = useSWR(
    token && serviceId ? endpoint : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const formatAxisDate = useCallback(
    (str: string) => {
      if (!str) return '';
      const date = new Date(str);
      if (isNaN(date.getTime())) return str;
      return date.toLocaleString(undefined, {
        month: range === '1h' ? undefined : 'short',
        day: range === '1h' ? undefined : 'numeric',
        hour: 'numeric',
        minute: range === '1h' ? '2-digit' : undefined,
      });
    },
    [range]
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

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Runtime metrics not available yet. They appear once your SDK sends data.
        </CardContent>
      </Card>
    );
  }

  const { current, timeSeries } = data;

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

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      {current && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Gauge}
            label="Event Loop Lag"
            value={formatMs(current.eventLoopLagMs || 0)}
            subValue={current.eventLoopLagP99Ms ? `P99: ${formatMs(current.eventLoopLagP99Ms)}` : undefined}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            icon={Activity}
            label="EL Utilization"
            value={formatPercent(current.eventLoopUtilizationPercent || 0)}
            subValue={`${current.activeHandles || 0} handles`}
            color="bg-purple-500/10 text-purple-500"
          />
          <StatCard
            icon={HardDrive}
            label="Heap Used"
            value={formatBytes(current.heapUsedBytes || 0)}
            subValue={`${formatPercent(current.heapUsedPercent || 0)} of ${formatBytes(current.heapTotalBytes || 0)}`}
            color="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard
            icon={Timer}
            label="RSS / Uptime"
            value={formatBytes(current.rssBytes || 0)}
            subValue={`Up: ${formatUptime(current.uptimeSeconds || 0)}`}
            color="bg-orange-500/10 text-orange-500"
          />
        </div>
      )}

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Runtime Health
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[280px]">
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
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                  <Tooltip content={<CustomTooltip labelFormatter={formatAxisDate} unit="ms" />} />
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
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} tickFormatter={(v) => `${v.toFixed(0)}MB`} />
                  <Tooltip content={<CustomTooltip labelFormatter={formatAxisDate} unit="MB" />} />
                  <Area type="monotone" dataKey="rssMB" stroke={getColor('#f59e0b')} fill="url(#colorRss)" strokeWidth={1.5} name="RSS" />
                  <Area type="monotone" dataKey="heapTotalMB" stroke={getColor('#6b7280')} fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="Heap Total" />
                  <Area type="monotone" dataKey="heapUsedMB" stroke={getColor('#10b981')} fill="url(#colorHeap)" strokeWidth={2} name="Heap Used" />
                </AreaChart>
              ) : chartMode === 'gc' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="rawTime" hide />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                  <Tooltip content={<CustomTooltip labelFormatter={formatAxisDate} />} />
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
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} tickFormatter={(v) => `${v.toFixed(0)}ms`} />
                  <Tooltip content={<CustomTooltip labelFormatter={formatAxisDate} unit="ms" />} />
                  <Area type="monotone" dataKey="cpuUserMs" stroke={getColor('#3b82f6')} fill="url(#colorCpuUser)" strokeWidth={2} name="User CPU" stackId="cpu" />
                  <Area type="monotone" dataKey="cpuSystemMs" stroke={getColor('#ef4444')} fill="url(#colorCpuSystem)" strokeWidth={1.5} name="System CPU" stackId="cpu" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
