import React, { useState, useMemo, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { DashboardLayout } from '../Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, Spinner, Dialog } from '../Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Activity, Clock, Trash2, AlertTriangle, Maximize2, X, RefreshCw, Box, Code, AlertOctagon, Zap, ArrowRight, ArrowLeft, Search, Layers, Globe, Smartphone, Monitor, Laptop, Map as MapIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { WorldMap } from '../WorldMap';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- HELPERS ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

const getMethodColor = (method: string) => {
  switch (method?.toUpperCase()) {
    case 'GET': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'POST': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'PUT': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-secondary text-muted-foreground';
  }
};

const getCountryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch { return code; }
};

// --- COMPONENTS ---

const CustomTooltip = ({ active, payload, label, unit = '', labelFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{labelFormatter ? labelFormatter(label) : label}</p>
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

// Context for Expanding Cards
const ChartContext = createContext<{ isMaximized: boolean; toggle: () => void }>({ isMaximized: false, toggle: () => {} });

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);
  
  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
        <div className="flex items-center gap-4"><CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>{actions}</div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={toggle}>{isMaximized ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
    </CardHeader>
  );
  
  const Content = (
    <ChartContext.Provider value={{ isMaximized, toggle }}>
      <Card className={`flex flex-col transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl border-orange-500/50' : 'h-[400px]'}`}>
         {Header}
         <CardContent className="flex-1 min-h-0 relative px-0 pb-0 overflow-hidden"><div className="w-full h-full relative">{children}</div></CardContent>
      </Card>
    </ChartContext.Provider>
  );
  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? 'text-[hsl(var(--chart-mono))]' : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2"><p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p><Icon className={`h-4 w-4 ${iconClass}`} /></div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
};

// Adaptive Table for Distribution (System/Geo/Endpoints)
const DistributionTable = ({ data, total, type, renderRow, filterPlaceholder, hidePercent }: any) => {
  const { isMaximized, toggle } = useContext(ChartContext);
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!filter) return data;
    return data.filter((item: any) => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  const limit = isMaximized ? filteredData.length : 6;
  const visibleData = filteredData.slice(0, limit);
  const hiddenCount = filteredData.length - limit;

  return (
    <div className="w-full h-full flex flex-col">
       {/* Inject search bar if maximized or if filterPlaceholder provided explicitly */}
       {isMaximized && (
         <div className="px-4 py-2 border-b border-border/40">
            <div className="relative"><Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none" placeholder={filterPlaceholder || "Filter..."} value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
         </div>
       )}
       <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-20">
              <tr>
                <th className="px-4 py-2 font-medium w-full">Name</th>
                <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Count</th>
                {!hidePercent && <th className="px-4 py-2 text-right font-medium w-16">%</th>}
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item: any, i: number) => {
                if (renderRow) return renderRow(item, i); // Custom row renderer
                
                // Default renderer (Geo/Sys)
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                const name = type === 'geo' ? getCountryName(item._id) : item._id;
                let Icon = null;
                if (type === 'geo') {
                   const code = item._id.toLowerCase();
                   if(code.length === 2) Icon = <img src={`https://flagcdn.com/20x15/${code}.png`} alt={code} className="w-4 h-3 mr-2 object-cover rounded-[1px] shadow-sm inline-block" />;
                   else Icon = <MapIcon className="w-3 h-3 mr-2 inline-block text-muted-foreground" />;
                }
                return (
                  <tr key={i} className="group relative border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td colSpan={3} className="p-0 h-full absolute inset-0 pointer-events-none"><div className="h-[calc(100%-2px)] my-[1px] bg-muted/40 transition-all duration-500 origin-left" style={{ width: `${percent}%` }} /></td>
                    <td className="px-4 py-2.5 relative z-10 truncate max-w-[200px] flex items-center">{Icon}<span className="truncate block w-full" title={name}>{name}</span></td>
                    <td className="px-4 py-2.5 relative z-10 text-right font-mono text-xs">{formatNumber(item.count)}</td>
                    <td className="px-4 py-2.5 relative z-10 text-right text-xs text-muted-foreground">{percent}%</td>
                  </tr>
                )
              })}
              {!isMaximized && hiddenCount > 0 && (
                <tr className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group" onClick={toggle}>
                  <td colSpan={3} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Show {hiddenCount} more...</td>
                </tr>
              )}
              {visibleData.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">No data found</td></tr>}
            </tbody>
          </table>
       </div>
    </div>
  )
};


