import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError } from '../../../components/Core';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from '../../../components/TimeRangePicker';
import { usePlanRetention } from '@/lib/usePlanRetention';
import { formatAxisDate, getTimeSpanMs } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Layers, Trash2, Pencil, RefreshCw, Inbox, AlertTriangle, Users, Clock, TrendingDown, Pause, Activity, Maximize, X
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { useServiceModal } from '@/components/ServiceModals/context';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const SYSTEM_LABELS: Record<string, string> = {
  bullmq: 'BullMQ',
  rabbitmq: 'RabbitMQ',
  kafka: 'Apache Kafka',
  sqs: 'AWS SQS',
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

const fmtEta = (ms: number) => {
  if (ms == null || ms < 0) return '—';
  if (ms < 1000) return '<1s';
  return fmtAge(ms);
};

const fmtNum = (n: number) => {
  if (n == null) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

// --- Reusable Chart Card ---
const ChartCard = ({ title, children, className = 'h-[300px]' }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : className}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
          {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 relative px-4 pb-4 [&_.recharts-wrapper]:outline-none">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
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

// --- Stat Card ---
const StatCard = ({ title, value, subtext, icon: Icon, color = 'text-cyan-500' }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {subtext && <div className="text-[11px] text-muted-foreground mt-1">{subtext}</div>}
    </CardContent>
  </Card>
);

export default function QueueDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { openModal } = useServiceModal();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);

  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const queueParam = selectedQueue ? `&queue=${encodeURIComponent(selectedQueue)}` : '';
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/queue/${id}/stats?${buildTimeRangeQuery(timeRange)}${queueParam}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((p: any) => ({
      ...p,
      time: formatAxisDate(p.time, spanMs),
      oldestWaitingAgeSec: p.oldestWaitingAgeMs ? p.oldestWaitingAgeMs / 1000 : 0,
    }));
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
      connectionMeta: data.source.connectionMeta || {},
      interval: String(data.source.interval),
      queueFilter: (data.source.queueFilter || []).join('\n'),
      onSuccess: () => mutate(),
    });
  };

  if (!data && !error) {
    return <div className="h-full flex items-center justify-center"><Spinner className="h-6 w-6" /></div>;
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
  const active = selectedQueue || data.selectedQueue;

  const statusVariant = source.status === 'online' ? 'success' : source.status === 'error' ? 'destructive' : 'secondary';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 md:p-8 pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {source.name}
              <Badge variant={statusVariant as any} className="uppercase text-[10px]">{source.status}</Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-mono">
              {SYSTEM_LABELS[source.system] || source.system} · {totals.queueCount} {source.system === 'kafka' ? 'group/topics' : 'queues'}{source.version ? ` · v${source.version}` : ''}
            </p>
            {source.status === 'error' && source.errorMessage && (
              <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {source.errorMessage}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
          <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={openEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Source-level stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Backlog" value={<SmartAnimatedValue value={totals.pending} />} subtext="Pending across all queues" icon={Inbox} />
          <StatCard title="Active" value={<SmartAnimatedValue value={totals.active} />} subtext="In-flight jobs" icon={Activity} color="text-emerald-500" />
          <StatCard title="Dead Letter" value={<SmartAnimatedValue value={totals.dlqDepth} />} subtext="Exhausted-retry jobs" icon={AlertTriangle} color={totals.dlqDepth > 0 ? 'text-destructive' : 'text-muted-foreground'} />
          <StatCard title="Consumers" value={<SmartAnimatedValue value={totals.consumers} />} subtext="Connected workers" icon={Users} color="text-indigo-500" />
        </div>

        {/* Per-queue table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-medium">Queues</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3 text-right">Backlog</th>
                  <th className="px-4 py-3 text-right">Active</th>
                  <th className="px-4 py-3 text-right">DLQ</th>
                  <th className="px-4 py-3 text-right">Consumers</th>
                  <th className="px-4 py-3 text-right">Oldest</th>
                  <th className="px-4 py-3 text-right">Net/s</th>
                  <th className="px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {queues.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No queues discovered yet. The first poll runs within a minute of registration.</td></tr>
                )}
                {queues.map((q: any) => (
                  <tr
                    key={q.queueName}
                    onClick={() => setSelectedQueue(q.queueName)}
                    className={`cursor-pointer transition-colors hover:bg-muted/30 ${active === q.queueName ? 'bg-cyan-500/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium font-mono">{q.queueName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(q.pending)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(q.active)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${q.dlqDepth > 0 ? 'text-destructive font-semibold' : ''}`}>{fmtNum(q.dlqDepth)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.consumerCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtAge(q.oldestWaitingAgeMs)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${q.netRate < 0 ? 'text-emerald-500' : q.netRate > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {q.netRate > 0 ? '+' : ''}{q.netRate?.toFixed(2) ?? '0'}
                    </td>
                    <td className="px-4 py-3">
                      {q.isPaused
                        ? <Badge variant="secondary" className="text-amber-500 bg-amber-500/10"><Pause className="h-3 w-3 mr-1" />Paused</Badge>
                        : q.consumerCount === 0
                          ? <Badge variant="secondary" className="text-destructive bg-destructive/10">No consumer</Badge>
                          : <Badge variant="secondary" className="text-emerald-500 bg-emerald-500/10">Active</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Charts for the selected queue */}
        {active && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Charting queue:</span>
              <span className="font-mono font-semibold text-foreground">{active}</span>
              <Badge variant="outline" className="text-[10px]">{data.resolution === 'hourly' ? 'Hourly' : '1-min'} resolution</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Backlog (pending jobs)">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="pending" name="Backlog" stroke="#06b6d4" fill="url(#gPending)" strokeWidth={2} />
                </AreaChart>
              </ChartCard>

              <ChartCard title="Dead Letter Queue">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDlq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="dlqDepth" name="DLQ" stroke="#ef4444" fill="url(#gDlq)" strokeWidth={2} />
                </AreaChart>
              </ChartCard>

              <ChartCard title="Oldest waiting job (seconds)">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="oldestWaitingAgeSec" name="Oldest (s)" stroke="#f59e0b" fill="url(#gAge)" strokeWidth={2} />
                </AreaChart>
              </ChartCard>

              <ChartCard title="Consumers">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="consumerCount" name="Consumers" stroke="#6366f1" fill="url(#gCons)" strokeWidth={2} />
                </AreaChart>
              </ChartCard>
            </div>

            {/* Drain projection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                title="Net Rate"
                value={`${(data.latest?.netRate ?? 0) > 0 ? '+' : ''}${(data.latest?.netRate ?? 0).toFixed(2)}/s`}
                subtext={(data.latest?.netRate ?? 0) < 0 ? 'Draining' : (data.latest?.netRate ?? 0) > 0 ? 'Growing' : 'Stable'}
                icon={TrendingDown}
                color={(data.latest?.netRate ?? 0) < 0 ? 'text-emerald-500' : (data.latest?.netRate ?? 0) > 0 ? 'text-amber-500' : 'text-muted-foreground'}
              />
              <StatCard title="Drain ETA" value={fmtEta(data.latest?.etaToEmptyMs)} subtext="Projected time to empty" icon={Clock} />
              <StatCard title="Oldest Job" value={fmtAge(data.latest?.oldestWaitingAgeMs)} subtext="Head-of-line wait" icon={AlertTriangle} color="text-amber-500" />
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Queue Source">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This permanently deletes <span className="font-semibold text-foreground">{source.name}</span> and all of its metric history. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
