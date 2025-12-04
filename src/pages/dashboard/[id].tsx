import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth'; // Ensure useAuth is imported
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../components/ui/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend } from 'recharts';
import { Activity, Box, Cpu, HardDrive, Network, Clock, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.color }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Uptime Strip Component ---
const UptimeStrip = ({ history, limit }: { history: any[], limit: number }) => {
  // Logic: Divide the time range into blocks. If a block has no data, it's 'down' or 'missing'.
  // Since we have precise timestamps, we can just iterate.
  // 1 Min Interval. If gap > 2 mins, mark down.

  const blocks = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Reverse to chronological (Old -> New)
    const chrono = [...history].reverse();
    const result = [];

    // Iterate and look for gaps
    for (let i = 0; i < chrono.length - 1; i++) {
      const t1 = new Date(chrono[i].createdAt).getTime();
      const t2 = new Date(chrono[i + 1].createdAt).getTime();
      const diffMins = (t2 - t1) / 1000 / 60;

      // Add "Up" block for the current point
      result.push({ status: 'up', time: chrono[i].createdAt });

      // If gap > 3 mins (buffer), insert a "Down" block
      if (diffMins > 3) {
        result.push({ status: 'down', count: Math.floor(diffMins), time: chrono[i + 1].createdAt });
      }
    }
    // Add last point
    result.push({ status: 'up', time: chrono[chrono.length - 1].createdAt });
    return result;
  }, [history]);

  // Calculate Uptime %
  const uptimePct = useMemo(() => {
    if (!history?.length) return 100;
    const totalPoints = history.length;
    const idealPoints = limit; // Roughly
    // Simple heuristic: (Actual / Ideal) * 100, capped at 100
    // Better: (Total Duration - Downtime Duration) / Total Duration
    // For now, let's use the points ratio for simplicity as "Data Availability"
    return Math.min(100, (totalPoints / limit) * 100).toFixed(1);
  }, [history, limit]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">System Uptime</span>
        <span className={Number(uptimePct) > 98 ? "text-emerald-500" : "text-yellow-500"}>{uptimePct}% Availability</span>
      </div>
      <div className="h-2 w-full flex gap-[2px] overflow-hidden rounded-full bg-secondary/50">
        {/* We render max 60 bars to prevent DOM overload. For larger ranges, we aggregate. */}
        {blocks.length > 0 ? (
          Array.from({ length: 60 }).map((_, i) => {
            // Map the 0-60 index to our blocks array
            const blockIndex = Math.floor((i / 60) * blocks.length);
            const block = blocks[blockIndex];
            // Default to 'up' if data exists, grey if future/unknown
            if (!block) return <div key={i} className="flex-1 bg-secondary" />;

            let color = "bg-emerald-500";
            if (block.status === 'down') color = "bg-destructive";

            return (
              <div key={i} className={`flex-1 rounded-sm ${color} opacity-80`} title={new Date(block.time).toLocaleTimeString()} />
            )
          })
        ) : (
          <div className="w-full bg-secondary h-full" />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{limit / 60}h ago</span>
        <span>Now</span>
      </div>
    </div>
  )
}

export default function VpsDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth(); // Get token to fix "first call fails"

  const [timeLimit, setTimeLimit] = useState(60); // Default 1 hour (60 mins)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR Key depends on token AND id. If either missing, it won't fetch.
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/vps/${id}/stats?limit=${timeLimit}` : null,
    fetcher,
    { refreshInterval: 60000 } // Auto refresh every minute
  );

  const { vps, history } = data || {};

  // Delete Handler
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/vps/${id}`);
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  }

  // --- Process Data for Charts ---
  const chartData = useMemo(() => {
    if (!history) return [];
    // Sort chronological for graphs
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
      procBlocked: run.metrics.processes?.blocked || 0,
      procRunning: run.metrics.processes?.running || 0,
      procSleeping: run.metrics.processes?.sleeping || 0,
    }));
  }, [history]);

  // Loading State
  if (!data && !error) return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Spinner className="h-8 w-8 text-emerald-500" />
        <p>Fetching Telemetry...</p>
      </div>
    </DashboardLayout>
  );

  if (error || !vps) return <DashboardLayout><div className="p-8 text-destructive">Error loading VPS data.</div></DashboardLayout>;

  const latest = history && history.length > 0 ? history[0].metrics : {}; // Backend returns sorted desc, so 0 is latest

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{vps.name}</h1>
              {vps.status === 'online' ? <Badge variant="success" className="animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]">Online</Badge> : <Badge variant="destructive">Offline</Badge>}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {latest.cpu?.cores || '-'} Cores</div>
              <div className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {latest.os?.distro || 'Unknown'} {latest.os?.release || ''}</div>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime: {((latest.uptimeSeconds || 0) / 3600).toFixed(1)}h</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              className="w-32 bg-background"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            >
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

        {/* Uptime Strip */}
        <div className="px-1">
          <UptimeStrip history={history} limit={timeLimit} />
        </div>

        {/* 1. Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="CPU Usage" value={`${(latest.cpu?.usagePercent || 0).toFixed(1)}%`} icon={Cpu} color="text-emerald-500" />
          <StatCard title="Memory" value={`${(latest.memory?.usagePercent || 0).toFixed(1)}%`} sub={`${((latest.memory?.used || 0) / 1024 ** 3).toFixed(1)} / ${((latest.memory?.total || 0) / 1024 ** 3).toFixed(1)} GB`} icon={Activity} color="text-blue-500" />
          <StatCard title="Net Latency" value={`${latest.network?.latencyMs?.toFixed(0) || '-'}ms`} sub="Global Ping" icon={Network} color="text-yellow-500" />
          <StatCard title="Containers" value={latest.docker?.filter((c: any) => c.state === 'running').length || 0} sub={`Total: ${latest.docker?.length || 0}`} icon={Box} color="text-purple-500" />
        </div>

        {/* 2. Charts Grid */}
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

          <ChartCard title="Memory Composition (%)">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" stackId="1" dataKey="memActive" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Active" />
              <Area type="monotone" stackId="1" dataKey="memFree" stroke="#64748b" fill="#64748b" fillOpacity={0.3} name="Free" />
            </AreaChart>
          </ChartCard>

          <ChartCard title={`Disk Usage (${latest.disk?.name || '/'})`}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                      <div className="text-yellow-500">Usage: {data.diskUsed}%</div>
                      <div className="text-muted-foreground">Used: {data.diskUsedVal}GB / {data.diskTotalVal}GB</div>
                    </div>
                  )
                }
                return null;
              }} />
              <Area type="step" dataKey="diskUsed" stroke="#f59e0b" strokeWidth={2} fill="url(#colorDisk)" name="Disk" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Network Traffic (KB/s)">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" KB/s" />} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="netRx" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Received" />
              <Line type="monotone" dataKey="netTx" stroke="#ec4899" strokeWidth={2} dot={false} name="Sent" />
            </LineChart>
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
                        <td className="px-6 py-4 text-muted-foreground">{c.image.split(':')[0]}</td>
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
              This will permanently delete <strong>{vps.name}</strong> and all its historical telemetry data. The API key will be invalidated immediately.
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

// Helper Components
const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children }: any) => (
  <Card className="flex flex-col h-[300px]">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 min-h-0 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </CardContent>
  </Card>
);