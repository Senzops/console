import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Spinner, Tabs, DataError, cn,
} from '../Core';
import { ChartTooltip } from '../ChartTooltip';
import {
  Search, X, Clock, Lock, Gauge, ArrowUpDown, ScanLine, Database, Sparkles, ShieldAlert,
} from 'lucide-react';

// ============================================================================
// Query Insights.
// ----------------------------------------------------------------------------
// Two views over the same window, mirroring how the question is actually asked:
//   Query shapes — which patterns cost the most in aggregate
//   Slow operations — what individually took too long, and when
//
// Query text arrives already normalized and value-redacted from the collector,
// and is withheld entirely on shared dashboards. This component never receives
// raw customer data.
// ============================================================================

interface QueryShape {
  digestHash: string;
  queryText: string;
  namespace?: string;
  operation: string;
  executions: number;
  totalTimeMs: number;
  meanTimeMs: number;
  maxTimeMs: number;
  rowsReturned?: number;
  rowsExamined?: number;
  examinedPerReturned?: number | null;
  planSummary?: string;
  lastSeen?: string;
}

interface SlowOp {
  _id: string;
  timestamp: string;
  durationMs: number;
  operation: string;
  namespace?: string;
  queryText: string;
  digestHash?: string;
  planSummary?: string;
  docsExamined?: number;
  docsReturned?: number;
  keysExamined?: number;
  source?: string;
}

const SORT_OPTIONS = [
  { id: 'totalTime', label: 'Total time' },
  { id: 'meanTime', label: 'Avg time' },
  { id: 'maxTime', label: 'Slowest' },
  { id: 'executions', label: 'Calls' },
  { id: 'examined', label: 'Scan ratio' },
];

const OPERATION_TONE: Record<string, string> = {
  select: 'text-blue-500',
  insert: 'text-emerald-500',
  update: 'text-yellow-500',
  delete: 'text-destructive',
  aggregate: 'text-purple-500',
  command: 'text-muted-foreground',
  other: 'text-muted-foreground',
};

const formatMs = (ms?: number | null) => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 1) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(2)}ms`;
};

const formatCount = (n?: number | null) =>
  n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-US');

const formatRatio = (n?: number | null) => {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(n >= 10 ? 0 : 1)}×`;
};

/** Scan ratio is the index-health headline, so it earns colour. */
const ratioTone = (n?: number | null) => {
  if (n == null || !Number.isFinite(n)) return 'text-muted-foreground';
  if (n >= 100) return 'text-destructive';
  if (n >= 10) return 'text-yellow-500';
  return 'text-emerald-500';
};

// --- Shared empty / blocked states -------------------------------------------

const Placeholder = ({
  icon: Icon,
  title,
  children,
  tone = 'muted',
}: {
  icon: typeof Lock;
  title: string;
  children?: React.ReactNode;
  tone?: 'muted' | 'warning';
}) => (
  <Card className={tone === 'warning' ? 'border-yellow-500/25 bg-yellow-500/[0.03]' : undefined}>
    <CardContent className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className={cn(
          'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
          tone === 'warning' ? 'bg-yellow-500/10' : 'bg-muted/50'
        )}
      >
        <Icon className={cn('h-6 w-6', tone === 'warning' ? 'text-yellow-500' : 'text-muted-foreground')} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>
    </CardContent>
  </Card>
);

// --- Detail drawer ------------------------------------------------------------

