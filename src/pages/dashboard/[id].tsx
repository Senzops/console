import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../components/ui/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { Activity, Box, Cpu, HardDrive, Network, Clock, RefreshCw, Trash2, AlertTriangle, X, Maximize } from 'lucide-react';
import { createPortal } from 'react-dom';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Formatter for Uptime ---
const formatUptime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m';
  const y = Math.floor(seconds / 31536000);
  const mo = Math.floor((seconds % 31536000) / 2628000);
  const d = Math.floor((seconds % 2628000) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (y > 0) parts.push(`${y}y`);
  if (mo > 0) parts.push(`${mo}mo`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);

  return parts.join(' ');
};

const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.fill || entry.color || entry.stroke }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color || entry.stroke }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- ChartCard with Maximize ---
const ChartCard = ({ title, children }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[300px]'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMaximized(!isMaximized)}>
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

// --- Uptime Strip (Unchanged logic) ---
const UptimeStrip = ({ history, limit }: { history: any[], limit: number }) => {
  const blocks = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Sort Oldest -> Newest
    const chrono = [...history].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const result = [];

    // 1. Process historical gaps
    for (let i = 0; i < chrono.length - 1; i++) {
      const t1 = new Date(chrono[i].createdAt).getTime();
      const t2 = new Date(chrono[i + 1].createdAt).getTime();
      const diffMins = (t2 - t1) / 1000 / 60;

      // If gap > 2 mins → downtime starts at t1
      if (diffMins > 2) {
        result.push({ status: 'down', time: chrono[i].createdAt });
      } else {
        result.push({ status: 'up', time: chrono[i].createdAt });
      }
    }
    const lastPoint = chrono[chrono.length - 1];
    const lastTime = new Date(lastPoint.createdAt).getTime();
    const now = new Date().getTime();
    const gapToNow = (now - lastTime) / 1000 / 60;

    // If no data for > 1.5 mins, we are currently DOWN
    if (gapToNow > 2) {
      result.push({ status: 'down', time: new Date().toISOString() });
    } else {
      result.push({ status: 'up', time: lastPoint.createdAt });
    }

    return result;
  }, [history]);

  // Calculate Availability %
  const uptimePct = useMemo(() => {
    if (!blocks.length) return 0;
    const downBlocks = blocks.filter(b => b.status === 'down').length;
    // Simple approximation: (Total - Down) / Total
    // For strict accuracy we'd calculate time durations, but for a visual strip this suffices
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
      <div className="h-2 w-full flex gap-[2px] overflow-hidden rounded-full bg-secondary/50">
        {Array.from({ length: 60 }).map((_, i) => {
          const blockIndex = Math.floor((i / 60) * blocks.length);
          const block = blocks[blockIndex];
          if (!block) return <div key={i} className="flex-1 bg-secondary/30" />;
          let color = "bg-emerald-500";
          if (block.status === 'down') color = "bg-destructive";
          return <div key={i} className={`flex-1 rounded-sm ${color}`} title={new Date(block.time).toLocaleTimeString()} />
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>{limit}m ago</span>
        <span>Live</span>
      </div>
    </div>
  )
}

export default function VpsDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme(); // Get Monochromatic state

  const [timeLimit, setTimeLimit] = useState(60);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/vps/${id}/stats?limit=${timeLimit}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const { vps, history } = data || {};

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/vps/${id}`); router.push('/dashboard'); }
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  // --- Process Charts ---
  const chartData = useMemo(() => {
    if (!history) return [];
    const sorted = [...history].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return sorted.map((run: any) => ({
      time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: run.metrics.cpu?.usagePercent || 0,
      memUsed: run.metrics.memory?.usagePercent || 0,
      memActive: (run.metrics.memory?.active / run.metrics.memory?.total) * 100 || 0,
      memFree: (run.metrics.memory?.free / run.metrics.memory?.total) * 100 || 0,
      diskUsed: run.metrics.disk?.usagePercent || 0,
      diskTotalVal: (run.metrics.disk?.total / 1e9).toFixed(1),
      diskUsedVal: (run.metrics.disk?.used / 1e9).toFixed(1),
      netRx: (run.metrics.network?.bytesRecvSec / 1024) || 0,
      netTx: (run.metrics.network?.bytesSentSec / 1024) || 0,
      latencyMs: run.metrics.network?.latencyMs || 0,
      procBlocked: run.metrics.processes?.blocked || 0,
      procRunning: run.metrics.processes?.running || 0,
      procSleeping: run.metrics.processes?.sleeping || 0,
    }));
  }, [history]);

  if (!data && !error) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Agent...</p></div></DashboardLayout>;
  if (error || !vps) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load instance data.</div></div></DashboardLayout>;

  const latest = history && history.length > 0 ? history[0].metrics : {};

  // Helper to get color based on Mode
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  // If mono, fills often need opacity or just matching stroke
  const getFill = (defaultFill: string, opacity: number = 0.2) => isMono ? 'var(--chart-mono)' : defaultFill;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{vps.name}</h1>
              {vps.status === 'online' ? <Badge variant="success" className="animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]">Online</Badge> : <Badge variant="destructive">Offline</Badge>}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
              <div className="flex items-center gap-1.5"><HardDrive className="h-3.5 w-3.5" /> {latest.os?.distro} {latest.os?.release}</div>
              <div className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> {latest.cpu?.cores} Cores • {latest.cpu?.brand}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Up: {formatUptime(latest.uptimeSeconds || 0)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select className="w-32 bg-background" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}>
              <option value={60}>Last 1 Hour</option>
              <option value={180}>Last 3 Hours</option>
              <option value={360}>Last 6 Hours</option>
              <option value={720}>Last 12 Hours</option>
              <option value={1440}>Last 24 Hours</option>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <UptimeStrip history={history} limit={timeLimit} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="CPU Usage" value={`${(latest.cpu?.usagePercent || 0).toFixed(1)}%`} icon={Cpu} color="text-emerald-500" sub={`${latest.cpu?.cores} Cores`} progressBarValue={(latest.cpu?.usagePercent || 0).toFixed(0)} isMono={isMono} />
          <StatCard title="Memory" value={`${(latest.memory?.usagePercent || 0).toFixed(1)}%`} sub={`${((latest.memory?.used || 0) / 1024 ** 3).toFixed(1)}GB / ${((latest.memory?.total || 0) / 1024 ** 3).toFixed(1)}GB Used`} icon={Activity} color="text-blue-500" progressBarValue={(latest.memory?.usagePercent || 0).toFixed(0)} isMono={isMono} />
          <StatCard title="Net Latency" value={`${latest.network?.latencyMs?.toFixed(0) || '-'}ms`} sub="Global Ping" icon={Network} color="text-yellow-500" progressBarValue={Math.min(((latest.network?.latencyMs || 0) / 200) * 100, 100)} isMono={isMono} />
          <StatCard title="Containers" value={latest.docker?.filter((c: any) => c.state === 'running').length || 0} sub={`Total: ${latest.docker?.length || 0}`} icon={Box} color="text-purple-500" progressBarValue={(latest.docker?.filter((c: any) => c.state === 'running')?.length || 0) / (latest.docker?.length || 100) * 100} isMono={isMono} />
        </div>

        {/* Charts Grid (Restored Memory & Processes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="CPU Load (%)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor("#10b981")} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor("#10b981")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="cpu" stroke={getColor("#10b981")} strokeWidth={2} fillOpacity={1} fill={"url(#colorCpu)"} name="CPU" />
            </AreaChart>
          </ChartCard>

          {/* combined Memory Composition and Usage */}
          <ChartCard title="Memory Composition (%)">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" Ms" />} />
              <Area type="monotone" dataKey="latencyMs" stroke={getColor("#f59e0b")} strokeWidth={2} fillOpacity={1} fill={"url(#colorLat)"} name="Latency" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Traffic (KB/s)">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" KB/s" />} />
              <Line type="monotone" dataKey="netRx" stroke={getColor("#8b5cf6")} strokeWidth={2} dot={false} name="Rx" />
              <Line type="monotone" dataKey="netTx" stroke={getColor("#ec4899")} strokeWidth={2} dot={false} name="Tx" />
            </LineChart>
          </ChartCard>

          <ChartCard title={`Disk Usage (${latest.disk?.name || '/'})`}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor("#9B5DE5")} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={getColor("#9B5DE5")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border p-2 text-xs rounded shadow z-50">
                      <div className="font-bold mb-1">{data.time}</div>
                      <div className="text-orange-500">Usage: {data.diskUsed}%</div>
                      <div className="text-muted-foreground">Used: {data.diskUsedVal}GB / {data.diskTotalVal}GB</div>
                    </div>
                  )
                }
                return null;
              }} />
              <Area type="step" dataKey="diskUsed" stroke={getColor("#9B5DE5")} strokeWidth={2} fill={"url(#colorDisk)"} name="Disk" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Process State">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Bar dataKey="procRunning" stackId="a" fill={getColor("#10b981")} name="Running" />
              <Bar dataKey="procSleeping" stackId="a" fill={isMono ? 'var(--chart-mono)' : "#334155"} name="Sleeping" opacity={isMono ? 0.5 : 1} />
              <Bar dataKey="procBlocked" stackId="a" fill={getColor("#ef4444")} name="Blocked" />
            </BarChart>
          </ChartCard>
        </div>

        {/* Docker Table */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-purple-500" /> Docker Containers</CardTitle></CardHeader>
          <div className="p-0">
            {latest.docker?.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/70">
                    <tr>
                      <th className="px-6 py-3">Container</th>
                      <th className="px-6 py-3">Image</th>
                      <th className="px-6 py-3">State</th>
                      <th className="px-6 py-3 text-right">CPU</th>
                      <th className="px-6 py-3 text-right">Memory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.docker.map((c: any) => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/${id}/docker/${c.id}`)}>
                        <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                        <td className="px-6 py-4 text-muted-foreground font-mono">{c.image.split(':')[0]}</td>
                        <td className="px-6 py-4"><Badge variant={c.state === 'running' ? 'success' : 'secondary'}>{c.state}</Badge></td>
                        <td className="px-6 py-4 text-right font-mono">{c.cpuPercent.toFixed(2)}%</td>
                        <td className="px-6 py-4 text-right font-mono">{c.memoryPercent.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No containers detected.</div>
            )}
          </div>
        </Card>
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
    </DashboardLayout>
  );
}

// Helpers
const StatCard = ({ title, value, sub, icon: Icon, color, progressBarValue, isMono }: any) => {
  const colorMap: Record<string, string> = {
    "text-emerald-500": "bg-emerald-500",
    "text-blue-500": "bg-blue-500",
    "text-yellow-500": "bg-yellow-500",
    "text-purple-500": "bg-purple-500",
  }

  // Mono overrides
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  const barClass = isMono ? 'bg-[hsl(var(--chart-mono))]' : colorMap[color];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1 flex items-center">{sub}</p>}
        {
          progressBarValue >= 0 && <div className="h-1.5 mt-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${barClass}`} style={{ width: `${progressBarValue}%` }} />
          </div>
        }
      </CardContent>
    </Card>
  )
};