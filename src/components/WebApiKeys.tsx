import React, { useState } from 'react';
import useSWR from 'swr';
import { api, useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Dialog, Badge, Spinner } from '@/components/Core';
import { Copy, Check, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

const API_BASE = 'https://api.senzor.dev/api/v1/web';
const fetcher = (url: string) => api.get(url).then((r) => r.data);

interface KeyRow { _id: string; name: string; prefix: string; status: string; lastUsedAt?: string; createdAt: string }

const KeysDialog = ({ open, onClose, webId }: { open: boolean; onClose: () => void; webId: string }) => {
  const { data: keys, mutate } = useSWR<KeyRow[]>(open ? `/web/${webId}/keys` : null, fetcher);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post(`/web/${webId}/keys`, { name: name.trim() });
      setFreshKey(res.data.key);
      setName('');
      mutate();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to create key'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/web/${webId}/keys/${id}`);
      mutate();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to revoke key'));
    } finally {
      setBusyId(null);
    }
  };

  const copy = (val: string) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const close = () => { setFreshKey(null); setName(''); onClose(); };

  return (
    <Dialog open={open} onClose={close} title="Query API Keys" className="max-w-xl">
      <div className="space-y-5">
        {freshKey ? (
          <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs font-medium text-foreground">Your new API key — copy it now, it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{freshKey}</code>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copy(freshKey)}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFreshKey(null)}>Done</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Grafana)" maxLength={60} className="h-9 text-sm" />
            <Button onClick={create} disabled={creating || !name.trim()}>
              {creating ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
          {!keys ? (
            <div className="flex items-center justify-center py-6"><Spinner className="h-5 w-5" /></div>
          ) : keys.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No API keys yet.</div>
          ) : (
            keys.map((k) => (
              <div key={k._id} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{k.name}</span>
                    <code className="text-[10px] text-muted-foreground font-mono">{k.prefix}…</code>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => revoke(k._id)} disabled={busyId === k._id}>
                  {busyId === k._id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
};

export const WebApiKeys = ({ webId }: { webId: string }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  if (!token) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 border-b border-border/40 h-16">
        <CardTitle className="text-sm font-medium text-muted-foreground">Query API</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">Read-only · 120 req/min</Badge>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Manage keys</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground mb-3">
          Pull this site's analytics programmatically. Authenticate with <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Authorization: Bearer &lt;key&gt;</code>. Add <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">format=csv</code> for spreadsheet exports.
        </p>
        <pre className="rounded-lg bg-muted/50 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`curl -H "Authorization: Bearer szw_..." \\
  "${API_BASE}/overview?range=24h"

# endpoints: /overview /timeseries /breakdown?dimension=path /events`}
        </pre>
      </CardContent>
      <KeysDialog open={open} onClose={() => setOpen(false)} webId={webId} />
    </Card>
  );
};
