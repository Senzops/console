import React, { useState, useMemo, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useShareApi, useShareMode, useShareScopeId } from '../../../lib/share';
import { ShareButton } from '../../../components/ShareModal';
import { useTheme } from '../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError } from '../../../components/Core';
import { WebDashboardSkeleton } from '../../../components/Skeletons';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
import { formatAxisDate, getTimeSpanMs } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { Globe, Users, Clock, ArrowUpRight, Trash2, AlertTriangle, X, RefreshCw, Search, Maximize, ChartNoAxesCombined, Pencil, Zap, Megaphone, GitCompare, TrendingUp, TrendingDown, Flag } from 'lucide-react';
import { useServiceModal } from '@/components/ServiceModals/context';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { WorldMap } from '@/components/WorldMap';
import { WebFunnels } from '@/components/WebFunnels';
import { WebAnnotationsDialog } from '@/components/WebAnnotations';
import { WebJourneys } from '@/components/WebJourneys';
import { WebApiKeys } from '@/components/WebApiKeys';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};
const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m';
  const y = Math.floor(seconds / 31536000);
  const mo = Math.floor((seconds % 31536000) / 2628000);
  const d = Math.floor((seconds % 2628000) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor((seconds % 60));

  const parts: string[] = [];
  if (y > 0) parts.push(`${y}y`);
  if (mo > 0) parts.push(`${mo}mo`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
};

const getCountryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch { return code; }
};

const getLanguageName = (code: string) => {
  if (!code || code === 'Unknown') return code || 'Unknown';
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch { return code; }
};

const webValueFormatter = (value: number) => formatNumber(value);

