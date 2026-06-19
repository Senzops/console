import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '@/lib/auth';
import { useShareApi, useShareMode, useShareScopeId } from '@/lib/share';
import { ShareButton } from '@/components/ShareModal';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError } from '@/components/Core';
import { DetailPageSkeleton } from '@/components/Skeletons';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from '@/components/TimeRangePicker';
import { usePlanRetention } from '@/lib/usePlanRetention';
import { formatAxisDate, getTimeSpanMs } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';
import { useTheme } from '@/lib/theme';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Layers, Trash2, Pencil, RefreshCw, Inbox, AlertTriangle, Users, Clock, Activity,
  Maximize, X, Sparkles, ExternalLink, Search, Pause
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { useServiceModal } from '@/components/ServiceModals/context';

const authFetcher = (url: string) => api.get(url).then(res => res.data);

const SYSTEM_LABELS: Record<string, string> = {
  bullmq: 'BullMQ', rabbitmq: 'RabbitMQ', kafka: 'Apache Kafka', sqs: 'AWS SQS',
};

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

const fmtNum = (n: number) => {
  if (n == null) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

// --- Reusable Chart Card (Standard UI) ---
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

// --- DRY Dynamic Chart Wrapper (hidden axes, themed colors) ---
const DynamicChart = ({ title, className, data, series, tooltipSuffix }: any) => {
  const { isMono } = useTheme();
  const getColor = (c: string) => (isMono ? 'hsl(var(--chart-mono))' : c);
  const vf = tooltipSuffix ? (v: number) => (v === null ? 'No Data' : `${Number(v).toFixed(2)}${tooltipSuffix}`) : undefined;
  return (
    <ChartCard title={title} className={className}>
      <AreaChart data={data}>
        <defs>
          {series.map((s: any) => (
            <linearGradient key={s.key} id={`qo-${s.key}`} x1="0" y1="0" x2="0" y2="1">
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
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={getColor(s.color)} fill={`url(#qo-${s.key})`} fillOpacity={0.6} name={s.name} strokeWidth={2} />
        ))}
      </AreaChart>
    </ChartCard>
  );
};

// --- Reusable Stat Card (Standard UI) ---
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

// --- Queues Table (rows drill into the per-queue entity page) ---
const QueuesTable = ({ queues, router, sourceId, readOnly, isKafka }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => (!filter ? queues : queues.filter((q: any) => q.queueName.toLowerCase().includes(filter.toLowerCase()))),
    [queues, filter]
  );
  const limit = isMaximized ? filtered.length : 8;
  const visible = filtered.slice(0, limit);
  const hidden = filtered.length - limit;

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{isKafka ? 'Consumer Groups' : 'Queues'}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <input
              className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-primary outline-none"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium">Queue</th>
              <th className="px-6 py-3 font-medium text-right">Backlog</th>
              <th className="px-6 py-3 font-medium text-right">In-Flight</th>
              <th className="px-6 py-3 font-medium text-right">DLQ</th>
              <th className="px-6 py-3 font-medium text-right">Consumers</th>
              <th className="px-6 py-3 font-medium text-right">Oldest</th>
              <th className="px-6 py-3 font-medium text-right">Net/s</th>
              <th className="px-6 py-3 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((q: any) => (
              <tr
                key={q.queueName}
                className={`border-b border-border transition-colors ${readOnly ? '' : 'hover:bg-muted/20 cursor-pointer'}`}
                onClick={readOnly ? undefined : () => router.push(`/dashboard/queue/${sourceId}/entity/${encodeURIComponent(q.queueName)}`)}
              >
                <td className="px-6 py-3 font-mono text-xs text-foreground truncate max-w-[280px]">{q.queueName}</td>
                <td className="px-6 py-3 text-right font-mono text-xs">{fmtNum(q.pending)}</td>
                <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{fmtNum(q.active)}</td>
                <td className={`px-6 py-3 text-right font-mono text-xs ${q.dlqDepth > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{fmtNum(q.dlqDepth)}</td>
                <td className="px-6 py-3 text-right font-mono text-xs">{q.consumerCount}</td>
                <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{fmtAge(q.oldestWaitingAgeMs)}</td>
                <td className={`px-6 py-3 text-right font-mono text-xs ${q.netRate < 0 ? 'text-emerald-500' : q.netRate > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {q.netRate > 0 ? '+' : ''}{(q.netRate ?? 0).toFixed(2)}
                </td>
                <td className="px-6 py-3">
                  {q.isPaused
                    ? <Badge variant="warning" className="gap-1"><Pause className="h-3 w-3" />Paused</Badge>
                    : q.consumerCount === 0
                      ? <Badge variant="destructive">No consumer</Badge>
                      : <Badge variant="success">Active</Badge>}
                </td>
              </tr>
            ))}
            {!isMaximized && hidden > 0 && (
              <tr className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => setIsMaximized(true)}>
                <td colSpan={8} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Show {hidden} more...</td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">No queues observed yet. The first sample lands within a minute.</td></tr>
            )}
          </tbody>
        </table>
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

