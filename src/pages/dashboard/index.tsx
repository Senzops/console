import React, { useState } from 'react';
import useSWR from 'swr';
import { api } from '../../lib/auth';
import { DashboardLayout } from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui/core';
import { Plus, Server, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function Dashboard() {
  const { data: vpsList, error, mutate } = useSWR('/vps/list', fetcher);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newVpsName, setNewVpsName] = useState('');
  const [newCreds, setNewCreds] = useState<{ vpsId: string, apiKey: string } | null>(null);

  const handleRegister = async () => {
    if (!newVpsName) return;
    try {
      const res = await api.post('/vps/register', { name: newVpsName });
      setNewCreds(res.data);
      setNewVpsName('');
      mutate(); // Refresh list
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Infrastructure</h1>
        <Button onClick={() => setIsRegistering(true)}><Plus className="mr-2 h-4 w-4" /> Add Server</Button>
      </div>

      {/* Registration Modal (Simplified as inline card for brevity) */}
      {isRegistering && (
        <Card className="mb-8 border-emerald-500/50 bg-emerald-500/5">
          <CardHeader><CardTitle>Connect New Server</CardTitle></CardHeader>
          <CardContent>
            {!newCreds ? (
              <div className="flex gap-4">
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  placeholder="Server Name (e.g. Prod-DB-01)"
                  value={newVpsName}
                  onChange={(e) => setNewVpsName(e.target.value)}
                />
                <Button onClick={handleRegister}>Create</Button>
                <Button variant="ghost" onClick={() => setIsRegistering(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-background rounded-md border">
                  <p className="text-sm font-mono text-emerald-500 mb-2"># Run this on your server:</p>
                  <code className="text-xs break-all text-muted-foreground select-all">
                    export VPS_ID="{newCreds.vpsId}" && export API_KEY="{newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/SysSentinel/agent-ts/dev/install_agent.sh | sudo -E bash -
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setNewCreds(null); setIsRegistering(false); }}>Done</Button>
                  <p className="text-xs text-muted-foreground self-center">Save these credentials! They are shown only once.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VPS List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vpsList?.map((vps: any) => (
          <Link href={`/dashboard/${vps._id}`} key={vps._id}>
            <Card className="cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{vps.name}</CardTitle>
                {vps.status === 'online' ? (
                  <Badge variant="success">Online</Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                  <Server className="h-4 w-4" />
                  <span>{vps.metadata?.os || 'Unknown OS'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last seen: {vps.lastSeen ? formatDistanceToNow(new Date(vps.lastSeen)) + ' ago' : 'Never'}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {vpsList?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            No servers monitored yet. Add one to get started.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}