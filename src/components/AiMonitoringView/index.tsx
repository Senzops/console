/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { usePlanRetention } from '@/lib/usePlanRetention';
import { useShareApi, useShareMode } from '../../lib/share';
import { ShareButton } from '../ShareModal';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DataError, Spinner } from '../Core';
import { AiMonitoringSkeleton } from '../Skeletons';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from '../TimeRangePicker';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DollarSign, Activity, Clock, Hash, Trash2, RefreshCw,
  ArrowLeft, Maximize, X, Search, Pencil, AlertTriangle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../lib/auth';
import { toast } from 'sonner';
import { SmartAnimatedValue } from '@/components/Tween';
import { useServiceModal } from '@/components/ServiceModals/context';
import { formatAxisDate, getTimeSpanMs } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';

// --- Formatters ---------------------------------------------------------------
const formatNumber = (n: number) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};
const formatUsd = (v: number) => {
  if (!v) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1_000) return `$${v.toFixed(2)}`;
  return `$${formatNumber(v)}`;
};
const formatTokens = (v: number) => formatNumber(v || 0);
const formatMs = (v: number) => {
  if (v == null) return '0ms';
  if (v < 1000) return `${Math.round(v)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
};
const getLatencyColor = (ms: number) =>
  ms > 10000 ? 'text-red-500' : ms > 3000 ? 'text-amber-500' : 'text-emerald-500';

const OPERATION_LABEL: Record<string, string> = {
  chat: 'Chat', completions: 'Completions', embeddings: 'Embeddings',
  generateContent: 'Generate', 'chat.stream': 'Chat (stream)',
};

// --- Reusable Chart Card (maximizable) — matches ApmView ----------------------
const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
      <div className="flex items-center gap-4"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>{actions}</div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
        {isMaximized ? <X className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
      </Button>
    </CardHeader>
  );
  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-[400px]'}`}>
      {Header}
      <CardContent className="flex-1 min-h-0 relative px-0 pb-0"><div className="w-full h-full relative">{children}</div></CardContent>
    </Card>
  );
  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

// --- Reusable Stat Card — matches ApmView -------------------------------------
const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </CardContent>
  </Card>
);

