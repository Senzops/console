import React, { useState } from 'react';
import useSWR from 'swr';
import { createPortal } from 'react-dom';
import { api, useAuth } from '@/lib/auth';
import { useShareApi, useShareMode } from '@/lib/share';
import { buildTimeRangeQuery } from '@/components/TimeRangePicker';
import { Card, CardContent, CardHeader, CardTitle, Button, Dialog, Input, Badge, Spinner, DataError } from '@/components/Core';
import { Plus, Trash2, Pencil, ArrowDown, Maximize, X } from 'lucide-react';

const FUNNEL_STEP_LIMIT = 3;
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/axiosError';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return (num ?? 0).toString();
};

type StepType = 'page' | 'event';
type MatchMode = 'exact' | 'contains' | 'startsWith';

interface FunnelStep { type: StepType; value: string; match?: MatchMode; label?: string }
interface FunnelDef { _id: string; name: string; steps: FunnelStep[] }

const MAX_STEPS = 10;
const emptyStep = (): FunnelStep => ({ type: 'page', value: '', match: 'exact' });

// ---------------------------------------------------------------------------
// Funnel builder (create / edit) dialog
// ---------------------------------------------------------------------------
const FunnelBuilder = ({ webId, existing, onClose, onSaved }: { webId: string; existing?: FunnelDef | null; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState(existing?.name || '');
  const [steps, setSteps] = useState<FunnelStep[]>(
    existing?.steps?.length ? existing.steps.map((s) => ({ ...s, match: s.match || 'exact' })) : [emptyStep(), emptyStep()]
  );
  const [saving, setSaving] = useState(false);

  const updateStep = (i: number, patch: Partial<FunnelStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () => setSteps((prev) => (prev.length >= MAX_STEPS ? prev : [...prev, emptyStep()]));
  const removeStep = (i: number) => setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const valid = name.trim().length > 0 && steps.length >= 1 && steps.every((s) => s.value.trim().length > 0);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      steps: steps.map((s) => ({ type: s.type, value: s.value.trim(), match: s.type === 'page' ? s.match || 'exact' : 'exact' })),
    };
    try {
      if (existing) await api.put(`/web/${webId}/funnels/${existing._id}`, payload);
      else {
        await api.post(`/web/${webId}/funnels`, payload);
        trackEvent(AnalyticsEvent.FunnelCreated, { steps: payload.steps.length });
      }
      toast.success(existing ? 'Funnel updated' : 'Funnel created');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to save funnel'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={existing ? 'Edit Funnel' : 'New Funnel'} className="max-w-2xl">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Funnel name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signup conversion" maxLength={80} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Steps</label>
            <span className="text-[10px] text-muted-foreground/70">{steps.length}/{MAX_STEPS}</span>
          </div>

          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">{i + 1}</span>
                <select
                  value={s.type}
                  onChange={(e) => updateStep(i, { type: e.target.value as StepType })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring shrink-0"
                >
                  <option value="page">Page</option>
                  <option value="event">Event</option>
                </select>
                <Input
                  value={s.value}
                  onChange={(e) => updateStep(i, { value: e.target.value })}
                  placeholder={s.type === 'page' ? '/pricing' : 'Signup'}
                  maxLength={200}
                  className="h-8 text-xs flex-1"
                />
                {s.type === 'page' && (
                  <select
                    value={s.match || 'exact'}
                    onChange={(e) => updateStep(i, { match: e.target.value as MatchMode })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring shrink-0"
                  >
                    <option value="exact">is</option>
                    <option value="startsWith">starts with</option>
                    <option value="contains">contains</option>
                  </select>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStep(i)} disabled={steps.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addStep} disabled={steps.length >= MAX_STEPS} className="w-full mt-1">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add step
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? <Spinner className="h-4 w-4 mr-2" /> : null}
            {existing ? 'Save changes' : 'Create funnel'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Single funnel card with conversion visualization
// ---------------------------------------------------------------------------
const FunnelStep = ({ r, i }: { r: any; i: number }) => {
  const width = Math.max(r.conversionFromStart, r.visitors > 0 ? 4 : 0);
  return (
    <div>
      {i > 0 && r.dropOff > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5 pl-7">
          <ArrowDown className="h-3 w-3 text-destructive/70" />
          {formatNumber(r.dropOff)} dropped off · {(100 - r.conversionFromPrev).toFixed(0)}%
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5 text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">{i + 1}</span>
          <span className="truncate font-medium text-foreground" title={r.label || r.value}>{r.label || r.value}</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0">{r.type}</Badge>
        </div>
        <span className="font-mono whitespace-nowrap text-foreground">
          {formatNumber(r.visitors)}
          <span className="text-muted-foreground/70 ml-1.5">{r.conversionFromStart.toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-7 rounded-md bg-muted/40 overflow-hidden">
        <div className="h-full bg-primary/80 rounded-md transition-all duration-700 flex items-center justify-end pr-2" style={{ width: `${width}%` }}>
          {r.conversionFromStart >= 18 && <span className="text-[10px] font-medium text-primary-foreground">{r.conversionFromStart.toFixed(0)}%</span>}
        </div>
      </div>
    </div>
  );
};

const FunnelCard = ({ webId, funnel, timeRange, fetcher, canQuery, readOnly, onEdit, onDelete }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { data, error } = useSWR(
    canQuery ? `/web/${webId}/funnels/${funnel._id}/analyze?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const results = data?.results || [];
  const overall = data?.overallConversion ?? 0;
  const visible = isMaximized ? results : results.slice(0, FUNNEL_STEP_LIMIT);
  const hidden = results.length - visible.length;

  const card = (
    <Card className={`flex flex-col overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 border-b border-border/40 h-16 shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate">{funnel.name}</CardTitle>
        <div className="flex items-center gap-1.5 shrink-0">
          {data && <Badge variant="outline" className="text-[10px] font-mono">{overall.toFixed(1)}% conversion</Badge>}
          {!readOnly && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(funnel)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(funnel)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMaximized((m) => !m)}>
            {isMaximized ? <X className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-5">
        {!data && !error && <div className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></div>}
        {error && <div className="py-6"><DataError /></div>}
        {data && (
          <div className="space-y-4">
            {visible.map((r: any, i: number) => <FunnelStep key={i} r={r} i={i} />)}
            {!isMaximized && hidden > 0 && (
              <button onClick={() => setIsMaximized(true)} className="w-full py-2 text-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                Show {hidden} more {hidden === 1 ? 'step' : 'steps'}...
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}
      {isMaximized ? createPortal(card, document.body) : card}
    </>
  );
};

// ---------------------------------------------------------------------------
// Funnels section
// ---------------------------------------------------------------------------
export const WebFunnels = ({ webId, timeRange }: { webId: string; timeRange: any }) => {
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const canQuery = Boolean(token || readOnly);

  const { data: funnels, error, mutate } = useSWR<FunnelDef[]>(
    canQuery && webId ? `/web/${webId}/funnels` : null,
    fetcher
  );

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<FunnelDef | null>(null);
  const [deleting, setDeleting] = useState<FunnelDef | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (f: FunnelDef) => { setEditing(f); setBuilderOpen(true); };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/web/${webId}/funnels/${deleting._id}`);
      toast.success('Funnel deleted');
      setDeleting(null);
      mutate();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to delete funnel'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Funnels &amp; Conversions</h2>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Funnel
          </Button>
        )}
      </div>

      {error ? (
        <Card><CardContent className="py-8"><DataError onRetry={() => mutate()} /></CardContent></Card>
      ) : !funnels ? (
        <Card><CardContent className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></CardContent></Card>
      ) : funnels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">No funnels yet</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm">Define an ordered path of pages and events to measure how visitors convert and where they drop off.</p>
            {!readOnly && <Button variant="outline" size="sm" onClick={openCreate} className="mt-1"><Plus className="h-3.5 w-3.5 mr-1.5" /> Create your first funnel</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {funnels.map((f) => (
            <FunnelCard key={f._id} webId={webId} funnel={f} timeRange={timeRange} fetcher={fetcher} canQuery={canQuery} readOnly={readOnly} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {builderOpen && <FunnelBuilder webId={webId} existing={editing} onClose={() => setBuilderOpen(false)} onSaved={() => mutate()} />}

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete Funnel?">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{deleting?.name}</strong>? This removes the funnel definition. Your analytics data is not affected.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
