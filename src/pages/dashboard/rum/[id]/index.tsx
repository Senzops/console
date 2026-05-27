/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useMemo,
  createContext,
  useContext,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../../lib/auth";
import { useTheme } from "../../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  Spinner,
  Dialog,
  DataError,
} from "../../../../components/Core";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Clock,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  Box,
  Code,
  AlertOctagon,
  Zap,
  ArrowRight,
  ArrowLeft,
  Search,
  Layers,
  Globe,
  Smartphone,
  Monitor,
  Laptop,
  Map as MapIcon,
  Maximize,
  Filter,
  Layout,
  MousePointer2,
  Pencil,
} from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SmartAnimatedValue } from "@/components/Tween";
import { useServiceModal } from '@/components/ServiceModals/context';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- HELPERS ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num?.toString() || "0";
};

const formatMs = (ms: number) => (ms ? `${Math.round(ms)}ms` : "-");
const formatSec = (ms: number) => (ms ? `${(ms / 1000).toFixed(2)}s` : "-");
const formatScore = (val: number) =>
  val !== undefined && val !== null ? val.toFixed(3) : "-";

const getVitalColor = (metric: "lcp" | "inp" | "cls", value: number) => {
  if (value === 0 || value === undefined) return "text-muted-foreground";
  if (metric === "lcp")
    return value <= 2500
      ? "text-emerald-500"
      : value <= 4000
        ? "text-yellow-500"
        : "text-red-500";
  if (metric === "inp")
    return value <= 200
      ? "text-emerald-500"
      : value <= 500
        ? "text-yellow-500"
        : "text-red-500";
  if (metric === "cls")
    return value <= 0.1
      ? "text-emerald-500"
      : value <= 0.25
        ? "text-yellow-500"
        : "text-red-500";
  return "text-foreground";
};

// --- COMPONENTS ---

