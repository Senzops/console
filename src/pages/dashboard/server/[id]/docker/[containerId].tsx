import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '../../../../../lib/auth';
import { useTheme } from '../../../../../lib/theme';
import { Card, CardHeader, CardTitle, Badge, Button, CardContent, Spinner } from '../../../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Box, Maximize, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label, unit = '%' }: any) => {
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

const ChartCard = ({ title, children, color, isMono }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const titleColor = isMono ? 'text-muted-foreground' : undefined;

  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[350px]'}`}>
      <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium" style={{ color: !isMono ? color : undefined }}>{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6  text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
          {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-4 relative">
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

export default function DockerDetail() {
  const router = useRouter();
  const { id, containerId } = router.query;
  const { data } = useSWR(id ? `/vps/${id}/stats` : null, fetcher);
  const { isMono } = useTheme();

  const { history } = data || {};

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map((run: any) => {
      const c = run.metrics.docker.find((d: any) => d.id === containerId);
      if (!c) return null;
      return {
        time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: c.cpuPercent,
        memPercent: c.memoryPercent,
        memUsed: (c.memoryUsage / 1024 / 1024), // MB
        memLimit: (c.memoryLimit / 1024 / 1024), // MB
        memFree: ((c.memoryLimit - c.memoryUsage) / 1024 / 1024) // MB
      };
    }).filter(Boolean);
  }, [history, containerId]);

  if (!data) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Loading Container Data...</p></div></>;

  const latestRun = history[history.length - 1];
  const containerCurrent = latestRun?.metrics.docker.find((c: any) => c.id === containerId);

  if (!containerCurrent) {
    return (
      <>
        <div className="p-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Card className="p-8 text-center text-muted-foreground">Container not found in latest run.</Card>
        </div>
      </>
    )
  }

  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <>
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0 hover:bg-transparent hover:text-emerald-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Server
        </Button>

        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded bg-purple-500/10 flex items-center justify-center ${isMono ? 'text-muted-foreground' : 'text-purple-500'}`}>
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
          <ChartCard title="CPU Usage (%)" color="#8b5cf6" isMono={isMono}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="cpu" stroke={getColor("#8b5cf6")} fill={getFill("#8b5cf6")} fillOpacity={0.2} />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Memory Usage (%)" color="#3b82f6" isMono={isMono}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="memPercent" stroke={getColor("#3b82f6")} fill={getFill("#3b82f6")} fillOpacity={0.2} />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Memory Capacity (MB)" color="#10b981" isMono={isMono}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" MB" />} />
              <Area type="monotone" stackId="1" dataKey="memUsed" stroke={getColor("#ef4444")} fill={getFill("#ef4444")} name="Used" />
              <Area type="monotone" stackId="1" dataKey="memFree" stroke={getColor("#10b981")} fill={getFill("#10b981")} fillOpacity={0.2} name="Free" />
            </AreaChart>
          </ChartCard>
        </div>
      </div>
    </>
  );
}