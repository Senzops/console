import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner, DataError } from '@/components/Core';
import { Maximize, X, ChevronRight } from 'lucide-react';

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return (num ?? 0).toString();
};

// Shared maximizable card shell — mirrors the Top Pages / Recent Traces pattern.
const MaximizableCard = ({ title, children }: { title: string; children: (isMaximized: boolean, maximize: () => void) => React.ReactNode }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized((m) => !m)}>
          {isMaximized ? <X className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        {children(isMaximized, () => setIsMaximized(true))}
      </CardContent>
    </Card>
  );

  return (
    <>
      {isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}
      {isMaximized ? createPortal(content, document.body) : content}
    </>
  );
};

const ShowMoreRow = ({ span, count, onClick }: { span: number; count: number; onClick: () => void }) => (
  <tr className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group" onClick={onClick}>
    <td colSpan={span} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
      Show {count} more...
    </td>
  </tr>
);

const EmptyRow = ({ span, label }: { span: number; label: string }) => (
  <tr><td colSpan={span} className="py-10 text-center text-muted-foreground text-xs">{label}</td></tr>
);

// ---------------------------------------------------------------------------
// Cohort retention heatmap
// ---------------------------------------------------------------------------
const RetentionCard = ({ webId, timeRange }: { webId: string; timeRange: any }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canQuery = Boolean(token || readOnly);

  const { data, error } = useSWR(
    canQuery && webId ? `/web/${webId}/retention?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  const unitLabel = data?.unit === 'week' ? 'W' : 'D';
  const cohorts = data?.cohorts || [];
  const maxOffset = data?.maxOffset ?? 11;
  const columns = useMemo(() => Array.from({ length: maxOffset + 1 }, (_, i) => i), [maxOffset]);

  return (
    <MaximizableCard title="Visitor Retention">
      {(isMaximized, maximize) => {
        if (!data && !error) return <div className="flex items-center justify-center py-16"><Spinner className="h-5 w-5" /></div>;
        if (error) return <div className="p-6"><DataError /></div>;
        if (cohorts.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">Not enough data for retention analysis.</div>;

        const limit = isMaximized ? cohorts.length : 6;
        const visible = cohorts.slice(0, limit);
        const hidden = cohorts.length - limit;

        return (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-muted/30 text-[10px] uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium sticky left-0 bg-muted/30 backdrop-blur">Cohort</th>
                <th className="px-2 py-2.5 text-right font-medium">Visitors</th>
                {columns.map((o) => <th key={o} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{unitLabel}{o}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((c: any) => {
                const byOffset = new Map<number, any>(c.cells.map((x: any) => [x.offset, x]));
                return (
                  <tr key={c.cohort} className="border-b border-border/40">
                    <td className="px-4 py-2 whitespace-nowrap sticky left-0 bg-card font-medium text-foreground">
                      {new Date(c.cohort).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatNumber(c.size)}</td>
                    {columns.map((o) => {
                      const cell = byOffset.get(o);
                      if (!cell) return <td key={o} className="px-1.5 py-1.5" />;
                      const alpha = cell.percent > 0 ? 0.1 + (cell.percent / 100) * 0.85 : 0;
                      return (
                        <td key={o} className="px-1 py-1">
                          <div
                            className="rounded px-1.5 py-1.5 text-center text-[10px] font-medium tabular-nums"
                            style={{ backgroundColor: `hsl(var(--chart-1) / ${alpha})`, color: cell.percent > 55 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))' }}
                            title={`${formatNumber(cell.visitors)} returning visitors`}
                          >
                            {Math.round(cell.percent)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {!isMaximized && hidden > 0 && <ShowMoreRow span={columns.length + 2} count={hidden} onClick={maximize} />}
            </tbody>
          </table>
        );
      }}
    </MaximizableCard>
  );
};

// ---------------------------------------------------------------------------
// Top user paths
// ---------------------------------------------------------------------------
const PathsCard = ({ webId, timeRange }: { webId: string; timeRange: any }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canQuery = Boolean(token || readOnly);

  const { data, error } = useSWR(
    canQuery && webId ? `/web/${webId}/paths?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  const paths = data?.paths || [];

  return (
    <MaximizableCard title="Top User Paths">
      {(isMaximized, maximize) => {
        if (!data && !error) return <div className="flex items-center justify-center py-16"><Spinner className="h-5 w-5" /></div>;
        if (error) return <div className="p-6"><DataError /></div>;
        if (paths.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">No session paths in this period.</div>;

        const limit = isMaximized ? paths.length : 6;
        const visible = paths.slice(0, limit);
        const hidden = paths.length - limit;

        return (
          <div>
            {visible.map((p: any, i: number) => (
              <div key={i} className="relative border-b border-border/40 px-4 py-2.5 overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-muted/40" style={{ width: `${p.percent}%` }} />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {p.path.map((step: string, si: number) => (
                      <React.Fragment key={si}>
                        {si > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                        <span className="font-mono text-[11px] bg-background/80 border border-border/50 rounded px-1.5 py-0.5 truncate max-w-[150px]" title={step}>{step}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0">
                    <span className="font-mono text-xs">{formatNumber(p.count)}</span>
                    <span className="text-[10px] text-muted-foreground/70 ml-1.5">{Math.round(p.percent)}%</span>
                  </div>
                </div>
              </div>
            ))}
            {!isMaximized && hidden > 0 && (
              <div onClick={maximize} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent/50 cursor-pointer transition-colors">
                Show {hidden} more...
              </div>
            )}
          </div>
        );
      }}
    </MaximizableCard>
  );
};

export const WebJourneys = ({ webId, timeRange }: { webId: string; timeRange: any }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <RetentionCard webId={webId} timeRange={timeRange} />
    <PathsCard webId={webId} timeRange={timeRange} />
  </div>
);
