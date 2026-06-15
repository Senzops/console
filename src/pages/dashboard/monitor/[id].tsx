import { useState, useMemo, useContext, useEffect, createContext } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, DataError } from '../../../components/Core';
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from '../../../components/TimeRangePicker';
import { usePlanRetention } from "@/lib/usePlanRetention";
import { getDisplayLabel, formatAxisDate, getTimeSpanMs } from '@/lib/formatAxisDate';
import { ChartTooltip } from '@/components/ChartTooltip';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Trash2, AlertTriangle, X, RefreshCw, Globe, Maximize, Pencil, ShieldAlert, ShieldCheck, Timer, Zap } from 'lucide-react';
import { useServiceModal } from '@/components/ServiceModals/context';
import { createPortal } from 'react-dom';
import { SmartAnimatedValue } from '@/components/Tween';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- Helpers ---
const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const computeDuration = (status: string, lastDownAt: string | null, createdAt: string, incidents: any[]): string => {
  if (status === 'up') {
    const since = lastDownAt || createdAt;
    return formatDuration(Date.now() - new Date(since).getTime());
  }
  const openIncident = incidents?.find((i: any) => !i.resolvedAt);
  if (openIncident?.startedAt) {
    return formatDuration(Date.now() - new Date(openIncident.startedAt).getTime());
  }
  if (lastDownAt) {
    return formatDuration(Date.now() - new Date(lastDownAt).getTime());
  }
  return '—';
};

