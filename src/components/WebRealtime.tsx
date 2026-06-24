import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { Card, CardContent } from '@/components/Core';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Radio, Zap } from 'lucide-react';

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return (num ?? 0).toString();
};

const timeAgo = (iso: string) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

// Compact bar within the "active now" pages/referrers lists.
const MiniRow = ({ label, count, total }: { label: string; count: number; total: number }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="relative flex items-center justify-between px-2 py-1 text-xs">
      <div className="absolute inset-y-0 left-0 bg-emerald-500/10 rounded-r" style={{ width: `${pct}%` }} />
      <span className="relative z-10 truncate max-w-[75%]" title={label}>{label || '/'}</span>
      <span className="relative z-10 font-mono text-[11px] text-muted-foreground">{formatNumber(count)}</span>
    </div>
  );
};

export const WebRealtime = ({ webId }: { webId: string }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canQuery = Boolean(token || readOnly);

  const { data } = useSWR(
    canQuery && webId ? `/web/${webId}/realtime` : null,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  const active = data?.activeVisitors ?? 0;
  const pulse = data?.pulse || [];
  const topPages = data?.topPages || [];
  const recentEvents = data?.recentEvents || [];
  const pageTotal = topPages.reduce((s: number, p: any) => s + (p.count || 0), 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Active now + pulse */}
          <div className="p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Active now</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{formatNumber(active)}</div>
            <div className="text-[10px] text-muted-foreground/70 mb-2">visitors in the last 5 min</div>
            <div className="h-12 mt-auto -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pulse} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rtPulse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={1.5} fill="url(#rtPulse)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-muted-foreground/60 text-center">pageviews · last 30 min</div>
          </div>

          {/* Active pages */}
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Active pages</div>
            {topPages.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 py-4 text-center">No active pages</div>
            ) : (
              <div className="space-y-0.5">
                {topPages.map((p: any, i: number) => <MiniRow key={i} label={p._id} count={p.count} total={pageTotal} />)}
              </div>
            )}
          </div>

          {/* Live event feed */}
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Live events</div>
            {recentEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 py-4 text-center">No recent events</div>
            ) : (
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {recentEvents.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-medium truncate" title={e.eventName}>{e.eventName}</span>
                      <span className="text-muted-foreground/60 truncate hidden sm:inline" title={e.path}>{e.path}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0">{timeAgo(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
