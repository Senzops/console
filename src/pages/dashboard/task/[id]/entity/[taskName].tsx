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
import { api, useAuth } from "../../../../../lib/auth";
import { useTheme } from "../../../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  Spinner,
  DataError,
} from "../../../../../components/Core";
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
  Maximize2,
  X,
  RefreshCw,
  AlertOctagon,
  Workflow,
  Timer,
  Search,
  Maximize,
  Filter,
  ArrowLeft,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { SmartAnimatedValue } from "@/components/Tween";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- HELPERS ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num.toString();
};

const formatDuration = (ms: number) => {
  if (!ms) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
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
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">
              {typeof entry.value === "number"
                ? entry.value.toFixed(0)
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

// Recent Task Runs Table (Modeled heavily after InvocationsList)
const RecentRunsList = ({ runs, serviceId, onRefresh, isRefreshing }: any) => {
  const router = useRouter();
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);
  const [filter, setFilter] = useState("");

  const handleFilterClick = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    setFilter(value);
  };

  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    if (!filter) return runs;
    const lower = filter.toLowerCase();
    return runs.filter(
      (r: any) =>
        r.status.toLowerCase().includes(lower) ||
        r.taskType.toLowerCase().includes(lower) ||
        r.runId.toLowerCase().includes(lower),
    );
  }, [runs, filter]);

  const limit = isMaximized ? filteredRuns.length : 15;
  const visibleRuns = filteredRuns.slice(0, limit);
  const hiddenCount = filteredRuns.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Filter runs..."
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
          className="h-7 w-7 text-muted-foreground"
          onClick={toggle}
        >
          {isMaximized ? (
            <X className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
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
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Execution Time</th>
              <th className="px-6 py-3 font-medium">Wait Time</th>
              <th className="px-6 py-3 text-right font-medium">Executed</th>
            </tr>
          </thead>
          <tbody>
            {visibleRuns.map((run: any) => (
              <tr
                key={run._id}
                className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors group"
                onClick={() =>
                  router.push(`/dashboard/task/${serviceId}/run/${run.runId}`)
                }
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 group/cell">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] px-2 py-0.5 border-0 bg-indigo-500/10 text-indigo-500 capitalize"
                    >
                      {run.taskType}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 group/cell">
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs ${run.isDeadLetter ? "border-purple-500/50 text-purple-500 bg-purple-500/10" : run.status === "success" ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10" : "border-destructive/50 text-destructive bg-destructive/10"}`}
                    >
                      {run.isDeadLetter ? "DEAD-LETTER" : run.status}
                    </Badge>
                    <button
                      onClick={(e) => handleFilterClick(e, run.status)}
                      className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-opacity"
                    >
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-3 font-mono text-xs">
                  <span
                    className={
                      run.duration > 5000
                        ? "text-orange-500"
                        : "text-emerald-500"
                    }
                  >
                    <SmartAnimatedValue value={formatDuration(run.duration)} />
                  </span>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                  {formatDuration(run.queueDelay || 0)}
                </td>
                <td className="px-6 py-3 text-right text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(run.timestamp))} ago
                </td>
              </tr>
            ))}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={5}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visibleRuns.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No recent executions found
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

// --- MAIN PAGE ---
export default function TaskEntityDetail() {
  const router = useRouter();
  const { id, taskName } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [range, setRange] = useState("1h");

  const endpoint = `/task/${id}/entity/${encodeURIComponent(String(taskName))}?range=${range}`;
  const { data, error, mutate, isValidating } = useSWR(
    token && id && taskName ? endpoint : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point: any) => {
      return {
        ...point,
        rawTime: point.time,
        successes: point.runs - point.failures,
      };
    });
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

  if (!data && !error)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Task Signature...</p>
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

  const { taskName: decodedTaskName, signature, stats, recentRuns } = data;
  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  const failureRate =
    stats.totalRuns > 0
      ? ((stats.totalFailures / stats.totalRuns) * 100).toFixed(2)
      : "0.00";
  const avgDuration =
    stats.totalRuns > 0 ? stats.durationSum / stats.totalRuns : 0;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/task/${id}`)}
            className="pl-0 w-fit hover:bg-transparent hover:text-indigo-500 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Service
          </Button>

          {/* Watchdog Anomaly Banner */}
          {signature?.healthState === "missing" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-4">
              <div className="p-2 bg-destructive/20 text-destructive rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-destructive font-bold text-lg">
                  Watchdog Alert: Missing Execution
                </h3>
                <p className="text-destructive/80 text-sm mt-1">
                  This job has missed its scheduled execution window according
                  to its cron profile. It may be deadlocked, out of memory, or
                  the worker node is offline.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Workflow className="h-6 w-6 text-indigo-500 shrink-0" />
                <h1
                  className="text-2xl font-bold tracking-tight truncate max-w-[60vw]"
                  title={decodedTaskName}
                >
                  {decodedTaskName}
                </h1>
              </div>
              <div className="flex items-center gap-3 pl-9">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-muted/50 capitalize"
                >
                  {signature?.taskType || "Task Entity Signature Profile"}
                </Badge>
                {signature?.scheduleExpression && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1.5"
                  >
                    <CalendarClock className="h-3 w-3" />{" "}
                    {signature.scheduleExpression}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Executions"
            value={formatNumber(stats.totalRuns)}
            sub={`Jobs processed in range`}
            icon={Activity}
            color="text-indigo-500"
            isMono={isMono}
          />
          <StatCard
            title="Failure Rate"
            value={`${failureRate}%`}
            sub={`${formatNumber(stats.totalFailures)} Failures`}
            icon={AlertOctagon}
            color={
              Number(failureRate) > 5 ? "text-destructive" : "text-emerald-500"
            }
            isMono={isMono}
          />
          <StatCard
            title="Avg Duration"
            value={formatDuration(avgDuration)}
            sub="Time spent executing"
            icon={Clock}
            color="text-orange-500"
            isMono={isMono}
          />
          <StatCard
            title="Max Attempts"
            value={stats.maxAttempts || 1}
            sub="Highest retry count observed"
            icon={Timer}
            color="text-blue-500"
            isMono={isMono}
          />
        </div>

        {/* Execution Trend Graph */}
        <ChartCard title="Execution Trend & Status">
          <div className="p-4 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
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
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={formatAxisDate}
                  content={
                    <CustomTooltip
                      labelFormatter={formatAxisDate}
                      unit=" runs"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="successes"
                  stroke={getColor("#10b981")}
                  fill={"url(#colorSuccess)"}
                  strokeWidth={2}
                  name="Success"
                />
                <Area
                  type="monotone"
                  dataKey="failures"
                  stroke={getColor("#ef4444")}
                  fill={"url(#colorFailed)"}
                  strokeWidth={2}
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Recent Executions Table */}
        <RecentRunsList
          runs={recentRuns}
          serviceId={id}
          onRefresh={() => mutate()}
          isRefreshing={isValidating}
        />
      </div>
    </>
  );
}
