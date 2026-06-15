import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError, Input } from '../../../components/Core';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
import { formatAxisDate, getTimeSpanMs } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, Trash2, AlertTriangle, X, RefreshCw, Maximize, Search, Pencil, ShieldCheck, UserPlus, UserX, Flame } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { useServiceModal } from '@/components/ServiceModals/context';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const formatPercent = (part: number, total: number) => {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
};

// --- Custom Tooltip ---

// --- Reusable Chart Card ---
const ChartCard = ({ title, children, className = "h-[300px]" }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : className}`}>
       <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
             {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
       </CardHeader>
       <CardContent className="flex-1 min-h-0 relative px-4 pb-4 [&_.recharts-wrapper]:outline-none">
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

// --- Stat Card ---
const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
      {subtext && <div className="text-xs text-muted-foreground mt-1 font-medium truncate"><SmartAnimatedValue value={subtext} /></div>}
    </CardContent>
  </Card>
);

// --- DynamicChart ---
const DynamicChart = ({ title, className, data, type = 'area', series, tooltipSuffix, tooltipFormatter }: any) => {
  const { isMono } = useTheme();
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  const vf = tooltipFormatter
    ? (v: number) => (v === null ? 'No Data' : tooltipFormatter(v))
    : tooltipSuffix
      ? (v: number) => (v === null ? 'No Data' : `${Number(v).toFixed(0)}${tooltipSuffix}`)
      : undefined;

  return (
    <ChartCard title={title} className={className}>
       {type === 'area' ? (
           <AreaChart data={data}>
               <defs>
                 {series.filter((s:any) => s.style !== 'transparent' && s.style !== 'solid').map((s:any) => (
                     <linearGradient key={s.key} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getColor(s.color)} stopOpacity={s.opacity || 0.3} />
                        <stop offset="95%" stopColor={getColor(s.color)} stopOpacity={0} />
                     </linearGradient>
                 ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip valueFormatter={vf} />} />
              {series.map((s:any) => {
                 const style = s.style || 'gradient';
                 let fill = `url(#color-${s.key})`;
                 if (style === 'transparent') fill = 'transparent';
                 if (style === 'solid') fill = getColor(s.color);

                 return (
                     <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={getColor(s.color)}
                        fill={fill}
                        fillOpacity={style === 'solid' ? (s.opacity || 0.6) : 0.6}
                        name={s.name}
                        strokeWidth={2}
                        stackId={s.stackId}
                        strokeDasharray={s.dashed ? "4 4" : undefined}
                     />
                 )
              })}
           </AreaChart>
       ) : (
           <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<ChartTooltip valueFormatter={vf} />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
              {series.map((s:any) => (
                 <Bar
                    key={s.key}
                    dataKey={s.key}
                    fill={getColor(s.color)}
                    name={s.name}
                    stackId={s.stackId}
                    radius={s.radius}
                 />
              ))}
           </BarChart>
       )}
    </ChartCard>
  );
};

