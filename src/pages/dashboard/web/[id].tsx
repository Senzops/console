import React, { useState, useMemo, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError } from '../../../components/Core';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
import { formatAxisDate, getTimeSpanMs } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Globe, Users, Clock, ArrowUpRight, Trash2, AlertTriangle, X, RefreshCw, Search, Maximize, ChartNoAxesCombined, Pencil } from 'lucide-react';
import { useServiceModal } from '@/components/ServiceModals/context';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { WorldMap } from '@/components/WorldMap';
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

const webValueFormatter = (value: number) => formatNumber(value);

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

const DistributionTable = ({ data, total, type, filter }: { data: any[], total: number, type: 'pages' | 'geo' | 'sys', filter?: string }) => {
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
            <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Views</th>
          </tr>
        </thead>
        <tbody>
          {visibleData.map((item: any, i: number) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const name = type === 'geo' ? getCountryName(item._id) : item._id;

            return (
              <tr key={i} className="group relative border-b border-border/40 hover:bg-muted/20 transition-colors">
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

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
        {sub && <p className="text-xs text-muted-foreground mt-1"><SmartAnimatedValue value={sub} /></p>}
      </CardContent>
    </Card>
  )
};

export default function WebDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { openModal } = useServiceModal();

  const [pageFilter, setPageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [geoMode, setGeoMode] = useState<'map' | 'countries' | 'cities'>('map');
  const [sysMode, setSysMode] = useState<'browsers' | 'os' | 'devices'>('browsers');
  const [pagesMode, setPagesMode] = useState<'path' | 'title'>('path');
  const [sourceMode, setSourceMode] = useState<'referrers' | 'channels'>('referrers');

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/web/${id}/stats?${buildTimeRangeQuery(timeRange)}` : null,
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

  const formattedGraph: any[] = useMemo(() => {
    if (!data?.graph) return [];
    return data.graph.map((point: any) => ({
      ...point,
      time: formatAxisDate(point.time, spanMs),
    }));
  }, [data?.graph, spanMs]);

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

  if (!data && !error) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Website...</p></div></>;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
  if (!data?.meta) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load analytics.</div></div></>;

  const { meta, overview, liveVisitors, pages, sources, geo, system, traffic } = data;
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
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Views" value={formatNumber(overview.totalViews)} sub={`${formatNumber(overview.totalViews)} page loads`} icon={ChartNoAxesCombined} color="text-blue-500" isMono={isMono} />
          <StatCard title="Unique Visitors" value={formatNumber(overview.uniqueVisitors)} sub="Distinct users" icon={Users} color="text-purple-500" isMono={isMono} />
          <StatCard title="Avg. Duration" value={`${formatTime(overview.avgDuration)}`} sub="Time on site" icon={Clock} color="text-emerald-500" isMono={isMono} />
          <StatCard title="Bounce Rate" value={overview?.bounceRate >= 0 ? `${(overview.bounceRate).toFixed(1)}%` : `${overview.totalViews > 0 ? (100 - (overview.uniqueVisitors / overview.totalViews) * 100).toFixed(1) : 0}%`} sub="Estimated" icon={ArrowUpRight} color="text-yellow-500" isMono={isMono} />
        </div>

        {/* Traffic Graph */}
        <ChartCard title="Traffic Overview">
          <AreaChart data={formattedGraph}>
            <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip content={<ChartTooltip valueFormatter={webValueFormatter} />} />
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
            <DistributionTable data={pages[pagesMode]} total={overview.totalViews} type="pages" filter={pageFilter} />
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
            <DistributionTable data={sources[sourceMode]} total={overview.totalViews} type="pages" filter={sourceFilter} />
          </DistributionCard>
        </div>

        {/* SYSTEM & GEO Tables/Maps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Environment */}
          <DistributionCard
            title={"System Environment"}
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {['browsers', 'os', 'devices'].map((m) => (
                  <button key={m} onClick={() => setSysMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${sysMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                ))}
              </div>
            }
          >
            <DistributionTable data={system[sysMode]} total={overview.totalViews} type="sys" />
          </DistributionCard>

          {/* Geographic Distribution */}
          <DistributionCard
            title={"Geographic Distribution"}
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                <button onClick={() => setGeoMode('map')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Map</button>
                <button onClick={() => setGeoMode('countries')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'countries' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Countries</button>
                <button onClick={() => setGeoMode('cities')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'cities' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Cities</button>
              </div>
            }
          >
            {geoMode === 'map' ? (
              <div className="w-full h-full bg-card rounded-lg flex items-center justify-center p-4">
                <WorldMap data={geo.countries} />
              </div>
            ) : (
              <DistributionTable data={geo[geoMode]} total={overview.totalViews} type="geo" />
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
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Stop Tracking?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{meta.name}</strong> and all analytics data.</div></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>
    </>
  );
}