import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { api, useAuth } from "../../lib/auth";
import { Badge, Button, Spinner } from "../Core";
import {
  X,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  XCircle,
  Plus,
  Ban,
} from "lucide-react";
import { getLevelColors, logSeverity, type LogRecord } from "./shared";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const ContextRow = ({ row, anchor, onSelect }: { row: any; anchor?: boolean; onSelect: (id: string) => void }) => {
  const colors = getLevelColors(logSeverity(row));
  return (
    <button
      onClick={() => !anchor && onSelect(row._id)}
      className={`flex items-start gap-2 w-full text-left px-3 py-2 rounded-md transition-colors ${anchor ? "bg-blue-500/10 border border-blue-500/30" : "hover:bg-muted/50"}`}
    >
      <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 w-16">
        {new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className="text-xs font-mono text-foreground truncate">{row.message}</span>
    </button>
  );
};

// New-Relic-style value with a filter action menu (add / exclude / copy).
// The menu renders in a portal with fixed positioning so it can never be clipped
// by an ancestor's overflow (the attributes container or the scrolling drawer).
const FilterableValue = ({
  field,
  queryValue,
  copyText,
  className,
  children,
  copyOnly,
  onAddFilter,
  onAfter,
}: {
  field: string;
  queryValue: string;
  copyText: string;
  className?: string;
  children: React.ReactNode;
  copyOnly?: boolean;
  onAddFilter?: (field: string, value: string, negate?: boolean) => void;
  onAfter?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 208) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onClose = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open]);

  const apply = (negate: boolean) => { onAddFilter?.(field, queryValue, negate); setOpen(false); onAfter?.(); };
  const copyVal = () => { navigator.clipboard.writeText(copyText); setOpen(false); };

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openMenu())} className={className} title="Filter options">
        {children}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[100] w-48 rounded-md border border-border/60 bg-popover text-popover-foreground shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {!copyOnly && (
            <>
              <button onClick={() => apply(false)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/60 text-left">
                <Plus className="h-3.5 w-3.5 text-emerald-500" /> Add to query
              </button>
              <button onClick={() => apply(true)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/60 text-left">
                <Ban className="h-3.5 w-3.5 text-destructive" /> Exclude from query
              </button>
            </>
          )}
          <button onClick={copyVal} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/60 text-left">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy value
          </button>
        </div>,
        document.body,
      )}
    </>
  );
};

// One key/value row in the formatted attributes list. Every value with a `field`
// is filterable; objects/arrays filter by existence (`field:*`) and copy their JSON.
const KvRow = ({
  label,
  val,
  field,
  copyOnly,
  onAddFilter,
  onAfter,
}: {
  label: string;
  val: any;
  field?: string;
  copyOnly?: boolean;
  onAddFilter?: (field: string, value: string, negate?: boolean) => void;
  onAfter?: () => void;
}) => {
  const isScalar = val === null || ["string", "number", "boolean"].includes(typeof val);
  const display = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val);
  return (
    <div className="flex items-baseline gap-3 px-3 py-1.5 text-xs font-mono hover:bg-muted/30">
      <span className="text-muted-foreground shrink-0 min-w-[88px] max-w-[140px] truncate">{label}</span>
      {field ? (
        <FilterableValue
          field={field}
          queryValue={isScalar ? display : "*"}
          copyText={display}
          copyOnly={copyOnly}
          className="text-foreground hover:underline decoration-dotted underline-offset-2 text-left break-all"
          onAddFilter={onAddFilter}
          onAfter={onAfter}
        >
          {display}
        </FilterableValue>
      ) : (
        <span className="text-foreground break-all">{display}</span>
      )}
    </div>
  );
};

const badgeCls = "inline-flex items-center px-3 py-1.5 text-xs rounded-full border border-border/50 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors";

