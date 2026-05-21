import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { useTheme } from '../../../../lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner, Badge } from '../../../../components/Core';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Route, Activity, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ChartCard, CustomTooltip, fetcher } from '.';
import { SmartAnimatedValue } from '@/components/Tween';

export default function TraefikDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const { data } = useSWR(token && id ? `/vps/${id}/stats` : null, fetcher);
  const { history } = data || {};

  const chartData = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((run: any) => ({
        time: new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        activeRouters: run.metrics.traefik?.routers.active || 0,
        activeServices: run.metrics.traefik?.services.active || 0,
      }));
  }, [history]);

  if (!data) return <><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-emerald-500" /></div></>;

  const latest = history && history.length > 0 ? history[0].metrics?.traefik || {} : {};
  const getColor = (defaultColor: string) => isMono ? 'hsl(var(--chart-mono))' : defaultColor;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0 hover:bg-transparent hover:text-blue-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Server
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <div className={`h-12 w-12 rounded bg-blue-500/10 flex items-center justify-center ${isMono ? 'text-muted-foreground' : 'text-blue-500'}`}>
            <Route className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Traefik Proxy</h1>
            <div className="flex gap-2 text-sm text-muted-foreground font-mono">
              Edge Router • v2/v3
            </div>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="text-sm px-3 py-1 text-blue-500 bg-blue-500/10 border-blue-500/20">
              Active
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="text-xs text-muted-foreground uppercase font-bold">Routers</div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-bold"><SmartAnimatedValue value={latest.routers?.total || 0} /></div>
                <div className="text-sm text-emerald-500"><SmartAnimatedValue value={latest.routers?.active || 0} /> Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="text-xs text-muted-foreground uppercase font-bold">Services</div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-bold"><SmartAnimatedValue value={latest.services?.total || 0} /></div>
                <div className="text-sm text-blue-500"><SmartAnimatedValue value={latest.services?.active || 0} /> Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="text-xs text-muted-foreground uppercase font-bold">Middlewares</div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-bold"><SmartAnimatedValue value={latest.middlewares?.total || 0} /></div>
                <div className="text-sm text-purple-500"><SmartAnimatedValue value={latest.middlewares?.active || 0} /> Active</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Active Routers">
            <AreaChart data={chartData} className="outline-none">
              {!isMono && <defs><linearGradient id="colorRout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Area type="step" dataKey="activeRouters" stroke={getColor("#10b981")} strokeWidth={2} fill={isMono ? getColor("#10b981") : "url(#colorRout)"} name="Routers" animationDuration={1500} />
            </AreaChart>
          </ChartCard>
          <ChartCard title="Active Services">
            <AreaChart data={chartData} className="outline-none">
              {!isMono && <defs><linearGradient id="colorServ" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" hide />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Area type="step" dataKey="activeServices" stroke={getColor("#3b82f6")} strokeWidth={2} fill={isMono ? getColor("#3b82f6") : "url(#colorServ)"} name="Services" animationDuration={1500} />
            </AreaChart>
          </ChartCard>
        </div>
      </div>
    </>
  );
}