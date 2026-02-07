import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Activity, Clock, Trash2, AlertTriangle, Maximize2, X, RefreshCw, Box, Code, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Helpers ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'POST': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'PUT': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-secondary text-muted-foreground';
  }
};

// ... (Reusable ChartCard, StatCard, CustomTooltip - Same as other pages) ...
// Copying streamlined versions for self-containment

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
        <div className="flex items-center gap-4"><CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>{actions}</div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
    </CardHeader>
  );
  const Content = (
    <Card className={`flex flex-col transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl border-orange-500/50' : 'h-[400px]'}`}>
       {Header}
       <CardContent className="flex-1 min-h-0 relative px-0 pb-0 overflow-hidden"><div className="w-full h-full relative [&_.recharts-wrapper]:outline-none">{children}</div></CardContent>
    </Card>
  );
  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.fill || entry.color || entry.stroke }}>
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
};

export default function ApmDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();
  
  const [range, setRange] = useState('24h');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/apm/${id}/stats?range=${range}` : null, 
    fetcher,
    { refreshInterval: 10000 }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/apm/${id}`); router.push('/dashboard'); } 
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  const formattedGraph = useMemo(() => {
    if (!data?.graph) return [];
    return data.graph.map((point: any) => ({
      ...point,
      time: new Date(point.time).toLocaleString(undefined, { 
        month: range === '24h' ? undefined : 'short', day: range === '24h' ? undefined : 'numeric', hour: 'numeric', minute: range === '24h' ? '2-digit' : undefined 
      })
    }));
  }, [data?.graph, range]);

  if (!data && !error) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-orange-500" /></div></DashboardLayout>;
  if (error || !data?.meta) return <DashboardLayout><div className="p-8 text-destructive">Service not found.</div></DashboardLayout>;

  const { meta, overview, routes, graph, clients } = data;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
               <Badge variant="outline" className="border-orange-500/20 text-orange-500 bg-orange-500/10 flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Node.js / API
               </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
               <Code className="h-3 w-3" /> {meta._id}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select className="w-32 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></Button>
            <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard title="Total Requests" value={formatNumber(overview.totalRequests)} sub="Calls to API" icon={Zap} color="text-orange-500" isMono={isMono} />
           <StatCard title="Error Rate" value={`${overview.errorRate.toFixed(2)}%`} sub={`${overview.totalErrors} Failures`} icon={AlertOctagon} color="text-red-500" isMono={isMono} />
           <StatCard title="Avg Latency" value={`${Math.round(overview.avgLatency)}ms`} sub="Response Time" icon={Clock} color="text-blue-500" isMono={isMono} />
           <StatCard title="P99 Latency" value={`${Math.round(overview.maxLatency)}ms`} sub="Slowest 1%" icon={Activity} color="text-purple-500" isMono={isMono} />
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ChartCard title="Throughput (Req vs Errors)">
              <div className="p-4 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedGraph}>
                    {!isMono && <defs><linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>}
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="requests" stroke={getColor("#f97316")} fill={getFill("url(#colorReq)")} strokeWidth={2} name="Requests" />
                    <Area type="monotone" dataKey="errors" stroke={getColor("#ef4444")} fill={getColor("#ef4444")} strokeWidth={2} name="Errors" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </ChartCard>

           <ChartCard title="Latency Trend (ms)">
              <div className="p-4 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedGraph}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgLatency" stroke={getColor("#3b82f6")} strokeWidth={2} dot={false} name="Avg Latency" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </ChartCard>
        </div>

        {/* Routes Table */}
        <Card className="flex flex-col h-[500px]">
           <CardHeader className="py-4 border-b border-border/40"><CardTitle>Top Endpoints</CardTitle></CardHeader>
           <CardContent className="p-0 flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
                    <tr>
                       <th className="px-6 py-3 font-medium">Method</th>
                       <th className="px-6 py-3 font-medium w-full">Route</th>
                       <th className="px-6 py-3 text-right font-medium">Reqs</th>
                       <th className="px-6 py-3 text-right font-medium">Errors</th>
                       <th className="px-6 py-3 text-right font-medium">Latency</th>
                    </tr>
                 </thead>
                 <tbody>
                    {routes.map((r: any, i: number) => (
                       <tr key={i} className="border-b border-border hover:bg-muted/20 group">
                          <td className="px-6 py-3">
                             <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 border-0 ${getMethodColor(r.method)}`}>{r.method}</Badge>
                          </td>
                          <td className="px-6 py-3 font-mono text-xs truncate max-w-[300px]">{r.route}</td>
                          <td className="px-6 py-3 text-right font-mono text-xs">{formatNumber(r.count)}</td>
                          <td className="px-6 py-3 text-right font-mono text-xs text-red-500">{r.errorRate > 0 ? `${r.errorRate.toFixed(1)}%` : '-'}</td>
                          <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{Math.round(r.avgLatency)}ms</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Service?">
        {/* ... Delete Confirmation ... */}
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{meta.name}</strong> and all traces.</div></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}