const CustomTooltip = ({
  active,
  payload,
  label,
  unit = "",
  labelFormatter,
}: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2"
            style={{ color: entry.color || entry.stroke || entry.fill }}
          >
            <div
              className="w-2.5 h-2.5 rounded-[2.5px]"
              style={{
                backgroundColor: entry.color || entry.stroke || entry.fill,
              }}
            />
            <span className="capitalize text-muted-foreground">
              {entry.name.replace("code_", "")}
            </span>
            <span className="font-mono text-foreground">
              {entry.name.includes("LCP")
                ? formatSec(entry.value)
                : entry.name.includes("INP")
                  ? formatMs(entry.value)
                  : entry.name.includes("CLS")
                    ? entry.value.toFixed(3)
                    : typeof entry.value === "number"
                      ? entry.value.toFixed(2)
                      : entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Context for Expanding Cards
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
        className="h-6 w-6 text-muted-foreground"
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
        className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl" : "h-[400px]"}`}
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
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
};

// 4. Paths Table (Direct clone of APM EndpointsTable)
const PathsTable = ({ paths, router, serviceId }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState("");

  const safePaths = paths || [];
  const filteredPaths = useMemo(() => {
    if (!filter) return safePaths;
    return safePaths.filter((r: any) =>
      r._id.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [safePaths, filter]);

  // Limit to 6 when minimized
  const limit = isMaximized ? filteredPaths.length : 6;
  const visiblePaths = filteredPaths.slice(0, limit);
  const hiddenCount = filteredPaths.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Top Viewed Paths
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            placeholder="Filter paths..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsMaximized(!isMaximized)}
        >
          {isMaximized ? (
            <X className="h-3 w-3" />
          ) : (
            <Maximize className="h-3 w-3" />
          )}
        </Button>
      </div>
    </CardHeader>
  );

  const Content = (
    <Card
      className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl" : "h-auto min-h-[300px]"}`}
    >
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium w-full">Path</th>
              <th className="px-6 py-3 text-right font-medium">Views</th>
            </tr>
          </thead>
          <tbody>
            {visiblePaths.map((r: any, i: number) => (
              <tr
                key={i}
                className="border-b border-border hover:bg-muted/20 group cursor-pointer transition-colors"
                onClick={() =>
                  router.push({ query: { ...router.query, path: r._id } })
                }
              >
                <td className="px-6 py-3 font-mono text-xs truncate max-w-[300px] text-foreground">
                  {r._id}
                </td>
                <td className="px-6 py-3 text-right font-mono text-xs">
                  <SmartAnimatedValue value={formatNumber(r.count)} />
                </td>
              </tr>
            ))}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => setIsMaximized(true)}
              >
                <td
                  colSpan={2}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visiblePaths.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-8 text-center text-muted-foreground text-xs"
                >
                  No paths found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
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

// 8. Recent Traces List (Direct clone of APM InvocationsList)
const RecentTracesList = ({
  traces,
  serviceId,
  onRefresh,
  isRefreshing,
}: any) => {
  const router = useRouter();
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);
  const [filter, setFilter] = useState("");

  const handleFilterClick = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    setFilter(value);
    toast.success(`Filtered by ${value}`);
  };

  const filteredTraces = useMemo(() => {
    if (!traces) return [];
    if (!filter) return traces;
    const lower = filter.toLowerCase();
    return traces.filter(
      (t: any) =>
        t.path.toLowerCase().includes(lower) ||
        t.traceType.toLowerCase().includes(lower) ||
        (t.browser && t.browser.toLowerCase().includes(lower)) ||
        (t.country && t.country.toLowerCase().includes(lower)),
    );
  }, [traces, filter]);

  const limit = isMaximized ? filteredTraces.length : 10;
  const visibleTraces = filteredTraces.slice(0, limit);
  const hiddenCount = filteredTraces.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium">Recent Page Traces</CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            placeholder="Filter traces..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggle}
        >
          {isMaximized ? (
            <X className="h-3 w-3" />
          ) : (
            <Maximize className="h-3 w-3" />
          )}
        </Button>
      </div>
    </CardHeader>
  );

  const Content = (
    <Card
      className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl" : "h-auto min-h-[300px]"}`}
    >
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium">Trace Path</th>
              <th className="px-6 py-3 font-medium">Vitals</th>
              <th className="px-6 py-3 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {visibleTraces.map((trace: any) => (
              <tr
                key={trace._id}
                className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors group"
                onClick={() =>
                  router.push(
                    `/dashboard/rum/${serviceId}/trace/${trace.traceId}`,
                  )
                }
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 group/cell">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] px-2 py-0.5 border-0 truncate ${trace.traceType === "initial_load" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                    >
                      {trace.traceType === "initial_load"
                        ? "HARD LOAD"
                        : "SPA ROUTE"}
                    </Badge>
                    <span
                      className="font-mono text-xs text-foreground truncate max-w-[200px]"
                      title={trace.path}
                    >
                      {trace.path}
                    </span>
                    <button
                      onClick={(e) => handleFilterClick(e, trace.path)}
                      className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-opacity"
                    >
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1.5">
                    {trace.vitals?.lcp ? (
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] px-1.5 py-0 border-border/50 truncate ${getVitalColor("lcp", trace.vitals.lcp).replace("text-", "bg-").replace("500", "500/10")} ${getVitalColor("lcp", trace.vitals.lcp)}`}
                      >
                        LCP {formatSec(trace.vitals.lcp)}
                      </Badge>
                    ) : null}
                    {trace.vitals?.inp ? (
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] px-1.5 py-0 border-border/50 truncate ${getVitalColor("inp", trace.vitals.inp).replace("text-", "bg-").replace("500", "500/10")} ${getVitalColor("inp", trace.vitals.inp)}`}
                      >
                        INP {formatMs(trace.vitals.inp)}
                      </Badge>
                    ) : null}
                    {trace.vitals?.cls ? (
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] px-1.5 py-0 border-border/50 truncate ${getVitalColor("cls", trace.vitals.cls).replace("text-", "bg-").replace("500", "500/10")} ${getVitalColor("cls", trace.vitals.cls)}`}
                      >
                        CLS {formatScore(trace.vitals.cls)}
                      </Badge>
                    ) : null}
                    {!trace.vitals?.lcp &&
                      !trace.vitals?.inp &&
                      !trace.vitals?.cls && (
                        <span className="text-xs text-muted-foreground italic">
                          No vitals captured
                        </span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-3 text-right text-xs text-muted-foreground font-mono truncate">
                  {formatDistanceToNow(new Date(trace.timestamp))} ago
                </td>
              </tr>
            ))}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={4}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visibleTraces.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-12 text-center text-muted-foreground"
                >
                  No recent traces found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
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

// Fallback aggregator to ensure PathsTable has data if the backend hasn't generated a paths array
const computePathsFallback = (traces: any[]) => {
  if (!traces || traces.length === 0) return [];
  const map: Record<string, number> = {};
  traces.forEach((t) => {
    const p = t.path || "Unknown";
    map[p] = (map[p] || 0) + 1;
  });
  return Object.entries(map)
    .map(([id, count]) => ({ _id: id, count }))
    .sort((a, b) => b.count - a.count);
};

// --- MAIN VIEW ---
export default function RumDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const pathFilter = router.query.path as string | undefined; // Reads path from query for dynamic filtering
  const { token } = useAuth();
  const { isMono } = useTheme();

  const { openModal } = useServiceModal();
  const [range, setRange] = useState("1h");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const endpoint =
    `/rum/${id}/dashboard?range=${range}` +
    (pathFilter ? `&path=${encodeURIComponent(pathFilter)}` : "");
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? endpoint : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/rum/${id}`);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  const openEdit = () => {
    if (!data?.service) return;
    openModal('rum', 'edit', {
      id: id as string,
      name: data.service.name,
      domains: data.service.domains?.join(', ') || '',
      onSuccess: () => mutate(),
    });
  };

  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point: any) => {
      return {
        ...point,
        rawTime: point.time || point._id,
      };
    });
  }, [data?.trend]);

  const formatAxisDate = useCallback(
    (str: string) => {
      if (!str) return "";
      const date = new Date(str);
      return date.toLocaleString(undefined, {
        month:
          range === "24h" || range === "7d" || range === "30d"
            ? "short"
            : undefined,
        day:
          range === "24h" || range === "7d" || range === "30d"
            ? "numeric"
            : undefined,
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [range],
  );

  if (!data && !error)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Connecting to Web APM...</p>
        </div>
      </>
    );
  if (error)
    return (
      <>
        <div className="h-full flex items-center justify-center p-8">
          <DataError onRetry={() => mutate()} />
        </div>
      </>
    );
  if (!data?.service)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="p-8 text-destructive">
            Failed to load RUM service.
          </div>
        </div>
      </>
    );

  const { service, stats, recentTraces } = data;
  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  const isActive =
    service.lastSeen &&
    new Date().getTime() - new Date(service.lastSeen).getTime() <
      15 * 60 * 1000;
  const safePaths = data.paths || computePathsFallback(recentTraces);

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* 1. Header */}
        <div className="flex flex-col gap-4">
          {pathFilter && (
            <Button
              variant="ghost"
              onClick={() => {
                const q = { ...router.query };
                delete q.path;
                router.push({ query: q });
              }}
              className="pl-0 w-fit hover:bg-transparent hover:text-pink-500 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Service
            </Button>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  {service.name}
                </h1>
                {pathFilter && (
                  <Badge
                    variant="outline"
                    className="border-pink-500/20 text-pink-500 bg-pink-500/10 font-mono text-xs truncate"
                  >
                    {pathFilter}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {isActive ? (
                  <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Active
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />{" "}
                    Inactive
                  </div>
                )}

                {/* NEW: Multi-domain display logic */}
                <div className="flex items-center gap-1 text-muted-foreground font-mono ml-2 border border-border/40 bg-muted/20 px-2 py-0.5 rounded truncate max-w-[250px]">
                  <Globe className="h-3 w-3 shrink-0" />
                  <span
                    className="truncate"
                    title={service.domains?.join(", ")}
                  >
                    {service.domains?.length > 1
                      ? `${service.domains[0]} +${service.domains.length - 1}`
                      : service.domains?.[0] || "Unknown Domain"}
                  </span>
                </div>

                <span className="text-muted-foreground font-mono ml-2">
                  Last Seen:{" "}
                  {service.lastSeen
                    ? formatDistanceToNow(new Date(service.lastSeen)) + " ago"
                    : "Never"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                className="w-32 bg-background"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                disabled={isValidating}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Page Views"
            value={formatNumber(stats.pageViews)}
            sub="Traces in range"
            icon={Globe}
            color="text-pink-500"
            isMono={isMono}
          />
          <StatCard
            title="Avg LCP"
            value={formatSec(stats.lcpAvg)}
            sub="Loading Perf"
            icon={Layout}
            color={getVitalColor("lcp", stats.lcpAvg)}
            isMono={isMono}
          />
          <StatCard
            title="Avg INP"
            value={formatMs(stats.inpAvg)}
            sub="Interactivity"
            icon={Zap}
            color={getVitalColor("inp", stats.inpAvg)}
            isMono={isMono}
          />
          <StatCard
            title="Avg CLS"
            value={formatScore(stats.clsAvg)}
            sub="Visual Stability"
            icon={MousePointer2}
            color={getVitalColor("cls", stats.clsAvg)}
            isMono={isMono}
          />
        </div>

        {/* 3. Web Sessions Graph (Full Wide) */}
        <ChartCard title="Web Sessions">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSess" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={getColor("#8b5cf6")}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={getColor("#8b5cf6")}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis dataKey="rawTime" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={formatAxisDate}
                  content={<CustomTooltip labelFormatter={formatAxisDate} />}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke={getColor("#8b5cf6")}
                  fill={"url(#colorSess)"}
                  strokeWidth={2}
                  name="Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 4. Top Viewed Paths Chart/List (Full Wide) */}
        {!pathFilter && (
          <PathsTable paths={safePaths} router={router} serviceId={id} />
        )}

        {/* 5. Core Web Vitals Graph (Full Wide) */}
        <ChartCard title="Core Web Vitals Trend">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLcp" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={getColor("#10b981")}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={getColor("#10b981")}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorInp" x1="0" y1="0" x2="0" y2="1">
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
                  <linearGradient id="colorCls" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={getColor("#8b5cf6")}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={getColor("#8b5cf6")}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis dataKey="rawTime" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={formatAxisDate}
                  content={<CustomTooltip labelFormatter={formatAxisDate} />}
                />
                <Area
                  type="monotone"
                  dataKey="lcpAvg"
                  stroke={getColor("#10b981")}
                  fill={"url(#colorLcp)"}
                  strokeWidth={2}
                  name="Avg LCP (ms)"
                />
                <Area
                  type="monotone"
                  dataKey="inpAvg"
                  stroke={getColor("#3b82f6")}
                  fill={"url(#colorInp)"}
                  strokeWidth={2}
                  name="Avg INP (ms)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="clsAvg"
                  stroke={getColor("#8b5cf6")}
                  fill={"url(#colorCls)"}
                  strokeWidth={2}
                  name="Avg CLS (Score)"
                  strokeDasharray="2 2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 6 & 7. Frustrations & Exceptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="User Frustrations">
            <div className="p-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRage" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={getColor("#f97316")}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={getColor("#f97316")}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorDead" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={getColor("#9ca3af")}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={getColor("#9ca3af")}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="rawTime" hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    labelFormatter={formatAxisDate}
                    content={<CustomTooltip labelFormatter={formatAxisDate} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="rageClicks"
                    stroke={getColor("#f97316")}
                    fill={"url(#colorRage)"}
                    strokeWidth={2}
                    name="Rage Clicks"
                  />
                  <Area
                    type="monotone"
                    dataKey="deadClicks"
                    stroke={getColor("#9ca3af")}
                    fill={"url(#colorDead)"}
                    strokeWidth={2}
                    name="Dead Clicks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Exceptions">
            <div className="p-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorErr" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={getColor("#ef4444")}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={getColor("#ef4444")}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="rawTime" hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    labelFormatter={formatAxisDate}
                    content={<CustomTooltip labelFormatter={formatAxisDate} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke={getColor("#ef4444")}
                    fill={"url(#colorErr)"}
                    strokeWidth={2}
                    name="Exceptions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* 8. Full wide Recent Page Traces chart/list */}
        <RecentTracesList
          traces={recentTraces}
          serviceId={id}
          onRefresh={() => mutate()}
          isRefreshing={isValidating}
        />
      </div>

      <Dialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Service?"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              This will delete <strong>{service.name}</strong> and all traces.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}{" "}
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>

    </>
  );
}
