import React, { createContext, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { useTheme } from '../../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog, cn, DataError } from '../../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { Activity, Box, Cpu, HardDrive, Network, Clock, RefreshCw, Trash2, AlertTriangle, X, Maximize, Terminal, Layers, CloudLightning, ArrowRight, Route, Thermometer, Zap, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue, useCounter } from '@/components/Tween';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';
import Link from 'next/link';

export const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Dynamic Color Utilities for New Charts ---
const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
  "#ec4899", "#f97316", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16",
  "#a855f7", "#0ea5e9", "#eab308", "#22c55e", "#2563eb", "#059669",
  "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#ea580c"
];

const getStringHash = (str: string) => {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// --- Formatter for Uptime ---
const formatUptime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m';
  const y = Math.floor(seconds / 31536000);
  const mo = Math.floor((seconds % 31536000) / 2628000);
  const d = Math.floor((seconds % 2628000) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (y > 0) parts.push(`${y}y`);
  if (mo > 0) parts.push(`${mo}mo`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);

  return parts.join(' ');
};

export const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.color || entry.stroke || entry.fill }}>
            <div className="w-2 h-2 rounded-full" style={{
                backgroundColor: entry.color || entry.stroke || entry.fill,
              }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Disk Tooltip ---
export const DiskTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50 min-w-[200px]">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => {
          const diskName = entry.name;
          const usedVal = data[`diskUsedVal_${diskName}`] || data.diskUsedVal; 
          const totalVal = data[`diskTotalVal_${diskName}`] || data.diskTotalVal;
          
          return (
            <div key={idx} className="mb-2.5 last:mb-0">
              <div className="flex items-center gap-2" style={{ color: entry.color || entry.stroke || entry.fill }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
                <span className="font-medium text-foreground">{diskName}</span>
                <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%</span>
              </div>
              {(usedVal && totalVal) && (
                <div className="text-[10px] text-muted-foreground ml-4 mt-0.5 font-mono border-l-2 border-border/50 pl-2">
                  Used: {usedVal} GB / {totalVal} GB
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// --- ChartCard with Maximize ---
export const ChartCard = ({ title, children }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[300px]'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6  text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
          {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardHeader>
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
      <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : ''}`}>
        {Header}
        <CardContent className="flex-1 min-h-0 relative px-0 pb-0 overflow-hidden">
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

const DistributionTable = ({ data, router, id }: { data: any[], router: any, id: any }) => {
  const { isMaximized, toggle } = useContext(DistributionContext);
  const filteredData = useMemo(() => {
    return data;
  }, [data]);
  if (!data?.length) return <div className="p-8 text-center text-muted-foreground">No containers detected</div>;

  const limit = isMaximized ? filteredData.length : 8;
  const visibleData = filteredData.slice(0, limit);
  const hiddenCount = filteredData.length - limit;

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
          <tr>
            <th className="px-6 py-3">Container</th>
            <th className="px-6 py-3">Image</th>
            <th className="px-6 py-3">State</th>
            <th className="px-6 py-3 text-right">CPU</th>
            <th className="px-6 py-3 text-right">Memory</th>
          </tr>
        </thead>
        <tbody>
          {visibleData.map((c: any) => {
            return (
              <tr key={c.id} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/server/${id}/docker/${c.id}`)}>
                <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                <td className="px-6 py-4 text-muted-foreground font-mono">{c.image.split(':')[0]}</td>
                <td className="px-6 py-4"><Badge variant={c.state === 'running' ? 'success' : 'secondary'}>{c.state}</Badge></td>
                <td className="px-6 py-4 text-right font-mono"><SmartAnimatedValue value={`${c.cpuPercent.toFixed(2)}%`} /></td>
                <td className="px-6 py-4 text-right font-mono"><SmartAnimatedValue value={`${c.memoryPercent.toFixed(2)}%`} /></td>
              </tr>
            )
          })}

          {/* Show More Row */}
          {hiddenCount > 0 && (
            <tr
              className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={toggle}
            >
              <td colSpan={5} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
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

// --- Uptime Strip (Unchanged logic) ---
const UptimeStrip = ({ history }: { history: any[] }) => {
  const blocks = useMemo(() => {
    if (!history || history.length === 0) return [];
    // Ensure we only ever map the last 60 minutes for visual readability
    const recentHistory = history.slice(-60);
    return recentHistory.map((run: any) => ({
      status: run.isOnline === false ? 'down' : 'up',
      time: run.createdAt
    }));
  }, [history]);

  const uptimePct = useMemo(() => {
     if(!blocks.length) return 0;
     const downBlocks = blocks.filter((b: any) => b.status === 'down').length;
     const total = blocks.length;
     return Math.max(0, ((total - downBlocks) / total) * 100).toFixed(1);
  }, [blocks]);

  return (
    <div className="space-y-2 bg-card/50 p-4 rounded-xl border">
      <div className="flex justify-between items-center text-xs">
         <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Activity className="h-3 w-3" /> Real-time Availability
         </span>
         <span className={Number(uptimePct) > 98 ? "text-emerald-500 font-mono" : "text-yellow-500 font-mono"}>{uptimePct}%</span>
      </div>
      <div className="h-2 w-full flex gap-[2px] overflow-hidden rounded-full">
        {blocks.map((block: any, i: number) => {
            let color = "bg-emerald-500";
            if (block.status === 'down') color = "bg-destructive";
            return <div key={i} className={`flex-1 rounded-sm ${color}`} title={new Date(block.time).toLocaleTimeString()} />
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>1hr ago</span>
        <span>Live</span>
      </div>
    </div>
  )
}

export default function ServerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme(); // Get Monochromatic state

  const [range, setRange] = useState('1h');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/vps/${id}/stats?range=${range}` : null, 
    fetcher, 
    { refreshInterval: 60000 }
  );

  const { vps, history } = data || {};

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/vps/${id}`); router.push('/dashboard');
    }
    catch (e) {
      console.error(e); setIsDeleting(false);
      toast.error(extractErrorMessage(e, 'Failed to delete server'));
    }
  }

  const openEdit = () => {
    setEditName(vps?.name || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    setIsUpdating(true);
    setEditError(null);
    try {
      await api.put(`/vps/${id}`, { name: editName.trim() });
      await mutate();
      setIsEditOpen(false);
      toast.success('Server updated');
    } catch (e) {
      setEditError(extractErrorMessage(e, 'Failed to update server'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Find the last real online metric to prevent top cards from flashing 0 during downtime
  const latestRun = history?.slice().reverse().find((h: any) => h.isOnline !== false) || history?.[history?.length - 1];
  const latest = latestRun ? latestRun.metrics : {}; 

  // Multi-Disk & Hardware Resolution (TS 2345 Fix via explicit cast)
  const diskArray = Array.isArray(latest?.disk) ? latest.disk : (latest?.disk ? [latest.disk] : []);
  const diskNames = Array.from(new Set(diskArray.map((d: any) => d.name).filter(Boolean))) as string[];
  const primaryDiskName = diskNames[0] || '/';

  const showTemperature = history?.some((h: any) => h.metrics?.hardware?.temperature > 0);
  const showPower = history?.some((h: any) => h.metrics?.hardware?.powerDraw > 0);
  const activeGpus = latest?.gpus || [];

  // --- Process Charts ---
  const chartData = useMemo(() => {
    if (!history) return [];
    const sorted = [...history].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return sorted.map((run: any) => {
      const runDiskArray = Array.isArray(run.metrics?.disk) ? run.metrics.disk : (run.metrics?.disk ? [run.metrics.disk] : []);
      const primaryDisk = runDiskArray[0] || {};

      const d: any = {
        time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: run.metrics.cpu?.usagePercent || 0,
        memUsed: run.metrics.memory?.usagePercent || 0,
        memActive: (run.metrics.memory?.active / (run.metrics.memory?.total || 1)) * 100 || 0,
        memFree: (run.metrics.memory?.free / (run.metrics.memory?.total || 1)) * 100 || 0,
        diskUsed: primaryDisk.usagePercent || 0,
        diskTotalVal: ((primaryDisk.total || 0) / 1e9).toFixed(1),
        diskUsedVal: ((primaryDisk.used || 0) / 1e9).toFixed(1),
        netRx: (run.metrics.network?.bytesRecvSec / 1024) || 0,
        netTx: (run.metrics.network?.bytesSentSec / 1024) || 0,
        latencyMs: run.metrics.network?.latencyMs || 0,
        procBlocked: run.metrics.processes?.blocked || 0,
        procRunning: run.metrics.processes?.running || 0,
        procSleeping: run.metrics.processes?.sleeping || 0,
        sysTemp: run.metrics.hardware?.temperature || 0,
        sysPower: run.metrics.hardware?.powerDraw || 0,
      };

      // Append multi-disk dynamic series + custom Tooltip data injection
      runDiskArray.forEach((disk: any) => {
        if (disk.name) {
          d[`disk_${disk.name}`] = disk.usagePercent || 0;
          d[`diskUsedVal_${disk.name}`] = ((disk.used || 0) / 1e9).toFixed(1);
          d[`diskTotalVal_${disk.name}`] = ((disk.total || 0) / 1e9).toFixed(1);
        }
      });

      // Append GPU dynamic series for unified charts
      run.metrics.gpus?.forEach((gpu: any, i: number) => {
        d[`gpu_${i}_utilization`] = gpu.utilization || 0;
        d[`gpu_${i}_temp`] = gpu.temperature || 0;
        d[`gpu_${i}_power`] = gpu.powerDraw || 0;
        d[`gpu_${i}_vram`] = ((gpu.vramUsed || 0) / (gpu.vramTotal || 1)) * 100 || 0;
      });

      return d;
    });
  }, [history]);

  if (!data && !error) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Server...</p></div></>;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
  if (!vps) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load server data.</div></div></>;

  // Original Helper to get color based on Mode
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  // Original If mono, fills matching stroke
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  // Dedicated Dynamic Color resolver for new charts
  const getDynamicColor = (key: string) => isMono ? 'hsl(var(--chart-mono))' : CHART_COLORS[getStringHash(key) % CHART_COLORS.length];

  // Integrations Flags (Check if active or if data exists)
  const hasNginx = vps.activeIntegrations?.nginx || (latest.nginx !== null && latest.nginx !== undefined);
  const hasTraefik = vps.activeIntegrations?.traefik || (latest.traefik !== null && latest.traefik !== undefined);
  const hasTerminal = vps.activeIntegrations?.terminal;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{vps.name}</h1>
              {vps.status === 'online' ? <Badge variant="success" className="animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]">Online</Badge> : <Badge variant="destructive">Offline</Badge>}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
              <div className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" /> {latest.os?.hostname || 'localhost'}</div>
              <div className="flex items-center gap-1.5"><HardDrive className="h-3.5 w-3.5" /> {latest.os?.distro} {latest.os?.release}</div>
              <div className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> {latest.cpu?.cores} Cores • {latest.cpu?.brand}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Up: {formatUptime(latest.uptimeSeconds || 0)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select className="w-36 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="1h">Last 1 Hour</option>
                <option value="3h">Last 3 Hours</option>
                <option value="6h">Last 6 Hours</option>
                <option value="12h">Last 12 Hours</option>
                <option value="24h">Last 24 Hours</option>
            </Select>
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

        <UptimeStrip history={history} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="CPU Usage" value={`${(latest.cpu?.usagePercent || 0).toFixed(1)}%`} icon={Cpu} color="text-emerald-500" sub={`${latest.cpu?.cores ?? 0} Cores`} progressBarValue={(latest.cpu?.usagePercent || 0).toFixed(0)} isMono={isMono} />
          <StatCard title="Memory" value={`${(latest.memory?.usagePercent || 0).toFixed(1)}%`} sub={`${((latest.memory?.active || 0) / 1024 ** 3).toFixed(1)}GB / ${((latest.memory?.total || 0) / 1024 ** 3).toFixed(1)}GB Used`} icon={Activity} color="text-blue-500" progressBarValue={(latest.memory?.usagePercent || 0).toFixed(0)} isMono={isMono} />
          <StatCard title="Net Latency" value={`${latest.network?.latencyMs?.toFixed(0) || '-'}ms`} sub="Global Ping" icon={Network} color="text-yellow-500" progressBarValue={Math.min(((latest.network?.latencyMs || 0) / 200) * 100, 100)} isMono={isMono} />
          <StatCard title="Containers" value={latest.docker?.filter((c: any) => c.state === 'running').length || 0} sub={`Total: ${latest.docker?.length || 0}`} icon={Box} color="text-purple-500" progressBarValue={(latest.docker?.filter((c: any) => c.state === 'running')?.length || 0) / (latest.docker?.length || 100) * 100} isMono={isMono} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="CPU Load (%)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor("#10b981")} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor("#10b981")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="cpu" stroke={getColor("#10b981")} strokeWidth={2} fillOpacity={1} fill={"url(#colorCpu)"} name="CPU" />
            </AreaChart>
          </ChartCard>

          {/* combined Memory Composition and Usage */}
          <ChartCard title="Memory Composition (%)">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="memUsed" stroke={getColor("#6c28d8")} fill={getFill("#6c28d8")} fillOpacity={0.15} name="Usage" />
              <Area type="monotone" dataKey="memActive" stackId="1" stroke={getColor("#9a9aff")} fill={getFill("#9a9aff")} fillOpacity={0.1} name="Active" />
              <Area type="monotone" dataKey="memFree" stackId="1" stroke={getColor("#4D6AFF")} fill={getFill("#4D6AFF")} fillOpacity={0.15} name="Free" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Latency (Ms)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor("#f59e0b")} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor("#f59e0b")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" Ms" />} />
              <Area type="monotone" dataKey="latencyMs" stroke={getColor("#f59e0b")} strokeWidth={2} fillOpacity={1} fill={"url(#colorLat)"} name="Latency" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Traffic (KB/s)">
            <AreaChart data={chartData}>
              <defs><linearGradient id="colorNetRx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#8b5cf6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#8b5cf6")} stopOpacity={0} /></linearGradient></defs>
              <defs><linearGradient id="colorNetTx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#ec4899")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#ec4899")} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" KB/s" />} />
              <Area type="monotone" dataKey="netRx" stroke={getColor("#8b5cf6")} strokeWidth={2} fill={"url(#colorNetRx)"} name="Rx" />
              <Area type="monotone" dataKey="netTx" stroke={getColor("#ec4899")} strokeWidth={2} fill={"url(#colorNetTx)"} name="Tx" />
            </AreaChart>
          </ChartCard>

          <ChartCard title={diskNames.length > 1 ? "Mounted Disk Usage (%)" : `Disk Usage (${primaryDiskName})`}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<DiskTooltip />} />
              
              {diskNames.length > 1 ? diskNames.map((diskName: string, i: number) => {
                 const color = getDynamicColor(`disk_${diskName}`);
                 const safeId = `color-disk-${i}`;
                 return (
                   <React.Fragment key={diskName}>
                      <defs>
                       <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                         <stop offset="95%" stopColor={color} stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <Area type="step" dataKey={`disk_${diskName}`} stackId="1" stroke={color} fill={`url(#${safeId})`} name={diskName} />
                   </React.Fragment>
                 )
              }) : (
                 <React.Fragment>
                    <defs>
                      <linearGradient id="colorDiskFallback" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getColor("#9B5DE5")} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={getColor("#9B5DE5")} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                   <Area type="step" dataKey="diskUsed" stroke={getColor("#9B5DE5")} strokeWidth={2} fill={"url(#colorDiskFallback)"} name="Disk" />
                 </React.Fragment>
              )}
            </AreaChart>
          </ChartCard>

          <ChartCard title="Process State">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Bar dataKey="procRunning" stackId="a" fill={getColor("#10b981")} name="Running" />
              <Bar dataKey="procSleeping" stackId="a" fill={getColor('#636165')} name="Sleeping" opacity="0.4" />
              <Bar dataKey="procBlocked" stackId="a" fill={getColor("#ef4444")} name="Blocked" />
            </BarChart>
          </ChartCard>

          {/* --- EXTENSIONS (Appended untouched after existing core loop) --- */}

          {showTemperature && (
            <ChartCard title="System Temperature (°C)">
              <AreaChart data={chartData}>
                 <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getDynamicColor("sysTemp")} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={getDynamicColor("sysTemp")} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip content={<CustomTooltip unit=" °C" />} />
                <Area type="monotone" dataKey="sysTemp" stroke={getDynamicColor("sysTemp")} strokeWidth={2} fillOpacity={1} fill={"url(#colorTemp)"} name="Core Temp" />
              </AreaChart>
            </ChartCard>
          )}

          {showPower && (
            <ChartCard title="System Power Draw (W)">
              <AreaChart data={chartData}>
                 <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getDynamicColor("sysPower")} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={getDynamicColor("sysPower")} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip content={<CustomTooltip unit=" W" />} />
                <Area type="monotone" dataKey="sysPower" stroke={getDynamicColor("sysPower")} strokeWidth={2} fillOpacity={1} fill={"url(#colorPower)"} name="Wattage" />
              </AreaChart>
            </ChartCard>
          )}

        </div>

        {/* Docker Table */}
        <DistributionCard
          title="Docker Containers"
        >
          <DistributionTable data={latest.docker} router={router} id={id} />
        </DistributionCard>

        
        {/* --- HARDWARE ACCELERATORS (GPU) CONSOLIDATED --- */}
        {activeGpus.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">Hardware Accelerators</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Utilization (Overlaid Lines for precision) */}
              <ChartCard title="GPU Utilization (%)">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  {activeGpus.map((gpu: any, i: number) => {
                     const color = getDynamicColor(`gpu_util_${i}`);
                     return <Line key={i} type="monotone" dataKey={`gpu_${i}_utilization`} stroke={color} strokeWidth={2} dot={false} name={gpu.model || `GPU ${i}`} />
                  })}
                </LineChart>
              </ChartCard>

              {/* VRAM (Overlaid Lines) */}
              <ChartCard title="GPU VRAM Usage (%)">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  {activeGpus.map((gpu: any, i: number) => {
                     const color = getDynamicColor(`gpu_vram_${i}`);
                     return <Line key={i} type="monotone" dataKey={`gpu_${i}_vram`} stroke={color} strokeWidth={2} dot={false} name={gpu.model || `GPU ${i}`} />
                  })}
                </LineChart>
              </ChartCard>

              {/* Temperature */}
              <ChartCard title="GPU Temperature (°C)">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip unit=" °C" />} />
                  {activeGpus.map((gpu: any, i: number) => {
                     const color = getDynamicColor(`gpu_temp_${i}`);
                     return <Line key={i} type="monotone" dataKey={`gpu_${i}_temp`} stroke={color} strokeWidth={2} dot={false} name={gpu.model || `GPU ${i}`} />
                  })}
                </LineChart>
              </ChartCard>

              {/* Power Draw (Area) */}
              <ChartCard title="GPU Power Draw (W)">
                <AreaChart data={chartData}>
                  {activeGpus.map((gpu: any, i: number) => {
                     const color = getDynamicColor(`gpu_power_${i}`);
                     const safeId = `color-gpu-power-${i}`;
                     return (
                        <React.Fragment key={i}>
                            <defs>
                             <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                               <stop offset="95%" stopColor={color} stopOpacity={0} />
                             </linearGradient>
                           </defs>
                           <Area type="monotone" dataKey={`gpu_${i}_power`} stroke={color} strokeWidth={2} fill={`url(#${safeId})`} name={gpu.model || `GPU ${i}`} />
                        </React.Fragment>
                     );
                  })}
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip unit=" W" />} />
                </AreaChart>
              </ChartCard>
              
            </div>
          </div>
        )}

        {/* --- INTEGRATIONS LIST --- */}
        {(hasNginx || hasTraefik || hasTerminal) && (
          <div className="space-y-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">Active Integrations</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hasTerminal && (
                <Link href={`/dashboard/server/${id}/terminal`}>
                  <Card className={cn("transition-all cursor-pointer group hover:shadow-md", isMono ? "hover:border-primary/50" : "hover:border-purple-500/50")}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-lg group-hover:scale-110 transition-transform", isMono ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-500")}>
                          <Terminal className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Web Terminal</h3>
                          <div className={cn("text-xs flex items-center gap-1.5 mt-1", isMono ? "text-primary" : "text-purple-500")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMono ? "bg-primary" : "bg-purple-500")} /> Online
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={cn("h-4 w-4 text-muted-foreground transition-colors", isMono ? "group-hover:text-primary" : "group-hover:text-purple-500")} />
                    </CardContent>
                  </Card>
                </Link>
              )}

              {hasNginx && (
                <Link href={`/dashboard/server/${id}/nginx`}>
                  <Card className={cn("transition-all cursor-pointer group hover:shadow-md", isMono ? "hover:border-primary/50" : "hover:border-emerald-500/50")}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-lg group-hover:scale-110 transition-transform", isMono ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500")}>
                          <CloudLightning className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Nginx</h3>
                          <div className={cn("text-xs flex items-center gap-1.5 mt-1", isMono ? "text-primary" : "text-emerald-500")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMono ? "bg-primary" : "bg-emerald-500")} /> Active
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={cn("h-4 w-4 text-muted-foreground transition-colors", isMono ? "group-hover:text-primary" : "group-hover:text-emerald-500")} />
                    </CardContent>
                  </Card>
                </Link>
              )}

              {hasTraefik && (
                <Link href={`/dashboard/server/${id}/traefik`}>
                  <Card className={cn("transition-all cursor-pointer group hover:shadow-md", isMono ? "hover:border-primary/50" : "hover:border-blue-500/50")}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-lg group-hover:scale-110 transition-transform", isMono ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500")}>
                          <Route className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Traefik</h3>
                          <div className={cn("text-xs flex items-center gap-1.5 mt-1", isMono ? "text-primary" : "text-blue-500")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMono ? "bg-primary" : "bg-blue-500")} /> Active
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={cn("h-4 w-4 text-muted-foreground transition-colors", isMono ? "group-hover:text-primary" : "group-hover:text-blue-500")} />
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Server?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">Warning: Irreversible Action</span>
              This will permanently delete <strong>{vps.name}</strong> and all its telemetry data.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Server">
        <div className="space-y-4">
          {editError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Server Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Server name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Spinner className="h-4 w-4 mr-2" />}
              Update
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// Helpers
export const StatCard = ({ title, value, sub, icon: Icon, color, progressBarValue, isMono }: any) => {
  const colorMap: Record<string, string> = {
    "text-emerald-500": "bg-emerald-500",
    "text-blue-500": "bg-blue-500",
    "text-yellow-500": "bg-yellow-500",
    "text-purple-500": "bg-purple-500",
  }

  // Mono overrides
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  const barClass = isMono ? 'bg-[hsl(var(--chart-mono))]' : colorMap[color];

  const animatedWidth = useCounter(Number(progressBarValue) || 0, 1500);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">
          <SmartAnimatedValue value={value} />
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <SmartAnimatedValue value={sub} /></p>}
        {
          progressBarValue >= 0 && <div className="h-1.5 mt-2 w-full bg-secondary rounded-full overflow-hidden transition-all duration-[1.5s]">
            <div className={`h-full ${barClass}`} style={{ width: `${animatedWidth}%` }} />
          </div>
        }
      </CardContent>
    </Card>
  )
};