import React, { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, DataError } from '../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { AlertOctagon, ArrowLeft, Clock, CheckCircle2, XCircle, Activity, Box, ExternalLink } from 'lucide-react';
import { ErrorEventList } from '../../../components/TraceErrors'; // Import the new shared component

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Standard StatCard component (Matches VPS/DB Dashboard)
const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{title}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1 font-medium">{subtext}</div>}
    </CardContent>
  </Card>
);

export default function ErrorDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [isUpdating, setIsUpdating] = useState(false);

  const { data, error, mutate } = useSWR(
    token && id ? `/errors/${id}` : null,
    fetcher
  );

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/errors/${id}/status`, { status });
      await mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!data && !error) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8"><DataError onRetry={() => mutate()} /></div></DashboardLayout>;

  const { group, events, trend } = data;
  const latestTraceId = events?.[0]?.traceId;

  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-3 mt-2 hover:bg-transparent hover:text-foreground" onClick={() => router.push('/dashboard/errors')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Button>
        {/* --- Header & Controls (Matches Standard Layout) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Badge variant="destructive" className="font-mono uppercase tracking-wider">{group.errorClass}</Badge>
               <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-2xl" title={group.message}>
                 {group.message}
               </h1>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-4">
               <span className="flex items-center gap-1.5 text-foreground"><Box className="h-3.5 w-3.5 text-orange-500" /> {group.apmId?.name || 'Unknown Service'}</span>
               <span>•</span>
               <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> First Seen: {new Date(group.firstSeen).toLocaleDateString()}</span>
               <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wider ${
                  group.status === 'resolved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' :
                  group.status === 'ignored' ? 'border-muted text-muted-foreground bg-muted/20' :
                  'border-destructive/30 text-destructive bg-destructive/10'
               }`}>
                  {group.status}
               </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
             {latestTraceId && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="w-full bg-background border-primary/30 text-primary hover:bg-primary/10"
                 onClick={() => router.push(`/dashboard/apm/${group.apmId._id}/trace/${latestTraceId}`)}
               >
                 View Latest Trace <ExternalLink className="h-3.5 w-3.5 ml-2" />
               </Button>
             )}
             <div className="flex items-center gap-2">
                {group.status !== 'resolved' && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus('resolved')} disabled={isUpdating} className="h-8 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Resolve
                  </Button>
                )}
                {group.status !== 'ignored' && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus('ignored')} disabled={isUpdating} className="h-8 text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Ignore
                  </Button>
                )}
                {group.status !== 'unresolved' && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus('unresolved')} disabled={isUpdating} className="h-8 border-destructive/30 hover:bg-destructive/10 text-destructive">
                    <AlertOctagon className="h-3.5 w-3.5 mr-1.5" /> Unresolve
                  </Button>
                )}
             </div>
          </div>
        </div>

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCard 
             title="Total Occurrences" 
             value={group.totalCount.toLocaleString()} 
             subtext="Across all tracked traces"
             icon={Activity} 
             color="text-destructive" 
           />
           <StatCard 
             title="Last Recorded" 
             value={new Date(group.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
             subtext={new Date(group.lastSeen).toLocaleDateString()}
             icon={Clock} 
             color="text-orange-500" 
           />
           <StatCard 
             title="Impact Range" 
             value={Math.ceil((new Date(group.lastSeen).getTime() - new Date(group.firstSeen).getTime()) / (1000 * 3600 * 24)) + ' Days'} 
             subtext="Time between first and last event"
             icon={Box} 
             color="text-blue-500" 
           />
        </div>

        {/* --- Full Wide Trend Area Chart --- */}
        <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col h-[300px]">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10 shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Issue Trend (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative bg-card pt-4 pb-2">
             {trend?.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data.trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor={getColor('#ef4444')} stopOpacity={0.2} />
                         <stop offset="95%" stopColor={getColor('#ef4444')} stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                     <XAxis dataKey="time" tick={{fontSize: 10}} tickMargin={10} minTickGap={30} stroke="#888" axisLine={false} tickLine={false} hide />
                     <YAxis hide />
                     <RechartsTooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                     />
                     <Area type="monotone" dataKey="count" stroke={getColor('#ef4444')} fill={"url(#colorTrend)"} strokeWidth={2} name="Occurrences" />
                   </AreaChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No events recorded in this period.</div>
             )}
          </CardContent>
        </Card>

        {/* --- Recent Event Occurrences List (Using Shared Component) --- */}
        <div className="space-y-4 pt-4">
           <h3 className="text-lg font-bold text-foreground">Recent Traces & Stack Context (Last 50)</h3>
           <ErrorEventList events={events} apmId={group.apmId?._id} showTraceLink={true} />
        </div>

      </div>
    </DashboardLayout>
  );
}