const QueryShapeDrawer = ({
  dbId,
  digestHash,
  timeQuery,
  fetcher,
  onClose,
}: {
  dbId: string;
  digestHash: string;
  timeQuery: string;
  fetcher: (url: string) => Promise<any>;
  onClose: () => void;
}) => {
  const { data, error } = useSWR(
    `/database/${dbId}/insights/${encodeURIComponent(digestHash)}?${timeQuery}`,
    fetcher
  );

  // Escape closes, matching every other overlay in the product.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shape: QueryShape | null = data?.shape || null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Query shape detail"
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-border/80 bg-card shadow-2xl animate-in slide-in-from-right-full duration-300 ease-out"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/20 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="mr-2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Query shape</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{digestHash}</p>
            </div>
          </div>
          {shape?.operation && (
            <Badge variant="outline" className={cn('capitalize', OPERATION_TONE[shape.operation])}>
              {shape.operation}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <DataError message="Could not load this query shape." />
          ) : !data ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Normalized query
                </h4>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground-secondary">
                  {shape?.queryText || '—'}
                </pre>
                {data.textRedacted && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Query text is hidden on shared dashboards.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Calls', value: formatCount(shape?.executions) },
                  { label: 'Avg time', value: formatMs(shape?.meanTimeMs) },
                  { label: 'Slowest', value: formatMs(shape?.maxTimeMs) },
                  { label: 'Scan ratio', value: formatRatio(shape?.examinedPerReturned) },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              {shape?.namespace && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  <span className="font-mono text-foreground-secondary">{shape.namespace}</span>
                  {shape.planSummary && (
                    <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                      {shape.planSummary}
                    </Badge>
                  )}
                </div>
              )}

              {data.trend?.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Average latency over time
                  </h4>
                  <div className="h-40 rounded-lg border border-border/60 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trend}>
                        <defs>
                          <linearGradient id="shape-latency" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: number) => formatMs(v)} />} />
                        <Area
                          type="monotone"
                          dataKey="meanTimeMs"
                          name="Avg time"
                          stroke="#8b5cf6"
                          fill="url(#shape-latency)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {data.executions?.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Slowest individual executions
                  </h4>
                  <div className="divide-y divide-border/50 rounded-lg border border-border/60">
                    {data.executions.map((op: SlowOp) => (
                      <div key={op._id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {new Date(op.timestamp).toLocaleString()}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                          {formatMs(op.durationMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main view ----------------------------------------------------------------

export const DatabaseInsights = ({
  dbId,
  timeQuery,
  fetcher,
  capabilities,
}: {
  dbId: string;
  timeQuery: string;
  fetcher: (url: string) => Promise<any>;
  capabilities?: Record<string, { available: boolean; reason?: string; remediation?: string }>;
}) => {
  const [view, setView] = useState<'shapes' | 'slow'>('shapes');
  const [sort, setSort] = useState('totalTime');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // Debounced so a keystroke does not become a database aggregation.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const key = `/database/${dbId}/insights?${timeQuery}&sort=${sort}${
    search ? `&search=${encodeURIComponent(search)}` : ''
  }`;
  const { data, error, isLoading } = useSWR(key, fetcher, { keepPreviousData: true });

  const planBlocked = error?.response?.status === 403 && error?.response?.data?.requiredPlan;

  const scatter = useMemo(
    () =>
      (data?.slowOps || []).map((op: SlowOp) => ({
        x: new Date(op.timestamp).getTime(),
        y: op.durationMs,
        op,
      })),
    [data?.slowOps]
  );

  if (planBlocked) {
    return (
      <Placeholder icon={Sparkles} title="Query Insights is available on Pro and above">
        {error.response.data.message ||
          'Upgrade to capture query shapes, latency distributions, and slow operations from your database.'}
        <div className="mt-4">
          <Button variant="default" onClick={() => window.open('/pricing', '_blank')}>
            View plans
          </Button>
        </div>
      </Placeholder>
    );
  }

  if (error) {
    return (
      <Placeholder icon={ShieldAlert} title="Could not load query insights">
        {error?.response?.data?.error || 'The request failed. Try again in a moment.'}
      </Placeholder>
    );
  }

  const queryStatsCap = capabilities?.queryStats;
  const slowLogCap = capabilities?.slowLog;
  const noSource = queryStatsCap && !queryStatsCap.available && slowLogCap && !slowLogCap.available;

  if (noSource) {
    return (
      <Placeholder icon={Lock} title="No query statistics source is available" tone="warning">
        {queryStatsCap?.reason}
        {queryStatsCap?.remediation && (
          <p className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3 text-left font-mono text-[11px] leading-relaxed text-foreground-secondary">
            {queryStatsCap.remediation}
          </p>
        )}
      </Placeholder>
    );
  }

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </CardContent>
      </Card>
    );
  }

  const shapes: QueryShape[] = data?.shapes || [];
  const slowOps: SlowOp[] = data?.slowOps || [];
  const summary = data?.summary || { executions: 0, totalTimeMs: 0, shapeCount: 0 };

  const isEmpty = shapes.length === 0 && slowOps.length === 0 && !search;

  return (
    <div className="space-y-6">
      {/* Window summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { title: 'Query shapes', value: formatCount(summary.shapeCount), icon: ScanLine, tone: 'text-blue-500' },
          { title: 'Executions', value: formatCount(summary.executions), icon: Gauge, tone: 'text-emerald-500' },
          { title: 'Total query time', value: formatMs(summary.totalTimeMs), icon: Clock, tone: 'text-purple-500' },
          {
            title: 'Slow operations',
            value: formatCount(slowOps.length),
            icon: ShieldAlert,
            tone: slowOps.length > 0 ? 'text-yellow-500' : 'text-muted-foreground',
          },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
                <s.icon className={cn('h-4 w-4', s.tone)} />
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEmpty ? (
        <Placeholder icon={ScanLine} title="No query activity captured yet">
          Insights are collected every five minutes. If this database was just connected, the first
          window will appear shortly.
        </Placeholder>
      ) : (
        <>
          {/* Latency scatter — the profiler view: each point is one slow operation. */}
          {scatter.length > 0 && (
            <Card className="h-[300px] flex flex-col">
              <CardHeader className="mb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Slow Operations Over Time
                </CardTitle>
                <span className="text-xs text-muted-foreground">{scatter.length} captured</span>
              </CardHeader>
              <CardContent className="relative min-h-0 flex-1 px-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--border))"
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      tickFormatter={(v) => formatMs(v)}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--border))"
                      width={56}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const op: SlowOp = payload[0].payload.op;
                        return (
                          <div className="max-w-sm rounded-lg border bg-popover p-3 shadow-lg">
                            <p className="text-xs font-semibold text-foreground">{formatMs(op.durationMs)}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {new Date(op.timestamp).toLocaleString()}
                            </p>
                            <p className="mt-1.5 break-words font-mono text-[11px] text-foreground-secondary">
                              {op.queryText.slice(0, 160)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatter} fill="#8b5cf6" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="flex h-auto flex-col gap-3 space-y-0 border-b border-border/40 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                variant="segmented"
                label="Insight views"
                value={view}
                onChange={(v) => setView(v as 'shapes' | 'slow')}
                items={[
                  { id: 'shapes', label: 'Query shapes' },
                  { id: 'slow', label: 'Slow operations' },
                ]}
              />

              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search queries..."
                    aria-label="Search query text"
                    className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                {view === 'shapes' && (
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <select
                      aria-label="Sort query shapes"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="max-h-[560px] flex-1 overflow-auto p-0">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/30 text-xs font-medium uppercase text-muted-foreground backdrop-blur">
                  {view === 'shapes' ? (
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3">Query</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Calls</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Avg</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Total</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Scan ratio</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3">Operation</th>
                      <th className="whitespace-nowrap px-5 py-3">When</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Duration</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">Examined</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border/50">
                  {view === 'shapes' &&
                    shapes.map((shape) => (
                      <tr
                        key={shape.digestHash}
                        onClick={() => setSelected(shape.digestHash)}
                        className="group cursor-pointer transition-colors hover:bg-muted/30"
                      >
                        <td className="max-w-[420px] px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] font-bold uppercase', OPERATION_TONE[shape.operation])}>
                              {shape.operation}
                            </span>
                            {shape.namespace && (
                              <span className="truncate font-mono text-[11px] text-muted-foreground">
                                {shape.namespace}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-xs text-foreground-secondary">
                            {shape.queryText}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                          {formatCount(shape.executions)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                          {formatMs(shape.meanTimeMs)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium text-foreground">
                          {formatMs(shape.totalTimeMs)}
                        </td>
                        <td className={cn('px-5 py-3 text-right font-mono', ratioTone(shape.examinedPerReturned))}>
                          {formatRatio(shape.examinedPerReturned)}
                        </td>
                      </tr>
                    ))}

                  {view === 'slow' &&
                    slowOps.map((op) => (
                      <tr
                        key={op._id}
                        onClick={() => op.digestHash && setSelected(op.digestHash)}
                        className={cn(
                          'group transition-colors hover:bg-muted/30',
                          op.digestHash && 'cursor-pointer'
                        )}
                      >
                        <td className="max-w-[420px] px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] font-bold uppercase', OPERATION_TONE[op.operation])}>
                              {op.operation}
                            </span>
                            {op.namespace && (
                              <span className="truncate font-mono text-[11px] text-muted-foreground">
                                {op.namespace}
                              </span>
                            )}
                            {op.planSummary && (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {op.planSummary}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-xs text-foreground-secondary">
                            {op.queryText}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                          {new Date(op.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium text-foreground">
                          {formatMs(op.durationMs)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                          {formatCount(op.docsExamined)}
                        </td>
                      </tr>
                    ))}

                  {((view === 'shapes' && shapes.length === 0) ||
                    (view === 'slow' && slowOps.length === 0)) && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        {search ? 'No queries match your search.' : 'Nothing captured in this window.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {data?.textRedacted && (
            <p className="text-center text-xs text-muted-foreground">
              Query text is hidden on shared dashboards.
            </p>
          )}
        </>
      )}

      {selected && (
        <QueryShapeDrawer
          dbId={dbId}
          digestHash={selected}
          timeQuery={timeQuery}
          fetcher={fetcher}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};
