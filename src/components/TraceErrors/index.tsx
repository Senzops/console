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
} from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- Shared Reusable Component for Error Occurrences ---
export const ErrorEventList = ({
  events,
  apmId,
  showTraceLink = false,
  showGroupLink = false,
}: {
  events: any[];
  apmId?: string;
  showTraceLink?: boolean;
  showGroupLink?: boolean;
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
          const validContext = err.context
            ? Object.entries(err.context).filter(
                ([_, v]) => v !== undefined && v !== null && v !== "",
              )
            : [];

          // DYNAMIC RESOLUTION: Resolve whether to link to APM Trace or Task Run
          const isTask = err.serviceType === "task";
          const routeServiceId = isTask
            ? err.taskServiceId?._id || err.taskServiceId
            : err.apmId?._id || err.apmId || apmId;
          const traceUrl = isTask
            ? `/dashboard/task/${routeServiceId}/run/${err.traceId}`
            : `/dashboard/apm/${routeServiceId}/trace/${err.traceId}`;
          const traceBtnLabel = isTask ? "View Run" : "View Trace";

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
                <div className="p-4 pl-11 border-t border-border/30 bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Context Grid */}
                  {validContext.length > 0 && (
                    <div className="bg-background rounded-lg p-3 border border-border/40 shadow-sm">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        <Info className="h-3.5 w-3.5" /> Operational Context
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {validContext.map(([k, v]) => (
                          <div key={k} className="space-y-1">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {k}
                            </div>
                            <div
                              className="text-xs font-mono text-foreground truncate"
                              title={String(v)}
                            >
                              {String(v)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stack Trace Terminal */}
                  {err.stackTrace && (
                    <div className="border border-border/60 rounded-lg overflow-hidden bg-[#0d1117] shadow-inner">
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

                      <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
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

// --- Fetcher Wrapper for the APM Trace Detail Page ---
export const TraceErrors = ({
  apmId,
  traceId,
}: {
  apmId: string;
  traceId: string;
}) => {
  const { token } = useAuth();
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
