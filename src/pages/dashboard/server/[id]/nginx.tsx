import { useMemo, } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { useTheme } from '../../../../lib/theme';
import { DashboardLayout } from '../../../../components/Layout';
import { Badge, Button, Spinner } from '../../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { ArrowLeft, CloudLightning, Activity, RefreshCw } from 'lucide-react';
import { ChartCard, CustomTooltip, fetcher, StatCard } from '.';

export default function NginxDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const { data } = useSWR(token && id ? `/vps/${id}/stats` : null, fetcher);
  const { vps, history } = data || {};

  const chartData = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((run: any) => ({
        time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reqPerSec: run.metrics.nginx?.reqPerSec || 0,
        active: run.metrics.nginx?.activeConnections || 0,
        reading: run.metrics.nginx?.reading || 0,
        writing: run.metrics.nginx?.writing || 0,
        waiting: run.metrics.nginx?.waiting || 0,
      }));
  }, [history]);

  if (!data) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-emerald-500" /></div></DashboardLayout>;

  const latest = history && history.length > 0 ? history[0].metrics?.nginx || {} : {};
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0 hover:bg-transparent hover:text-emerald-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Server
        </Button>

        <div className="flex items-center gap-4 mb-4">
          <div className={`h-12 w-12 rounded bg-emerald-500/10 flex items-center justify-center ${isMono ? 'text-muted-foreground' : 'text-emerald-500'}`}>
            <CloudLightning className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Nginx Web Server</h1>
            <div className="flex gap-2 text-sm text-muted-foreground font-mono">
              High Performance Load Balancer
            </div>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="text-sm px-3 py-1 text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
              Active
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Active Connections" value={latest.activeConnections || 0} icon={Activity} color="text-emerald-500" />
          <StatCard title="Requests / Sec" value={(latest.reqPerSec || 0).toFixed(1)} icon={RefreshCw} color="text-emerald-500" />
          <StatCard title="Total Requests" value={(latest.requests || 0).toLocaleString()} icon={Activity} color="text-blue-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Request Rate (req/s)">
            <AreaChart data={chartData} className="outline-none">
              {!isMono && <defs><linearGradient id="colorNginx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit=" rps" />} />
              <Area type="monotone" dataKey="reqPerSec" stroke={getColor("#10b981")} strokeWidth={2} fill={isMono ? getColor("#10b981") : "url(#colorNginx)"} name="Req/Sec" animationDuration={1500} />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Connection State">
            <BarChart data={chartData} className="outline-none">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Bar dataKey="reading" stackId="a" fill={getColor("#3b82f6")} name="Reading" animationDuration={1500} />
              <Bar dataKey="writing" stackId="a" fill={getColor("#10b981")} name="Writing" animationDuration={1500} />
              <Bar dataKey="waiting" stackId="a" fill={getColor("#f59e0b")} name="Waiting" animationDuration={1500} />
            </BarChart>
          </ChartCard>
        </div>
      </div>
    </DashboardLayout>
  );
}