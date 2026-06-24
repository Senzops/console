import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';
import { Card, CardContent, CardHeader, CardTitle, Spinner, DataError } from '@/components/Core';
import { Users, Route, ChevronRight } from 'lucide-react';

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return (num ?? 0).toString();
};

// ---------------------------------------------------------------------------
// Cohort retention heatmap
// ---------------------------------------------------------------------------
const RetentionGrid = ({ webId, timeRange }: { webId: string; timeRange: any }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canQuery = Boolean(token || readOnly);

  const { data, error } = useSWR(
    canQuery && webId ? `/web/${webId}/retention?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  const unitLabel = data?.unit === 'week' ? 'Week' : 'Day';
  const cohorts = data?.cohorts || [];
  const maxOffset = data?.maxOffset ?? 11;
  const columns = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Visitor Retention
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {!data && !error && <div className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="py-6"><DataError /></div>}
        {data && cohorts.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Not enough data for retention analysis.</div>
        )}
        {data && cohorts.length > 0 && (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium px-2 py-1.5 sticky left-0 bg-card">Cohort</th>
                <th className="text-right font-medium px-2 py-1.5">Visitors</th>
                {columns.map((o) => (
                  <th key={o} className="text-center font-medium px-1.5 py-1.5 whitespace-nowrap">{unitLabel} {o}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c: any) => {
                const cellByOffset = new Map<number, any>(c.cells.map((x: any) => [x.offset, x]));
                return (
                  <tr key={c.cohort}>
                    <td className="px-2 py-1.5 whitespace-nowrap sticky left-0 bg-card text-foreground">
                      {new Date(c.cohort).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{formatNumber(c.size)}</td>
                    {columns.map((o) => {
                      const cell = cellByOffset.get(o);
                      if (!cell) return <td key={o} className="px-1.5 py-1.5" />;
                      const alpha = cell.percent > 0 ? 0.08 + (cell.percent / 100) * 0.92 : 0;
                      return (
                        <td key={o} className="px-1 py-1 text-center">
                          <div
                            className="rounded px-1.5 py-1 text-[10px] font-medium tabular-nums"
                            style={{ backgroundColor: `hsl(var(--chart-1) / ${alpha})`, color: cell.percent > 55 ? 'white' : 'inherit' }}
                            title={`${formatNumber(cell.visitors)} visitors`}
                          >
                            {cell.percent.toFixed(0)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Top user paths
// ---------------------------------------------------------------------------
const TopPaths = ({ webId, timeRange }: { webId: string; timeRange: any }) => {
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
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Route className="h-4 w-4" /> Top User Paths
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {!data && !error && <div className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="py-6"><DataError /></div>}
        {data && paths.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No session paths in this period.</div>
        )}
        {data && paths.length > 0 && (
          <div className="space-y-1">
            {paths.map((p: any, i: number) => (
              <div key={i} className="relative rounded-md border border-border/40 px-3 py-2 overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-muted/40" style={{ width: `${p.percent}%` }} />
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {p.path.map((step: string, si: number) => (
                      <React.Fragment key={si}>
                        {si > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                        <span className="text-xs font-mono bg-muted/60 rounded px-1.5 py-0.5 truncate max-w-[160px]" title={step}>{step}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0">
                    <span className="font-mono text-xs">{formatNumber(p.count)}</span>
                    <span className="text-[10px] text-muted-foreground/70 ml-1">{p.percent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const WebJourneys = ({ webId, timeRange }: { webId: string; timeRange: any }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Route className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">Retention &amp; Journeys</h2>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RetentionGrid webId={webId} timeRange={timeRange} />
      <TopPaths webId={webId} timeRange={timeRange} />
    </div>
  </div>
);
