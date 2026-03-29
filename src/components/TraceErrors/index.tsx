import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
} from "../Core";
import {
  AlertOctagon,
  Terminal,
  ChevronRight,
  Copy,
  Check,
  Info,
  Clock,
  ExternalLink,
  Server,
  Activity,
  HardDrive,
  MonitorSmartphone,
  History,
} from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- Formatters ---
const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return undefined;
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return undefined;
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 && d === 0) parts.push(`${s}s`);

  return parts.join(" ") || "< 1s";
};

// --- Reusable UI Context Blocks ---
const ContextGroup = ({ title, icon: Icon, children, className = "" }: any) => {
  // If all children evaluate to null (empty), don't render the group
  let hasContent = false;
  React.Children.forEach(children, (child) => {
    if (child) hasContent = true;
  });
  if (!hasContent) return null;

  return (
    <div
      className={`bg-background rounded-lg p-4 border border-border/40 shadow-sm flex flex-col ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
};

const ContextItem = ({ label, value }: { label: string; value: any }) => {
  // Prevent rendering empty strings, nulls, or completely empty objects/arrays
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object" && Object.keys(value).length === 0) return null;

  // Safely parse nested objects so they don't show up as [object Object]
  const displayValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  return (
    <div className="space-y-1 min-w-0">
      <div
        className="text-[10px] text-muted-foreground uppercase tracking-wider truncate"
        title={label}
      >
        {label}
      </div>
      <div
        className="text-xs font-mono text-foreground truncate"
        title={displayValue}
      >
        {displayValue}
      </div>
    </div>
  );
};

// --- Shared Reusable Component for Universal Error Occurrences ---
export const ErrorEventList = ({
  events,
  apmId, // Generic fallback parent ID
  showTraceLink = false,
  showGroupLink = false,
  serviceType, // Allows explicitly passing the service type
}: {
  events: any[];
  apmId?: string;
  showTraceLink?: boolean;
  showGroupLink?: boolean;
  serviceType?: string;
}) => {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!events || events.length === 0) return null;

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-card">
      <div className="max-h-[600px] overflow-y-auto divide-y divide-border/40 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {events.map((err) => {
          const isExpanded = expandedIds[err._id];

          // DYNAMIC ROUTING: Resolves exact model for correct links
          const actualServiceModel =
            err.serviceModel ||
            (serviceType === "task"
              ? "TaskService"
              : serviceType === "rum"
                ? "RumService"
                : "ApmService");

          const isTask = actualServiceModel === "TaskService";
          const isRum = actualServiceModel === "RumService";
          const routeServiceId = err.serviceId || apmId;

          const traceUrl = isTask
            ? `/dashboard/task/${routeServiceId}/run/${err.traceId}`
            : isRum
              ? `/dashboard/rum/${routeServiceId}/trace/${err.traceId}`
              : `/dashboard/apm/${routeServiceId}/trace/${err.traceId}`;

          const traceBtnLabel = isTask
            ? "View Run"
            : isRum
              ? "View Page Trace"
              : "View Trace";

          // ADVANCED CONTEXT PARSING
          const ctx = err.context || {};

          // We cleanly extract Backend vs Frontend fields so they map cleanly to groups
          const {
            // Node/Backend Context
            runtime,
            process: procInfo,
            memory,
            sdk,
            // Browser/RUM Context
            breadcrumbs,
            browser,
            os,
            device,
            url,
            userAgent,
            viewport,
            // Catch-all for extra custom tags
            ...flatContext
          } = ctx;

          const validFlatContext = Object.entries(flatContext).filter(
            ([_, v]) =>
              v !== undefined &&
              v !== null &&
              v !== "" &&
              !(typeof v === "object" && Object.keys(v).length === 0),
          );

          return (
            <div key={err._id} className="flex flex-col transition-colors">
              {/* Row Header (Clickable) */}
              <div
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-all ${isExpanded ? "bg-muted/10" : ""}`}
                onClick={() => toggleExpand(err._id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="destructive"
                        className="font-mono text-[10px] uppercase tracking-wider px-2 py-0 h-5"
                      >
                        {err.errorClass}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(err.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          fractionalSecondDigits: 3,
                        })}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-foreground truncate pr-4">
                      {err.message}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 md:mt-0 pl-7 md:pl-0 shrink-0">
                  {showGroupLink && err.groupId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/errors/${err.groupId}`);
                      }}
                    >
                      View Group <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  )}
                  {showTraceLink && err.traceId && routeServiceId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-background text-primary border-primary/20 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(traceUrl);
                      }}
                    >
                      {traceBtnLabel}{" "}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Row Body (Expanded) */}
              {isExpanded && (
                <div className="p-4 pl-11 border-t border-border/30 bg-muted/5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                  {/* --- ADVANCED FORENSIC CONTEXT --- */}
                  {Object.keys(ctx).length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* RUM: Breadcrumbs Timeline */}
                      {breadcrumbs &&
                        Array.isArray(breadcrumbs) &&
                        breadcrumbs.length > 0 && (
                          <div className="lg:col-span-3 bg-background rounded-lg p-4 border border-border/40 shadow-sm">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
                              <History className="h-3.5 w-3.5" /> User
                              Breadcrumbs
                            </div>
                            <div className="space-y-4 pl-2.5 border-l-2 border-border/60 ml-2 mt-4">
                              {breadcrumbs.map((crumb: any, idx: number) => (
                                <div key={idx} className="relative pl-5">
                                  {/* Timeline node marker */}
                                  <div className="absolute -left-[15.5px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground ring-4 ring-background" />
                                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                    <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="px-1.5 py-0 h-4 text-[9px] uppercase font-mono tracking-wider bg-secondary border-border/50 text-muted-foreground"
                                      >
                                        {crumb.category ||
                                          crumb.type ||
                                          "Action"}
                                      </Badge>
                                      {crumb.message ||
                                        crumb.name ||
                                        "Event Registered"}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                                      {crumb.time
                                        ? new Date(
                                            crumb.time,
                                          ).toLocaleTimeString()
                                        : "-"}
                                    </div>
                                  </div>
                                  {/* Breadcrumb extra metadata */}
                                  {crumb.data &&
                                    Object.keys(crumb.data).length > 0 && (
                                      <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/30 overflow-x-auto">
                                        {JSON.stringify(crumb.data)}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* 1. Flat / Operational Context (Spans full width if present) */}
                      {validFlatContext.length > 0 && (
                        <div className="lg:col-span-3 bg-background rounded-lg p-4 border border-border/40 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border/30 pb-2">
                            <Info className="h-3.5 w-3.5" /> Event Context
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {validFlatContext.map(([k, v]) => (
                              <ContextItem key={k} label={k} value={v} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2A. Client Environment (RUM) */}
                      {(browser ||
                        os ||
                        device ||
                        url ||
                        viewport ||
                        userAgent) && (
                        <ContextGroup
                          title="Client Environment"
                          icon={MonitorSmartphone}
                        >
                          <ContextItem label="URL" value={url} />
                          <ContextItem label="Browser" value={browser} />
                          <ContextItem label="OS" value={os} />
                          <ContextItem label="Device" value={device} />
                          <ContextItem label="Viewport" value={viewport} />
                          <ContextItem label="User Agent" value={userAgent} />
                        </ContextGroup>
                      )}

                      {/* 2B. Environment / SDK (Node/Task) */}
                      {(runtime || sdk) && (
                        <ContextGroup title="Environment & SDK" icon={Server}>
                          <ContextItem label="Runtime" value={runtime?.name} />
                          <ContextItem
                            label="Version"
                            value={runtime?.version}
                          />
                          <ContextItem label="SDK" value={sdk?.name} />
                          <ContextItem
                            label="SDK Version"
                            value={sdk?.version}
                          />
                        </ContextGroup>
                      )}

                      {/* 3. Process Health (Node/Task) */}
                      {procInfo && (
                        <ContextGroup title="Process Profile" icon={Activity}>
                          <ContextItem
                            label="PID / PPID"
                            value={
                              procInfo.pid
                                ? `${procInfo.pid} / ${procInfo.ppid || "-"}`
                                : undefined
                            }
                          />
                          <ContextItem
                            label="Platform"
                            value={procInfo.platform}
                          />
                          <ContextItem
                            label="Environment"
                            value={procInfo.env}
                          />
                          <ContextItem
                            label="Uptime"
                            value={formatUptime(procInfo.uptimeSec)}
                          />
                        </ContextGroup>
                      )}

                      {/* 4. Memory Allocation (Node/Task) */}
                      {memory && (
                        <ContextGroup title="Memory State" icon={HardDrive}>
                          <ContextItem
                            label="RSS"
                            value={formatBytes(memory.rss)}
                          />
                          <ContextItem
                            label="Heap Total"
                            value={formatBytes(memory.heapTotal)}
                          />
                          <ContextItem
                            label="Heap Used"
                            value={formatBytes(memory.heapUsed)}
                          />
                          <ContextItem
                            label="External V8"
                            value={formatBytes(memory.external)}
                          />
                        </ContextGroup>
                      )}
                    </div>
                  )}

                  {/* Stack Trace Terminal */}
                  {err.stackTrace && (
                    <div className="border border-border/60 rounded-lg overflow-hidden bg-[#0d1117] shadow-inner mt-2">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/40">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Terminal className="h-3.5 w-3.5" /> Stack Trace
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={(e) =>
                            copyToClipboard(e, err._id, err.stackTrace)
                          }
                          title="Copy Stack Trace"
                        >
                          {copiedId === err._id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      <div className="p-4 overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
                        <pre className="text-[11.5px] leading-relaxed font-mono text-[#c9d1d9]">
                          {err.stackTrace
                            .split("\n")
                            .map((line: string, i: number) => {
                              const isNodeModule =
                                line.includes("node_modules") ||
                                line.includes("node:") ||
                                line.includes("internal/");
                              return (
                                <div
                                  key={i}
                                  className={`hover:bg-[#161b22] px-1 -mx-1 rounded ${isNodeModule ? "opacity-40" : "text-[#e6edf3]"}`}
                                >
                                  {line}
                                </div>
                              );
                            })}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Fetcher Wrapper for the Trace Detail Pages ---
export const TraceErrors = ({
  apmId,
  traceId,
}: {
  apmId: string;
  traceId: string;
}) => {
  const { token } = useAuth();

  // Call the universal trace route on the backend
  const { data, error, isLoading } = useSWR(
    token && apmId && traceId ? `/apm/${apmId}/trace/${traceId}/errors` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-card/50 rounded-xl border border-border/40 mt-8">
        <Spinner className="h-6 w-6 text-muted-foreground mr-3" />
        <span className="text-sm text-muted-foreground font-medium">
          Analyzing telemetry for exceptions...
        </span>
      </div>
    );
  }

  if (error || !data?.errors || data.errors.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertOctagon className="h-5 w-5 text-destructive" />
        <h3 className="text-lg font-bold text-foreground">
          Exceptions Recorded ({data.errors.length})
        </h3>
      </div>
      <ErrorEventList events={data.errors} apmId={apmId} showGroupLink={true} />
    </div>
  );
};
