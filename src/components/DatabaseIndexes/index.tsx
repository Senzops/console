import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Spinner, Tabs, cn,
} from '../Core';
import { AdvisoryList, type Advisory } from '../DatabaseHealth';
import {
  Search, Lock, Sparkles, ShieldAlert, Database, Layers, HardDrive, Trash2, Lightbulb,
} from 'lucide-react';

// ============================================================================
// Indexes & Advisor.
// ----------------------------------------------------------------------------
// Strictly advisory. Suggested DDL is rendered as copyable text and nothing on
// this screen can modify the monitored database — Senzor observes.
// ============================================================================

interface IndexEntry {
  namespace: string;
  name: string;
  definition: string;
  keys: string[];
  unique: boolean;
  primary: boolean;
  partial: boolean;
  sizeBytes: number;
  scans: number;
  flags: string[];
  redundantWith?: string;
}

const FLAG_STYLE: Record<string, { label: string; className: string }> = {
  unused: { label: 'Unused', className: 'text-destructive border-destructive/30 bg-destructive/10' },
  redundant: { label: 'Redundant', className: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' },
  duplicate: { label: 'Duplicate', className: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' },
  'rarely-used': { label: 'Rarely used', className: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
  oversized: { label: 'Oversized', className: 'text-orange-500 border-orange-500/30 bg-orange-500/10' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'issues', label: 'With issues' },
  { id: 'unused', label: 'Unused' },
];

const formatBytes = (n?: number) => {
  if (!n || !Number.isFinite(n)) return '—';
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
};

const formatCount = (n?: number) =>
  n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-US');

const formatUptime = (seconds: number) => {
  if (!seconds) return 'unknown';
  const d = Math.floor(seconds / 86400);
  if (d >= 1) return `${d} day${d === 1 ? '' : 's'}`;
  return `${Math.floor(seconds / 3600)} hours`;
};

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

export const DatabaseIndexes = ({
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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, error, isLoading } = useSWR(
    `/database/${dbId}/indexes?${timeQuery}`,
    fetcher,
    { keepPreviousData: true }
  );

  const indexes: IndexEntry[] = useMemo(() => data?.indexes || [], [data?.indexes]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return indexes
      .filter((i) => {
        if (filter === 'issues' && i.flags.length === 0) return false;
        if (filter === 'unused' && !i.flags.includes('unused')) return false;
        if (!term) return true;
        return (
          i.name.toLowerCase().includes(term) ||
          i.namespace.toLowerCase().includes(term) ||
          i.definition.toLowerCase().includes(term)
        );
      })
      // Problems first, then by what they cost.
      .sort((a, b) => b.flags.length - a.flags.length || b.sizeBytes - a.sizeBytes);
  }, [indexes, filter, search]);

  const planBlocked = error?.response?.status === 403 && error?.response?.data?.requiredPlan;

  if (planBlocked) {
    return (
      <Placeholder icon={Sparkles} title="The index advisor is available on Pro and above">
        {error.response.data.message ||
          'Upgrade to see index usage, redundancy analysis, and index recommendations.'}
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
      <Placeholder icon={ShieldAlert} title="Could not load index data">
        {error?.response?.data?.error || 'The request failed. Try again in a moment.'}
      </Placeholder>
    );
  }

  const indexCap = capabilities?.indexStats;
  if (indexCap && !indexCap.available) {
    return (
      <Placeholder icon={Lock} title="Index statistics are not readable" tone="warning">
        {indexCap.reason}
        {indexCap.remediation && (
          <p className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3 text-left font-mono text-[11px] leading-relaxed text-foreground-secondary">
            {indexCap.remediation}
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

  if (!data?.collectedAt) {
    return (
      <Placeholder icon={Layers} title="No index census yet">
        Indexes are catalogued hourly. If this database was connected recently, the first census
        will appear within the hour.
      </Placeholder>
    );
  }

  const advisories: Advisory[] = data.advisories || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { title: 'Indexes', value: formatCount(data.totalIndexes), icon: Layers, tone: 'text-blue-500' },
          { title: 'Total size', value: formatBytes(data.totalSizeBytes), icon: HardDrive, tone: 'text-purple-500' },
          {
            title: 'Reclaimable',
            value: formatBytes(data.unusedSizeBytes),
            icon: Trash2,
            tone: data.unusedSizeBytes > 0 ? 'text-yellow-500' : 'text-muted-foreground',
          },
          {
            title: 'Recommendations',
            value: formatCount(advisories.length),
            icon: Lightbulb,
            tone: advisories.length > 0 ? 'text-emerald-500' : 'text-muted-foreground',
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" /> Recommendations
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Advisory only — nothing here is applied automatically
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <AdvisoryList advisories={advisories} />
        </CardContent>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex h-auto flex-col gap-3 space-y-0 border-b border-border/40 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indexes</CardTitle>
            <Tabs
              variant="segmented"
              label="Index filters"
              value={filter}
              onChange={setFilter}
              items={FILTERS}
            />
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search indexes..."
              aria-label="Search indexes"
              className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-orange-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="max-h-[560px] flex-1 overflow-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/30 text-xs font-medium uppercase text-muted-foreground backdrop-blur">
              <tr>
                <th className="whitespace-nowrap px-5 py-3">Index</th>
                <th className="whitespace-nowrap px-5 py-3 text-right">Size</th>
                <th className="whitespace-nowrap px-5 py-3 text-right">Scans</th>
                <th className="whitespace-nowrap px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visible.map((index) => (
                <tr key={`${index.namespace}|${index.name}`} className="transition-colors hover:bg-muted/30">
                  <td className="max-w-[420px] px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {index.namespace}
                      </span>
                      {index.primary && (
                        <Badge variant="outline" className="text-[10px]">Primary</Badge>
                      )}
                      {index.unique && !index.primary && (
                        <Badge variant="outline" className="text-[10px]">Unique</Badge>
                      )}
                      {index.partial && (
                        <Badge variant="outline" className="text-[10px]">Partial</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{index.name}</p>
                    <p className="truncate font-mono text-xs text-foreground-secondary">
                      {index.definition}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                    {formatBytes(index.sizeBytes)}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-3 text-right font-mono',
                      index.scans === 0 && !index.primary ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {formatCount(index.scans)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {index.flags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">In use</span>
                      ) : (
                        index.flags.map((flag) => {
                          const style = FLAG_STYLE[flag];
                          if (!style) return null;
                          return (
                            <Badge key={flag} variant="outline" className={cn('text-[10px]', style.className)}>
                              {style.label}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                    {index.redundantWith && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        covered by {index.redundantWith}
                      </p>
                    )}
                  </td>
                </tr>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {search || filter !== 'all'
                      ? 'No indexes match this filter.'
                      : 'No indexes catalogued.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Catalogued {new Date(data.collectedAt).toLocaleString()} · usage counted over{' '}
        {formatUptime(data.serverUptimeSeconds)} of server uptime
        {data.serverUptimeSeconds < 7 * 86400 && ' — too short to judge an index unused'}
      </p>
    </div>
  );
};
