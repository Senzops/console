import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../lib/auth';
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../../components/ui/core';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend
} from 'recharts';
import { Activity, Box, Cpu, HardDrive, Network, Layers, Clock } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.color }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{entry.value.toFixed(2)}{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function VpsDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data, error } = useSWR(id ? `/vps/${id}/stats` : null, fetcher, { refreshInterval: 10000 });

  // 1. Destructure safely (data might be undefined initially)
  const { vps, history } = data || {};

  // 2. Always call useMemo (Rules of Hooks)
  const chartData = useMemo(() => {
    if (!history) return [];

    return history.map((run: any) => ({
      time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: run.metrics.cpu?.usagePercent || 0,
      memUsed: run.metrics.memory?.usagePercent || 0,
      memActive: (run.metrics.memory?.active / run.metrics.memory?.total) * 100 || 0,
      memFree: (run.metrics.memory?.free / run.metrics.memory?.total) * 100 || 0,
      diskUsed: run.metrics.disk?.usagePercent || 0,
      diskTotalVal: (run.metrics.disk?.total / 1e9).toFixed(1), // GB for tooltip
      diskUsedVal: (run.metrics.disk?.used / 1e9).toFixed(1), // GB for tooltip
      netRx: (run.metrics.network?.bytesRecvSec / 1024) || 0, // KB/s
      netTx: (run.metrics.network?.bytesSentSec / 1024) || 0, // KB/s
      procBlocked: run.metrics.processes?.blocked || 0,
      procRunning: run.metrics.processes?.running || 0,
      procSleeping: run.metrics.processes?.sleeping || 0,
    }));
  }, [history]);

  // 3. Conditional Rendering happens AFTER hooks
  if (!data) return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;

  const latest = history[history.length - 1]?.metrics || {};

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{vps.name}</h1>
              {vps.status === 'online' ? <Badge variant="success" className="animate-pulse">Online</Badge> : <Badge variant="destructive">Offline</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {latest.cpu?.cores} Cores ({latest.cpu?.brand})</div>
              <div className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {latest.os?.distro} {latest.os?.release}</div>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime: {(latest.uptimeSeconds / 3600).toFixed(1)}h</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.reload()}>Refresh Data</Button>
          </div>
        </div>

        {/* 1. Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="CPU Usage" value={`${latest.cpu?.usagePercent.toFixed(1)}%`} icon={Cpu} color="text-emerald-500" />
          <StatCard title="Memory" value={`${latest.memory?.usagePercent.toFixed(1)}%`} sub={`${(latest.memory?.used / 1024 ** 3).toFixed(1)} / ${(latest.memory?.total / 1024 ** 3).toFixed(1)} GB`} icon={Activity} color="text-blue-500" />
          <StatCard title="Net Latency" value={`${latest.network?.latencyMs?.toFixed(0) || '-'}ms`} sub="To 8.8.8.8" icon={Network} color="text-yellow-500" />
          <StatCard title="Active Containers" value={latest.docker?.filter((c: any) => c.state === 'running').length || 0} sub={`Total: ${latest.docker?.length || 0}`} icon={Box} color="text-purple-500" />
        </div>

        {/* 2. Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CPU Chart */}
          <ChartCard title="CPU Load">
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

          {/* Memory Stacked (Active vs Free) */}
          <ChartCard title="Memory Composition">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" stackId="1" dataKey="memActive" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Active" />
              <Area type="monotone" stackId="1" dataKey="memFree" stroke="#64748b" fill="#64748b" fillOpacity={0.3} name="Free" />
            </AreaChart>
          </ChartCard>

          {/* Disk Usage */}
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
                    <div className="bg-popover border p-2 text-xs rounded shadow">
                      <div className="font-bold">{data.time}</div>
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

          {/* Network I/O */}
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

          {/* Processes */}
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
    </DashboardLayout>
  );
}

// Helpers
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
    <CardContent className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </CardContent>
  </Card>
);