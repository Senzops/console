import { useState, useMemo, useContext, createContext } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Trash2, AlertTriangle, X, RefreshCw, Globe, Maximize } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Helpers ---
const formatLatency = (ms: number) => ms > 0 ? `${ms.toFixed(0)}ms` : '-';

const getHealthBadge = (uptime: number, latency: number) => {
  if (uptime >= 99.9 && latency < 500) return { label: 'Excellent', color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' };
  if (uptime >= 99) return { label: 'Good', color: 'text-blue-500 border-blue-500/20 bg-blue-500/10' };
  if (uptime >= 95) return { label: 'Degraded', color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' };
  return { label: 'Critical', color: 'text-destructive border-destructive/20 bg-destructive/10' };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{new Date(label).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}</p>
        <div className="flex items-center gap-2 text-emerald-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Latency: <span className="font-mono">{payload[0].value}ms</span></span>
        </div>
      </div>
    );
  }
  return null;
};

// --- Reusable Chart Card ---
const ChartCard = ({ title, children }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Content = (
    <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[350px]'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6  text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>
          {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 relative px-4 pb-4">
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
      <Card className={`flex flex-col ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95' : 'h-[400px]'}`}>
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

const DistributionTable = ({ data }: { data: any[] }) => {
  const { isMaximized, toggle } = useContext(DistributionContext);
  const filteredData = useMemo(() => {
    return data;
  }, [data]);
  if (!data?.length) return null;

  const limit = isMaximized ? filteredData.length : 5;
  const visibleData = filteredData.slice(0, limit);
  const hiddenCount = filteredData.length - limit;

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
          <tr><th className="px-6 py-3">Time</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Code</th><th className="px-6 py-3 text-right">Latency</th></tr>
        </thead>
        <tbody>
          {visibleData.map((run: any) => {
            return (
              <tr key={run._id} className="border-b border-border hover:bg-muted/20">
                <td className="px-6 py-3 font-mono text-xs">{new Date(run.createdAt).toLocaleString()}</td>
                <td className="px-6 py-3">
                  <Badge variant={run.status === 'up' ? 'success' : run.status === 'timeout' ? 'warning' : 'destructive'} className="uppercase text-[10px] px-2">
                    {run.status}
                  </Badge>
                </td>
                <td className="px-6 py-3 font-mono"><SmartAnimatedValue value={run.statusCode} /></td>
                <td className="px-6 py-3 text-right font-mono text-muted-foreground"><SmartAnimatedValue value={`${run.latency}ms`} /></td>
              </tr>
            )
          })}

          {/* Show More Row */}
          {hiddenCount > 0 && (
            <tr
              className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={toggle}
            >
              <td colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
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

const UptimeStrip = ({ history }: { history: any[] }) => {
  // Show last 60 checks or fill empty
  const checks = history.slice(0, 60).reverse(); // Oldest -> Newest
  const filledChecks = [...Array(Math.max(0, 60 - checks.length)).fill(null), ...checks];

  return (
    <div className="space-y-2 bg-card/50 p-4 rounded-xl border">
      <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <span>Last 60 Checks</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Up</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-destructive" /> Down</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Timeout</span>
        </span>
      </div>
      <div className="h-8 w-full flex gap-[2px]">
        {filledChecks.map((run, i) => {
          if (!run) return <div key={i} className="flex-1 bg-secondary/30 rounded-sm" />;

          let color = "bg-emerald-500";
          if (run.status === 'down') color = "bg-destructive";
          if (run.status === 'timeout') color = "bg-yellow-500";

          return (
            <div
              key={run._id || i}
              className={`flex-1 rounded-sm ${color} transition-all hover:scale-y-125 hover:opacity-80 relative group`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover border border-border text-[10px] px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap">
                {new Date(run.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })} • {run.latency}ms • {run.statusCode || 'Err'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const StatCard = ({ title, value, sub, icon: Icon, color, isMono, textColor }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className={`text-sm font-medium text-muted-foreground flex items-center gap-2`}>{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className={`text-2xl font-bold capitalize ${textColor ?? "text-foreground"}`}><SmartAnimatedValue value={value} /></div>
        {sub && <p className="text-xs text-muted-foreground mt-1"><SmartAnimatedValue value={sub} /></p>}
      </CardContent>
    </Card>
  )
};

export default function MonitorDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [range, setRange] = useState('24h');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/uptime/${id}/stats?range=${range}` : null,
    fetcher,
    { refreshInterval: 60000 } // Auto refresh every minute
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/uptime/${id}`); router.push('/dashboard'); }
    catch (e) {
      console.error(e); setIsDeleting(false);
      toast.error(extractErrorMessage(e, 'Failed to delete monitor'));
    }
  }

  // --- Process Chart Data (Reverse to Chronological) ---
  const chartData = useMemo(() => {
    if (!data?.history) return [];
    // History comes newest-first. Reverse it for the graph to show Old -> New.
    return [...data.history].reverse();
  }, [data?.history]);

  if (!data && !error) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Server...</p></div></DashboardLayout>;
  if (error || !data?.monitor) return <DashboardLayout><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load server data.</div></div></DashboardLayout>;

  const { monitor, stats, history } = data;
  const health = getHealthBadge(stats.uptime, stats.avgLatency);
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{monitor.name}</h1>
              <Badge variant="outline" className={`animate-pulse ${health.color}`}>
                {health.label}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-3">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> <a href={monitor.url} target="_blank" rel="noreferrer" className="hover:underline">{monitor.url}</a></span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {monitor.interval}m Interval</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select className="w-32 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="24h">Last 24 Hours</option>
              <option value="2d">Last 2 Days</option>
              <option value="5d">Last 5 Days</option>
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

        {/* Uptime Strip */}
        <UptimeStrip history={history} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title={`Uptime(${range})`} value={`${stats.uptime.toFixed(2)}%`} sub={`Target: 99.9%`} icon={Activity} color="text-emerald-500" isMono={isMono} />
          <StatCard title={`Avg Latency`} value={`${Math.round(stats.avgLatency)}ms`} sub={`Global Average`} icon={Clock} color="text-blue-500" isMono={isMono} />
          <StatCard title={`Last Check`} value={`${stats.lastStatus}`} sub={`${new Date(stats.lastCheckTime).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit'
          })}`} icon={Globe} color="text-purple-500" isMono={isMono} textColor={stats.lastStatus === 'up' ? 'text-emerald-500' : 'text-destructive'} />
          <StatCard title={`Last Code`} value={`${stats.lastStatusCode || '-'}`} sub={`HTTP Status`} icon={Activity} color="text-yellow-500" isMono={isMono} />
        </div>

        {/* Response Time Graph */}
        <ChartCard title="Response Time (ms)">
          <AreaChart data={chartData}>
            <defs><linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="createdAt" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="latency" stroke={getColor("#3b82f6")} fill={"url(#colorLatency)"} strokeWidth={2} name="Latency" />
          </AreaChart>
        </ChartCard>

        {/* Execution Log Table */}
        <DistributionCard
          title="Recent Checks"
        >
          <DistributionTable data={history} />
        </DistributionCard>

      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Monitor?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{monitor.name}</strong> and all history data.</div></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}