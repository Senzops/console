import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  createContext,
} from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import { DashboardLayout } from "../../../components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  Button,
  Spinner,
  DataError,
  Dialog,
} from "../../../components/Core";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Terminal,
  X,
  Key,
  ExternalLink,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Maximize,
  ArrowUp,
  ArrowDown,
  Box,
} from "lucide-react";
import { SmartAnimatedValue } from "@/components/Tween";
import { createPortal } from "react-dom";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num.toString();
};

// --- Context & Wrappers ---
const ChartContext = createContext<{
  isMaximized: boolean;
  toggle: () => void;
}>({ isMaximized: false, toggle: () => {} });

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
      <div className="flex items-center gap-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {actions}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggle}
      >
        {isMaximized ? (
          <X className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>
    </CardHeader>
  );

  const Content = (
    <ChartContext.Provider value={{ isMaximized, toggle }}>
      <Card
        className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl" : "h-[300px]"}`}
      >
        {Header}
        <CardContent className="flex-1 min-h-0 relative px-0 pb-0 overflow-hidden">
          <div className="w-full h-full relative">{children}</div>
        </CardContent>
      </Card>
    </ChartContext.Provider>
  );
  return (
    <>
      {isMaximized &&
        createPortal(
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsMaximized(false)}
          />,
          document.body,
        )}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? "text-[hsl(var(--chart-mono))]" : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
          </p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">
          <SmartAnimatedValue value={value} />
        </div>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// --- Helpers ---
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

const CustomTooltip = ({ active, payload, label, labelFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="capitalize">Logs:</span>
          <span className="font-mono font-medium text-foreground">
            {Number(payload[0].value).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// --- Main Dashboard ---
export default function GlobalLogsDashboard() {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();

  // URL State
  const logId = router.query.logId as string | undefined;
  const initSearch = router.query.search as string | undefined;

  // Local State
  const [range, setRange] = useState("24h");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(initSearch || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  // Copy states
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== searchInput) {
        setDebouncedSearch(searchInput);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, debouncedSearch]);

  // Main Table Fetch
  const endpoint = `/logs?search=${encodeURIComponent(debouncedSearch)}&range=${range}&page=${page}&limit=100`;
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    token ? endpoint : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { data: keyData } = useSWR(
    token && isKeyModalOpen ? "/logs/key" : null,
    fetcher,
  );

  // Fallback Single Log Fetch (Handles hard refreshes or when log shifts off current page)
  const { data: singleLogData, isLoading: isSingleLoading } = useSWR(
    token && logId ? `/logs/${logId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Stats Calculations
  const totalLogs = data?.pagination?.total || 0;
  const logVelocity = useMemo(() => {
    if (!totalLogs) return 0;
    const mins =
      range === "1h"
        ? 60
        : range === "24h"
          ? 1440
          : range === "7d"
            ? 10080
            : 43200;
    return (totalLogs / mins).toFixed(1);
  }, [totalLogs, range]);

  const errorCount = useMemo(() => {
    if (!data?.logs) return 0;
    return data.logs.filter(
      (l: any) => l.level === "error" || l.level === "fatal",
    ).length;
  }, [data?.logs]);

  const uniqueServices = useMemo(() => {
    if (!data?.logs) return 0;
    const services = new Set(
      data.logs
        .map((l: any) => l.serviceId?._id || l.serviceId)
        .filter(Boolean),
    );
    return services.size;
  }, [data?.logs]);

  // Graph Parsing
  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point: any) => ({
      ...point,
      rawTime: point._id,
    }));
  }, [data?.trend]);

  const formatAxisDate = useCallback(
    (str: string) => {
      if (!str) return "";
      const date = new Date(str);
      return date.toLocaleString(undefined, {
        month: range === "1h" ? undefined : "short",
        day: range === "1h" ? undefined : "numeric",
        hour: "numeric",
        minute: range === "1h" ? "2-digit" : undefined,
      });
    },
    [range],
  );

  // Drawer Management: Resolves from table data FIRST, falls back to direct API lookup
  const selectedLog = useMemo(() => {
    if (!logId) return null;
    // Fast path: find in currently loaded table
    const fromTable = data?.logs?.find((l: any) => l._id === logId);
    if (fromTable) return fromTable;
    // Fallback path: use the specific /api/logs/:id endpoint response
    return singleLogData?.log || null;
  }, [logId, data?.logs, singleLogData]);

  // Prev/Next Navigation Logic (Requires log to be present in currently loaded page data)
  const currentIndex = useMemo(() => {
    if (!logId || !data?.logs) return -1;
    return data.logs.findIndex((l: any) => l._id === logId);
  }, [logId, data?.logs]);

  const hasPrev = currentIndex > 0;
  const hasNext =
    currentIndex !== -1 && data?.logs && currentIndex < data.logs.length - 1;

  const navigateLog = (direction: "prev" | "next") => {
    if (!data?.logs) return;
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < data.logs.length) {
      router.push(
        { query: { ...router.query, logId: data.logs[newIndex]._id } },
        undefined,
        { shallow: true },
      );
    }
  };

  const closeDrawer = () => {
    const q = { ...router.query };
    delete q.logId;
    router.push({ query: q }, undefined, { shallow: true });
  };

  const copyToClipboard = (text: string, type: "raw" | "msg" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "raw") {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
    if (type === "msg") {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const getTraceLink: any = (log: any) => {
    if (!log.traceId || !log.serviceId) return null;
    if (log.serviceModel === "TaskService")
      return `/dashboard/task/${log.serviceId._id || log.serviceId}/run/${log.traceId}`;
    if (log.serviceModel === "RumService")
      return `/dashboard/rum/${log.serviceId._id || log.serviceId}/trace/${log.traceId}`;
    return `/dashboard/apm/${log.serviceId._id || log.serviceId}/trace/${log.traceId}`;
  };

  if (!data && !error && isLoading) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Querying Log Events...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center p-8">
          <DataError onRetry={() => mutate()} />
        </div>
      </DashboardLayout>
    );
  }

  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 relative">
        {/* --- Header & Range Control --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Terminal className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Log Management
              </h1>
            </div>
            <p className="text-xs text-muted-foreground pl-12 font-mono">
              Centralized, searchable logging for APM, RUM, and Custom Events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setIsKeyModalOpen(true)}
            >
              <Key className="h-4 w-4 mr-2" /> Ingestion Key
            </Button>
            <Select
              className="w-36 bg-background rounded-md border-border/80 h-9"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPage(1);
              }}
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-9 w-9 shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* --- Stats Cards --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Logs"
            value={formatNumber(totalLogs)}
            sub="Logs in range"
            icon={Terminal}
            color="text-blue-500"
            isMono={isMono}
          />
          <StatCard
            title="Log Velocity"
            value={logVelocity}
            sub="Logs per minute"
            icon={Activity}
            color="text-purple-500"
            isMono={isMono}
          />
          <StatCard
            title="Error Count"
            value={errorCount}
            sub="In current view"
            icon={XCircle}
            color="text-destructive"
            isMono={isMono}
          />
          <StatCard
            title="Active Services"
            value={uniqueServices}
            sub="In current view"
            icon={Box}
            color="text-emerald-500"
            isMono={isMono}
          />
        </div>

        {/* --- Trend Graph --- */}
        <ChartCard title="Log Volume">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLogs" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={getColor("#3b82f6")}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={getColor("#3b82f6")}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis dataKey="rawTime" hide />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={formatAxisDate}
                  content={<CustomTooltip labelFormatter={formatAxisDate} />}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={getColor("#3b82f6")}
                  fill={"url(#colorLogs)"}
                  strokeWidth={2}
                  name="Logs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* --- Data Table --- */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b border-border/40 bg-card/50">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder='Search logs... e.g., level:error message:"timeout" userId:123'
                className="pl-9 pr-9 h-10 w-full bg-background border-border/80 font-mono text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 font-semibold w-32">Timestamp</th>
                  <th className="px-4 py-3 font-semibold w-24">Level</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data?.logs?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-muted-foreground font-medium"
                    >
                      No logs found matching your query.
                    </td>
                  </tr>
                ) : (
                  data?.logs?.map((log: any) => {
                    const colors = getLevelColors(log.level);
                    const isSelected = logId === log._id;
                    return (
                      <tr
                        key={log._id}
                        onClick={() =>
                          router.push(
                            { query: { ...router.query, logId: log._id } },
                            undefined,
                            { shallow: true },
                          )
                        }
                        className={`hover:bg-muted/40 transition-colors cursor-pointer group ${isSelected ? "bg-muted/20" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
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
                        <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-sm md:max-w-xl lg:max-w-3xl xl:max-w-5xl">
                          {log.message}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>

          {/* Pagination */}
          {data?.pagination?.pages > 1 && (
            <div className="p-4 border-t border-border/40 bg-card/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {data.pagination.pages} ({data.pagination.total}{" "}
                logs)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination.pages, p + 1))
                  }
                  disabled={page === data.pagination.pages}
                  className="h-8"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* --- New Relic Style Log Drawer --- */}
      {logId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-background/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          <div className="relative w-full max-w-2xl h-full bg-card border-l border-border/80 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300 ease-out">
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full mr-2"
                >
                  <X className="h-5 w-5" />
                </Button>
                {selectedLog ? (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${getLevelColors(selectedLog.level).bg} ${getLevelColors(selectedLog.level).text} ${getLevelColors(selectedLog.level).border} uppercase font-bold text-xs`}
                    >
                      {selectedLog.level}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    Log Details
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateLog("prev")}
                  disabled={!hasPrev || isSingleLoading}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateLog("next")}
                  disabled={!hasNext || isSingleLoading}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Intelligent Loading State for Deep Links / Hard Refreshes */}
              {isSingleLoading && !selectedLog ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Spinner className="h-8 w-8 text-blue-500" />
                  <p className="text-muted-foreground text-sm">
                    Loading log data...
                  </p>
                </div>
              ) : selectedLog ? (
                <>
                  {/* Distinct Message Block */}
                  <div className="relative group/message bg-background border border-border/60 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Message
                      </h2>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity"
                        onClick={() =>
                          copyToClipboard(selectedLog.message, "msg")
                        }
                      >
                        {copiedMsg ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-foreground break-words leading-relaxed">
                      {selectedLog.message}
                    </p>
                  </div>

                  {/* Context Links */}
                  {(selectedLog.traceId || selectedLog.serviceId) && (
                    <div className="flex flex-wrap gap-3">
                      {getTraceLink(selectedLog) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20"
                          onClick={() => router.push(getTraceLink(selectedLog))}
                        >
                          View Trace Details{" "}
                          <ExternalLink className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      )}
                      {selectedLog.serviceId && (
                        <Badge
                          variant="secondary"
                          className="px-3 py-1.5 text-xs font-medium border border-border/50"
                        >
                          Source: {selectedLog.serviceId.name || "Unknown"}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Attributes Viewer */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Attributes
                      </h2>
                      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border/50">
                        <button
                          onClick={() => setViewMode("formatted")}
                          className={`px-3 py-1 text-xs font-medium rounded transition-all ${viewMode === "formatted" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          Formatted
                        </button>
                        <button
                          onClick={() => setViewMode("raw")}
                          className={`px-3 py-1 text-xs font-medium rounded transition-all ${viewMode === "raw" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          Raw
                        </button>
                      </div>
                    </div>

                    <div className="relative group/raw">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 bg-muted/80 opacity-0 group-hover/raw:opacity-100 transition-opacity z-10"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(
                              {
                                level: selectedLog.level,
                                message: selectedLog.message,
                                timestamp: selectedLog.timestamp,
                                ...selectedLog.attributes,
                              },
                              null,
                              2,
                            ),
                            "raw",
                          )
                        }
                      >
                        {copiedRaw ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>

                      {viewMode === "formatted" ? (
                        <div className="bg-[#0d1117] border border-border/60 rounded-lg p-4 overflow-x-auto shadow-inner">
                          <pre className="text-xs font-mono leading-loose whitespace-pre-wrap break-words">
                            <div className="flex items-start">
                              <span className="text-[#79c0ff] mr-2">
                                message:
                              </span>
                              <span className="text-[#a5d6ff]">
                                {selectedLog.message}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-[#79c0ff] mr-2">
                                level:
                              </span>
                              <span className="text-[#a5d6ff]">
                                {selectedLog.level}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-[#79c0ff] mr-2">
                                timestamp:
                              </span>
                              <span className="text-[#a5d6ff]">
                                {selectedLog.timestamp}
                              </span>
                            </div>

                            {/* Render Destructured Attributes block-style, explicitly without string quotes */}
                            {Object.entries(selectedLog.attributes || {}).map(
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
                                      : String(val)}
                                  </span>
                                </div>
                              ),
                            )}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-[#0d1117] border border-border/60 rounded-lg p-4 overflow-x-auto shadow-inner">
                          <pre className="text-xs font-mono text-[#e6edf3]">
                            {JSON.stringify(
                              {
                                message: selectedLog.message,
                                level: selectedLog.level,
                                timestamp: selectedLog.timestamp,
                                ...selectedLog.attributes,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 h-full">
                  <XCircle className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-sm font-medium text-foreground">
                    Log not found
                  </span>
                  <span className="text-xs">
                    It may have expired or exists on another page.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Ingestion Key Modal --- */}
      <Dialog
        open={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        title="Global Log Ingestion"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use this API key to pipe logs from external systems (Docker, AWS,
            Nginx) directly into your dashboard.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              API Key
            </label>
            <div className="relative">
              <Input
                readOnly
                value={keyData?.key || "Loading..."}
                className="font-mono text-blue-500 pr-10 bg-muted/30"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                onClick={() => copyToClipboard(keyData?.key, "key")}
              >
                {copiedKey ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-border/50">
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
              Example cURL
            </div>
            <pre className="text-[10px] font-mono text-blue-300 whitespace-pre-wrap break-all">
              curl -X POST https://api.senzor.dev/api/ingest/logs \<br />
              -H "x-log-api-key: {keyData?.key || "YOUR_KEY"}" \<br />
              -H "Content-Type: application/json" \<br />
              -d '&#123;"level":"error", "message":"Payment failed", "userId":
              123&#125;'
            </pre>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
