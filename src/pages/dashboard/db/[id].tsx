import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog, DataError } from '../../../components/Core';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, Activity, Clock, Trash2, AlertTriangle, Maximize2, X, RefreshCw, HardDrive, Zap, Lock, ScanLine, Network, Maximize } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';

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
      {subtext && <div className="text-xs text-muted-foreground mt-1 font-medium"><SmartAnimatedValue value={subtext} /></div>}
    </CardContent>
  </Card>
);

export default function DatabaseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();
  
  const [range, setRange] = useState('24h');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/database/${id}/stats?range=${range}` : null, 
    fetcher,
    { refreshInterval: 60000 } 
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/database/${id}`); router.push('/dashboard'); } 
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  // --- Format Chart Data ---
  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.map((point: any) => ({
        ...point,
        time: new Date(point.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        // Convert network from Bytes/s to KB/s for chart
        netInKB: point.netIn ? point.netIn / 1024 : 0,
        netOutKB: point.netOut ? point.netOut / 1024 : 0
    }));
  }, [data?.history]);

  if (!data && !error) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Database...</p></div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></DashboardLayout>;
    if (!data?.database) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load database.</div></div></DashboardLayout>;

  const { database, latest } = data;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <DashboardLayout>
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
               <span className="capitalize">{database.type} Engine</span>
               <span>•</span>
               <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Polling {database.interval}m</span>
               <span>•</span>
               <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {formatSize(latest.storage?.dataSize)} Data</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select className="w-32 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
                <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
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
             title="Total Ops/sec" 
             value={((latest.throughput?.read || 0) + (latest.throughput?.write || 0)).toFixed(1)} 
             subtext="Reads & Writes combined"
             icon={Zap} 
             color="text-emerald-500" 
           />
           <StatCard 
             title="Memory Used" 
             value={formatSize(latest.memory?.resident)} 
             subtext="Resident Set Size (RSS)"
             icon={HardDrive} 
             color="text-purple-500" 
           />
           <StatCard 
             title="DB Uptime" 
             value={formatUptime(latest.uptimeSeconds)} 
             subtext="Time since last restart"
             icon={Clock} 
             color="text-orange-500" 
           />
        </div>

        {/* --- 3. Full Width Throughput --- */}
        <ChartCard title="Throughput (Operations / sec)" className="h-[350px]">
           <AreaChart data={chartData}>
              <defs>
                 <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#10b981")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#10b981")} stopOpacity={0} /></linearGradient>
                 <linearGradient id="colorWrite" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip suffix=" ops" />} />
              <Area type="monotone" dataKey="throughputWrite" stroke={getColor("#3b82f6")} fill={"url(#colorWrite)"} name="Writes" strokeWidth={2} />
              <Area type="monotone" dataKey="throughputRead" stroke={getColor("#10b981")} fill={ "url(#colorRead)"} name="Reads" strokeWidth={2} />
           </AreaChart>
        </ChartCard>

        {/* --- 4. Detailed Charts Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           
           {/* Latency: Read */}
           <ChartCard title="Read Latency (ms)">
              <AreaChart data={chartData}>
                 <defs><linearGradient id="colorLatRead" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#8b5cf6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#8b5cf6")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip suffix=" ms" />} />
                 <Area type="monotone" dataKey="latencyReadMax" stroke={getColor("#c4b5fd")} strokeDasharray="4 4" fill="transparent" name="Max Read" strokeWidth={2} />
                 <Area type="monotone" dataKey="latencyReadAvg" stroke={getColor("#8b5cf6")} fill={ "url(#colorLatRead)"} name="Avg Read" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

           {/* Latency: Write */}
           <ChartCard title="Write Latency (ms)">
              <AreaChart data={chartData}>
                 <defs><linearGradient id="colorLatWrite" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#f59e0b")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#f59e0b")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip suffix=" ms" />} />
                 <Area type="monotone" dataKey="latencyWriteMax" stroke={getColor("#fcd34d")} strokeDasharray="4 4" fill="transparent" name="Max Write" strokeWidth={2} />
                 <Area type="monotone" dataKey="latencyWriteAvg" stroke={getColor("#f59e0b")} fill={"url(#colorLatWrite)"} name="Avg Write" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

           {/* Memory Usage */}
           <ChartCard title="Memory Allocation (MB)">
              <AreaChart data={chartData}>
              <defs><linearGradient id="colorMemVirtual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#64748b")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#64748b")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorMemMapped" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#06b6d4")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#06b6d4")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorMemResident" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#ec4899")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#ec4899")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip formatter={(val: number) => formatSize(val)} />} />
                 <Area type="monotone" dataKey="memVirtual" stroke={getColor("#64748b")} fill={"url(#colorMemVirtual)"} name="Virtual" strokeWidth={2} />
                 <Area type="monotone" dataKey="memMapped" stroke={getColor("#06b6d4")} fill={"url(#colorMemMapped)"} name="Mapped" strokeWidth={2} />
                 <Area type="monotone" dataKey="memResident" stroke={getColor("#ec4899")} fill={"url(#colorMemResident)"} name="Resident (RSS)" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

           {/* Storage (Stacked Area) */}
           <ChartCard title="Storage Size (MB)">
              <AreaChart data={chartData}>
              <defs><linearGradient id="colorStorageData" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#14b8a6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#14b8a6")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorStorageIndex" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#6366f1")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#6366f1")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip formatter={(val: number) => formatSize(val)} />} />
                 <Area type="monotone" dataKey="storageData" stroke={getColor("#14b8a6")} fill={"url(#colorStorageData)"} fillOpacity={0.6} name="Data Size" />
                 <Area type="monotone" dataKey="storageIndex" stroke={getColor("#6366f1")} fill={"url(#colorStorageIndex)"} fillOpacity={0.6} name="Index Size" />
              </AreaChart>
           </ChartCard>

           {/* Index & Collection Scans */}
           <ChartCard title="Database Scans">
              <AreaChart data={chartData}>
              <defs><linearGradient id="colorScansCollection" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#ef4444")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#ef4444")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorScansIndex" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#10b981")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#10b981")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip suffix=" scans/sec" />} />
                 <Area type="monotone" dataKey="scansCollection" stroke={getColor("#ef4444")} fill={"url(#colorScansCollection)"} name="Collection Scans" strokeWidth={2} />
                 <Area type="monotone" dataKey="scansIndex" stroke={getColor("#10b981")} fill={"url(#colorScansIndex)"} name="Index Scans" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

           {/* Locks (Bar Chart) */}
           <ChartCard title="Global Locks">
              <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                 <Bar dataKey="locksAR" fill={getColor("#3b82f6")} name="Active Readers" stackId="a" radius={[0, 0, 4, 4]} />
                 <Bar dataKey="locksQR" fill={getColor("#93c5fd")} name="Queued Readers" stackId="a" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="locksAW" fill={getColor("#f59e0b")} name="Active Writers" stackId="b" radius={[0, 0, 4, 4]} />
                 <Bar dataKey="locksQW" fill={getColor("#fcd34d")} name="Queued Writers" stackId="b" radius={[4, 4, 0, 0]} />
              </BarChart>
           </ChartCard>

           {/* Network Data Rate (Multi-line Area) */}
           <ChartCard title="Network Traffic (KB/s)">
              <AreaChart data={chartData}>
              <defs><linearGradient id="colorNetOutKB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#10b981")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#10b981")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorNetInKB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip suffix=" KB/s" />} />
                 <Area type="monotone" dataKey="netOutKB" stroke={getColor("#10b981")} fill={"url(#colorNetOutKB)"} name="Bytes Out" strokeWidth={2} />
                 <Area type="monotone" dataKey="netInKB" stroke={getColor("#3b82f6")} fill={"url(#colorNetInKB)"} name="Bytes In" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

           {/* Network Requests Rate */}
           <ChartCard title="Network Requests (Req/s)">
              <AreaChart data={chartData}>
                 <defs><linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#8b5cf6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#8b5cf6")} stopOpacity={0} /></linearGradient></defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="time" hide />
                 <YAxis hide />
                 <Tooltip content={<CustomTooltip suffix=" req/s" />} />
                 <Area type="monotone" dataKey="netRequests" stroke={getColor("#8b5cf6")} fill={ "url(#colorReq)"} name="Requests" strokeWidth={2} />
              </AreaChart>
           </ChartCard>

        </div>
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
    </DashboardLayout>
  );
}