// --- Recent Users Table ---
const RecentUsersTable = ({ users }: { users: any[] }) => {
  const [search, setSearch] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  if (!users || users.length === 0) return null;

  const filtered = users.filter(u =>
    (u.email || u.uid || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );
  const displayed = isMaximized ? filtered : filtered.slice(0, 5);

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
       <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 space-y-0 shrink-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Signups (24h)</CardTitle>
          <div className="flex items-center gap-2">
             <div className="relative w-48">
               <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
               <Input
                 placeholder="Search..."
                 className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized(!isMaximized)}>
               {isMaximized ? <X className="h-4 w-4 text-muted-foreground" /> : <Maximize className="h-4 w-4 text-muted-foreground" />}
             </Button>
          </div>
       </CardHeader>
       <CardContent className="p-0 flex-1 overflow-auto">
          <div className="min-w-full inline-block align-middle">
             <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/30 uppercase font-medium sticky top-0 backdrop-blur z-10">
                   <tr>
                      <th className="px-5 py-3 whitespace-nowrap">User</th>
                      <th className="px-5 py-3 whitespace-nowrap">Providers</th>
                      <th className="px-5 py-3 text-center whitespace-nowrap">Verified</th>
                      <th className="px-5 py-3 text-center whitespace-nowrap">MFA</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Created</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                   {displayed.map((u, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors group">
                         <td className="px-5 py-3">
                           <div className="font-medium text-foreground truncate max-w-[200px]">{u.email || u.uid}</div>
                           {u.displayName && <div className="text-xs text-muted-foreground truncate">{u.displayName}</div>}
                         </td>
                         <td className="px-5 py-3">
                           <div className="flex gap-1 flex-wrap">
                             {u.providers?.map((p: string, j: number) => (
                               <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{p}</span>
                             ))}
                           </div>
                         </td>
                         <td className="px-5 py-3 text-center">
                           {u.emailVerified
                             ? <span className="text-emerald-500 text-xs font-medium">Yes</span>
                             : <span className="text-muted-foreground text-xs">No</span>}
                         </td>
                         <td className="px-5 py-3 text-center">
                           {u.mfaEnabled
                             ? <span className="text-emerald-500 text-xs font-medium">On</span>
                             : <span className="text-muted-foreground text-xs">Off</span>}
                         </td>
                         <td className="px-5 py-3 text-right font-mono text-muted-foreground text-xs">
                           {u.createdAt ? new Date(u.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                         </td>
                      </tr>
                   ))}
                   {!isMaximized && filtered.length > 5 && (
                      <tr
                         onClick={() => setIsMaximized(true)}
                         className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                         <td colSpan={5} className="px-5 py-3.5 text-center text-xs text-muted-foreground group-hover:text-foreground font-medium">
                            Show {filtered.length - 5} more...
                         </td>
                      </tr>
                   )}
                   {filtered.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No results match your search.</td></tr>
                   )}
                </tbody>
             </table>
          </div>
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

// --- Provider Distribution Card ---
const ProviderDistribution = ({ providers }: { providers: any }) => {
  if (!providers) return null;

  const items = [
    { name: 'Email/Password', count: providers.password || 0, color: 'bg-blue-500' },
    { name: 'Google', count: providers.google || 0, color: 'bg-red-500' },
    { name: 'Apple', count: providers.apple || 0, color: 'bg-foreground' },
    { name: 'Phone', count: providers.phone || 0, color: 'bg-emerald-500' },
    { name: 'GitHub', count: providers.github || 0, color: 'bg-purple-500' },
    { name: 'Microsoft', count: providers.microsoft || 0, color: 'bg-cyan-500' },
    { name: 'Facebook', count: providers.facebook || 0, color: 'bg-indigo-500' },
    { name: 'Twitter/X', count: providers.twitter || 0, color: 'bg-sky-500' },
    { name: 'Anonymous', count: providers.anonymous || 0, color: 'bg-muted-foreground' },
    { name: 'Other', count: providers.other || 0, color: 'bg-amber-500' },
  ].filter(p => p.count > 0).sort((a, b) => b.count - a.count);

  const total = items.reduce((sum, p) => sum + p.count, 0);

  return (
    <Card className="h-[300px] flex flex-col">
      <CardHeader className="pb-2 border-b border-border/40 mb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Auth Provider Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-3">
          {items.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{p.name}</span>
                <span className="text-muted-foreground font-mono">{formatNumber(p.count)} ({formatPercent(p.count, total)})</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.color} transition-all duration-500`}
                  style={{ width: `${Math.max((p.count / total) * 100, 1)}%` }}
                />
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">No provider data yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function FirebaseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();

  const { openModal } = useServiceModal();
  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/firebase/${id}/stats?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/firebase/${id}`); router.push('/dashboard'); }
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  const openEdit = () => {
    if (!data?.service) return;
    openModal('firebase', 'edit', {
      id: id as string,
      name: data.service.name,
      interval: String(data.service.interval),
      onSuccess: () => mutate(),
    });
  };

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((point: any) => ({
        ...point,
        time: formatAxisDate(point.time, spanMs),
        verificationRate: point.totalUsers ? ((point.emailVerifiedCount / point.totalUsers) * 100) : 0,
        mfaRate: point.totalUsers ? ((point.mfaEnrolledCount / point.totalUsers) * 100) : 0,
    }));
  }, [data?.history, spanMs]);

  if (!data && !error) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-amber-500" /><p className="text-muted-foreground">Connecting to Firebase...</p></div></>;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
  if (!data?.service) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load Firebase service.</div></div></>;

  const { service, latest, recentUsers } = data;

  const hasAnonymousData = (latest.auth?.anonymousUsers ?? 0) > 0;

  const gridCharts = [
    {
        title: "Daily Active Users", tooltipSuffix: " users",
        series: [{ key: 'activeUsersDaily', name: 'DAU', color: '#f59e0b', style: 'gradient' }]
    },
    {
        title: "Monthly Active Users", tooltipSuffix: " users",
        series: [{ key: 'activeUsersMonthly', name: 'MAU', color: '#8b5cf6', style: 'gradient' }]
    },
    {
        title: "New Signups (24h window)", tooltipSuffix: " signups",
        series: [{ key: 'newSignups24h', name: 'New Signups', color: '#10b981', style: 'gradient' }]
    },
    {
        title: "Recent Sign-ins (1h window)", tooltipSuffix: " sign-ins",
        series: [{ key: 'recentSignIns1h', name: 'Sign-ins', color: '#3b82f6', style: 'gradient' }]
    },
    {
        title: "Email Verification Rate (%)", tooltipSuffix: "%",
        series: [{ key: 'verificationRate', name: 'Verified', color: '#10b981', style: 'gradient' }]
    },
    {
        title: "MFA Enrollment Rate (%)", tooltipSuffix: "%",
        series: [{ key: 'mfaRate', name: 'MFA Enrolled', color: '#06b6d4', style: 'gradient' }]
    },
    {
        title: "Disabled Accounts", tooltipSuffix: " accounts",
        series: [{ key: 'disabledUsers', name: 'Disabled', color: '#ef4444', style: 'gradient' }]
    },
    ...(hasAnonymousData ? [{
        title: "Anonymous Users", tooltipSuffix: " users",
        series: [{ key: 'anonymousUsers', name: 'Anonymous', color: '#64748b', style: 'gradient' }]
    }] : [])
  ];

  const showProviders = latest.providers &&
    Object.values(latest.providers as Record<string, number>).some((v: number) => v > 0);
  const totalGridItems = gridCharts.length + (showProviders ? 1 : 0);
  const isOddGrid = totalGridItems % 2 !== 0;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* --- 1. Header & Controls --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
               <Badge variant="outline" className={`capitalize ${service.status === 'online' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-destructive border-destructive/20 bg-destructive/10'}`}>
                  {service.status}
               </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-3">
               <span>{service.projectId}</span>
               <span>•</span>
               <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Polling {service.interval}m</span>
               {latest.auth?.totalUsers > 0 && (
                 <>
                   <span>•</span>
                   <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {formatNumber(latest.auth.totalUsers)} Users</span>
                 </>
               )}
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

        {service.status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3 text-destructive animate-in fade-in">
             <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
             <div>
                <strong className="block mb-1 text-sm">Connection Failed during last poll</strong>
                <span className="text-xs font-mono">{service.errorMessage}</span>
             </div>
          </div>
        )}

        {/* --- 2. Top-level Stats Cards --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard
             title="Total Users"
             value={formatNumber(latest.auth?.totalUsers || 0)}
             subtext={`${formatNumber(latest.auth?.emailVerifiedCount || 0)} verified`}
             icon={Users}
             color="text-blue-500"
           />
           <StatCard
             title="New Signups (24h)"
             value={formatNumber(latest.auth?.newSignups24h || 0)}
             subtext="Last 24 hours"
             icon={UserPlus}
             color="text-emerald-500"
           />
           <StatCard
             title="MFA Enrolled"
             value={formatPercent(latest.auth?.mfaEnrolledCount || 0, latest.auth?.totalUsers || 0)}
             subtext={`${formatNumber(latest.auth?.mfaEnrolledCount || 0)} users`}
             icon={ShieldCheck}
             color="text-purple-500"
           />
           <StatCard
             title="Active (30d)"
             value={formatNumber(latest.auth?.activeUsersMonthly || 0)}
             subtext={`DAU: ${formatNumber(latest.auth?.activeUsersDaily || 0)}`}
             icon={Flame}
             color="text-orange-500"
           />
        </div>

        {/* --- 3. Full Width User Growth --- */}
        <DynamicChart
            title="Total Registered Users"
            className="h-[350px]"
            data={chartData}
            tooltipSuffix=" users"
            series={[
                { key: 'totalUsers', name: 'Total Users', color: '#3b82f6', style: 'gradient' }
            ]}
        />

        {/* --- 4. Provider Distribution + Charts Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {showProviders && <ProviderDistribution providers={latest.providers} />}
           {gridCharts.map((chart, i) => (
               <div key={i} className={i === gridCharts.length - 1 && isOddGrid ? 'md:col-span-2' : ''}>
                 <DynamicChart
                     title={chart.title}
                     data={chartData}
                     series={chart.series}
                     tooltipSuffix={chart.tooltipSuffix}
                 />
               </div>
           ))}
        </div>

        {/* --- 6. Recent Users Table --- */}
        <RecentUsersTable users={recentUsers} />
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Firebase Project?">
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
               <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
               <div className="text-sm">
                  <span className="font-bold block mb-1">Warning: Irreversible Action</span>
                  This will disconnect <strong>{service.name}</strong>, securely delete your credentials, and wipe all historical metrics.
               </div>
            </div>
            <div className="flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
               <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete Data
               </Button>
            </div>
        </div>
      </Dialog>

    </>
  );
}
