import React, { useState } from 'react';
import { api } from '@/lib/auth';
import { Dialog, Button, Input, Spinner } from '@/components/Core';
import { Flag, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';

export interface Annotation { _id: string; date: string; text: string; color?: string }

const SWATCHES = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

// datetime-local value (local time, no zone) for an <input type="datetime-local">.
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const WebAnnotationsDialog = ({ open, onClose, webId, annotations, onChanged, readOnly }: {
  open: boolean;
  onClose: () => void;
  webId: string;
  annotations: Annotation[];
  onChanged: () => void;
  readOnly: boolean;
}) => {
  const [date, setDate] = useState(() => toLocalInput(new Date()));
  const [text, setText] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const add = async () => {
    if (!text.trim() || !date) return;
    setSaving(true);
    try {
      await api.post(`/web/${webId}/annotations`, {
        date: new Date(date).toISOString(),
        text: text.trim(),
        color,
      });
      setText('');
      toast.success('Annotation added');
      onChanged();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to add annotation'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/web/${webId}/annotations/${id}`);
      onChanged();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to delete annotation'));
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...(annotations || [])].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Dialog open={open} onClose={onClose} title="Annotations" className="max-w-lg">
      <div className="space-y-5">
        {!readOnly && (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-medium text-muted-foreground">When</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-1.5 pb-1.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Deployed v2.0" maxLength={200} className="h-9 text-sm" />
              <Button onClick={add} disabled={saving || !text.trim()}>
                {saving ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Flag className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No annotations in this period</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">Mark deploys, campaigns, or incidents to give your traffic context.</p>
            </div>
          ) : (
            sorted.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color || '#f43f5e' }} />
                  <div className="min-w-0">
                    <div className="text-sm truncate" title={a.text}>{a.text}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleString()}</div>
                  </div>
                </div>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(a._id)} disabled={busyId === a._id}>
                    {busyId === a._id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
};
