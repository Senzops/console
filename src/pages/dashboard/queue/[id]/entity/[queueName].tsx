import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, DataError } from '@/components/Core';
import { DetailPageSkeleton } from '@/components/Skeletons';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from '@/components/TimeRangePicker';
import { usePlanRetention } from '@/lib/usePlanRetention';
import { formatAxisDate, getTimeSpanMs } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';
import { useTheme } from '@/lib/theme';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowLeft, RefreshCw, Inbox, AlertTriangle, Users, Activity,
  Maximize, X, Workflow, Pause, ExternalLink
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';

const authFetcher = (url: string) => api.get(url).then(res => res.data);

const fmtAge = (ms: number) => {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
};
const fmtEta = (ms: number) => (ms == null || ms < 0 ? '—' : ms < 1000 ? '<1s' : fmtAge(ms));
const fmtNum = (n: number) => {
  if (n == null) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

const ChartCard = ({ title, children, className = 'h-[350px]' }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : className}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
          {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 relative px-0 pb-0">
        <div className="w-full h-full p-4"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
  return (
    <>
      {isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

const DynamicChart = ({ title, className, data, series, tooltipSuffix, tooltipFormatter }: any) => {
  const { isMono } = useTheme();
  const getColor = (c: string) => (isMono ? 'hsl(var(--chart-mono))' : c);
  const vf = tooltipFormatter
    ? (v: number) => (v === null ? 'No Data' : tooltipFormatter(v))
    : tooltipSuffix
      ? (v: number) => (v === null ? 'No Data' : `${Number(v).toFixed(2)}${tooltipSuffix}`)
      : undefined;
  return (
    <ChartCard title={title} className={className}>
      <AreaChart data={data}>
        <defs>
          {series.map((s: any) => (
            <linearGradient key={s.key} id={`qe-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getColor(s.color)} stopOpacity={0.3} />
              <stop offset="95%" stopColor={getColor(s.color)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="time" hide />
        <YAxis hide />
        <Tooltip content={<ChartTooltip valueFormatter={vf} />} />
        {series.map((s: any) => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={getColor(s.color)} fill={`url(#qe-${s.key})`} fillOpacity={0.6} name={s.name} strokeWidth={2} />
        ))}
      </AreaChart>
    </ChartCard>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
        <Icon className={`h-4 w-4 ${isMono ? 'text-[hsl(var(--chart-mono))]' : color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

export default function QueueEntityDetail() {
  const router = useRouter();
  const { id, queueName: rawName } = router.query;
  const { token } = useAuth();
  const { fetcher: shareFetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);

  const queueName = typeof rawName === 'string' ? rawName : '';
  const encName = encodeURIComponent(queueName);
  const rangeQuery = buildTimeRangeQuery(timeRange);

  const { data, error, mutate, isValidating } = useSWR(
    (token || readOnly) && id && queueName ? `/queue/${id}/entity/${encName}?${rangeQuery}` : null,
    shareFetcher,
    { refreshInterval: 60000 }
  );

  // Instrumented executions — authenticated dashboard only.
  const { data: execData } = useSWR(
    !readOnly && token && id && queueName ? `/queue/${id}/executions?queue=${encName}&${rangeQuery}` : null,
    authFetcher,
    { refreshInterval: 60000 }
  );

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((p: any) => ({ ...p, time: formatAxisDate(p.time, spanMs), oldestWaitingAgeSec: p.oldestWaitingAgeMs ? p.oldestWaitingAgeMs / 1000 : 0 }));
  }, [data?.history, spanMs]);

  const backToSource = () => router.push(`/dashboard/queue/${id}`);

  if (!data && !error) {
    return <DetailPageSkeleton backLink badge badgeInline headerActions={1} headerPicker stats={4} chart charts={4} table maxWidthClass="max-w-7xl" />;
  }
  if (error) {
    return <div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div>;
  }
  if (!data?.queueName) {
    return <div className="h-full flex items-center justify-center p-8 text-destructive">Queue not found.</div>;
  }

  const source = data.source || {};
  const latest = data.latest || {};
  const netRate = latest.netRate ?? 0;
  const exec = execData?.correlated ? execData : null;

  const stateBadge = latest.isPaused
    ? <Badge variant="warning" className="gap-1"><Pause className="h-3 w-3" />Paused</Badge>
    : latest.consumerCount === 0
      ? <Badge variant="destructive">No consumer</Badge>
      : <Badge variant="success">Active</Badge>;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={backToSource}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {source.name || 'Source'}
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono truncate">{queueName}</h1>
            {stateBadge}
          </div>
          <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-3">
            <span>{source.name}</span>
            <span>•</span>
            <span>{data.resolution === 'hourly' ? 'Hourly resolution' : '1-min resolution'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
          <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          </Button>
          {!readOnly && source.managementUrl && (
            <a href={source.managementUrl} target="_blank" rel="noopener noreferrer" title="Open broker console / runbook">
              <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          )}
        </div>
      </div>

      {/* Stats — single set */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Backlog"
          value={fmtNum(latest.pending ?? 0)}
          sub={netRate < 0 ? `Draining ${netRate.toFixed(2)}/s · ETA ${fmtEta(latest.etaToEmptyMs)}` : netRate > 0 ? `Growing +${netRate.toFixed(2)}/s` : 'Stable'}
          icon={Inbox} color="text-blue-500" isMono={isMono}
        />
        <StatCard title="Dead Letters" value={fmtNum(latest.dlqDepth ?? 0)} sub="Exhausted-retry jobs" icon={AlertTriangle} color={(latest.dlqDepth ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'} isMono={isMono} />
        <StatCard title="Throughput" value={`${(latest.completedRate ?? 0).toFixed(1)}/s`} sub={(latest.failedRate ?? 0) > 0 ? `${(latest.failedRate).toFixed(1)}/s failing` : 'Processed'} icon={Activity} color="text-emerald-500" isMono={isMono} />
        <StatCard title="Consumers" value={fmtNum(latest.consumerCount ?? 0)} sub={`Oldest ${fmtAge(latest.oldestWaitingAgeMs)}`} icon={Users} color="text-purple-500" isMono={isMono} />
      </div>

      {/* Charts — throughput leads (primary vital sign) */}
      <DynamicChart title="Throughput (processed / sec)" data={chartData} tooltipSuffix="/s" series={[{ key: 'completedRate', name: 'Processed', color: '#10b981' }]} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DynamicChart title="Backlog (pending jobs)" data={chartData} series={[{ key: 'pending', name: 'Backlog', color: '#3b82f6' }]} />
        <DynamicChart title="Dead Letter Queue" data={chartData} series={[{ key: 'dlqDepth', name: 'DLQ', color: '#ef4444' }]} />
        <DynamicChart title="Oldest waiting job" data={chartData} tooltipFormatter={(v: number) => fmtAge(v * 1000)} series={[{ key: 'oldestWaitingAgeSec', name: 'Oldest', color: '#f59e0b' }]} />
        <DynamicChart title="Consumers" data={chartData} series={[{ key: 'consumerCount', name: 'Consumers', color: '#8b5cf6' }]} />
      </div>

      {/* Instrumented executions */}
      {exec && exec.summary && (
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 h-16 shrink-0">
            <Workflow className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Instrumented Executions</CardTitle>
            <Badge variant="outline" className="text-[10px]">via apm-node</Badge>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">What&apos;s draining this queue</span>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-sm font-medium text-muted-foreground pb-2">Runs</p><div className="text-2xl font-bold text-foreground">{fmtNum(exec.summary.runs)}</div></div>
              <div><p className="text-sm font-medium text-muted-foreground pb-2">Failure Rate</p><div className={`text-2xl font-bold ${exec.summary.failureRate > 0.1 ? 'text-destructive' : 'text-foreground'}`}>{(exec.summary.failureRate * 100).toFixed(1)}%</div></div>
              <div><p className="text-sm font-medium text-muted-foreground pb-2">Dead Letters</p><div className={`text-2xl font-bold ${exec.summary.deadLetters > 0 ? 'text-destructive' : 'text-foreground'}`}>{fmtNum(exec.summary.deadLetters)}</div></div>
              <div><p className="text-sm font-medium text-muted-foreground pb-2">Avg Processing</p><div className="text-2xl font-bold text-foreground">{fmtAge(exec.summary.avgDurationMs)}</div></div>
            </div>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground border-y border-border/40">
                  <tr>
                    <th className="px-6 py-3 font-medium">Job</th>
                    <th className="px-6 py-3 font-medium">Service</th>
                    <th className="px-6 py-3 font-medium text-right">Duration</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {exec.recent.map((r: any) => (
                    <tr key={r.runId} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/task/${r.serviceId}`)}>
                      <td className="px-6 py-3 font-mono text-xs truncate max-w-[200px]">{r.taskName}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{r.serviceName}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs">{fmtAge(r.duration)}</td>
                      <td className="px-6 py-3">
                        {r.isDeadLetter ? <Badge variant="destructive">Dead Letter</Badge> : r.status === 'failed' ? <Badge variant="destructive">Failed</Badge> : <Badge variant="success">Success</Badge>}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground text-xs">{new Date(r.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
