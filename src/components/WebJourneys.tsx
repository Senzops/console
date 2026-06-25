import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { useTheme } from '@/lib/theme';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';

const MIN_OFFSET_COLS = 6; // columns shown before maximizing (prevents overflow)
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner, DataError } from '@/components/Core';
import { Maximize, X, ChevronRight } from 'lucide-react';

// Industry-standard middle truncation for a journey: keep the entry and exit
// (the most meaningful steps) and collapse the middle into a "+N" pill. The full
// ordered path is always available via the row tooltip.
type PathSegment = { value: string; collapsed?: false } | { collapsed: true; count: number; title: string };
const collapsePath = (path: string[], expanded = false): PathSegment[] => {
  const MAX = 4;
  if (expanded || path.length <= MAX) return path.map((value) => ({ value }));
  const hidden = path.slice(2, -1);
  return [
    { value: path[0] },
    { value: path[1] },
    { collapsed: true, count: hidden.length, title: hidden.join('  →  ') },
    { value: path[path.length - 1] },
  ];
};

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
  const { isMono } = useTheme();
  const canQuery = Boolean(token || readOnly);

  const { data, error } = useSWR(
    canQuery && webId ? `/web/${webId}/retention?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  const unitLabel = data?.unit === 'week' ? 'W' : 'D';
  const cohorts = data?.cohorts || [];
  const maxOffset = data?.maxOffset ?? 11;
  const allColumns = useMemo(() => Array.from({ length: maxOffset + 1 }, (_, i) => i), [maxOffset]);

  // Theme-aware heatmap: monochrome theme uses the chart-mono token, otherwise
  // the brand emerald — both as an alpha ramp so intensity reads cleanly.
  const cellBg = (alpha: number) => (isMono ? `hsl(var(--chart-mono) / ${alpha})` : `rgba(16, 185, 129, ${alpha})`);
  const cellFg = (alpha: number) => (alpha > 0.5 ? (isMono ? 'hsl(var(--background))' : '#ffffff') : 'hsl(var(--foreground))');

  return (
    <MaximizableCard title="Visitor Retention">
      {(isMaximized) => {
        if (!data && !error) return <div className="flex items-center justify-center py-16"><Spinner className="h-5 w-5" /></div>;
        if (error) return <div className="p-6"><DataError /></div>;
        if (cohorts.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">Not enough data for retention analysis.</div>;

        // Bound both axes when minimized so the card never scrolls; the header's
        // maximize control reveals the full grid.
        const columns = isMaximized ? allColumns : allColumns.slice(0, MIN_OFFSET_COLS);
        const limit = isMaximized ? cohorts.length : 6;
        const visible = cohorts.slice(0, limit);

        return (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-muted/30 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Cohort</th>
                <th className="px-2 py-2.5 text-right font-medium">Visitors</th>
                {columns.map((o) => <th key={o} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">{unitLabel}{o}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((c: any) => {
                const byOffset = new Map<number, any>(c.cells.map((x: any) => [x.offset, x]));
                return (
                  <tr key={c.cohort} className="border-b border-border/40">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-foreground">
                      {new Date(c.cohort).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatNumber(c.size)}</td>
                    {columns.map((o) => {
                      const cell = byOffset.get(o);
                      if (!cell) return <td key={o} className="px-1 py-1" />;
                      const alpha = cell.percent > 0 ? 0.12 + (cell.percent / 100) * 0.78 : 0;
                      return (
                        <td key={o} className="px-1 py-1">
                          <div
                            className="rounded px-1.5 py-1.5 text-center text-[10px] font-semibold tabular-nums"
                            style={{ backgroundColor: cellBg(alpha), color: cellFg(alpha) }}
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
          <div className="w-full text-sm">
            {/* Header */}
            <div className="flex items-stretch bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground font-medium border-b border-border/40">
              <span className="flex-1 px-4 py-2.5 min-w-0">User Path</span>
              <span className="w-24 shrink-0 px-4 py-2.5 text-right">Sessions</span>
            </div>
            {/* Rows */}
            {visible.map((p: any, i: number) => (
              <div key={i} className="group relative flex items-stretch border-b border-border/40 hover:bg-muted/20 transition-colors overflow-hidden">
                {/* Background bar */}
                <div className="absolute inset-y-0 left-0 my-[1px] bg-muted/40 origin-left rounded-r-md transition-all duration-[1500ms] pointer-events-none" style={{ width: `${p.percent}%` }} />
                {/* Single-line path with middle-collapse + tooltip of the full journey */}
                <div className="relative z-10 flex-1 min-w-0 flex items-center gap-1 px-4 py-2.5 overflow-hidden" title={p.path.join('  →  ')}>
                  {collapsePath(p.path).map((seg, si) => (
                    <React.Fragment key={si}>
                      {si > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                      {seg.collapsed ? (
                        <span className="text-[11px] text-muted-foreground/70 shrink-0 px-0.5" title={seg.title}>+{seg.count}</span>
                      ) : (
                        <span className="font-mono text-[11px] bg-background/80 border border-border/50 rounded px-1.5 py-0.5 shrink min-w-0 truncate" title={seg.value}>{seg.value}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="relative z-10 w-24 shrink-0 px-4 py-2.5 text-right font-mono text-xs whitespace-nowrap self-center">
                  {formatNumber(p.count)}
                  <span className="text-[10px] text-muted-foreground/70 ml-1">|</span>
                  <span className="text-[10px] text-muted-foreground/70 ml-1">{Math.round(p.percent)}%</span>
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