// Segmentation filter dimensions → human labels (mirrors backend WEB_FILTER_FIELDS).
const FILTER_LABELS: Record<string, string> = {
  country: 'Country', region: 'Region', city: 'City',
  browser: 'Browser', os: 'OS', device: 'Device',
  channel: 'Channel', referrer: 'Referrer', path: 'Page',
  language: 'Language', screen: 'Screen',
  utm_source: 'Source', utm_medium: 'Medium', utm_campaign: 'Campaign',
};
// System-card mode → filter dimension.
const SYS_FILTER_DIM: Record<string, string> = { browsers: 'browser', os: 'os', devices: 'device', languages: 'language', screens: 'screen' };

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
        {actions}
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
        {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[350px]'}`}>
      {Header}
      <CardContent className="flex-1 min-h-0 pt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
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

const DistributionContext = createContext<{ isMaximized: boolean; toggle: () => void }>({
  isMaximized: false,
  toggle: () => { }
});

const DistributionCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const Header = (
    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
        {actions}
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
        {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>
    </CardHeader>
  );

  const Content = (
    <DistributionContext.Provider value={{ isMaximized, toggle }}>
      <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[400px]'}`}>
        {Header}
        <CardContent className="flex-1 min-h-0 relative px-0 pb-0">
          {/* Container for content ensuring it fills space */}
          <div className="w-full h-full relative">
            {children}
          </div>
        </CardContent>
      </Card>
    </DistributionContext.Provider>
  );

  return (
    <>
      {isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

const DistributionTable = ({ data, total, type, filter, valueLabel = 'Views', onRowClick, nameFormatter }: { data: any[], total: number, type: 'pages' | 'geo' | 'sys', filter?: string, valueLabel?: string, onRowClick?: (name: string) => void, nameFormatter?: (id: string) => string }) => {
  const { isMaximized, toggle } = useContext(DistributionContext);
  const filteredData = useMemo(() => {
    if (!filter) return data;
    return data.filter((item: any) => item._id.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);
  if (!data?.length) return null;

  const limit = isMaximized ? filteredData.length : 6;
  const visibleData = filteredData.slice(0, limit);
  const hiddenCount = filteredData.length - limit;

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-20">
          <tr>
            <th className="px-4 py-2 font-medium w-full">Name</th>
            <th className="px-4 py-2 text-right font-medium whitespace-nowrap">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {visibleData.map((item: any, i: number) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const name = nameFormatter ? nameFormatter(item._id) : (type === 'geo' ? getCountryName(item._id) : item._id);

            return (
              <tr key={i} onClick={onRowClick ? () => onRowClick(item._id) : undefined} className={`group relative border-b border-border/40 hover:bg-muted/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                {/* Background Bar */}
                <td colSpan={3} className="p-0 h-full absolute inset-0 pointer-events-none">
                  <div className="h-[calc(100%-2px)] my-[1px] bg-muted/40 transition-all duration-[1500ms] origin-left rounded-r-md" style={{ width: `${percent}%` }} />
                </td>

                {/* Content */}
                <td className={`px-4 py-2.5 relative z-10 truncate ${isMaximized ? "max-w-[75vw]" : "max-w-[300px]"} flex items-center`}>
                  <span className="truncate" title={name}>{name}</span>
                </td>
                <td className="px-4 py-2.5 relative z-10 text-right font-mono text-xs whitespace-nowrap">
                  <span className="font-mono text-xs"><SmartAnimatedValue value={formatNumber(item.count)} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 ml-1">|</span>
                  <span className="text-[10px] text-muted-foreground/70 ml-1"><SmartAnimatedValue value={percent} />%</span>
                </td>
              </tr>
            )
          })}

          {/* Show More Row */}
          {hiddenCount > 0 && (
            <tr
              className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={toggle}
            >
              <td colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Show {hiddenCount} more...
              </td>
            </tr>
          )}

          {filteredData.length === 0 && (
            <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">No data found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
};

// Period-over-period delta pill. `invert` flags metrics where a decrease is good
// (e.g. bounce rate), so colours reflect "better/worse", not just up/down.
const DeltaBadge = ({ delta, invert }: { delta: number | null | undefined; invert?: boolean }) => {
  if (delta === null || delta === undefined || !isFinite(delta)) return null;
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return <span className="text-[10px] text-muted-foreground">0%</span>;
  const isUp = rounded > 0;
  const good = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${good ? 'text-emerald-500' : 'text-red-500'}`}>
      <Icon className="h-3 w-3" />{Math.abs(rounded)}%
    </span>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono, delta, invert }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
          <DeltaBadge delta={delta} invert={invert} />
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1"><SmartAnimatedValue value={sub} /></p>}
      </CardContent>
    </Card>
  )
};

// Percent change vs a previous value; null when there's nothing to compare.
const pctChange = (cur: number, prev: number | undefined): number | null => {
  if (prev === undefined || prev === null) return null;
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
};

const sumCounts = (arr?: any[]) => (arr || []).reduce((s: number, x: any) => s + (x.count || 0), 0);

// Mini stat used inside the event drill-down dialog.
const EventStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border bg-muted/20 p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-xl font-bold text-foreground mt-1"><SmartAnimatedValue value={value} /></div>
  </div>
);

// Per-property value breakdown block (one event property → its top values).
const PropertyBlock = ({ prop }: { prop: { key: string; total: number; values: { value: string; count: number }[] } }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground font-mono">{prop.key}</span>
      <span className="text-[10px] text-muted-foreground/70">{formatNumber(prop.total)} total</span>
    </div>
    <div className="space-y-px rounded-lg overflow-hidden border border-border/40">
      {prop.values.map((v, i) => {
        const percent = prop.total > 0 ? Math.round((v.count / prop.total) * 100) : 0;
        return (
          <div key={i} className="group relative flex items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors">
            <div className="absolute inset-y-0 left-0 bg-muted/40 rounded-r-md transition-all duration-700" style={{ width: `${percent}%` }} />
            <span className="relative z-10 truncate text-sm max-w-[70%]" title={v.value || '(empty)'}>{v.value || <span className="text-muted-foreground italic">(empty)</span>}</span>
            <span className="relative z-10 font-mono text-xs whitespace-nowrap">
              {formatNumber(v.count)}
              <span className="text-[10px] text-muted-foreground/70 ml-1">| {percent}%</span>
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

// Drill-down dialog for a single custom event: summary + property breakdowns.
const EventDetailDialog = ({ webId, eventName, timeRange, fetcher, onClose }: { webId: string; eventName: string | null; timeRange: any; fetcher: (url: string) => Promise<any>; onClose: () => void }) => {
  const { data, error } = useSWR(
    eventName ? `/web/${webId}/events?event=${encodeURIComponent(eventName)}&${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  return (
    <Dialog open={!!eventName} onClose={onClose} title={eventName || 'Event'} className="max-w-2xl">
      {!data && !error && <div className="flex items-center justify-center py-12"><Spinner className="h-6 w-6" /></div>}
      {error && <div className="py-8"><DataError /></div>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <EventStat label="Total Events" value={formatNumber(data.summary?.total || 0)} />
            <EventStat label="Unique Visitors" value={formatNumber(data.summary?.uniqueVisitors || 0)} />
          </div>
          {data.properties?.length ? (
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-foreground">Properties</h4>
              {data.properties.map((p: any) => <PropertyBlock key={p.key} prop={p} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
              No properties were captured for this event.
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default function WebDetail() {
  const router = useRouter();
  const id = useShareScopeId(router.query.id as string | undefined);
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { openModal } = useServiceModal();

  const [pageFilter, setPageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [geoMode, setGeoMode] = useState<'map' | 'countries' | 'regions' | 'cities'>('map');
  const [sysMode, setSysMode] = useState<'browsers' | 'os' | 'devices' | 'languages' | 'screens'>('browsers');
  const [pagesMode, setPagesMode] = useState<'path' | 'title'>('path');
  const [sourceMode, setSourceMode] = useState<'referrers' | 'channels'>('referrers');
  const [campaignMode, setCampaignMode] = useState<'sources' | 'mediums' | 'campaigns'>('sources');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState(false);

  const addFilter = (dim: string, value: string) => { if (value) setFilters((p) => ({ ...p, [dim]: value })); };
  const removeFilter = (dim: string) => setFilters((p) => { const n = { ...p }; delete n[dim]; return n; });
  const clearFilters = () => setFilters({});
  const filterQs = Object.entries(filters).map(([k, v]) => `&f_${k}=${encodeURIComponent(v)}`).join('');
  const compareQs = compare ? '&compare=previous' : '';

  const { data, error, mutate, isValidating } = useSWR(
    (token || readOnly) && id ? `/web/${id}/stats?${buildTimeRangeQuery(timeRange)}${filterQs}${compareQs}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/web/${id}`); router.push('/dashboard');
    }
    catch (e) {
      console.error(e); setIsDeleting(false);
      toast.error(extractErrorMessage(e, 'Failed to delete website'));
    }
  }

  const openEdit = () => {
    openModal('web', 'edit', { id: id as string, name: data?.meta?.name || '', domain: data?.meta?.domain || '', onSuccess: () => mutate() });
  };

  const filteredPages = useMemo(() => {
    if (!data?.pages?.[pagesMode]) return [];
    return data.pages?.[pagesMode].filter((p: any) => p._id.toLowerCase().includes(pageFilter.toLowerCase()));
  }, [data?.pages, pageFilter, pagesMode]);

  const filteredReferrers = useMemo(() => {
    if (!data?.sources?.[sourceMode]) return [];
    return data.sources?.[sourceMode].filter((r: any) => r._id.toLowerCase().includes(sourceFilter.toLowerCase()));
  }, [data?.sources, sourceFilter, sourceMode]);

  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const { data: annotations, mutate: mutateAnnotations } = useSWR(
    (token || readOnly) && id ? `/web/${id}/annotations?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher
  );

  const formattedGraph: any[] = useMemo(() => {
    if (!data?.graph) return [];
    return data.graph.map((point: any) => ({
      ...point,
      time: formatAxisDate(point.time, spanMs),
    }));
  }, [data?.graph, spanMs]);

  // Map each annotation to the nearest graph bucket so it can be drawn as a
  // ReferenceLine on the categorical x-axis (bucket labels are exact category values).
  const annotationLines = useMemo(() => {
    if (!annotations?.length || !data?.graph?.length) return [];
    const buckets = data.graph.map((p: any, i: number) => ({ ts: Date.parse(p.time), label: formattedGraph[i]?.time }));
    const valid = buckets.filter((b: any) => isFinite(b.ts) && b.label !== undefined);
    if (!valid.length) return [];
    return annotations
      .map((a: any) => {
        const at = new Date(a.date).getTime();
        let best: any = null;
        let bestDist = Infinity;
        for (const b of valid) {
          const d = Math.abs(b.ts - at);
          if (d < bestDist) { bestDist = d; best = b; }
        }
        return best ? { id: a._id, x: best.label, text: a.text, color: a.color || '#f43f5e' } : null;
      })
      .filter(Boolean);
  }, [annotations, data?.graph, formattedGraph]);

  const localTrafficHours = useMemo(() => {
    if (!data?.traffic?.hours) return [];
    return data.traffic.hours.map((h: any) => {
      // Backend returns UTC hour (0-23) in h.name "0:00"
      const utcHour = parseInt(h.name.split(':')[0]);
      const date = new Date();
      date.setUTCHours(utcHour, 0, 0, 0);

      return {
        ...h,
        // Format to local string (e.g., "5 AM" or "17:00")
        name: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: "2-digit", hour12: true })
      };
    });
  }, [data?.traffic?.hours]);

  if (!data && !error) return <WebDashboardSkeleton />;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
  if (!data?.meta) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load analytics.</div></div></>;

  const { meta, overview, liveVisitors, pages, sources, geo, system, traffic, events = [], campaigns = { sources: [], mediums: [], campaigns: [] }, entryExit = { entry: [], exit: [] } } = data;
  const campaignData = campaigns[campaignMode] || [];
  const campaignTotal = sumCounts(campaignData);
  const hasCampaigns = sumCounts(campaigns.sources) + sumCounts(campaigns.mediums) + sumCounts(campaigns.campaigns) > 0;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
              {/* Live Visitor Badge */}
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/10 animate-pulse flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                {liveVisitors ? formatNumber(liveVisitors) : 0} Live Visitor{liveVisitors !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <Globe className="h-3 w-3" /> {meta.domain}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
            <Button
              variant={compare ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCompare((c) => !c)}
              title="Compare with previous period"
            >
              <GitCompare className="h-4 w-4 mr-1.5" /> Compare
            </Button>
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
            {!readOnly && <ShareButton scopeType="web" scopeId={id as string} dashboardName={data?.meta?.name} />}
            {!readOnly && (
              <Button variant="outline" size="icon" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!readOnly && (
              <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active segmentation filters */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtered by</span>
            {Object.entries(filters).map(([dim, val]) => (
              <button
                key={dim}
                onClick={() => removeFilter(dim)}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted/70 transition-colors"
                title="Remove filter"
              >
                <span className="text-muted-foreground">{FILTER_LABELS[dim] || dim}:</span>
                <span className="font-medium text-foreground max-w-[180px] truncate">{val}</span>
                <X className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            ))}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Clear all</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Views" value={formatNumber(overview.totalViews)} sub={`${formatNumber(overview.totalViews)} page loads`} icon={ChartNoAxesCombined} color="text-blue-500" isMono={isMono} delta={pctChange(overview.totalViews, data.comparison?.previous?.totalViews)} />
          <StatCard title="Unique Visitors" value={formatNumber(overview.uniqueVisitors)} sub="Distinct users" icon={Users} color="text-purple-500" isMono={isMono} delta={pctChange(overview.uniqueVisitors, data.comparison?.previous?.uniqueVisitors)} />
          <StatCard title="Avg. Duration" value={`${formatTime(overview.avgDuration)}`} sub="Time on site" icon={Clock} color="text-emerald-500" isMono={isMono} delta={pctChange(overview.avgDuration, data.comparison?.previous?.avgDuration)} />
          <StatCard title="Bounce Rate" value={overview?.bounceRate >= 0 ? `${(overview.bounceRate).toFixed(1)}%` : `${overview.totalViews > 0 ? (100 - (overview.uniqueVisitors / overview.totalViews) * 100).toFixed(1) : 0}%`} sub="Estimated" icon={ArrowUpRight} color="text-yellow-500" isMono={isMono} delta={pctChange(overview.bounceRate, data.comparison?.previous?.bounceRate)} invert />
        </div>

        {/* Traffic Graph */}
        <ChartCard
          title="Traffic Overview"
          actions={
            <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground" onClick={() => setAnnotationsOpen(true)}>
              <Flag className="h-3.5 w-3.5 mr-1" /> {annotations?.length ? annotations.length : ''} Annotations
            </Button>
          }
        >
          <AreaChart data={formattedGraph}>
            <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip content={<ChartTooltip valueFormatter={webValueFormatter} />} />
            {annotationLines.map((l: any) => (
              <ReferenceLine
                key={l.id}
                x={l.x}
                stroke={l.color}
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: l.text.length > 18 ? l.text.slice(0, 18) + '…' : l.text, position: 'insideTopRight', fontSize: 9, fill: l.color }}
              />
            ))}
            <Area type="monotone" dataKey="views" stroke={getColor("#3b82f6")} fill={"url(#colorViews)"} strokeWidth={2} name="Page Views" />
            <Area type="monotone" dataKey="visitors" stroke={getColor("#8b5cf6")} fill="none" strokeWidth={2} strokeDasharray="5 5" name="Visitors" />
          </AreaChart>
        </ChartCard>


        {/* Detailed Tables (Pages & Sources) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DistributionCard
            title="Top Pages"
            actions={
              <>
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                  {['path', 'title'].map((m) => (
                    <button key={m} onClick={() => setPagesMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${pagesMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                  ))}
                </div>
                <div className="relative w-32">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Filter..." value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} />
                </div>
              </>
            }
          >
            <DistributionTable data={pages[pagesMode]} total={overview.totalViews} type="pages" filter={pageFilter} onRowClick={pagesMode === 'path' ? (v) => addFilter('path', v) : undefined} />
          </DistributionCard>

          <DistributionCard
            title="Top Sources"
            actions={
              <>
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                  {['referrers', 'channels'].map((m) => (
                    <button key={m} onClick={() => setSourceMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${sourceMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                  ))}
                </div>
                <div className="relative w-32">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Filter..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
                </div>
              </>
            }
          >
            <DistributionTable data={sources[sourceMode]} total={overview.totalViews} type="pages" filter={sourceFilter} onRowClick={(v) => addFilter(sourceMode === 'referrers' ? 'referrer' : 'channel', v)} />
          </DistributionCard>
        </div>

        {/* Custom Events & Campaigns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DistributionCard
            title="Custom Events"
            actions={
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                {formatNumber(overview.totalEvents || 0)} total
              </Badge>
            }
          >
            {events.length > 0 ? (
              <DistributionTable data={events} total={overview.totalEvents || sumCounts(events)} type="pages" valueLabel="Events" onRowClick={setSelectedEvent} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Zap className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No custom events yet</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">Send events with <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Senzor.track(name, props)</code> to see them here.</p>
              </div>
            )}
          </DistributionCard>

          <DistributionCard
            title="Campaigns"
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {['sources', 'mediums', 'campaigns'].map((m) => (
                  <button key={m} onClick={() => setCampaignMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${campaignMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                ))}
              </div>
            }
          >
            {hasCampaigns ? (
              <DistributionTable data={campaignData} total={campaignTotal} type="pages" valueLabel="Visits" onRowClick={(v) => addFilter(campaignMode === 'sources' ? 'utm_source' : campaignMode === 'mediums' ? 'utm_medium' : 'utm_campaign', v)} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Megaphone className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No campaign traffic</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">Tag inbound links with <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">utm_source</code>, <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">utm_medium</code> &amp; <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">utm_campaign</code>.</p>
              </div>
            )}
          </DistributionCard>
        </div>

        {/* SYSTEM & GEO Tables/Maps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Environment */}
          <DistributionCard
            title={"System Environment"}
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {[['browsers', 'Browser'], ['os', 'OS'], ['devices', 'Device'], ['languages', 'Lang'], ['screens', 'Screen']].map(([m, label]) => (
                  <button key={m} onClick={() => setSysMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${sysMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
                ))}
              </div>
            }
          >
            <DistributionTable data={system[sysMode]} total={overview.totalViews} type="sys" nameFormatter={sysMode === 'languages' ? getLanguageName : undefined} onRowClick={(v) => addFilter(SYS_FILTER_DIM[sysMode], v)} />
          </DistributionCard>

          {/* Geographic Distribution */}
          <DistributionCard
            title={"Geographic Distribution"}
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                <button onClick={() => setGeoMode('map')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Map</button>
                <button onClick={() => setGeoMode('countries')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'countries' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Countries</button>
                <button onClick={() => setGeoMode('regions')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'regions' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Regions</button>
                <button onClick={() => setGeoMode('cities')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'cities' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Cities</button>
              </div>
            }
          >
            {geoMode === 'map' ? (
              <div className="w-full h-full bg-card rounded-lg flex items-center justify-center p-4">
                <WorldMap data={geo.countries} />
              </div>
            ) : (
              <DistributionTable data={geo[geoMode]} total={overview.totalViews} type="geo" nameFormatter={geoMode === 'countries' ? getCountryName : (x: string) => x} onRowClick={(v) => addFilter(geoMode === 'countries' ? 'country' : geoMode === 'regions' ? 'region' : 'city', v)} />
            )}
          </DistributionCard>
        </div>

        {/* Entry & Exit Pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DistributionCard title="Entry Pages">
            {entryExit.entry?.length > 0 ? (
              <DistributionTable data={entryExit.entry} total={sumCounts(entryExit.entry)} type="pages" valueLabel="Sessions" />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">No session data yet</div>
            )}
          </DistributionCard>
          <DistributionCard title="Exit Pages">
            {entryExit.exit?.length > 0 ? (
              <DistributionTable data={entryExit.exit} total={sumCounts(entryExit.exit)} type="pages" valueLabel="Sessions" />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">No session data yet</div>
            )}
          </DistributionCard>
        </div>

        {/* Traffic Patterns (Split Charts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Traffic by Day of Week">
            <BarChart data={traffic.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#666" />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip valueFormatter={webValueFormatter} />} />
              <Bar dataKey="count" fill={getColor("#f59e0b")} radius={[4, 4, 0, 0]} name="Hits" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Traffic by Hour of Day">
            <BarChart data={localTrafficHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#666" interval={3} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip valueFormatter={webValueFormatter} />} />
              <Bar dataKey="count" fill={getColor("#8b5cf6")} radius={[2, 2, 0, 0]} name="Hits" />
            </BarChart>
          </ChartCard>
        </div>

        {/* Retention & Journeys */}
        <WebJourneys webId={id as string} timeRange={timeRange} />

        {/* Funnels & Conversions */}
        <WebFunnels webId={id as string} timeRange={timeRange} />

        {/* Query API */}
        {!readOnly && <WebApiKeys webId={id as string} />}
      </div>

      <EventDetailDialog
        webId={id as string}
        eventName={selectedEvent}
        timeRange={timeRange}
        fetcher={fetcher}
        onClose={() => setSelectedEvent(null)}
      />

      <WebAnnotationsDialog
        open={annotationsOpen}
        onClose={() => setAnnotationsOpen(false)}
        webId={id as string}
        annotations={annotations || []}
        onChanged={() => mutateAnnotations()}
        readOnly={readOnly}
      />

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Stop Tracking?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{meta.name}</strong> and all analytics data.</div></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>
    </>
  );
}