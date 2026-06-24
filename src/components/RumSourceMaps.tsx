import React from 'react';
import useSWR from 'swr';
import { api } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner } from '@/components/Core';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

const UPLOAD_URL = 'https://api.senzor.dev/api/ingest/rum/sourcemap';
const fetcher = (url: string) => api.get(url).then((r) => r.data);

const formatBytes = (b: number) => {
  if (!b) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(b) / Math.log(k)));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface MapRow { _id: string; fileName: string; release: string; size: number; updatedAt: string }

export const RumSourceMaps = ({ serviceId }: { serviceId: string }) => {
  const { data: maps, mutate } = useSWR<MapRow[]>(serviceId ? `/rum/${serviceId}/sourcemaps` : null, fetcher);

  const remove = async (id: string) => {
    try {
      await api.delete(`/rum/${serviceId}/sourcemaps/${id}`);
      mutate();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to delete source map'));
    }
  };

  return (
    <Card>
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0 h-16">
        <CardTitle className="text-sm font-medium text-muted-foreground">Source Maps</CardTitle>
        <Badge variant="outline" className="text-[10px]">{maps?.length ?? 0} uploaded</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <p className="text-xs text-muted-foreground">
          Upload source maps from your build/CI to de-minify error stack traces. Authenticate with your RUM ingest API key.
        </p>
        <pre className="rounded-lg bg-muted/50 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`curl -X POST "${UPLOAD_URL}" \\
  -H "x-service-api-key: <RUM_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"release":"1.4.0","fileName":"main.abc123.js","sourceMap": <map.json> }'`}
        </pre>

        {maps && maps.length > 0 && (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {maps.map((m) => (
              <div key={m._id} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono truncate" title={m.fileName}>{m.fileName}</div>
                  <div className="text-[10px] text-muted-foreground">release {m.release} · {formatBytes(m.size)} · {new Date(m.updatedAt).toLocaleDateString()}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(m._id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {maps && maps.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">No source maps uploaded yet.</div>
        )}
        {!maps && <div className="flex items-center justify-center py-4"><Spinner className="h-4 w-4" /></div>}
      </CardContent>
    </Card>
  );
};
