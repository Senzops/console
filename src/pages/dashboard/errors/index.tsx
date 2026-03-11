import React, { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/theme';
import { DashboardLayout } from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Input, Select, Button, Spinner, DataError } from '../../../components/Core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { AlertOctagon, Search, ChevronLeft, ChevronRight, Activity, Clock, Box } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function GlobalErrorsDashboard() {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [searchInput, setSearchInput] = useState(''); 

  const { data, error, isLoading } = useSWR(
    token ? `/errors?page=${page}&limit=15&search=${search}&status=${statusFilter}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    if (status === 'resolved') return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
    if (status === 'ignored') return 'text-muted-foreground border-border bg-muted/20';
    return 'text-destructive border-destructive/20 bg-destructive/10';
  };

  if (!data && !error && isLoading) return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8"><DataError /></div></DashboardLayout>;
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-2 rounded-lg bg-destructive/10 text-destructive"><AlertOctagon className="h-5 w-5" /></div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Exception Tracker</h1>
            </div>
            <p className="text-xs text-muted-foreground pl-12 font-mono">Monitor, triage, and resolve errors across all your services.</p>
          </div>
        </div>

        {/* --- Global Trend Graph --- */}
        <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col h-[280px]">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10 shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Aggregate Error Trend (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative bg-card pt-6 pb-2">
             {data?.trend?.length > 0 ? (
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
                     <Area type="monotone" dataKey="count" stroke={getColor('#ef4444')} fill={"url(#colorTrend)"} strokeWidth={2} name="Total Errors" />
                   </AreaChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No error events recorded in this period.</div>
             )}
          </CardContent>
        </Card>

        {/* --- Error Table --- */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50">
             <form onSubmit={handleSearch} className="relative w-full md:w-[350px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Search by error class or message..." 
                 className="pl-9 h-9 w-full bg-background border-border/80"
                 value={searchInput}
                 onChange={(e) => setSearchInput(e.target.value)}
               />
             </form>
             <Select 
               className="w-full md:w-[180px] h-9 bg-background border-border/80" 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
             >
               <option value="unresolved">Status: Unresolved</option>
               <option value="resolved">Status: Resolved</option>
               <option value="ignored">Status: Ignored</option>
               <option value="all">Status: All</option>
             </Select>
          </CardHeader>
          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                <tr>
                  <th className="px-6 py-3 font-semibold">Service</th>
                  <th className="px-6 py-3 font-semibold">Error Event</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Occurrences</th>
                  <th className="px-6 py-3 font-semibold text-right">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data?.errors?.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">No error events found matching the current filters.</td></tr>
                ) : (
                  data?.errors?.map((err: any) => (
                    <tr 
                      key={err._id} 
                      onClick={() => router.push(`/dashboard/errors/${err._id}`)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-foreground">
                        <div className="flex items-center gap-2">
                           <Box className="h-4 w-4 text-orange-500" />
                           <span className="font-medium">{err.apmId?.name || 'Unknown Service'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[300px] md:max-w-[500px] truncate">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-semibold text-destructive">{err.errorClass}</span>
                          <span className="text-muted-foreground text-xs truncate" title={err.message}>{err.message}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <Badge variant="outline" className={`capitalize ${getStatusColor(err.status)}`}>{err.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium">
                        {err.totalCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        <div className="flex items-center justify-end gap-1.5">
                           <Clock className="h-3 w-3" />
                           {new Date(err.lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
          
          {data?.pagination?.pages > 1 && (
             <div className="p-4 border-t border-border/40 bg-card/50 flex items-center justify-between">
               <span className="text-xs text-muted-foreground font-medium">
                 Showing page {page} of {data.pagination.pages} ({data.pagination.total} groups)
               </span>
               <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
                   <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className="h-8">
                   Next <ChevronRight className="h-4 w-4 ml-1" />
                 </Button>
               </div>
             </div>
          )}
        </Card>

      </div>
    </DashboardLayout>
  );
}