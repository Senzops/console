import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { api, useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';
import { Card, CardContent, CardHeader, CardTitle, Button, Dialog, Badge, Spinner, DataError } from '@/components/Core';
import { Gauge, Users, AlertOctagon, ChevronRight } from 'lucide-react';
import { RumSourceMaps } from '@/components/RumSourceMaps';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

// --- Core Web Vitals thresholds (Google): [good ≤, needs-improvement ≤] ---
const CWV: Record<string, { label: string; good: number; ni: number; unit: 'ms' | 'cls' }> = {
  lcp: { label: 'LCP', good: 2500, ni: 4000, unit: 'ms' },
  inp: { label: 'INP', good: 200, ni: 500, unit: 'ms' },
  cls: { label: 'CLS', good: 0.1, ni: 0.25, unit: 'cls' },
  fcp: { label: 'FCP', good: 1800, ni: 3000, unit: 'ms' },
  ttfb: { label: 'TTFB', good: 800, ni: 1800, unit: 'ms' },
};

const rate = (key: string, v: number | null) => {
  if (v === null || v === undefined) return 'none';
  const t = CWV[key];
  if (v <= t.good) return 'good';
  if (v <= t.ni) return 'ni';
  return 'poor';
};

const RATING_STYLE: Record<string, string> = {
  good: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
  ni: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  poor: 'text-red-500 border-red-500/30 bg-red-500/5',
  none: 'text-muted-foreground border-border bg-muted/20',
};

const fmtMs = (v: number | null) => (v === null || v === undefined ? '—' : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`);
const fmtVital = (key: string, v: number | null) => (key === 'cls' ? (v === null ? '—' : v.toFixed(3)) : fmtMs(v));

const fmtDuration = (ms: number) => {
  if (!ms || ms < 1000) return `${Math.max(0, Math.round(ms / 1000))}s`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

// ---------------------------------------------------------------------------
// Core Web Vitals (percentiles)
// ---------------------------------------------------------------------------
const VitalsPanel = ({ serviceId, timeRange, fetcher, canQuery }: any) => {
  const { data, error } = useSWR(
    canQuery ? `/rum/${serviceId}/vitals?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Core Web Vitals <span className="text-[10px] text-muted-foreground/60">(p75)</span>
        </CardTitle>
        {data?.sampleSize > 0 && <span className="text-[10px] text-muted-foreground/60">{data.sampled ? '20k+ sample' : `${data.sampleSize} samples`}</span>}
      </CardHeader>
      <CardContent>
        {!data && !error && <div className="flex items-center justify-center py-8"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="py-4"><DataError /></div>}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.keys(CWV).map((key) => {
              const m = data.vitals?.[key] || {};
              const r = rate(key, m.p75);
              return (
                <div key={key} className={`rounded-lg border p-3 ${RATING_STYLE[r]}`}>
                  <div className="text-[10px] uppercase font-bold tracking-wide opacity-80">{CWV[key].label}</div>
                  <div className="text-xl font-bold mt-1 tabular-nums">{fmtVital(key, m.p75 ?? null)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">p95 {fmtVital(key, m.p95 ?? null)}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Session detail drawer
// ---------------------------------------------------------------------------
const SessionDrawer = ({ serviceId, sessionId, fetcher, onClose }: any) => {
  const { data, error } = useSWR(sessionId ? `/rum/${serviceId}/sessions/${sessionId}` : null, fetcher);
  return (
    <Dialog open={!!sessionId} onClose={onClose} title="Session Timeline" className="max-w-2xl">
      {!data && !error && <div className="flex items-center justify-center py-10"><Spinner className="h-6 w-6" /></div>}
      {error && <div className="py-6"><DataError /></div>}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border bg-muted/20 p-2"><div className="text-muted-foreground">Pages</div><div className="text-base font-bold">{data.summary.pageViews}</div></div>
            <div className="rounded-lg border bg-muted/20 p-2"><div className="text-muted-foreground">Duration</div><div className="text-base font-bold">{fmtDuration(data.summary.durationMs)}</div></div>
            <div className="rounded-lg border bg-muted/20 p-2"><div className="text-muted-foreground">Errors</div><div className="text-base font-bold">{data.summary.errors}</div></div>
          </div>
          <div className="text-[11px] text-muted-foreground">{data.summary.browser} · {data.summary.os} · {data.summary.device} · {data.summary.country}</div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
            {data.traces.map((t: any) => (
              <Link key={t._id} href={`/dashboard/rum/${serviceId}/trace/${t.traceId}`} className="block rounded-md border border-border/40 px-3 py-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono truncate" title={t.path}>{t.path}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] py-0">{t.traceType === 'initial_load' ? 'load' : 'route'}</Badge>
                  {typeof t.vitals?.lcp === 'number' && <span>LCP {fmtMs(t.vitals.lcp)}</span>}
                  <span>{fmtMs(t.duration)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Sessions list
// ---------------------------------------------------------------------------
const SessionsPanel = ({ serviceId, timeRange, fetcher, canQuery }: any) => {
  const [page, setPage] = useState(0);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const { data, error } = useSWR(
    canQuery ? `/rum/${serviceId}/sessions?${buildTimeRangeQuery(timeRange)}&page=${page}` : null,
    fetcher
  );
  const sessions = data?.sessions || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data && !error && <div className="flex items-center justify-center py-8"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="py-4"><DataError /></div>}
        {data && sessions.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No sessions in this period.</div>}
        {data && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left font-medium px-2 py-1.5">Entry page</th>
                  <th className="text-right font-medium px-2 py-1.5">Pages</th>
                  <th className="text-right font-medium px-2 py-1.5">Duration</th>
                  <th className="text-right font-medium px-2 py-1.5">Errors</th>
                  <th className="text-left font-medium px-2 py-1.5 hidden md:table-cell">Device</th>
                  <th className="text-right font-medium px-2 py-1.5">When</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any) => (
                  <tr key={s._id} onClick={() => setOpenSession(s._id)} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-2 py-2 font-mono truncate max-w-[180px]" title={s.entryPath}>{s.entryPath}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{s.pageViews}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtDuration(s.durationMs)}</td>
                    <td className="px-2 py-2 text-right">
                      {s.errors > 0 ? <span className="inline-flex items-center gap-1 text-red-500"><AlertOctagon className="h-3 w-3" />{s.errors}</span> : <span className="text-muted-foreground/50">0</span>}
                    </td>
                    <td className="px-2 py-2 hidden md:table-cell text-muted-foreground truncate max-w-[140px]">{s.browser} · {s.os}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(s.end), { addSuffix: true })}</td>
                    <td className="px-1 text-muted-foreground/50"><ChevronRight className="h-3.5 w-3.5" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(page > 0 || data.hasMore) && (
              <div className="flex items-center justify-between pt-3">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
                <span className="text-[10px] text-muted-foreground">Page {page + 1}</span>
                <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <SessionDrawer serviceId={serviceId} sessionId={openSession} fetcher={fetcher} onClose={() => setOpenSession(null)} />
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Sampling control (owner-only)
// ---------------------------------------------------------------------------
const SamplingControl = ({ serviceId, samplingRate }: { serviceId: string; samplingRate?: number }) => {
  const [rateValue, setRateValue] = useState<number>(typeof samplingRate === 'number' ? Math.round(samplingRate * 100) : 100);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/rum/${serviceId}`, { samplingRate: rateValue / 100 });
      toast.success(`Sampling set to ${rateValue}%`);
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to update sampling'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">Client sample rate</span>
      <input type="range" min={1} max={100} value={rateValue} onChange={(e) => setRateValue(parseInt(e.target.value))} className="flex-1 accent-[hsl(var(--chart-1))]" />
      <span className="font-mono w-10 text-right">{rateValue}%</span>
      <Button size="sm" variant="outline" onClick={save} disabled={saving || rateValue === Math.round((samplingRate ?? 1) * 100)}>
        {saving ? <Spinner className="h-3.5 w-3.5" /> : 'Save'}
      </Button>
    </div>
  );
};

export const RumInsights = ({ serviceId, timeRange, readOnly, samplingRate }: { serviceId: string; timeRange: any; readOnly: boolean; samplingRate?: number }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly: shareReadOnly } = useShareMode();
  const canQuery = Boolean(token || shareReadOnly);

  return (
    <div className="space-y-6">
      <VitalsPanel serviceId={serviceId} timeRange={timeRange} fetcher={fetcher} canQuery={canQuery} />
      {!readOnly && (
        <Card>
          <CardContent className="py-3">
            <SamplingControl serviceId={serviceId} samplingRate={samplingRate} />
          </CardContent>
        </Card>
      )}
      <SessionsPanel serviceId={serviceId} timeRange={timeRange} fetcher={fetcher} canQuery={canQuery} />
      {!readOnly && <RumSourceMaps serviceId={serviceId} />}
    </div>
  );
};