// --- Breakdown table (Models / Providers / Operations) — clickable drill-down --
const BreakdownTable = ({ title, label, rows, onSelect, formatKey }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => (filter ? rows.filter((r: any) => String(r.key).toLowerCase().includes(filter.toLowerCase())) : rows),
    [rows, filter],
  );
  const limit = isMaximized ? filtered.length : 6;
  const visible = filtered.slice(0, limit);
  const hidden = filtered.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-44 hidden sm:block">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-violet-500 outline-none" placeholder={`Filter ${label.toLowerCase()}...`} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? <X className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}</Button>
      </div>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium w-full">{label}</th>
              <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Calls</th>
              <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Tokens</th>
              <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Cost</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r: any) => (
              <tr key={r.key} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => onSelect(r.key)}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground truncate max-w-[260px]" title={r.key}>{formatKey ? formatKey(r.key) : r.key}</span>
                    {r.errors > 0 && <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-500 bg-red-500/10 px-1 py-0">{r.errors} err</Badge>}
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">{formatNumber(r.calls)}</td>
                <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">{formatTokens((r.tokensIn || 0) + (r.tokensOut || 0))}</td>
                <td className="px-6 py-3 text-right font-mono text-xs font-medium text-foreground whitespace-nowrap">{formatUsd(r.costUsd)}</td>
              </tr>
            ))}
            {!isMaximized && hidden > 0 && (
              <tr className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => setIsMaximized(true)}>
                <td colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-violet-500 transition-colors">Show {hidden} more...</td>
              </tr>
            )}
            {visible.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">No data in range</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

// --- Recent activity table (traces on main view, generations when filtered) ----
const ActivityTable = ({ rows, mode, sourceId, router, onRefresh, isRefreshing }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    if (!filter) return rows;
    const l = filter.toLowerCase();
    return rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(l));
  }, [rows, filter]);
  const limit = isMaximized ? filtered.length : 8;
  const visible = filtered.slice(0, limit);
  const hidden = filtered.length - limit;
  const isGen = mode === 'generations';

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{isGen ? 'Recent Generations' : 'Recent Traces'}</CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-44 hidden sm:block">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-violet-500 outline-none" placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isRefreshing}><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? <X className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}</Button>
      </div>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium">{isGen ? 'Model' : 'Trace'}</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Tokens</th>
              <th className="px-6 py-3 font-medium text-right">Cost</th>
              <th className="px-6 py-3 font-medium text-right">Latency</th>
              <th className="px-6 py-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r: any) => (
              <tr key={isGen ? r.generationId : r.traceId} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/ai-monitoring/${sourceId}/trace/${encodeURIComponent(r.traceId)}`)}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {isGen && <Badge variant="outline" className="font-mono text-[10px] border-violet-500/30 text-violet-500 bg-violet-500/10">{r.provider}</Badge>}
                    <span className="font-mono text-xs text-foreground truncate max-w-[240px]" title={isGen ? (r.responseModel || r.requestModel) : r.name}>{isGen ? (r.responseModel || r.requestModel || '—') : (r.name || 'ai.trace')}</span>
                  </div>
                </td>
                <td className="px-6 py-3"><Badge variant="outline" className={`font-mono text-[10px] ${r.status === 'error' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'}`}>{(r.status || 'ok').toUpperCase()}</Badge></td>
                <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{formatTokens(isGen ? ((r.tokensIn || 0) + (r.tokensOut || 0)) : (r.totalTokens || 0))}</td>
                <td className="px-6 py-3 text-right font-mono text-xs font-medium">{formatUsd(isGen ? r.costUsd : r.totalCostUsd)}</td>
                <td className="px-6 py-3 text-right font-mono text-xs"><span className={getLatencyColor(r.latencyMs)}>{formatMs(r.latencyMs)}</span></td>
                <td className="px-6 py-3 text-right text-xs text-muted-foreground font-mono">{r.timestamp ? formatDistanceToNow(new Date(r.timestamp)) + ' ago' : '—'}</td>
              </tr>
            ))}
            {!isMaximized && hidden > 0 && <tr className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => setIsMaximized(true)}><td colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-violet-500 transition-colors">Show {hidden} more...</td></tr>}
            {visible.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No {isGen ? 'generations' : 'traces'} in this range</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

// --- Consumer card (top users / sessions) -------------------------------------
const ConsumerCard = ({ title, label, rows }: any) => (
  <Card className="flex flex-col h-auto min-h-[300px] overflow-hidden">
    <CardHeader className="py-4 border-b border-border/40 h-16 shrink-0"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
    <CardContent className="p-0 flex-1 overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
          <tr><th className="px-6 py-3 font-medium">{label}</th><th className="px-6 py-3 font-medium text-right">Traces</th><th className="px-6 py-3 font-medium text-right">Tokens</th><th className="px-6 py-3 font-medium text-right">Cost</th></tr>
        </thead>
        <tbody>
          {(rows || []).slice(0, 8).map((r: any) => (
            <tr key={r.key} className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-6 py-3 font-mono text-xs truncate max-w-[220px]" title={r.key}>{r.key}</td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{formatNumber(r.traces)}</td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{formatTokens(r.tokens)}</td>
              <td className="px-6 py-3 text-right font-mono text-xs font-medium">{formatUsd(r.costUsd)}</td>
            </tr>
          ))}
          {(!rows || rows.length === 0) && <tr><td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">No attributed {label.toLowerCase()}s</td></tr>}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

// --- Reliability card (tool / MCP-server health) — read-only debugging --------
const ReliabilityCard = ({ title, label, rows }: any) => (
  <Card className="flex flex-col h-auto min-h-[300px] overflow-hidden">
    <CardHeader className="py-4 border-b border-border/40 h-16 shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex-1 overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
          <tr>
            <th className="px-6 py-3 font-medium w-full">{label}</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Calls</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Err rate</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Avg latency</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).slice(0, 8).map((r: any) => (
            <tr key={r.key} className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-6 py-3 font-mono text-xs text-foreground truncate max-w-[220px]" title={r.key}>{r.key}</td>
              <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">{formatNumber(r.calls)}</td>
              <td className={`px-6 py-3 text-right font-mono text-xs whitespace-nowrap ${r.errors > 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{(r.errorRate * 100).toFixed(1)}%</td>
              <td className="px-6 py-3 text-right font-mono text-xs whitespace-nowrap"><span className={getLatencyColor(r.avgLatencyMs)}>{formatMs(r.avgLatencyMs)}</span></td>
            </tr>
          ))}
          {(!rows || rows.length === 0) && <tr><td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">No {label.toLowerCase()} activity in range</td></tr>}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

export interface AiFilter { dimension: 'model' | 'provider' | 'operation'; value: string; }

interface AiMonitoringViewProps {
  sourceId: string;
  filter?: AiFilter;
}

export default function AiMonitoringView({ sourceId, filter }: AiMonitoringViewProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canFetch = !!(token || readOnly);
  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { openModal } = useServiceModal();

  const rangeQuery = buildTimeRangeQuery(timeRange);
  const spanMs = getTimeSpanMs(timeRange);
  const filterQuery = filter ? `&${filter.dimension}=${encodeURIComponent(filter.value)}` : '';

  const statsUrl = `/ai/observability/${sourceId}/stats?${rangeQuery}${filterQuery}`;
  const { data, error, mutate, isValidating } = useSWR(canFetch && sourceId ? statsUrl : null, fetcher, { refreshInterval: 30000 });

  const activityUrl = filter
    ? `/ai/observability/${sourceId}/generations?${rangeQuery}${filterQuery}&limit=50`
    : `/ai/observability/${sourceId}/traces?${rangeQuery}&limit=50`;
  const { data: activity, mutate: mutateActivity, isValidating: isValidatingActivity } = useSWR(canFetch && sourceId ? activityUrl : null, fetcher, { refreshInterval: 30000 });

  const { data: consumers } = useSWR(canFetch && sourceId && !filter ? `/ai/observability/${sourceId}/consumers?${rangeQuery}` : null, fetcher, { refreshInterval: 60000 });

  const { data: reliability } = useSWR(canFetch && sourceId && !filter ? `/ai/observability/${sourceId}/reliability?${rangeQuery}` : null, fetcher, { refreshInterval: 60000 });

  const getColor = (c: string) => (isMono ? 'hsl(var(--chart-mono))' : c);
  const axisFormatter = useMemo(() => (str: string) => formatAxisDate(str, spanMs), [spanMs]);
  const graph = useMemo(() => data?.graph || [], [data?.graph]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/ai/observability/${sourceId}`); router.push('/dashboard/ai-monitoring'); }
    catch { setIsDeleting(false); toast.error('Failed to delete source'); }
  };

  const openEdit = () => {
    if (!data?.meta) return;
    openModal('ai', 'edit', {
      id: sourceId, name: data.meta.name, aiType: data.meta.type,
      aiSettings: data.meta.settings, managementUrl: data.meta.managementUrl, onSuccess: () => mutate(),
    });
  };

  const selectDimension = (dimension: AiFilter['dimension']) => (value: string) =>
    router.push(`/dashboard/ai-monitoring/${sourceId}?${dimension}=${encodeURIComponent(value)}`);

  if (!data && !error) return <AiMonitoringSkeleton />;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => { mutate(); mutateActivity(); }} /></div></>;
  if (!data?.meta) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load AI source.</div></div></>;

  const { meta, overview } = data;
  const isActive = meta.lastSeen && (new Date().getTime() - new Date(meta.lastSeen).getTime()) < 15 * 60 * 1000;

  const areaDefs = (id: string, color: string) => (
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor(color)} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor(color)} stopOpacity={0} /></linearGradient></defs>
  );

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4">
          {filter && (
            <Button variant="ghost" onClick={() => router.push(`/dashboard/ai-monitoring/${sourceId}`)} className="pl-0 w-fit hover:bg-transparent hover:text-violet-500 -ml-2"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Source</Button>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
                <Badge variant="outline" className="border-violet-500/20 text-violet-500 bg-violet-500/10 text-[10px]">{meta.type === 'browser' ? 'BROWSER' : 'SERVER'}</Badge>
                {filter && <Badge variant="outline" className="border-violet-500/20 text-violet-500 bg-violet-500/10 font-mono text-xs">{filter.dimension}: {filter.value}</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {isActive
                  ? <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</div>
                  : <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Inactive</div>}
                <span className="text-muted-foreground font-mono ml-2">Last Seen: {meta.lastSeen ? formatDistanceToNow(new Date(meta.lastSeen)) + ' ago' : 'Never'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
              <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></Button>
              {!readOnly && !filter && <ShareButton scopeType="ai" scopeId={sourceId} dashboardName={meta.name} />}
              {!readOnly && !filter && <Button variant="outline" size="icon" onClick={openEdit}><Pencil className="h-4 w-4" /></Button>}
              {!readOnly && !filter && <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>

        {/* Stats — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Cost" value={formatUsd(overview.totalCostUsd)} sub="USD in range" icon={DollarSign} color="text-violet-500" />
          <StatCard title="LLM Calls" value={formatNumber(overview.totalCalls)} sub={`${overview.errorRate?.toFixed(2)}% error rate`} icon={Activity} color="text-blue-500" />
          <StatCard title="Total Tokens" value={formatTokens(overview.totalTokens)} sub={`${formatTokens(overview.tokensIn)} in · ${formatTokens(overview.tokensOut)} out`} icon={Hash} color="text-emerald-500" />
          <StatCard title="P95 Latency" value={formatMs(overview.p95)} sub={`p50 ${formatMs(overview.p50)} · p99 ${formatMs(overview.p99)}`} icon={Clock} color="text-cyan-500" />
        </div>

        {/* Cost over time */}
        <ChartCard title="Cost over time (USD)">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graph}>
                {areaDefs('ai-cost', '#8b5cf6')}
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} valueFormatter={(v: number) => formatUsd(v)} />} />
                <Area type="monotone" dataKey="costUsd" name="Cost" stroke={getColor('#8b5cf6')} fill="url(#ai-cost)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Calls & Errors | Avg Latency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Calls & errors">
            <div className="p-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graph}>
                  {areaDefs('ai-calls', '#3b82f6')}
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} />} />
                  <Area type="monotone" dataKey="calls" name="Calls" stroke={getColor('#3b82f6')} fill="url(#ai-calls)" strokeWidth={2} />
                  <Area type="monotone" dataKey="errors" name="Errors" stroke={getColor('#ef4444')} fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Average latency (ms)">
            <div className="p-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graph}>
                  {areaDefs('ai-lat', '#06b6d4')}
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} valueFormatter={(v: number) => formatMs(v)} />} />
                  <Area type="monotone" dataKey="avgLatencyMs" name="Avg latency" stroke={getColor('#06b6d4')} fill="url(#ai-lat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Token usage */}
        <ChartCard title="Token usage (input / output)">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graph}>
                {areaDefs('ai-tin', '#10b981')}
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} valueFormatter={(v: number) => formatTokens(v)} />} />
                <Area type="monotone" dataKey="tokensIn" name="Input" stroke={getColor('#10b981')} fill="url(#ai-tin)" strokeWidth={2} />
                <Area type="monotone" dataKey="tokensOut" name="Output" stroke={getColor('#f59e0b')} fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top models — full width */}
        <BreakdownTable title="Top models" label="Model" rows={data.models || []} onSelect={selectDimension('model')} />

        {/* Providers | Operations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BreakdownTable title="Providers" label="Provider" rows={data.providers || []} onSelect={selectDimension('provider')} />
          <BreakdownTable title="Operations" label="Operation" rows={data.operations || []} onSelect={selectDimension('operation')} formatKey={(k: string) => OPERATION_LABEL[k] || k} />
        </div>

        {/* Top consumers (main view only) */}
        {!filter && (consumers?.users?.length > 0 || consumers?.sessions?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConsumerCard title="Top users by cost" label="User" rows={consumers?.users} />
            <ConsumerCard title="Top sessions by cost" label="Session" rows={consumers?.sessions} />
          </div>
        )}

        {/* Tool & MCP reliability (main view only; shown when agent/tool/MCP telemetry exists) */}
        {!filter && (reliability?.tools?.length > 0 || reliability?.mcp?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReliabilityCard title="Tool reliability" label="Tool" rows={reliability?.tools} />
            <ReliabilityCard title="MCP server reliability" label="Server" rows={reliability?.mcp} />
          </div>
        )}

        {/* Recent activity */}
        <ActivityTable
          rows={filter ? (activity?.generations || []) : (activity?.traces || [])}
          mode={filter ? 'generations' : 'traces'}
          sourceId={sourceId}
          router={router}
          onRefresh={() => mutateActivity()}
          isRefreshing={isValidatingActivity}
        />
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete AI source?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{meta.name}</strong> and all its traces, generations, scores and metrics.</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
