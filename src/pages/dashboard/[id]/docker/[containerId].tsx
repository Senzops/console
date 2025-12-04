import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../../../lib/auth';
import { DashboardLayout } from '../../../../components/Layout';
import { Card, CardHeader, CardTitle, Badge, Button, CardContent } from '../../../../components/ui/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Box } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DockerDetail() {
  const router = useRouter();
  const { id, containerId } = router.query;
  const { data } = useSWR(id ? `/vps/${id}/stats` : null, fetcher);

  // 1. Destructure safely
  const { history } = data || {};

  // 2. Always call useMemo (Rules of Hooks)
  const chartData = useMemo(() => {
    if (!history) return [];

    return history.map((run: any) => {
      const c = run.metrics.docker.find((d: any) => d.id === containerId);
      if (!c) return null; // Container wasn't running during this tick
      return {
        time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: c.cpuPercent,
        memPercent: c.memoryPercent,
        memUsed: (c.memoryUsage / 1024 / 1024), // MB
        memLimit: (c.memoryLimit / 1024 / 1024), // MB
        memFree: ((c.memoryLimit - c.memoryUsage) / 1024 / 1024) // MB
      };
    }).filter(Boolean); // Remove nulls (times when container was offline)
  }, [history, containerId]);

  // 3. Conditional Return AFTER hooks
  if (!data) return <DashboardLayout><div className="p-8">Loading Container Data...</div></DashboardLayout>;

  const latestRun = history[history.length - 1];
  const containerCurrent = latestRun?.metrics.docker.find((c: any) => c.id === containerId);

  if (!containerCurrent) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Card className="p-8 text-center text-muted-foreground">Container not found in latest run.</Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0 hover:bg-transparent hover:text-emerald-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Instance
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{containerCurrent.name}</h1>
            <div className="flex gap-2 text-sm text-muted-foreground font-mono">
              {containerCurrent.image} • <span className="text-foreground">{containerCurrent.id.substring(0, 12)}</span>
            </div>
          </div>
          <div className="ml-auto">
            <Badge variant={containerCurrent.state === 'running' ? 'success' : 'secondary'} className="text-sm px-3 py-1">
              {containerCurrent.state}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* CPU Chart */}
          <ChartCard title="CPU Usage (%)" color="#8b5cf6">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ChartCard>

          {/* Memory Percent */}
          <ChartCard title="Memory Usage (%)" color="#3b82f6">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
              <Area type="monotone" dataKey="memPercent" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ChartCard>

          {/* Memory Usage vs Limit */}
          <ChartCard title="Memory Capacity (MB)" color="#10b981">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
              <Area type="monotone" stackId="1" dataKey="memUsed" stroke="#ef4444" fill="#ef4444" name="Used" />
              <Area type="monotone" stackId="1" dataKey="memFree" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Free" />
            </AreaChart>
          </ChartCard>

        </div>
      </div>
    </DashboardLayout>
  );
}

const ChartCard = ({ title, children, color }: any) => (
  <Card className="h-[350px] flex flex-col">
    <CardHeader className="pb-2 border-b border-border/50">
      <CardTitle className="text-sm font-medium" style={{ color }}>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 min-h-0 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </CardContent>
  </Card>
);