export const LogDetailDrawer = ({
  log,
  isLoading,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  onSelectLog,
  getTraceLink,
  onOpenTrace,
  onAddFilter,
}: {
  log: LogRecord | null;
  isLoading: boolean;
  onClose: () => void;
  onNavigate: (dir: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
  onSelectLog: (id: string) => void;
  getTraceLink: (log: any) => string | null;
  onOpenTrace: (href: string) => void;
  onAddFilter?: (field: string, value: string, negate?: boolean) => void;
}) => {
  const { token } = useAuth();
  const [tab, setTab] = useState<"details" | "context">("details");
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [copied, setCopied] = useState<string | null>(null);

  const { data: ctxData, isLoading: ctxLoading } = useSWR(
    token && tab === "context" && log ? `/logs/${log._id}/context?limit=8` : null,
    fetcher,
  );

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  // Adding a filter closes the drawer so the refined results are visible.
  const afterFilter = () => onClose();
  const sourceName = log?.source || "";

  const rawJson = log
    ? JSON.stringify(
        { message: log.message, level: logSeverity(log), timestamp: log.timestamp, source: log.source, ...(log.attributes || {}) },
        null,
        2,
      )
    : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-card border-l border-border/80 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full mr-2">
              <X className="h-5 w-5" />
            </Button>
            {log ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${getLevelColors(logSeverity(log)).bg} ${getLevelColors(logSeverity(log)).text} ${getLevelColors(logSeverity(log)).border} uppercase font-bold text-xs`}>
                  {logSeverity(log)}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground">Log Details</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("prev")} disabled={!hasPrev || isLoading}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("next")} disabled={!hasNext || isLoading}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        {log && (
          <div className="flex items-center gap-1 px-4 pt-3 shrink-0">
            {(["details", "context"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md capitalize border-b-2 transition-all ${tab === t ? "border-blue-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t === "context" ? "Surrounding" : "Details"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !log ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Spinner className="h-8 w-8 text-blue-500" />
              <p className="text-muted-foreground text-sm">Loading log data...</p>
            </div>
          ) : !log ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 h-full">
              <XCircle className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm font-medium text-foreground">Log not found</span>
              <span className="text-xs">It may have expired or exists on another page.</span>
            </div>
          ) : tab === "details" ? (
            <>
              {/* Message */}
              <div className="relative group/message bg-background border border-border/60 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</h2>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity" onClick={() => copy(log.message, "msg")}>
                    {copied === "msg" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-sm font-mono text-foreground break-words leading-relaxed">{log.message}</p>
              </div>

              {/* Context links + filterable badges */}
              {(log.traceId || log.source || log.host || log.environment) && (
                <div className="flex flex-wrap gap-2">
                  {getTraceLink(log) && (
                    <Button variant="outline" size="sm" className="bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20" onClick={() => onOpenTrace(getTraceLink(log)!)}>
                      View Trace <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  )}
                  {log.traceId && (
                    <FilterableValue field="trace" queryValue={String(log.traceId)} copyText={String(log.traceId)} className={badgeCls} onAddFilter={onAddFilter} onAfter={afterFilter}>
                      trace: {String(log.traceId).slice(0, 12)}…
                    </FilterableValue>
                  )}
                  {log.source && (
                    <FilterableValue field="source" queryValue={sourceName} copyText={sourceName} className={badgeCls} onAddFilter={onAddFilter} onAfter={afterFilter}>
                      source: {sourceName}
                    </FilterableValue>
                  )}
                  {log.host && (
                    <FilterableValue field="host" queryValue={log.host} copyText={log.host} className={badgeCls} onAddFilter={onAddFilter} onAfter={afterFilter}>
                      host: {log.host}
                    </FilterableValue>
                  )}
                  {log.environment && (
                    <FilterableValue field="env" queryValue={log.environment} copyText={log.environment} className={badgeCls} onAddFilter={onAddFilter} onAfter={afterFilter}>
                      env: {log.environment}
                    </FilterableValue>
                  )}
                </div>
              )}

              {/* Attributes */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attributes</h2>
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border/50">
                    {(["formatted", "raw"] as const).map((m) => (
                      <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${viewMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {viewMode === "formatted" ? (
                  <div className="rounded-lg border border-border/60 divide-y divide-border/40">
                    <KvRow label="message" val={log.message} field="message" onAddFilter={onAddFilter} onAfter={afterFilter} />
                    <KvRow label="level" val={logSeverity(log)} field="level" onAddFilter={onAddFilter} onAfter={afterFilter} />
                    <KvRow label="timestamp" val={new Date(log.timestamp).toISOString()} field="timestamp" copyOnly onAddFilter={onAddFilter} onAfter={afterFilter} />
                    {log.source && <KvRow label="source" val={log.source} field="source" onAddFilter={onAddFilter} onAfter={afterFilter} />}
                    {Object.entries(log.attributes || {}).map(([k, v]) => (
                      <KvRow key={k} label={k} val={v} field={k} onAddFilter={onAddFilter} onAfter={afterFilter} />
                    ))}
                  </div>
                ) : (
                  <div className="relative group/raw">
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 bg-muted/80 opacity-0 group-hover/raw:opacity-100 transition-opacity z-10" onClick={() => copy(rawJson, "raw")}>
                      {copied === "raw" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <div className="bg-[#0d1117] border border-border/60 rounded-lg p-4 overflow-x-auto shadow-inner">
                      <pre className="text-xs font-mono text-[#e6edf3] whitespace-pre-wrap break-words">{rawJson}</pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Surrounding context
            <div className="space-y-1">
              {ctxLoading ? (
                <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-blue-500" /></div>
              ) : (
                <>
                  {(ctxData?.before || []).map((r: any) => <ContextRow key={r._id} row={r} onSelect={onSelectLog} />)}
                  {ctxData?.anchor && <ContextRow row={ctxData.anchor} anchor onSelect={onSelectLog} />}
                  {(ctxData?.after || []).map((r: any) => <ContextRow key={r._id} row={r} onSelect={onSelectLog} />)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
