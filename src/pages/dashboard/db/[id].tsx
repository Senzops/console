import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError, Input } from '../../../components/Core';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, Activity, Clock, Trash2, AlertTriangle, Maximize2, X, RefreshCw, HardDrive, Zap, Lock, ScanLine, Network, Maximize, Search, Pencil, Gauge } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { useServiceModal } from '@/components/ServiceModals/context';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Dynamic Formatters ---
const formatSize = (value: number, isBytes = false) => {
  if (value == null) return '0 MB';
  let mb = isBytes ? value / (1024 * 1024) : value;
  if (mb >= 1048576) return `${(mb / 1048576).toFixed(2)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
};

const formatUptime = (seconds: number) => {
  if (!seconds) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (d >= 365) return `${(d/365).toFixed(1)} years`;
  if (d >= 30) return `${(d/30).toFixed(1)} months`;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// --- Custom Tooltip (Standard UI) ---
const CustomTooltip = ({ active, payload, label, suffix = '', formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-1" style={{ color: entry.color || entry.stroke || entry.fill }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">
               {entry.value === null ? 'No Data' : (formatter ? formatter(entry.value) : `${Number(entry.value).toFixed(2)}${suffix}`)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Reusable Chart Card (Standard UI) ---
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

// --- Reusable Stat Card (Standard UI, like Nginx/Server) ---
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

// --- DRY Principle: Dynamic Chart Wrapper ---
const DynamicChart = ({ title, className, data, type = 'area', series, tooltipSuffix, tooltipFormatter }: any) => {
  const { isMono } = useTheme();
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

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
              <Tooltip content={<CustomTooltip suffix={tooltipSuffix} formatter={tooltipFormatter} />} />
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
              <Tooltip content={<CustomTooltip suffix={tooltipSuffix} formatter={tooltipFormatter} />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
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

// --- Collections Table ---
const CollectionsTable = ({ collections, type }: { collections: any[], type: string }) => {
  const [search, setSearch] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  if (!collections || collections.length === 0) return null;

  const filtered = collections.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const displayed = isMaximized ? filtered : filtered.slice(0, 5);
  
  const isSQLType = type === 'postgresql' || type === 'mysql';
  const titleText = type === 'redis' ? 'Top Keyspaces' : isSQLType ? 'Top Tables' : 'Top Collections';
  const nameLabel = type === 'redis' ? 'Database' : isSQLType ? 'Table Name' : 'Collection Name';
  const countLabel = type === 'redis' ? 'Total Keys' : isSQLType ? 'Row Estimate' : 'Documents';
  const indexLabel = type === 'redis' ? 'Expiring Keys' : 'Index Size';

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
       <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 space-y-0 shrink-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{titleText}</CardTitle>
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
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? <X className="h-4 w-4 text-muted-foreground" /> : <Maximize className="h-4 w-4 text-muted-foreground" />}</Button>
          </div>
       </CardHeader>
       <CardContent className="p-0 flex-1 overflow-auto">
          <div className="min-w-full inline-block align-middle">
             <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/30 uppercase font-medium sticky top-0 backdrop-blur z-10">
                   <tr>
                      <th className="px-5 py-3 whitespace-nowrap">{nameLabel}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">{countLabel}</th>
                      {(type === 'mongodb' || isSQLType) && <th className="px-5 py-3 text-right whitespace-nowrap">Data Size</th>}
                      {(type === 'mongodb' || isSQLType) && <th className="px-5 py-3 text-right whitespace-nowrap">Storage Size</th>}
                      <th className="px-5 py-3 text-right whitespace-nowrap">{indexLabel}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                   {displayed.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors group">
                         <td className="px-5 py-3 font-medium text-foreground break-all max-w-[200px]">{c.name}</td>
                         <td className="px-5 py-3 text-right font-mono text-muted-foreground"><SmartAnimatedValue value={Number(c.count).toLocaleString('en-US')}/></td>
                         {(type === 'mongodb' || isSQLType) && <td className="px-5 py-3 text-right font-mono text-muted-foreground"><SmartAnimatedValue value={formatSize(c.size)}/></td>}
                         {(type === 'mongodb' || isSQLType) && <td className="px-5 py-3 text-right font-mono text-muted-foreground"><SmartAnimatedValue value={formatSize(c.storageSize)}/></td>}
                         <td className="px-5 py-3 text-right font-mono text-muted-foreground"><SmartAnimatedValue value={type === 'redis' ? Number(c.indexSize).toLocaleString('en-US') : formatSize(c.indexSize)}/></td>
                      </tr>
                   ))}
                   {!isMaximized && filtered.length > 5 && (
                      <tr 
                         onClick={() => setIsMaximized(true)}
                         className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                         <td colSpan={type==='redis'?3:5} className="px-5 py-3.5 text-center text-xs text-muted-foreground group-hover:text-foreground font-medium">
                            Show {filtered.length - 5} more...
                         </td>
                      </tr>
                   )}
                   {filtered.length === 0 && (
                      <tr><td colSpan={type==='redis'?3:5} className="px-5 py-8 text-center text-muted-foreground text-sm">No results match your search.</td></tr>
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
}

export default function DatabaseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();
  
  const { openModal } = useServiceModal();
  const [timeRange, setTimeRange] = usePersistedTimeRange(7);
  const displayRange = timeRange.type === 'relative' ? timeRange.range : '24h';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/database/${id}/stats?${buildTimeRangeQuery(timeRange)}` : null, 
    fetcher,
    { refreshInterval: 60000 } 
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/database/${id}`); router.push('/dashboard'); }
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  const openEdit = () => {
    if (!data?.database) return;
    openModal('database', 'edit', {
      id: id as string,
      name: data.database.name,
      dbType: data.database.type,
      interval: String(data.database.interval),
      onSuccess: () => mutate(),
    });
  };

  // --- Format Chart Data ---
  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((point: any) => ({
        ...point,
        time: new Date(point.time).toLocaleTimeString([], {
          month: (displayRange === '30m' || displayRange === '1h') ? undefined : 'short',
          day: (displayRange === '30m' || displayRange === '1h') ? undefined : 'numeric',
          hour: 'numeric',
          minute: displayRange !== '7d' ? '2-digit' : undefined,
        }),
        // Convert network from Bytes/s to KB/s for chart
        netInKB: point.netIn ? point.netIn / 1024 : 0,
        netOutKB: point.netOut ? point.netOut / 1024 : 0
    }));
  }, [data?.history]);

  if (!data && !error) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Database...</p></div></>;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
    if (!data?.database) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load database.</div></div></>;

  const { database, latest, history, collections } = data;
  const isRedis = database.type === 'redis';
  const isSQL = database.type === 'postgresql' || database.type === 'mysql';
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  // --- Configuration Driven Chart Definitions ---
  const gridCharts = isRedis ? [
    {
        title: "Ping Latency (ms)", tooltipSuffix: " ms",
        series: [{ key: 'latencyPing', name: 'Ping Time', color: '#8b5cf6', style: 'gradient' }]
    },
    {
        title: "Memory Allocation (MB)", formatter: (val: number) => formatSize(val),
        series: [
            { key: 'redisMemPeak', name: 'Peak History', color: '#64748b', style: 'gradient', dashed: true },
            { key: 'memResident', name: 'RSS (OS Memory)', color: '#ec4899', style: 'gradient' },
            { key: 'memVirtual', name: 'Used Memory', color: '#06b6d4', style: 'gradient' }
        ]
    },
    {
        title: "Keyspace Hits & Misses (ops/sec)", tooltipSuffix: " ops",
        series: [
            { key: 'redisMisses', name: 'Misses', color: '#ef4444', style: 'gradient', stackId: 1 },
            { key: 'redisHits', name: 'Hits', color: '#10b981', style: 'gradient', stackId: 1 }
        ]
    },
    {
        title: "Evictions & Expirations (ops/sec)", tooltipSuffix: " ops",
        series: [
            { key: 'redisEvicted', name: 'Evicted (OOM)', color: '#f59e0b', style: 'gradient' },
            { key: 'redisExpired', name: 'Expired (TTL)', color: '#8b5cf6', style: 'gradient' }
        ]
    },
    {
        title: "Memory Fragmentation Ratio", tooltipSuffix: "",
        series: [{ key: 'redisFragRatio', name: 'Fragmentation', color: '#f59e0b', style: 'gradient' }]
    },
    {
        title: "Blocked Clients", tooltipSuffix: "",
        series: [{ key: 'redisBlockedClients', name: 'Blocked', color: '#ef4444', style: 'gradient' }]
    }
  ] : isSQL ? [
    {
        title: "Query Latency (ms)", tooltipSuffix: " ms",
        series: [{ key: 'latencyPing', name: 'Ping Latency', color: '#8b5cf6', style: 'gradient' }]
    },
    {
        title: "Buffer Cache Hit Rate (%)", tooltipSuffix: "%",
        series: [{ key: 'sqlCacheHitRate', name: 'Cache Hit Rate', color: '#10b981', style: 'gradient' }]
    },
    {
        title: "Memory / Buffer Pool (MB)", formatter: (val: number) => formatSize(val),
        series: [
            { key: 'memVirtual', name: 'Buffer Pool Total', color: '#64748b', style: 'gradient', dashed: true },
            { key: 'memResident', name: 'Buffer Pool Used', color: '#ec4899', style: 'gradient' }
        ]
    },
    {
        title: "Storage Size (MB)", formatter: (val: number) => formatSize(val),
        series: [
            { key: 'storageData', name: 'Data Size', color: '#14b8a6', style: 'gradient' },
            { key: 'storageIndex', name: 'Index Size', color: '#6366f1', style: 'gradient' }
        ]
    },
    {
        title: "Transaction Rate (tx/sec)", tooltipSuffix: " tx/s",
        series: [
            { key: 'sqlTxRolledBack', name: 'Rolled Back', color: '#ef4444', style: 'gradient', stackId: 1 },
            { key: 'sqlTxCommitted', name: 'Committed', color: '#10b981', style: 'gradient', stackId: 1 }
        ]
    },
    {
        title: "Row Operations (rows/sec)", tooltipSuffix: " rows/s",
        series: [
            { key: 'sqlRowsReturned', name: 'Rows Returned', color: '#3b82f6', style: 'gradient' },
            { key: 'sqlRowsModified', name: 'Rows Modified', color: '#f59e0b', style: 'gradient' }
        ]
    },
    {
        title: "Scan Efficiency (scans/sec)", tooltipSuffix: " scans/s",
        series: [
            { key: 'sqlTableScans', name: 'Seq / Full Table Scans', color: '#ef4444', style: 'gradient' },
            { key: 'sqlIndexScans', name: 'Index Scans', color: '#10b981', style: 'gradient' }
        ]
    },
    {
        title: "Locks & Contention", type: 'bar',
        series: [
            { key: 'locksAR', name: 'Granted Locks', color: '#3b82f6', stackId: 'a', radius: [0, 0, 4, 4] },
            { key: 'locksQW', name: 'Waiting Locks', color: '#f59e0b', stackId: 'a', radius: [4, 4, 0, 0] }
        ]
    },
    {
        title: "Deadlocks & Blocked Queries", tooltipSuffix: "",
        series: [
            { key: 'sqlDeadlocks', name: 'Deadlocks', color: '#ef4444', style: 'gradient' },
            { key: 'sqlBlockedQueries', name: 'Blocked Queries', color: '#f59e0b', style: 'gradient' }
        ]
    },
    {
        title: "Active & Slow Queries", tooltipSuffix: "",
        series: [
            { key: 'sqlActiveQueries', name: 'Active Queries', color: '#8b5cf6', style: 'gradient' },
            { key: 'sqlSlowQueries', name: 'Slow Queries (>1s)', color: '#ef4444', style: 'gradient' }
        ]
    },
    // Only show replication lag chart when the instance is a replica (lag >= 0)
    ...((latest.sql?.replicationLagMs ?? -1) >= 0 ? [{
        title: "Replication Lag (ms)", tooltipSuffix: " ms",
        series: [{ key: 'sqlReplicationLag', name: 'Replica Lag', color: '#f59e0b', style: 'gradient' }]
    }] : [])
  ] : [
    {
        title: "Read Latency (ms)", tooltipSuffix: " ms",
        series: [
            { key: 'latencyReadMax', name: 'Max Read', color: '#c4b5fd', style: 'gradient', dashed: true },
            { key: 'latencyReadAvg', name: 'Avg Read', color: '#8b5cf6', style: 'gradient' }
        ]
    },
    {
        title: "Write Latency (ms)", tooltipSuffix: " ms",
        series: [
            { key: 'latencyWriteMax', name: 'Max Write', color: '#fcd34d', style: 'gradient', dashed: true },
            { key: 'latencyWriteAvg', name: 'Avg Write', color: '#f59e0b', style: 'gradient' }
        ]
    },
    {
        title: "Memory Allocation (MB)", formatter: (val: number) => formatSize(val),
        series: [
            { key: 'memVirtual', name: 'Virtual', color: '#64748b', style: 'gradient' },
            { key: 'memMapped', name: 'Mapped', color: '#06b6d4', style: 'gradient' },
            { key: 'memResident', name: 'Resident (RSS)', color: '#ec4899', style: 'gradient' }
        ]
    },
    {
        title: "Storage Size (MB)", formatter: (val: number) => formatSize(val),
        series: [
            { key: 'storageData', name: 'Data Size', color: '#14b8a6', style: 'gradient' },
            { key: 'storageIndex', name: 'Index Size', color: '#6366f1', style: 'gradient' }
        ]
    },
    {
        title: "Database Scans", tooltipSuffix: " scans/sec",
        series: [
            { key: 'scansCollection', name: 'Collection Scans', color: '#ef4444', style: 'gradient' },
            { key: 'scansIndex', name: 'Index Scans', color: '#10b981', style: 'gradient' }
        ]
    },
    {
        title: "Global Locks", type: 'bar',
        series: [
            { key: 'locksAR', name: 'Active Readers', color: '#3b82f6', stackId: 'a', radius: [0, 0, 4, 4] },
            { key: 'locksQR', name: 'Queued Readers', color: '#93c5fd', stackId: 'a', radius: [4, 4, 0, 0] },
            { key: 'locksAW', name: 'Active Writers', color: '#f59e0b', stackId: 'b', radius: [0, 0, 4, 4] },
            { key: 'locksQW', name: 'Queued Writers', color: '#fcd34d', stackId: 'b', radius: [4, 4, 0, 0] }
        ]
    }
  ];

  // Append Common Shared Charts
  gridCharts.push(
      {
          title: "Connections Over Time", tooltipSuffix: "",
          series: [{ key: 'connections', name: 'Active Connections', color: '#3b82f6', style: 'gradient' }]
      },
      {
          title: "Network Traffic (KB/s)", tooltipSuffix: " KB/s",
          series: [
              { key: 'netOutKB', name: 'Bytes Out', color: '#10b981', style: 'gradient' },
              { key: 'netInKB', name: 'Bytes In', color: '#3b82f6', style: 'gradient' }
          ]
      },
      {
          title: "Network Requests (Req/s)", tooltipSuffix: " req/s",
          series: [
              { key: 'netRequests', name: 'Requests', color: '#8b5cf6', style: 'gradient' }
          ]
      }
  );

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* --- 1. Header & Controls --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-2xl font-bold tracking-tight">{database.name}</h1>
               <Badge variant="outline" className={`capitalize ${database.status === 'online' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-destructive border-destructive/20 bg-destructive/10'}`}>
                  {database.status}
               </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-3">
               <span className="capitalize">{database.type}{database.version ? ` ${database.version}` : ''}</span>
               <span>•</span>
               <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Polling {database.interval}m</span>
               {!isRedis && latest.storage?.dataSize > 0 && (
                 <>
                   <span>•</span>
                   <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {formatSize(latest.storage?.dataSize)} Data</span>
                 </>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={7} />
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

        {database.status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3 text-destructive animate-in fade-in">
             <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
             <div>
                <strong className="block mb-1 text-sm">Connection Failed during last poll</strong>
                <span className="text-xs font-mono">{database.errorMessage}</span>
             </div>
          </div>
        )}

        {/* --- 2. Top-level Stats Cards --- */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard 
             title="Active Connections" 
             value={latest.connections?.current || 0} 
             subtext={`Available: ${latest.connections?.available || 0}`}
             icon={Activity} 
             color="text-blue-500" 
           />
           <StatCard
             title={isRedis ? "Operations/sec" : "Total Ops/sec"}
             value={isRedis ? (latest.throughput?.total || 0).toFixed(2) : ((latest.throughput?.read || 0) + (latest.throughput?.write || 0)).toFixed(2)}
             subtext={isRedis ? "Commands processed" : "Reads & Writes combined"}
             icon={Zap}
             color="text-emerald-500"
           />
           {isRedis ? (
              <StatCard
                 title="Cache Hit Rate"
                 value={`${(latest.redis?.hitRate || 0).toFixed(2)}%`}
                 subtext="Hits vs Misses"
                 icon={Zap}
                 color="text-yellow-500"
              />
           ) : isSQL ? (
              <StatCard
                 title="Buffer Cache Hit"
                 value={`${(latest.sql?.cacheHitRate || 0).toFixed(2)}%`}
                 subtext="Buffer pool efficiency"
                 icon={Gauge}
                 color="text-yellow-500"
              />
           ) : (
              <StatCard
                 title="Memory Used"
                 value={formatSize(latest.memory?.resident)}
                 subtext="Resident Set Size (RSS)"
                 icon={HardDrive}
                 color="text-purple-500"
              />
           )}
           <StatCard 
             title="DB Uptime" 
             value={formatUptime(latest.uptimeSeconds)} 
             subtext="Time since last restart"
             icon={Clock} 
             color="text-orange-500" 
           />
        </div>

        {/* --- 3. Full Width Throughput --- */}
        <DynamicChart 
            title="Throughput (Operations / sec)"
            className="h-[350px]"
            data={chartData}
            tooltipSuffix=" ops"
            series={isRedis
                ? [{ key: 'throughputTotal', name: 'Commands', color: '#8b5cf6', style: 'gradient' }]
                : [
                    { key: 'throughputWrite', name: 'Writes', color: '#3b82f6', style: 'gradient' },
                    { key: 'throughputRead', name: 'Reads', color: '#10b981', style: 'gradient' }
                  ]}
        />

        {/* --- 4. Detailed Charts Grid --- */}
        {/* --- 4. Detailed Charts Grid (Configuration Driven) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {gridCharts.map((chart, i) => (
               <DynamicChart 
                   key={i}
                   title={chart.title}
                   data={chartData}
                   type={'type' in chart ? chart.type : undefined}
                   series={chart.series}
                   tooltipSuffix={chart.tooltipSuffix}
                   tooltipFormatter={chart.formatter}
               />
           ))}
        </div>

        {/* --- 5. Collections Table --- */}
        <CollectionsTable collections={collections}  type={database.type} />
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Database?">
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
               <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
               <div className="text-sm">
                  <span className="font-bold block mb-1">Warning: Irreversible Action</span>
                  This will disconnect <strong>{database.name}</strong>, securely delete your credentials, and wipe all historical metrics.
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