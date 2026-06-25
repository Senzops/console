import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';
import { Card, CardContent, CardHeader, CardTitle, Button, Dialog, Badge, Spinner, DataError } from '@/components/Core';
import { Maximize, X, ChevronRight, AlertOctagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RumSourceMaps } from '@/components/RumSourceMaps';

const fmtMs = (v?: number | null) => (v === null || v === undefined ? '—' : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`);
// Human duration, rolling up to days and showing the two most-significant units
// (e.g. 11s · 5m 11s · 1h 49m · 2d 3h).
const fmtDuration = (ms: number) => {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  if (total < 60) return `${total}s`;
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

// ===========================================================================
// Session timeline drawer
// ===========================================================================
const SessionDrawer = ({ serviceId, sessionId, fetcher, onClose }: any) => {
  const { data, error } = useSWR(sessionId ? `/rum/${serviceId}/sessions/${sessionId}` : null, fetcher);
  const s = data?.summary;

  return (
    <Dialog open={!!sessionId} onClose={onClose} title="Session Timeline" className="max-w-2xl">
      {!data && !error && <div className="flex items-center justify-center py-12"><Spinner className="h-6 w-6" /></div>}
      {error && <div className="py-6"><DataError /></div>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[['Page loads', s.pageViews], ['Duration', fmtDuration(s.durationMs)], ['Errors', s.errors]].map(([label, val]) => (
              <div key={label as string} className="rounded-lg border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-lg font-bold text-foreground mt-1">{val}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
            <span>{s.browser}</span><span>·</span><span>{s.os}</span><span>·</span><span>{s.device}</span><span>·</span><span>{s.country}</span>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Page views ({data.traces.length})</div>
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
              {data.traces.map((t: any) => (
                <Link key={t._id} href={`/dashboard/rum/${serviceId}/trace/${t.traceId}`} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`font-mono text-[9px] px-1.5 py-0 border-0 shrink-0 ${t.traceType === 'initial_load' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                      {t.traceType === 'initial_load' ? 'HARD LOAD' : 'SPA ROUTE'}
                    </Badge>
                    <span className="font-mono text-xs text-foreground truncate" title={t.path}>{t.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                    {typeof t.vitals?.lcp === 'number' && <span className="font-mono">LCP {fmtMs(t.vitals.lcp)}</span>}
                    <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

// ===========================================================================
// Sessions table — mirrors the Recent Page Traces design.
// ===========================================================================
const SessionsCard = ({ serviceId, timeRange, fetcher, canQuery }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [page, setPage] = useState(0);
  const [openSession, setOpenSession] = useState<string | null>(null);

  const trKey = buildTimeRangeQuery(timeRange);
  // Reset to the first page whenever the time window changes.
  useEffect(() => { setPage(0); }, [trKey]);

  const { data, error } = useSWR(
    canQuery ? `/rum/${serviceId}/sessions?${trKey}&page=${page}` : null,
    fetcher
  );
  const sessions = data?.sessions || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
        <CardTitle className="text-sm font-medium">Sessions</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized((m) => !m)}>
          {isMaximized ? <X className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        {!data && !error && <div className="flex items-center justify-center py-16"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="p-6"><DataError /></div>}
        {data && (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-6 py-3 font-medium">Entry page</th>
                <th className="px-4 py-3 text-right font-medium">Pages</th>
                <th className="px-4 py-3 text-right font-medium">Duration</th>
                <th className="px-4 py-3 text-right font-medium">Errors</th>
                <th className="px-6 py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => (
                <tr key={s._id} onClick={() => setOpenSession(s._id)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-foreground truncate max-w-[220px]" title={s.entryPath}>{s.entryPath}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{s.pageViews}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtDuration(s.durationMs)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {s.errors > 0 ? <span className="inline-flex items-center gap-1 text-red-500"><AlertOctagon className="h-3 w-3" />{s.errors}</span> : <span className="text-muted-foreground/40">0</span>}
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(s.end), { addSuffix: true })}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">No sessions in this period.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </CardContent>
      {data && total > 0 && (
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 shrink-0">
          <span className="text-[11px] text-muted-foreground tabular-nums">{total.toLocaleString()} session{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
              <span className="text-[11px] text-muted-foreground tabular-nums">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <>
      {isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}
      {isMaximized ? createPortal(Content, document.body) : Content}
      <SessionDrawer serviceId={serviceId} sessionId={openSession} fetcher={fetcher} onClose={() => setOpenSession(null)} />
    </>
  );
};

// ===========================================================================
export const RumInsights = ({ serviceId, timeRange, readOnly }: { serviceId: string; timeRange: any; readOnly: boolean }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly: shareReadOnly } = useShareMode();
  const canQuery = Boolean(token || shareReadOnly);

  return (
    <div className="space-y-6">
      <SessionsCard serviceId={serviceId} timeRange={timeRange} fetcher={fetcher} canQuery={canQuery} />
      {!readOnly && <RumSourceMaps serviceId={serviceId} />}
    </div>
  );
};