const getHealthBadge = (uptime: number, latency: number) => {
  if (uptime >= 99.9 && latency < 500) return { label: 'Excellent', color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' };
  if (uptime >= 99) return { label: 'Good', color: 'text-blue-500 border-blue-500/20 bg-blue-500/10' };
  if (uptime >= 95) return { label: 'Degraded', color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' };
  return { label: 'Critical', color: 'text-destructive border-destructive/20 bg-destructive/10' };
};

const getSslBadge = (ssl: any) => {
  if (!ssl || !ssl.lastCheckedAt) return { label: 'Unknown', color: 'text-muted-foreground' };
  if (!ssl.valid) return { label: 'Invalid', color: 'text-destructive' };
  if (ssl.daysRemaining <= 7) return { label: 'Expiring Soon', color: 'text-destructive' };
  if (ssl.daysRemaining <= 30) return { label: 'Expiring Soon', color: 'text-yellow-500' };
  return { label: 'Valid', color: 'text-emerald-500' };
};

const getDomainBadge = (domain: any) => {
  if (!domain || !domain.lastCheckedAt) return { label: 'Unknown', color: 'text-muted-foreground' };
  if (domain.error) return { label: 'Error', color: 'text-muted-foreground' };
  if (domain.daysRemaining <= 14) return { label: 'Expiring Soon', color: 'text-destructive' };
  if (domain.daysRemaining <= 30) return { label: 'Expiring Soon', color: 'text-yellow-500' };
  return { label: 'Valid', color: 'text-emerald-500' };
};

const getDaysColor = (days: number) => {
  if (days <= 7) return 'text-destructive';
  if (days <= 30) return 'text-yellow-500';
  return 'text-emerald-500';
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
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0 h-16 shrink-0">
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
      <Card className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : 'h-auto min-h-[300px]'}`}>
        {Header}
        <CardContent className="p-0 flex-1 overflow-auto bg-card">
          {children}
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

  const limit = isMaximized ? filteredData.length : 10;
  const visibleData = filteredData.slice(0, limit);
  const hiddenCount = filteredData.length - limit;

  return (
    <div className="w-full overflow-auto">
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
  const checks = history.slice(0, 60).reverse();
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

const DomainSslCard = ({ ssl, domain, url }: { ssl: any; domain: any; url: string }) => {
  const hasSsl = url?.startsWith('https://') && ssl?.lastCheckedAt;
  const hasDomain = domain?.lastCheckedAt && !domain?.error;

  if (!hasSsl && !hasDomain) return null;

  const sslBadge = getSslBadge(ssl);
  const domainBadge = getDomainBadge(domain);

  return (
    <Card>
      <CardContent className="p-0">
        <div className={`grid ${hasSsl && hasDomain ? 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border' : 'grid-cols-1'}`}>
          {/* Domain Registration */}
          {hasDomain && (
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Domain Registration</p>
                    <Badge variant={domain.daysRemaining > 30 ? 'success' : domain.daysRemaining > 14 ? 'warning' : 'destructive'} className="text-[10px] px-1.5">
                      {domainBadge.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div>
                      <span className="text-muted-foreground">Domain: </span>
                      <span className="font-mono font-medium">{domain.registeredDomain || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registrar: </span>
                      <span className="font-medium">{domain.registrar || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registered: </span>
                      <span className="font-mono">{domain.registeredAt ? new Date(domain.registeredAt).toLocaleDateString() : '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expires: </span>
                      <span className="font-mono">{domain.expiresAt ? new Date(domain.expiresAt).toLocaleDateString() : '-'}</span>
                    </div>
                    {domain.nameServers?.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">NS: </span>
                        <span className="font-mono">{domain.nameServers.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                {domain.daysRemaining >= 0 && (
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold tabular-nums ${getDaysColor(domain.daysRemaining)}`}>
                      {domain.daysRemaining}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days Left</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SSL Certificate */}
          {hasSsl && (
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">SSL Certificate</p>
                    <Badge variant={ssl.valid && ssl.daysRemaining > 7 ? 'success' : ssl.daysRemaining > 0 ? 'warning' : 'destructive'} className="text-[10px] px-1.5">
                      {sslBadge.label}
                    </Badge>
                  </div>
                  {ssl.error ? (
                    <p className="text-xs text-destructive">{ssl.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-muted-foreground">Issuer: </span>
                        <span className="font-medium">{ssl.issuer || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Protocol: </span>
                        <span className="font-mono">{ssl.protocol || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid From: </span>
                        <span className="font-mono">{ssl.validFrom ? new Date(ssl.validFrom).toLocaleDateString() : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expires: </span>
                        <span className="font-mono">{ssl.validTo ? new Date(ssl.validTo).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  )}
                </div>
                {ssl.valid && ssl.daysRemaining >= 0 && (
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold tabular-nums ${getDaysColor(ssl.daysRemaining)}`}>
                      {ssl.daysRemaining}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days Left</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const IncidentTable = ({ incidents }: { incidents: any[] }) => {
  if (!incidents?.length) {
    return (
      <div className="py-8 text-center text-muted-foreground text-xs">
        No incidents recorded in this time range
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
          <tr>
            <th className="px-6 py-3">Started</th>
            <th className="px-6 py-3">Resolved</th>
            <th className="px-6 py-3">Duration</th>
            <th className="px-6 py-3">Cause</th>
            <th className="px-6 py-3 text-right">Status Code</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident: any) => (
            <tr key={incident._id} className="border-b border-border hover:bg-muted/20">
              <td className="px-6 py-3 font-mono text-xs">{new Date(incident.startedAt).toLocaleString()}</td>
              <td className="px-6 py-3 font-mono text-xs">
                {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : (
                  <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">Ongoing</Badge>
                )}
              </td>
              <td className="px-6 py-3 font-mono text-xs">
                {incident.duration ? formatDuration(incident.duration) : (
                  <span className="text-destructive">Active</span>
                )}
              </td>
              <td className="px-6 py-3">
                <Badge variant={incident.cause === 'timeout' ? 'warning' : 'destructive'} className="uppercase text-[10px] px-2">
                  {incident.cause}
                </Badge>
              </td>
              <td className="px-6 py-3 text-right font-mono text-muted-foreground">{incident.statusCode || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Live ticking duration display ---
const useLiveDuration = (status: string, lastDownAt: string | null, createdAt: string, incidents: any[]): string => {
  const compute = () => computeDuration(status, lastDownAt, createdAt, incidents);

  const [display, setDisplay] = useState(compute);

  useEffect(() => {
    setDisplay(compute());
    const timer = setInterval(() => setDisplay(compute()), 1000);
    return () => clearInterval(timer);
  }, [status, lastDownAt, createdAt, incidents]);

  return display;
};

export default function MonitorDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);
  const displayRange = timeRange.type === 'relative' ? timeRange.range : getDisplayLabel(timeRange);
  const monitorAxisFormatter = useMemo(() => (str: string) => formatAxisDate(str, spanMs), [spanMs]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { openModal } = useServiceModal();

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/uptime/${id}/stats?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.delete(`/uptime/${id}`); router.push('/dashboard'); }
    catch (e) {
      console.error(e); setIsDeleting(false);
      toast.error(extractErrorMessage(e, 'Failed to delete monitor'));
    }
  }

  const openEdit = () => {
    if (!data?.monitor) return;
    openModal('monitor', 'edit', {
      id: id as string,
      name: data.monitor.name,
      url: data.monitor.url,
      interval: String(data.monitor.interval),
      method: data.monitor.method,
      headers: data.monitor.headers,
      body: data.monitor.body,
      expectedStatus: data.monitor.expectedStatus,
      onSuccess: () => mutate(),
    });
  };

  // --- Process Chart Data (Reverse to Chronological) ---
  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return [...data.history].reverse();
  }, [data?.history]);

  // Hooks must run unconditionally — above all early returns
  const liveDuration = useLiveDuration(
    data?.monitor?.status ?? 'pending',
    data?.monitor?.lastDownAt ?? null,
    data?.monitor?.createdAt ?? new Date().toISOString(),
    data?.incidents ?? [],
  );

  if (!data && !error) return <><div className="h-full flex flex-col items-center justify-center gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-muted-foreground">Connecting to Server...</p></div></>;
  if (error) return <><div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div></>;
  if (!data?.monitor) return <><div className="h-full flex flex-col items-center justify-center gap-4"><div className="p-8 text-destructive">Failed to load server data.</div></div></>;

  const { monitor, stats, history, incidents } = data;
  const health = getHealthBadge(stats.uptime, stats.avgLatency);
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  const isUp = monitor.status === 'up';
  const sslWarning = monitor.ssl?.valid && monitor.ssl?.daysRemaining <= 14 && monitor.ssl?.daysRemaining >= 0;
  const domainWarning = monitor.domain?.lastCheckedAt && !monitor.domain?.error && monitor.domain?.daysRemaining <= 30 && monitor.domain?.daysRemaining >= 0;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{monitor.name}</h1>
              <Badge variant="outline" className={`animate-pulse ${health.color}`}>
                {health.label}
              </Badge>
              {domainWarning && (
                <Badge variant="outline" className={`text-[10px] ${monitor.domain.daysRemaining <= 14 ? 'text-destructive border-destructive/20 bg-destructive/10' : 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'}`}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Domain Expiring
                </Badge>
              )}
              {sslWarning && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10 text-[10px]">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  SSL Expiring
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> <a href={monitor.url} target="_blank" rel="noreferrer" className="hover:underline">{monitor.url}</a></span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {monitor.interval}m Interval</span>
              {monitor.method && monitor.method !== 'GET' && (
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {monitor.method}</span>
              )}
              {monitor.expectedStatus > 0 && (
                <span className="flex items-center gap-1">Expected: {monitor.expectedStatus}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
            <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
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
          <StatCard
            title={`Uptime(${displayRange})`}
            value={`${stats.uptime.toFixed(2)}%`}
            sub={`Target: 99.9%`}
            icon={Activity}
            color="text-emerald-500"
            isMono={isMono}
          />
          <StatCard
            title={isUp ? 'Currently Up For' : 'Currently Down For'}
            value={liveDuration}
            sub={(() => {
              if (isUp) {
                return monitor.lastDownAt
                  ? `Since ${new Date(monitor.lastDownAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                  : 'Since creation';
              }
              const openIncident = incidents?.find((i: any) => !i.resolvedAt);
              const downSince = openIncident?.startedAt || monitor.lastCheck;
              return downSince
                ? `Since ${new Date(downSince).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                : 'Since last check';
            })()}
            icon={Timer}
            color="text-purple-500"
            isMono={isMono}
            textColor={isUp ? 'text-emerald-500' : 'text-destructive'}
          />
          <StatCard
            title="Avg Latency"
            value={`${Math.round(stats.avgLatency)}ms`}
            sub={`P95: ${Math.round(stats.p95)}ms`}
            icon={Clock}
            color="text-blue-500"
            isMono={isMono}
          />
          <StatCard
            title="Last Check"
            value={`${stats.lastStatus}`}
            sub={`${new Date(stats.lastCheckTime).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit'
            })}`}
            icon={Globe}
            color="text-yellow-500"
            isMono={isMono}
            textColor={stats.lastStatus === 'up' ? 'text-emerald-500' : 'text-destructive'}
          />
        </div>

        {/* Domain & SSL */}
        <DomainSslCard ssl={monitor.ssl} domain={monitor.domain} url={monitor.url} />

        {/* Response Time Graph */}
        <ChartCard title="Response Time (ms)">
          <AreaChart data={chartData}>
            <defs><linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor("#3b82f6")} stopOpacity={0.3} /><stop offset="95%" stopColor={getColor("#3b82f6")} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="createdAt" hide />
            <YAxis hide />
            <Tooltip content={<ChartTooltip labelFormatter={monitorAxisFormatter} unit="ms" />} />
            <Area type="monotone" dataKey="latency" stroke={getColor("#3b82f6")} fill={"url(#colorLatency)"} strokeWidth={2} name="Latency" />
          </AreaChart>
        </ChartCard>

        {/* Recent Checks */}
        <DistributionCard title="Recent Checks">
          <DistributionTable data={history} />
        </DistributionCard>

        {/* Incident History */}
        {incidents && incidents.length > 0 && (
          <DistributionCard title="Incident History">
            <IncidentTable incidents={incidents} />
          </DistributionCard>
        )}

      </div>

      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Monitor?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><div className="text-sm"><span className="font-bold block mb-1">Warning: Irreversible Action</span>This will delete <strong>{monitor.name}</strong> and all history data.</div></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm</Button></div>
        </div>
      </Dialog>

    </>
  );
}
