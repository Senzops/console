/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "@/lib/auth";
import { useShareApi, useShareMode, useShareScopeId } from "@/lib/share";
import { ShareButton } from "@/components/ShareModal";
import { Card, Button, Spinner, Badge, Dialog, DataError } from "@/components/Core";
import { StatusBoardSkeleton } from "@/components/Skeletons";
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "@/components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
import { getDisplayLabel } from "@/lib/formatAxisDate";
import { MonitorCard, MonitorSummary } from "@/components/MonitorBoard/MonitorCard";
import { useServiceModal } from "@/components/ServiceModals/context";
import {
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  Activity,
  AlertTriangle,
  Globe,
  Edit3,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/axiosError";

const DEFAULT_CARD = { w: 12, h: 2 };
const MIN_W = 3;
const MIN_H = 2;
const MAX_W = 12;
const MAX_H = 6;

// Status Boards (incl. public status pages) divide the selected window into a
// fixed number of availability-stripe buckets. Below ~24h the stripe is mostly
// empty for typical check intervals, so we floor the selectable range at 24h —
// matching the convention of every major status-page product. Enforced again
// server-side in getBoardSummary as defense-in-depth for the public share path.
const BOARD_MIN_RANGE_HOURS = 24;

export default function MonitorBoardView() {
  const router = useRouter();
  const id = useShareScopeId(router.query.id as string | undefined);
  const { token } = useAuth();
  const { fetcher } = useShareApi();
  const { readOnly } = useShareMode();
  const { openModal } = useServiceModal();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays, BOARD_MIN_RANGE_HOURS);
  const rangeQuery = buildTimeRangeQuery(timeRange);
  const displayRange = timeRange.type === "relative" ? timeRange.range : getDisplayLabel(timeRange);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localLayout, setLocalLayout] = useState<any[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: boardData,
    error: boardErr,
    mutate: mutateBoard,
  } = useSWR((token || readOnly) && id ? `/monitor-board/${id}` : null, fetcher);

  // In edit mode we ask for live data for the CURRENT (possibly unsaved) layout
  // so freshly-added cards render immediately instead of "Monitor unavailable".
  const editingMonitors = isEditing ? localLayout.map((n) => n.i).join(",") : "";
  const {
    data: summaryData,
    error: summaryErr,
    mutate: mutateSummary,
    isValidating,
  } = useSWR(
    (token || readOnly) && id
      ? `/monitor-board/${id}/summary?${rangeQuery}${editingMonitors ? `&monitors=${editingMonitors}` : ""}`
      : null,
    fetcher,
    { refreshInterval: 60000, keepPreviousData: true }
  );

  // Full monitor list — only for the "add monitor" picker (authenticated).
  const { data: monitorList } = useSWR(token && !readOnly ? "/uptime/list" : null, fetcher);

  const board = boardData?.board;
  const summaryMap = useMemo(() => {
    const monitors: MonitorSummary[] = summaryData?.monitors || [];
    return new Map(monitors.map((s) => [s.monitorId, s]));
  }, [summaryData]);

  useEffect(() => {
    if (board?.layout) setLocalLayout([...board.layout]);
  }, [board?.layout, isEditing]);

  // Native CSS-grid resize engine (mirrors Saved Views).
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const colDelta = Math.round((e.clientX - resizing.startX) / 100);
      const rowDelta = Math.round((e.clientY - resizing.startY) / 120);
      const newW = Math.max(MIN_W, Math.min(MAX_W, resizing.startW + colDelta));
      const newH = Math.max(MIN_H, Math.min(MAX_H, resizing.startH + rowDelta));
      setLocalLayout((prev) => prev.map((n) => (n.i === resizing.id ? { ...n, w: newW, h: newH } : n)));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const orderedLayout = isEditing ? localLayout : board?.layout || [];

  // --- Mutations ---
  const saveLayout = async () => {
    setIsSaving(true);
    try {
      await api.put(`/monitor-board/${id}`, { layout: localLayout });
      await mutateBoard();
      toast.success("Board layout saved.");
      setIsEditing(false);
    } catch (e) {
      toast.error(extractErrorMessage(e, "Failed to save board."));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setLocalLayout([...(board?.layout || [])]);
    setIsEditing(false);
  };

  const addMonitor = (monitorId: string) => {
    setLocalLayout((prev) => {
      if (prev.some((n) => n.i === monitorId)) return prev;
      const maxY = prev.reduce((m, n) => Math.max(m, n.y || 0), 0);
      return [...prev, { i: monitorId, x: 0, y: maxY + 1, ...DEFAULT_CARD }];
    });
  };

  const removeCard = (monitorId: string) => setLocalLayout((prev) => prev.filter((n) => n.i !== monitorId));

  const handleDragStart = (e: React.DragEvent, monitorId: string) => {
    if (!isEditing) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(monitorId);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    setLocalLayout((prev) => {
      const next = [...prev];
      const from = next.findIndex((n) => n.i === draggedId);
      const to = next.findIndex((n) => n.i === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedId(null);
  };

  const openEditBoard = () => {
    if (!board) return;
    openModal("board", "edit", {
      id: id as string,
      name: board.name,
      description: board.description,
      onSuccess: () => mutateBoard(),
    });
  };

  const deleteBoard = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/monitor-board/${id}`);
      toast.success("Board deleted.");
      router.push("/dashboard");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Failed to delete board."));
      setIsDeleting(false);
    }
  };

  // --- Gates ---
  if (!boardData && !boardErr) {
    return <StatusBoardSkeleton />;
  }
  if (boardErr) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <DataError onRetry={() => mutateBoard()} />
      </div>
    );
  }
  if (!board) {
    return <div className="h-full flex items-center justify-center text-destructive p-8">Board not found.</div>;
  }

  const onBoardIds = new Set(localLayout.map((n) => n.i));
  const availableMonitors = (monitorList || []).filter(
    (m: any) => !onBoardIds.has(m._id) && m.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const summaryLoading = !summaryData && !summaryErr;

  return (
    <>
      {/* Blueprint dots in edit mode (matches Saved Views) */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ${isEditing ? "opacity-20" : "opacity-0"}`}
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-32 relative z-10">
        {/* Header */}
        <div className="relative z-[301] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight truncate">{board.name}</h1>
              <Badge
                variant="outline"
                className="border-emerald-500/20 text-emerald-500 bg-emerald-500/10 font-mono text-[10px] font-bold tracking-wider shrink-0"
              >
                STATUS BOARD
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{board.description || "Centralized uptime dashboard"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} minRangeHours={BOARD_MIN_RANGE_HOURS} />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mutateSummary()} disabled={isValidating}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
            </Button>
            {!readOnly && <ShareButton scopeType="monitorboard" scopeId={id as string} dashboardName={board.name} />}
            {!readOnly && (
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={openEditBoard} title="Edit board details">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!readOnly && (
              <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary error */}
        {summaryErr && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Failed to load live monitor data.
            <button className="underline ml-1" onClick={() => mutateSummary()}>
              Retry
            </button>
          </div>
        )}

        {/* Empty board */}
        {orderedLayout.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border border-dashed border-border rounded-xl bg-card/30 flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Activity className="h-8 w-8" />
            </div>
            <p className="font-semibold text-foreground text-lg">No monitors on this board</p>
            {!readOnly ? (
              <>
                <p className="text-sm opacity-70 max-w-sm">Add uptime monitors to build your status board.</p>
                <Button
                  className="mt-2"
                  onClick={() => {
                    setIsEditing(true);
                    setPickerOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Monitor
                </Button>
              </>
            ) : (
              <p className="text-sm opacity-70">This status board has no monitors yet.</p>
            )}
          </div>
        ) : (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `@media (max-width: 768px) { .board-grid-item { grid-column: span 12 !important; } }`,
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 transition-all" style={{ gridAutoRows: "120px" }}>
              {orderedLayout.map((node: any) => {
                const summary = summaryMap.get(node.i);
                return (
                  <div
                    key={node.i}
                    className="board-grid-item transition-all duration-200 ease-in-out"
                    style={{ gridColumn: `span ${node.w || DEFAULT_CARD.w}`, gridRow: `span ${node.h || DEFAULT_CARD.h}` }}
                  >
                    {summary ? (
                      <MonitorCard
                        summary={summary}
                        displayRange={displayRange}
                        readOnly={readOnly}
                        isEditing={isEditing}
                        isDragged={draggedId === node.i}
                        onRemove={() => removeCard(node.i)}
                        onOpen={() => router.push(`/dashboard/monitor/${node.i}`)}
                        dragHandlers={{
                          onDragStart: (e) => handleDragStart(e, node.i),
                          onDrop: (e) => handleDrop(e, node.i),
                        }}
                        onResizeStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setResizing({ id: node.i, startX: e.clientX, startY: e.clientY, startW: node.w, startH: node.h });
                        }}
                      />
                    ) : summaryLoading || isValidating ? (
                      <Card className="h-full flex items-center justify-center">
                        <Spinner className="h-6 w-6 text-emerald-500" />
                      </Card>
                    ) : (
                      <Card className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm border-dashed">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span>Monitor unavailable</span>
                        {isEditing && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeCard(node.i)}>
                            <X className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        )}
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating edit dock / FAB (mirrors Saved Views; hidden in read-only share view) */}
      {!readOnly &&
        (isEditing ? (
          <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 md:left-[calc(50vw+8rem)] w-[calc(100%-2rem)] max-w-fit bg-card/95 backdrop-blur-md border border-border/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] px-3 py-2.5 md:px-6 md:py-3 rounded-full flex items-center justify-center gap-2 md:gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 md:pr-4 md:border-r border-border/40 shrink-0">
              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-foreground hidden sm:block">
                Edit Mode
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <Button
                onClick={() => setPickerOpen(true)}
                variant="secondary"
                className="h-8 md:h-9 rounded-full px-3 md:px-5 shadow-sm font-semibold border-none text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">Add Monitor</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button
                variant="ghost"
                onClick={cancelEdit}
                disabled={isSaving}
                className="h-8 md:h-9 rounded-full px-3 md:px-5 hover:bg-destructive/10 hover:text-destructive font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={saveLayout}
                disabled={isSaving}
                className="h-8 md:h-9 shadow-md bg-primary text-primary-foreground rounded-full px-4 md:px-6 font-semibold transition-all text-xs"
              >
                {isSaving ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">Save Layout</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-8 right-8 z-40">
            <Button
              onClick={() => setIsEditing(true)}
              size="icon"
              className="h-12 w-12 rounded-full shadow-2xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border group transition-all"
              title="Edit layout"
            >
              <Edit3 className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        ))}

      {/* Add-monitor picker */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Monitors">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search monitors…"
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 pl-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-border/40">
            {!monitorList ? (
              <div className="py-8 flex justify-center">
                <Spinner className="h-5 w-5 text-emerald-500" />
              </div>
            ) : availableMonitors.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {(monitorList || []).length === 0 ? "No uptime monitors yet." : "All monitors are already on this board."}
              </p>
            ) : (
              availableMonitors.map((m: any) => (
                <div key={m._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        m.status === "up" ? "bg-emerald-500" : m.status === "timeout" ? "bg-yellow-500" : m.status === "down" ? "bg-destructive" : "bg-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                        <Globe className="h-3 w-3 shrink-0" />
                        {(m.url || "").replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => addMonitor(m._id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={() => setPickerOpen(false)}>Done</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete board */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Board?">
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">This removes the board and its share links.</span>
              Your monitors and their history are <strong>not</strong> affected.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteBoard} disabled={isDeleting}>
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete Board
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
