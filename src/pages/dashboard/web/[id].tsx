import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../../components/ui/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Globe, Users, Clock, ArrowUpRight, Trash2, AlertTriangle, Maximize2, X, MousePointer, RefreshCw, Search, Smartphone, MapPin, Calendar, Sun, Maximize, ChartNoAxesCombined } from 'lucide-react';
import { createPortal } from 'react-dom';

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

  const parts = [];
  if (y > 0) parts.push(`${y}y`);
  if (mo > 0) parts.push(`${mo}mo`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.fill || entry.color || entry.stroke }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color || entry.stroke }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{formatNumber(entry.value)}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
        {actions}
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMaximized(!isMaximized)}>
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

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
};

export default function WebDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [range, setRange] = useState('24h');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pageFilter, setPageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [geoMode, setGeoMode] = useState<'countries' | 'cities'>('countries');
  const [sysMode, setSysMode] = useState<'browsers' | 'os' | 'devices'>('browsers');

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/web/${id}/stats?range=${range}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/web/${id}`); router.push('/dashboard'); }
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  const filteredPages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.filter((p: any) => p._id.toLowerCase().includes(pageFilter.toLowerCase()));
  }, [data?.pages, pageFilter]);

  const filteredReferrers = useMemo(() => {
    if (!data?.referrers) return [];
    return data.referrers.filter((r: any) => r._id.toLowerCase().includes(sourceFilter.toLowerCase()));
  }, [data?.referrers, sourceFilter]);

  const formattedGraph: any[] = useMemo(() => {
    if (!data?.graph) return [];
    return data.graph.map((point: any) => ({
      ...point,
      time: new Date(point.time).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: range === '24h' ? '2-digit' : undefined
      })
    }));
  }, [data?.graph, range]);

  if (!data && !error) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Website...</p></div></DashboardLayout>;
  if (error || !data?.meta) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load analytics.</div></div></DashboardLayout>;

  const { meta, overview, liveVisitors, geo, system, traffic } = data;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <DashboardLayout>
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
            <Select className="w-32 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
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
          <StatCard title="Bounce Rate" value={`${overview.totalViews > 0 ? (100 - (overview.uniqueVisitors / overview.totalViews) * 100).toFixed(1) : 0}%`} sub="Estimated" icon={ArrowUpRight} color="text-yellow-500" isMono={isMono} />
        </div>

        {/* Traffic Graph */}
        <ChartCard title="Traffic Overview">
          <AreaChart data={formattedGraph}>
            <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: "var(--radius)" }} />
            <Area type="monotone" dataKey="views" stroke={getColor("#3b82f6")} fill={"url(#colorViews)"} strokeWidth={2} name="Page Views" />
            <Area type="monotone" dataKey="visitors" stroke={getColor("#8b5cf6")} fill="none" strokeWidth={2} strokeDasharray="5 5" name="Visitors" />
          </AreaChart>
        </ChartCard>

        {/* System & Geo Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="System Environment"
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {['browsers', 'os', 'devices'].map((m) => (
                  <button key={m} onClick={() => setSysMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${sysMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                ))}
              </div>
            }
          >
            <BarChart data={system[sysMode]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} stroke="#666" />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="count" fill={getColor("#ec4899")} radius={[4, 4, 0, 0]} name="Views" />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Geographic Distribution"
            actions={
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                {['countries', 'cities'].map((m) => (
                  <button key={m} onClick={() => setGeoMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>
                ))}
              </div>
            }
          >
            <BarChart data={geo[geoMode]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="_id" type="category" width={90} tick={{ fontSize: 10 }} stroke="#666" />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="count" fill={getColor("#10b981")} radius={[0, 4, 4, 0]} name="Views" barSize={20} />
            </BarChart>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col h-[420px]">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/40">
              <CardTitle className="text-sm font-medium">Top Pages</CardTitle>
              <div className="relative w-32"><Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Filter..." value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} /></div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10"><tr><th className="px-4 py-2 font-medium">Path</th><th className="px-4 py-2 text-right font-medium">Views</th></tr></thead>
                <tbody>
                  {filteredPages.map((p: any, i: number) => {
                    const percent = overview.totalViews > 0 ? Math.round((p.count / overview.totalViews) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-2 truncate max-w-[200px] font-mono text-xs" title={p._id}>{p._id}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono text-xs">{formatNumber(p.count)}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({percent}%)</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[420px]">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/40">
              <CardTitle className="text-sm font-medium">Top Sources</CardTitle>
              <div className="relative w-32"><Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Filter..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} /></div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10"><tr><th className="px-4 py-2 font-medium">Referrer</th><th className="px-4 py-2 text-right font-medium">Views</th></tr></thead>
                <tbody>
                  {filteredReferrers.map((r: any, i: number) => {
                    const percent = overview.totalViews > 0 ? Math.round((r.count / overview.totalViews) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-2 truncate max-w-[200px] font-mono text-xs" title={r._id}>{r._id.replace('https://', '').replace('http://', '')}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono text-xs">{formatNumber(r.count)}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({percent}%)</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Traffic Patterns (Split Charts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Traffic by Day of Week (UTC)">
            <BarChart data={traffic.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#666" />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="count" fill={getColor("#f59e0b")} radius={[4, 4, 0, 0]} name="Hits" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Traffic by Hour of Day (UTC)">
            <BarChart data={traffic.hours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#666" interval={3} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
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
    </DashboardLayout>
  );
}