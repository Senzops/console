/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Globe, GripVertical, Trash2, AlertTriangle, ShieldCheck, ShieldAlert, ExternalLink, Timer } from "lucide-react";
import { Card, Badge, Button } from "../Core";
import { SmartAnimatedValue } from "../Tween";
import { UptimeStrip, UptimeSegment } from "./UptimeStrip";

// --- Types ---
export interface MonitorSummary {
  monitorId: string;
  name: string;
  url?: string;
  interval: number;
  status: "up" | "down" | "timeout" | "pending" | string;
  lastDownAt: string | null;
  createdAt: string;
  lastCheck: string | null;
  ssl: { valid: boolean; daysRemaining: number; validTo: string | null; lastCheckedAt: string | null; error: string | null };
  domain: { daysRemaining: number; expiresAt: string | null; lastCheckedAt: string | null; error: string | null };
  stats: { uptime: number; avgLatency: number; totalChecks: number };
  openIncident: { startedAt: string; cause: string; statusCode: number } | null;
  /** Width of each stripe segment's time window in ms (adapts to check interval). */
  bucketMs: number;
  stripe: (UptimeSegment | null)[];
}

// --- Helpers ---
const formatDuration = (ms: number): string => {
  if (ms <= 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const computeDuration = (s: MonitorSummary): string => {
  if (s.status === "up") {
    const since = s.lastDownAt || s.createdAt;
    return formatDuration(Date.now() - new Date(since).getTime());
  }
  if (s.openIncident?.startedAt) return formatDuration(Date.now() - new Date(s.openIncident.startedAt).getTime());
  if (s.lastDownAt) return formatDuration(Date.now() - new Date(s.lastDownAt).getTime());
  return "—";
};

const useLiveDuration = (s: MonitorSummary): string => {
  const [display, setDisplay] = useState(() => computeDuration(s));
  useEffect(() => {
    setDisplay(computeDuration(s));
    const t = setInterval(() => setDisplay(computeDuration(s)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.status, s.lastDownAt, s.createdAt, s.openIncident?.startedAt]);
  return display;
};

const statusMeta = (status: string) => {
  switch (status) {
    case "up":
      return { label: "UP", dot: "bg-emerald-500", badge: "success" as const };
    case "timeout":
      return { label: "TIMEOUT", dot: "bg-yellow-500", badge: "warning" as const };
    case "down":
      return { label: "DOWN", dot: "bg-destructive", badge: "destructive" as const };
    default:
      return { label: "PENDING", dot: "bg-muted-foreground", badge: "secondary" as const };
  }
};

const uptimeColor = (uptime: number) =>
  uptime >= 99.9 ? "text-emerald-500" : uptime >= 99 ? "text-blue-500" : uptime >= 95 ? "text-yellow-500" : "text-destructive";

const daysColor = (days: number) =>
  days < 0 ? "text-muted-foreground" : days <= 7 ? "text-destructive" : days <= 30 ? "text-yellow-500" : "text-muted-foreground";

interface MonitorCardProps {
  summary: MonitorSummary;
  displayRange?: string;
  readOnly?: boolean;
  isEditing?: boolean;
  isDragged?: boolean;
  onRemove?: () => void;
  onOpen?: () => void;
  dragHandlers?: {
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
  };
  onResizeStart?: (e: React.MouseEvent) => void;
}

const Stat = ({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
    <p className={`text-sm font-semibold tabular-nums truncate ${valueClass ?? "text-foreground"}`}>{value}</p>
  </div>
);

export const MonitorCard = ({
  summary,
  displayRange,
  readOnly = false,
  isEditing = false,
  isDragged = false,
  onRemove,
  onOpen,
  dragHandlers,
  onResizeStart,
}: MonitorCardProps) => {
  const sm = statusMeta(summary.status);
  const isUp = summary.status === "up";
  const liveDuration = useLiveDuration(summary);

  const hasSsl = !!summary.ssl?.lastCheckedAt && summary.ssl.daysRemaining >= 0;
  const sslWarn = hasSsl && summary.ssl.daysRemaining <= 14;
  const hasDomain = !!summary.domain?.lastCheckedAt && !summary.domain?.error && summary.domain.daysRemaining >= 0;

  return (
    <Card
      className={`flex flex-col h-full relative overflow-hidden border-border/60 shadow-sm transition-all duration-200 ${
        isDragged ? "opacity-40 scale-[0.98]" : "opacity-100"
      }`}
    >
      {/* Header / drag handle */}
      <div
        className={`flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5 shrink-0 ${
          isEditing ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        draggable={isEditing}
        onDragStart={dragHandlers?.onDragStart}
        onDragOver={(e) => {
          e.preventDefault();
          dragHandlers?.onDragOver?.(e);
        }}
        onDrop={dragHandlers?.onDrop}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isEditing && <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate leading-tight">{summary.name}</h3>
            {summary.url && (
              <a
                href={summary.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground font-mono hover:underline truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {summary.url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={sm.badge} className="text-[10px] px-2 uppercase">
            {sm.label}
          </Badge>
          {isEditing && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:bg-destructive/10 transition-colors"
              title="Remove from board"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            !readOnly &&
            onOpen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Open monitor"
                onClick={onOpen}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-4 pb-4 flex-1 min-h-0">
        {!isUp && summary.openIncident && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium truncate">
              {summary.status === "timeout" ? "Timing out" : "Outage"} for {liveDuration}
            </span>
          </div>
        )}

        {/* Availability stripe (range-bucketed; resolution adapts to interval) */}
        <UptimeStrip segments={summary.stripe} bucketMs={summary.bucketMs} dense label="Availability" />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <Stat
            label={displayRange ? `Uptime · ${displayRange}` : "Uptime"}
            value={<SmartAnimatedValue value={`${summary.stats.uptime.toFixed(2)}%`} />}
            valueClass={uptimeColor(summary.stats.uptime)}
          />
          <Stat
            label={isUp ? "Up for" : "Down for"}
            value={liveDuration}
            valueClass={isUp ? "text-emerald-500" : "text-destructive"}
          />
          <Stat label="Avg Latency" value={<SmartAnimatedValue value={`${Math.round(summary.stats.avgLatency)}ms`} />} />
          <Stat
            label="Last Check"
            value={
              summary.lastCheck ? (
                <span title={new Date(summary.lastCheck).toLocaleString()}>
                  {new Date(summary.lastCheck).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>

        {/* Minimal footer pinned to the bottom — keeps card height consistent */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground shrink-0 mt-auto pt-1">
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" /> {summary.interval}m interval
          </span>
          {hasSsl && (
            <span className={`inline-flex items-center gap-1 ${daysColor(summary.ssl.daysRemaining)}`}>
              {sslWarn ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              SSL {summary.ssl.daysRemaining}d
            </span>
          )}
          {hasDomain && (
            <span className={`inline-flex items-center gap-1 ${daysColor(summary.domain.daysRemaining)}`}>
              <Globe className="h-3 w-3" />
              Domain {summary.domain.daysRemaining}d
            </span>
          )}
        </div>
      </div>

      {/* Resize handle (edit mode) */}
      {isEditing && onResizeStart && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-muted-foreground/30 hover:text-primary transition-colors z-20"
          onMouseDown={onResizeStart}
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-current rounded-br-sm" />
        </div>
      )}
    </Card>
  );
};

export default MonitorCard;
