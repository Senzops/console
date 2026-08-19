import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, cn,
} from '../Core';
import {
  Network, RefreshCw, Activity, Lock, ShieldAlert, Server, CircleDot, Radio,
} from 'lucide-react';

// ============================================================================
// Topology & live operations.
// ----------------------------------------------------------------------------
// The operations feed is a live read that is never stored — it shows what is
// executing right now and nothing more. There is deliberately no way to
// terminate an operation from here: Senzor observes.
// ============================================================================

interface TopologyMember {
  name: string;
  role: string;
  state: string;
  healthy: boolean;
  lagMs?: number;
  lagBytes?: number;
  self?: boolean;
}

interface Topology {
  kind: string;
  isReplica: boolean;
  members: TopologyMember[];
}

interface CurrentOperation {
  id: string;
  durationMs: number;
  operation: string;
  namespace?: string;
  queryText: string;
  state?: string;
  waitingOn?: string;
  source?: string;
}

const KIND_LABEL: Record<string, string> = {
  standalone: 'Standalone',
  replicaset: 'Replica set',
  'primary-replica': 'Primary / replica',
  cluster: 'Cluster',
};

const formatMs = (ms?: number) => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
};

const formatBytes = (n?: number) => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
};

/** Longest-running operations earn colour — that is the whole point of the list. */
const durationTone = (ms: number) => {
  if (ms >= 60000) return 'text-destructive';
  if (ms >= 10000) return 'text-yellow-500';
  return 'text-muted-foreground';
};

const MemberRow = ({ member }: { member: TopologyMember }) => (
  <div className="flex items-center gap-3 px-5 py-3">
    <CircleDot
      className={cn('h-4 w-4 shrink-0', member.healthy ? 'text-emerald-500' : 'text-destructive')}
      aria-hidden="true"
    />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-sm text-foreground">{member.name}</span>
        {member.self && <Badge variant="outline" className="text-[10px]">Connected</Badge>}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        <span className="capitalize">{member.role}</span> · {member.state}
      </p>
    </div>
    <div className="shrink-0 text-right">
      {member.lagMs != null && (
        <p className={cn('font-mono text-xs', member.lagMs > 10000 ? 'text-yellow-500' : 'text-muted-foreground')}>
          {formatMs(member.lagMs)} behind
        </p>
      )}
      {member.lagBytes != null && (
        <p className="font-mono text-xs text-muted-foreground">{formatBytes(member.lagBytes)} behind</p>
      )}
    </div>
  </div>
);

export const DatabaseTopology = ({
  dbId,
  topology,
  topologyCheckedAt,
  fetcher,
}: {
  dbId: string;
  topology?: Topology;
  topologyCheckedAt?: string | null;
  fetcher: (url: string) => Promise<any>;
}) => {
  const [live, setLive] = useState(false);

  const { data, error, isValidating, mutate } = useSWR(
    `/database/${dbId}/operations`,
    fetcher,
    // Off by default: this opens a connection to the customer's database on
    // every tick, so it polls only while the user is actually watching.
    { refreshInterval: live ? 5000 : 0, revalidateOnFocus: false }
  );

  const operations: CurrentOperation[] = data?.operations || [];
  const members = topology?.members || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Network className="h-4 w-4" /> Replication Topology
          </CardTitle>
          {topology?.kind && (
            <Badge variant="outline">{KIND_LABEL[topology.kind] || topology.kind}</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Server className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {topology?.kind === 'standalone'
                  ? 'This instance is standalone — there is no replication to report.'
                  : 'No topology reported. The monitoring user may not be permitted to read replication status.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {members.map((m, i) => (
                <MemberRow key={`${m.name}-${i}`} member={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex h-16 flex-row items-center justify-between space-y-0 border-b border-border/40 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" /> Live Operations
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={live ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLive((v) => !v)}
              aria-pressed={live}
            >
              <Radio className={cn('mr-2 h-3.5 w-3.5', live && 'animate-pulse')} />
              {live ? 'Live' : 'Go live'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              disabled={isValidating}
              aria-label="Refresh operations"
            >
              <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="max-h-[480px] flex-1 overflow-auto p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShieldAlert className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {error?.response?.data?.error || 'Could not read live operations.'}
              </p>
            </div>
          ) : data?.blocked ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <Lock className="h-6 w-6 text-yellow-500" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{data.reason}</p>
              {data.remediation && (
                <p className="mt-2 max-w-lg rounded-md border border-border/60 bg-muted/30 p-3 text-left font-mono text-[11px] leading-relaxed text-foreground-secondary">
                  {data.remediation}
                </p>
              )}
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : operations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Activity className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Nothing is executing right now.</p>
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/30 text-xs font-medium uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3">Operation</th>
                  <th className="whitespace-nowrap px-5 py-3">State</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Running for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {operations.map((op) => (
                  <tr key={op.id} className="transition-colors hover:bg-muted/30">
                    <td className="max-w-[520px] px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {op.operation}
                        </span>
                        {op.namespace && (
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {op.namespace}
                          </span>
                        )}
                        {op.source && (
                          <Badge variant="outline" className="text-[10px]">{op.source}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-xs text-foreground-secondary">
                        {op.queryText}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                      {op.state || '—'}
                      {op.waitingOn && (
                        <span className="block text-[11px] text-yellow-500">{op.waitingOn}</span>
                      )}
                    </td>
                    <td className={cn('px-5 py-3 text-right font-mono font-medium', durationTone(op.durationMs))}>
                      {formatMs(op.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Live operations are read on demand and never stored.
        {topologyCheckedAt && ` Topology last seen ${new Date(topologyCheckedAt).toLocaleString()}.`}
      </p>
    </div>
  );
};