// 4. Endpoints Table (Dedicated Component for Complex Row)
const EndpointsTable = ({ routes, serviceId }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredRoutes = useMemo(() => {
    if (!filter) return routes;
    return routes.filter((r: any) => r.route.toLowerCase().includes(filter.toLowerCase()));
  }, [routes, filter]);

  // Limit to 6 when minimized
  const limit = isMaximized ? filteredRoutes.length : 6;
  const visibleRoutes = filteredRoutes.slice(0, limit);
  const hiddenCount = filteredRoutes.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
       <CardTitle className="text-sm font-medium">Top Endpoints</CardTitle>
       <div className="flex items-center gap-2">
         <div className="relative w-48"><Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" /><input className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none" placeholder="Filter routes..." value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? <X className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}</Button>
       </div>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl border-orange-500/50' : 'h-auto min-h-[300px]'}`}>
       {Header}
       <CardContent className="p-0 flex-1 overflow-auto bg-card">
          <table className="w-full text-sm text-left border-collapse">
             <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
                <tr><th className="px-6 py-3 font-medium">Method</th><th className="px-6 py-3 font-medium w-full">Route</th><th className="px-6 py-3 text-right font-medium">Reqs</th><th className="px-6 py-3 text-right font-medium">Errors</th><th className="px-6 py-3 text-right font-medium">Latency</th><th className="px-4"></th></tr>
             </thead>
             <tbody>
                {visibleRoutes.map((r: any, i: number) => (
                   <tr key={i} className="border-b border-border hover:bg-muted/20 group cursor-pointer transition-colors">
                      <td className="px-6 py-3"><Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 border-0 ${getMethodColor(r.method)}`}>{r.method}</Badge></td>
                      <td className="px-6 py-3 font-mono text-xs truncate max-w-[300px] text-foreground">{r.route}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs">{formatNumber(r.count)}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs text-red-500">{r.errorRate > 0 ? `${r.errorRate.toFixed(1)}%` : '-'}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">{Math.round(r.avgLatency)}ms</td>
                      <td className="px-4 py-3 text-right">
                         <Link href={`/dashboard/apm/${serviceId}/${encodeURIComponent(r.route)}`}>
                            <Button size="icon" variant="ghost" className="h-6 w-6"><ArrowRight className="h-3 w-3 text-muted-foreground hover:text-primary" /></Button>
                         </Link>
                      </td>
                   </tr>
                ))}
                {!isMaximized && hiddenCount > 0 && (
                  <tr className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => setIsMaximized(true)}>
                    <td colSpan={6} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Show {hiddenCount} more...</td>
                  </tr>
                )}
                {visibleRoutes.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No endpoints found</td></tr>}
             </tbody>
          </table>
       </CardContent>
    </Card>
  );

  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

interface ApmViewProps {
  serviceId: string;
  route?: string;
}

export default function ApmView({ serviceId, route }: ApmViewProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();
  
  const [range, setRange] = useState('24h');
  const [geoMode, setGeoMode] = useState<'map'|'countries'|'cities'>('map');
  const [sysMode, setSysMode] = useState<'browsers'|'os'|'devices'>('browsers');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const endpoint = `/apm/${serviceId}/stats?range=${range}` + (route ? `&route=${encodeURIComponent(route)}` : '');
  const { data, error, mutate, isValidating } = useSWR(token && serviceId ? endpoint : null, fetcher, { refreshInterval: 10000 });

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/apm/${serviceId}`); router.push('/dashboard'); } 
    catch (e) { console.error(e); setIsDeleting(false); }
  }

  const formattedGraph = useMemo(() => {
    if (!data?.graph) return [];
    return data.graph.map((point: any) => {
      // Scale requests to RPS
      const interval = range === '1h' ? 60 : 3600;
      return {
        ...point,
        rps: point.requests / interval,
        // Keep raw ISO time for uniqueness
        time: point.time
      };
    });
  }, [data?.graph, range]);

  const formatAxisDate = (str: string) => {
    if (!str) return '';
    const date = new Date(str);
    return date.toLocaleString(undefined, { 
      month: range === '24h' ? undefined : 'short', day: range === '24h' ? undefined : 'numeric', hour: 'numeric', minute: range === '24h' ? '2-digit' : undefined 
    });
  };

  if (!data && !error) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-orange-500" /></div></DashboardLayout>;
  if (error || !data?.meta) return <DashboardLayout><div className="p-8 text-destructive">Service not found.</div></DashboardLayout>;

  const { meta, overview, routes, geo, system } = data;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;
  const getFill = (defaultFill: string) => isMono ? 'hsl(var(--chart-mono))' : defaultFill;
  
  const sysTitle = sysMode === 'browsers' ? 'Browser Usage' : sysMode === 'os' ? 'Operating Systems' : 'Device Types';
  const geoTitle = geoMode === 'map' ? 'Request Map' : geoMode === 'countries' ? 'Top Countries' : 'Top Cities';

   // Header Logic
  const isActive = meta.lastSeen && (Date.now() - new Date(meta.lastSeen).getTime()) < 5 * 60 * 1000;
  

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        
        {/* Header */}
        <div className="flex flex-col gap-4">
           {route && (
             <Button variant="ghost" onClick={() => router.push(`/dashboard/apm/${serviceId}`)} className="pl-0 w-fit hover:bg-transparent hover:text-orange-500 -ml-2"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Service</Button>
           )}

           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
              <div>
                <div className="flex items-center gap-3 mb-1">
                   <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
                   {route && <Badge variant="outline" className="border-orange-500/20 text-orange-500 bg-orange-500/10 font-mono text-xs">{route}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                   {isActive ? (
                     <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Active</div>
                   ) : (
                     <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"/> Inactive</div>
                   )}
                   <span className="text-muted-foreground font-mono ml-2">Last Seen: {meta.lastSeen ? formatDistanceToNow(new Date(meta.lastSeen)) + ' ago' : 'Never'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select className="w-32 bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
                    <option value="1h">Last 1 Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                </Select>
                <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></Button>
              </div>
           </div>
        </div>


        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard title="Total Requests" value={formatNumber(overview.totalRequests)} sub="Calls in range" icon={Zap} color="text-orange-500" isMono={isMono} />
           <StatCard title="Error Rate" value={`${overview.errorRate.toFixed(2)}%`} sub={`${overview.totalErrors} Failures`} icon={AlertOctagon} color="text-red-500" isMono={isMono} />
           <StatCard title="Avg Latency" value={`${Math.round(overview.avgLatency)}ms`} sub="Response Time" icon={Clock} color="text-blue-500" isMono={isMono} />
           <StatCard title="P99 Latency" value={`${Math.round(overview.maxLatency)}ms`} sub="Slowest 1%" icon={Activity} color="text-purple-500" isMono={isMono} />
        </div>

        {/* RPS Graph */}
        <ChartCard title="Requests per Second (RPS)">
            <div className="p-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedGraph} wrapperStyle={{ outline: 'none' }}>
                      {!isMono && <defs><linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>}
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} labelFormatter={formatAxisDate} content={<CustomTooltip labelFormatter={formatAxisDate} unit=" rps" />} />
                      <Area type="monotone" dataKey="rps" stroke={getColor("#f97316")} fill={getFill("url(#colorRps)")} strokeWidth={2} name="RPS" />
                  </AreaChart>
              </ResponsiveContainer>
            </div>
        </ChartCard>

        {/* Latency & Errors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ChartCard title="Latency Distribution (ms)">
              <div className="p-4 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedGraph} wrapperStyle={{ outline: 'none' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} labelFormatter={formatAxisDate} content={<CustomTooltip labelFormatter={formatAxisDate} unit="ms" />} />
                    <Line type="monotone" dataKey="avgLatency" stroke={getColor("#3b82f6")} strokeWidth={2} dot={false} name="Avg" />
                    <Line type="monotone" dataKey="maxLatency" stroke={getColor("#ef4444")} strokeWidth={1} dot={false} strokeDasharray="5 5" name="Max" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </ChartCard>

           <ChartCard title="Error Count">
              <div className="p-4 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedGraph} wrapperStyle={{ outline: 'none' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} labelFormatter={formatAxisDate} content={<CustomTooltip labelFormatter={formatAxisDate} />} />
                    <Bar dataKey="errors" fill={getColor("#ef4444")} name="Errors" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </ChartCard>
        </div>

        {/* Endpoints Table (Only on Main Service View) */}
        {!route && <EndpointsTable routes={routes} serviceId={serviceId} />}

        {/* Context Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ChartCard 
             title={sysTitle}
             actions={
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                   {['browsers', 'os', 'devices'].map((m) => (<button key={m} onClick={() => setSysMode(m as any)} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${sysMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{m}</button>))}
                </div>
             }
           >
              <DistributionTable data={system[sysMode]} total={overview.totalRequests} type="sys" />
           </ChartCard>

           <ChartCard 
             title={geoTitle} 
             actions={
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                   <button onClick={() => setGeoMode('map')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Map</button>
                   <button onClick={() => setGeoMode('countries')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'countries' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Countries</button>
                   <button onClick={() => setGeoMode('cities')} className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-colors ${geoMode === 'cities' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Cities</button>
                </div>
             }
           >
              {geoMode === 'map' ? <div className="w-full h-full bg-card rounded-lg flex items-center justify-center p-4"><WorldMap data={geo.countries} /></div> : <DistributionTable data={geo[geoMode]} total={overview.totalRequests} type="geo" />}
           </ChartCard>
        </div>
      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Service?">
        {/* ... Delete Content ... */}
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{meta.name}</strong> and all traces.</div></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}