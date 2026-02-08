import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../../../lib/auth';
import { DashboardLayout } from '../../../../../components/Layout';
import { Button, Spinner, Card, Badge, CardContent } from '../../../../../components/Core';
import { Activity, ArrowLeft, Clock, Globe, Laptop, Server } from 'lucide-react';
import { TraceWaterfall } from '../../../../../components/TraceWaterfall';
import { formatDistanceToNow } from 'date-fns';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function TraceDetail() {
  const router = useRouter();
  const { id, traceId } = router.query;
  const { token } = useAuth();

  const { data: trace, error } = useSWR(token && id && traceId ? `/apm/${id}/trace/${traceId}` : null, fetcher);

  if (!trace && !error) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-orange-500" /></div></DashboardLayout>;
  if (error || !trace) return <DashboardLayout><div className="p-8 text-destructive">Trace not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 h-screen flex flex-col">
        {/* Header */}
        <div className="shrink-0">
           <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-orange-500 -ml-2 mb-2">
              <ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard
           </Button>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${trace.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                       {trace.method}
                    </span>
                    <h1 className="text-2xl font-bold font-mono text-foreground">{trace.path}</h1>
                 </div>
                 <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(trace.timestamp).toLocaleString()}</span>
                    <span>({formatDistanceToNow(new Date(trace.timestamp))} ago)</span>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase font-bold">Duration</div>
                    <div className="text-xl font-mono">{trace.duration.toFixed(2)}ms</div>
                 </div>
                 <div className="text-right border-l border-border pl-4">
                    <div className="text-xs text-muted-foreground uppercase font-bold">Status</div>
                    <div className={`text-xl font-mono ${trace.status >= 400 ? 'text-red-500' : 'text-emerald-500'}`}>
                       {trace.status}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
           <Card className="bg-muted/20">
              <CardContent className="p-4 flex items-center gap-3">
                 <Globe className="h-8 w-8 text-blue-500 opacity-80" />
                 <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Location</div>
                    <div className="font-medium">{trace.city}, {trace.country}</div>
                    <div className="text-xs font-mono text-muted-foreground">{trace.ip}</div>
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-muted/20">
              <CardContent className="p-4 flex items-center gap-3">
                 <Laptop className="h-8 w-8 text-purple-500 opacity-80" />
                 <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Client</div>
                    <div className="font-medium">{trace.browser} on {trace.os}</div>
                    <div className="text-xs font-mono text-muted-foreground">{trace.device}</div>
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-muted/20">
              <CardContent className="p-4 flex items-center gap-3">
                 <Server className="h-8 w-8 text-orange-500 opacity-80" />
                 <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Service</div>
                    <div className="font-medium">Trace ID</div>
                    <div className="text-xs font-mono text-muted-foreground truncate w-32" title={trace.traceId}>{trace.traceId || trace._id}</div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Waterfall */}
        <div className="flex-1 min-h-0">
           {trace.spans && trace.spans.length > 0 ? (
              <TraceWaterfall spans={trace.spans} totalDuration={trace.duration} />
           ) : (
              <div className="h-full border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground">
                 <Activity className="h-10 w-10 mb-4 opacity-20" />
                 <p>No internal spans captured.</p>
                 <p className="text-xs mt-2">Use <code>senzor.startSpan()</code> in your SDK to trace internals.</p>
              </div>
           )}
        </div>
      </div>
    </DashboardLayout>
  );
}