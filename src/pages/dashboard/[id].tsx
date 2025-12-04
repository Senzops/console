import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth';
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../components/ui/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { Activity, Box, Cpu, HardDrive, Network, Clock, RefreshCw, Trash2, AlertTriangle, Layers } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.fill || entry.color }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Updated Uptime Logic ---
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

    // 2. Process Real-time Gap (Crucial Fix)
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
        {/* Render standardized buckets */}
        {Array.from({ length: 60 }).map((_, i) => {
          // Map visual buckets to actual data blocks
          const blockIndex = Math.floor((i / 60) * blocks.length);
          const block = blocks[blockIndex];

          // If we don't have data for this bucket yet (future), render grey
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
  if (error || !vps) return <DashboardLayout><div className="p-8 text-destructive">Failed to load instance data.</div></DashboardLayout>;

  const latest = history && history.length > 0 ? history[0].metrics : {};

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
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Up: {((latest.uptimeSeconds || 0) / 3600).toFixed(1)}h</div>
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

        <div className="px-1"><UptimeStrip history={history} limit={timeLimit} /></div>

        {/* 1. Stat Cards (Center Aligned Items) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="CPU Usage" value={`${(latest.cpu?.usagePercent || 0).toFixed(1)}%`} icon={Cpu} color="text-emerald-500" sub={`${latest.cpu?.cores} Cores`} />
          <StatCard title="Memory" value={`${(latest.memory?.usagePercent || 0).toFixed(1)}%`} sub={`${((latest.memory?.used || 0) / 1024 ** 3).toFixed(1)}GB / ${((latest.memory?.total || 0) / 1024 ** 3).toFixed(1)}GB Used`} icon={Activity} color="text-blue-500" />
          <StatCard title="Net Latency" value={`${latest.network?.latencyMs?.toFixed(0) || '-'}ms`} sub="Global Ping" icon={Network} color="text-yellow-500" />
          <StatCard title="Containers" value={latest.docker?.filter((c: any) => c.state === 'running').length || 0} sub={`Total: ${latest.docker?.length || 0}`} icon={Box} color="text-purple-500" />
        </div>

        {/* 2. Charts Grid (Restored Memory & Processes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="CPU Load (%)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU" />
            </AreaChart>
          </ChartCard>

          {/* <ChartCard title="Memory Usage (%)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" stackId="1" dataKey="memUsed" stroke="#3b82f6" fill="url(#colorMem)" name="Usage" />
            </AreaChart>
          </ChartCard> */}

          {/* <ChartCard title="Memory Composition (%)">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" stackId="1" dataKey="memActive" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Active" />
              <Area type="monotone" stackId="1" dataKey="memFree" stroke="#64748b" fill="#64748b" fillOpacity={0.3} name="Free" />
            </AreaChart>
          </ChartCard> */}

          {/* combined Memory Composition and Usage */}
          <ChartCard title="Memory Composition (%)">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="memUsed" stroke="#6c28d8" fill="#6c28d8" fillOpacity={0.15} name="Usage" />
              <Area type="monotone" dataKey="memActive" stroke="#4D6AFF" fill="#4D6AFF" fillOpacity={0.2} name="Active" />
              <Area type="monotone" dataKey="memFree" stroke="#9a9aff" fill="#9a9aff" fillOpacity={0.25} name="Free" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Latency (Ms)">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" Ms" />} />
              <Area type="monotone" dataKey="latencyMs" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Traffic (KB/s)">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" KB/s" />} />
              <Line type="monotone" dataKey="netRx" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Rx" />
              <Line type="monotone" dataKey="netTx" stroke="#ec4899" strokeWidth={2} dot={false} name="Tx" />
            </LineChart>
          </ChartCard>

          <ChartCard title={`Disk Usage (${latest.disk?.name || '/'})`}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9B5DE5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#9B5DE5" stopOpacity={0} />
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
              <Area type="step" dataKey="diskUsed" stroke="#9B5DE5" strokeWidth={2} fill="url(#colorDisk)" name="Disk" />
            </AreaChart>
          </ChartCard>

          {/* Restored Process Graph */}
          <ChartCard title="Process State">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Bar dataKey="procRunning" stackId="a" fill="#10b981" name="Running" />
              <Bar dataKey="procSleeping" stackId="a" fill="#334155" name="Sleeping" />
              <Bar dataKey="procBlocked" stackId="a" fill="#ef4444" name="Blocked" />
            </BarChart>
          </ChartCard>
        </div>

        {/* 3. Docker Table */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-purple-500" /> Docker Containers</CardTitle></CardHeader>
          <div className="p-0">
            {latest.docker?.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
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
                      <tr
                        key={c.id}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/${id}/docker/${c.id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                        <td className="px-6 py-4 text-muted-foreground font-mono">{c.image.split(':')[0]}</td>
                        <td className="px-6 py-4">
                          <Badge variant={c.state === 'running' ? 'success' : 'secondary'}>{c.state}</Badge>
                        </td>
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
const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1 flex items-center">{sub}</p>}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children }: any) => (
  <Card className="flex flex-col h-[300px]">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 min-h-0 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </CardContent>
  </Card>
);