import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../lib/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Spinner,
  Button,
} from "../Core";
import {
  Terminal,
  Bug,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const getLevelColors = (level: string) => {
  switch (level.toLowerCase()) {
    case "error":
    case "fatal":
      return {
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        text: "text-destructive",
        icon: XCircle,
      };
    case "warn":
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        text: "text-yellow-500",
        icon: AlertTriangle,
      };
    case "debug":
      return {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-500",
        icon: Bug,
      };
    case "info":
    default:
      return {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-500",
        icon: Info,
      };
  }
};

export const TraceLogs = ({
  serviceId,
  traceId,
  serviceType,
}: {
  serviceId: string;
  traceId: string;
  serviceType: "apm" | "rum" | "task";
}) => {
  const router = useRouter();
  const { token } = useAuth();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic route construction based on service context
  let endpoint = "";
  if (serviceType === "task")
    endpoint = `/task/${serviceId}/run/${traceId}/logs`;
  else if (serviceType === "rum")
    endpoint = `/rum/${serviceId}/trace/${traceId}/logs`;
  else endpoint = `/apm/${serviceId}/trace/${traceId}/logs`;

  const { data, isLoading } = useSWR(token ? endpoint : null, fetcher);

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const copyToClipboard = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openInGlobalLogs = (e: React.MouseEvent, logId?: string) => {
    e.stopPropagation();
    if (logId) {
      // Open specific log in the drawer
      router.push(`/dashboard/logs?logId=${logId}`);
    } else {
      // Filter global dashboard by the entire trace
      router.push(
        `/dashboard/logs?search=${encodeURIComponent(`traceId:${traceId}`)}`,
      );
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm mt-6">
        <CardContent className="p-8 flex items-center justify-center gap-3">
          <Spinner className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-muted-foreground">
            Scanning for attached logs...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!data?.logs || data.logs.length === 0) return null; // Hide cleanly if no logs exist

  return (
    <Card className="border-border/60 shadow-sm mt-6 flex flex-col overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-card/50 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-500" /> Trace Logs
          </CardTitle>
          <Badge
            variant="outline"
            className="font-mono bg-blue-500/10 text-blue-500 border-blue-500/20"
          >
            {data.logs.length} Events
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs bg-background"
          onClick={(e) => openInGlobalLogs(e)}
        >
          View in Log Management <ExternalLink className="h-3 w-3 ml-1.5" />
        </Button>
      </CardHeader>

      <CardContent className="p-0 overflow-auto bg-card max-h-[600px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/40 sticky top-0 z-10 backdrop-blur">
            <tr>
              <th className="px-4 py-3 font-semibold w-8"></th>
              <th className="px-4 py-3 font-semibold w-32">Timestamp</th>
              <th className="px-4 py-3 font-semibold w-24">Level</th>
              <th className="px-4 py-3 font-semibold">Message</th>
              <th className="px-4 py-3 font-semibold w-16 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.logs.map((log: any) => {
              const isExpanded = expandedIds[log._id];
              const colors = getLevelColors(log.level);
              const hasAttributes =
                Object.keys(log.attributes || {}).length > 0;

              return (
                <React.Fragment key={log._id}>
                  {/* Main Log Row */}
                  <tr
                    onClick={() => hasAttributes && toggleExpand(log._id)}
                    className={`hover:bg-muted/40 transition-colors ${hasAttributes ? "cursor-pointer" : ""} ${isExpanded ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {hasAttributes ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        fractionalSecondDigits: 3,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`${colors.bg} ${colors.border} ${colors.text} uppercase text-[9px] font-bold px-1.5`}
                      >
                        {log.level}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-sm md:max-w-xl lg:max-w-3xl">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-blue-500"
                        onClick={(e) => openInGlobalLogs(e, log._id)}
                        title="Open in Global Logs Drawer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>

                  {/* Expanded Attributes Row */}
                  {isExpanded && hasAttributes && (
                    <tr className="bg-[#0d1117] border-b border-border/40">
                      <td colSpan={5} className="p-0">
                        <div className="p-4 pl-12 shadow-inner relative group">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) =>
                              copyToClipboard(
                                e,
                                log._id,
                                JSON.stringify(log.attributes, null, 2),
                              )
                            }
                          >
                            {copiedId === log._id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          <pre className="text-[11px] font-mono leading-loose whitespace-pre-wrap word-break">
                            {Object.entries(log.attributes).map(
                              ([key, val]) => (
                                <div key={key} className="flex items-start">
                                  <span className="text-[#79c0ff] mr-2">
                                    {key}:
                                  </span>
                                  <span
                                    className={
                                      typeof val === "number"
                                        ? "text-[#79c0ff]"
                                        : typeof val === "boolean"
                                          ? "text-[#ff7b72]"
                                          : "text-[#a5d6ff]"
                                    }
                                  >
                                    {typeof val === "object"
                                      ? JSON.stringify(val, null, 2)
                                      : typeof val === "string"
                                        ? `"${val}"`
                                        : String(val)}
                                  </span>
                                </div>
                              ),
                            )}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
