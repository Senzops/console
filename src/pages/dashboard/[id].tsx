import React from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../lib/auth';
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../../components/ui/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Box, Cpu, HardDrive } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function VpsDetail() {
  const router = useRouter();
  const { id } = router.query;
  // Poll every 30 seconds for fresh data
  const { data, error } = useSWR(id ? `/vps/${id}/stats` : null, fetcher, { refreshInterval: 30000 });

  if (!data) return <DashboardLayout>Loading telemetry...</DashboardLayout>;

  const { vps, history } = data;
  const latest = history[history.length - 1]?.metrics || {};

  // Process data for charts
  const chartData = history.map((run: any) => ({
    time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu: run.metrics.cpu.usagePercent,
    memory: run.metrics.memory.usagePercent,
  }));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{vps.name}</h1>
          {vps.status === 'online' ? <Badge variant="success">System Online</Badge> : <Badge variant="destructive">Offline</Badge>}
        </div>
        <p className="text-muted-foreground">{vps.metadata?.os} • {latest.os?.arch}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard title="CPU Usage" value={`${latest.cpu?.usagePercent.toFixed(1)}%`} icon={Cpu} />
        <StatCard title="Memory" value={`${latest.memory?.usagePercent.toFixed(1)}%`} sub={`${(latest.memory?.used / 1024 / 1024 / 1024).toFixed(1)}GB Used`} icon={Activity} />
        <StatCard title="Disk" value={`${latest.disk?.usagePercent}%`} sub={latest.disk?.name} icon={HardDrive} />
        <StatCard title="Docker Containers" value={latest.docker?.length || 0} icon={Box} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="col-span-1">
          <CardHeader><CardTitle>CPU History</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader><CardTitle>Memory History</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="memory" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMem)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Docker Table */}
      <Card>
        <CardHeader><CardTitle>Docker Containers</CardTitle></CardHeader>
        <CardContent>
          {latest.docker?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 font-medium">Name</th>
                    <th className="py-3 font-medium">Image</th>
                    <th className="py-3 font-medium">State</th>
                    <th className="py-3 font-medium text-right">CPU %</th>
                    <th className="py-3 font-medium text-right">Mem %</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.docker.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.image.substring(0, 20)}...</td>
                      <td className="py-3">
                        <Badge variant={c.state === 'running' ? 'success' : 'secondary'}>{c.state}</Badge>
                      </td>
                      <td className="py-3 text-right">{c.cpuPercent.toFixed(2)}%</td>
                      <td className="py-3 text-right">{c.memoryPercent.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4">No containers detected.</div>
          )}
        </CardContent>
      </Card>

    </DashboardLayout>
  );
}

const StatCard = ({ title, value, sub, icon: Icon }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);