export default function QueueOverview() {
  const router = useRouter();
  const id = useShareScopeId(router.query.id as string | undefined);
  const { token } = useAuth();
  const { fetcher: shareFetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const { openModal } = useServiceModal();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    (token || readOnly) && id ? `/queue/${id}/stats?${buildTimeRangeQuery(timeRange)}` : null,
    shareFetcher,
    { refreshInterval: 60000 }
  );

  const { data: discData } = useSWR(!readOnly && token ? `/queue/discovered` : null, authFetcher);

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((p: any) => ({ ...p, time: formatAxisDate(p.time, spanMs) }));
  }, [data?.history, spanMs]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/queue/${id}`);
      toast.success('Queue source deleted');
      router.push('/dashboard/queue');
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
      toast.error('Failed to delete queue source');
    }
  };

  const openEdit = () => {
    if (!data?.source) return;
    openModal('queue', 'edit', {
      id: id as string,
      name: data.source.name,
      system: data.source.system,
      mode: data.source.mode,
      connectionMeta: data.source.connectionMeta || {},
      interval: String(data.source.interval),
      queueFilter: (data.source.queueFilter || []).join('\n'),
      managementUrl: data.source.managementUrl || '',
      onSuccess: () => mutate(),
    });
  };

  if (!data && !error) {
    return <DetailPageSkeleton backLink={false} badge badgeInline headerActions={4} headerPicker stats={4} chart charts={2} table maxWidthClass="max-w-7xl" />;
  }
  if (error) {
    return <div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div>;
  }
  if (!data?.source) {
    return <div className="h-full flex items-center justify-center p-8 text-destructive">Failed to load queue source.</div>;
  }

  const source = data.source;
  const totals = data.totals || { pending: 0, active: 0, dlqDepth: 0, consumers: 0, queueCount: 0 };
  const queues = data.queues || [];
  const discovered = (discData?.discovered || []) as Array<{ queueName: string }>;
  const isKafka = source.system === 'kafka';

  const statusBadgeClass =
    source.status === 'online' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'
      : source.status === 'error' ? 'text-destructive border-destructive/20 bg-destructive/10'
        : 'text-muted-foreground border-border bg-muted/30';

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{source.name}</h1>
              <Badge variant="outline" className={`capitalize ${statusBadgeClass}`}>{source.status}</Badge>
              {source.mode === 'collector' && <Badge variant="outline" className="text-cyan-500 border-cyan-500/20 bg-cyan-500/10">Collector</Badge>}
            </div>
            <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-3">
              <span>{SYSTEM_LABELS[source.system] || source.system}{source.version ? ` ${source.version}` : ''}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {totals.queueCount} {isKafka ? 'group/topics' : 'queues'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {source.mode === 'collector' ? 'Push collector' : `Polling ${source.interval}m`}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
            {!readOnly && source.managementUrl && (
              <a href={source.managementUrl} target="_blank" rel="noopener noreferrer" title="Open broker console / runbook">
                <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
              </a>
            )}
            {!readOnly && <ShareButton scopeType="queue" scopeId={id as string} dashboardName={source?.name} />}
            {!readOnly && <Button variant="outline" size="icon" onClick={openEdit}><Pencil className="h-4 w-4" /></Button>}
            {!readOnly && <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>

        {/* Connection error */}
        {source.status === 'error' && source.errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3 text-destructive animate-in fade-in">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1 text-sm">Connection failed during last poll</strong>
              <span className="text-xs font-mono">{source.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Auto-discovery hint */}
        {discovered.length > 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <span>Detected in your workers but not monitored: <span className="font-mono text-foreground">{discovered.slice(0, 6).map(d => d.queueName).join(', ')}</span>{discovered.length > 6 ? ` +${discovered.length - 6}` : ''}</span>
          </div>
        )}

        {/* Stats — single set */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Backlog" value={fmtNum(totals.pending)} sub="Pending across all queues" icon={Inbox} color="text-blue-500" isMono={isMono} />
          <StatCard title="In-Flight" value={fmtNum(totals.active)} sub="Active jobs" icon={Activity} color="text-emerald-500" isMono={isMono} />
          <StatCard title="Dead Letters" value={fmtNum(totals.dlqDepth)} sub="Exhausted-retry jobs" icon={AlertTriangle} color={totals.dlqDepth > 0 ? 'text-destructive' : 'text-muted-foreground'} isMono={isMono} />
          <StatCard title="Consumers" value={fmtNum(totals.consumers)} sub="Connected workers" icon={Users} color="text-purple-500" isMono={isMono} />
        </div>

        {/* Overall charts */}
        <DynamicChart
          title="Backlog & Dead Letters"
          data={chartData}
          series={[{ key: 'pending', name: 'Backlog', color: '#3b82f6' }, { key: 'dlqDepth', name: 'Dead Letters', color: '#ef4444' }]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DynamicChart title="Throughput (processed / sec)" data={chartData} tooltipSuffix="/s" series={[{ key: 'completedRate', name: 'Processed', color: '#10b981' }]} />
          <DynamicChart title="Consumers" data={chartData} series={[{ key: 'consumerCount', name: 'Consumers', color: '#8b5cf6' }]} />
        </div>

        {/* Queues table — at the end */}
        <QueuesTable queues={queues} router={router} sourceId={id} readOnly={readOnly} isKafka={isKafka} />
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Queue Source?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold block mb-1">Warning: Irreversible action</span>
              This disconnects <strong>{source.name}</strong>, deletes its credentials, and wipes all historical metrics.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
