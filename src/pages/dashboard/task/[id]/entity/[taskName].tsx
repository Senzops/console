/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
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
  Spinner,
  DataError,
} from "../../../../../components/Core";
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../../../components/TimeRangePicker";
import { formatAxisDate, getTimeSpanMs } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
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
  Info,
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

const getHealthBadgeColor = (state: string) => {
  switch (state) {
    case "missing": return "text-destructive border-destructive/20 bg-destructive/10";
    case "failing": return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
    default: return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
  }
};

const getHealthLabel = (state: string) => {
  switch (state) {
    case "missing": return "Missing";
    case "failing": return "Failing";
    default: return "Healthy";
  }
};

const buildHealthTooltipLines = (sig: any) => {
  const state = sig?.healthState || "healthy";
  const lines: { label: string; value: string }[] = [];

  lines.push({ label: "Status", value: getHealthLabel(state) });

  if (state === "healthy") {
    lines.push({ label: "Condition", value: "No threshold breaches detected" });
    lines.push({ label: "Evaluation interval", value: "120s (every sweep cycle)" });
  } else if (state === "missing") {
    lines.push({ label: "Condition", value: "lastRunAt < expectedPreviousRun - 5s jitter" });
    if (sig.consecutiveMisses > 0) lines.push({ label: "Consecutive misses", value: String(sig.consecutiveMisses) });
    if (sig.scheduleExpression) lines.push({ label: "Cron expression", value: sig.scheduleExpression });
    lines.push({ label: "Grace period", value: `${((sig.gracePeriodMs || 120000) / 1000).toFixed(0)}s after expected run` });
    lines.push({ label: "Recovery condition", value: "Run completes within next schedule window" });
  } else if (state === "failing") {
    const threshold = sig.failureRateThreshold || 0.5;
    lines.push({ label: "Condition", value: `failureRate ≥ ${(threshold * 100).toFixed(0)}% over 10m window` });
    lines.push({ label: "Min sample size", value: "3 runs required to evaluate" });
    if (sig.consecutiveFailures > 0) lines.push({ label: "Consecutive evaluations", value: `${sig.consecutiveFailures} sweep cycles` });
    lines.push({ label: "Recovery condition", value: `failureRate < ${(threshold * 50).toFixed(0)}% (hysteresis)` });
  }

  if (sig?.lastHealthTransition && state !== "healthy") {
    lines.push({ label: "In this state since", value: formatDistanceToNow(new Date(sig.lastHealthTransition)) + " ago" });
  }

  return lines;
};

const FloatingTooltip = ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", opacity: 0, pointerEvents: "none" });
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recompute = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = contentRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel.scrollHeight;
    const panelWidth = panel.scrollWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 6;

    const spaceBelow = vh - rect.bottom - gap;
    const placeAbove = spaceBelow < panelHeight && rect.top - gap > spaceBelow;

    let top = placeAbove ? rect.top - gap - panelHeight : rect.bottom + gap;
    let left = rect.left;

    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
    if (left < 8) left = 8;
    top = Math.max(8, Math.min(top, vh - panelHeight - 8));

    setStyle({ position: "fixed", top, left, opacity: 1, pointerEvents: "auto", zIndex: 9999 });
  }, []);

  useEffect(() => {
    if (visible) recompute();
  }, [visible, recompute]);

  const show = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setVisible(false), 100);
  }, []);

  const keepOpen = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  useEffect(() => () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); }, []);

  return (
    <>
      <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </div>
      {visible && createPortal(
        <div ref={contentRef} style={style} onMouseEnter={keepOpen} onMouseLeave={hide} className="transition-opacity duration-150">
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

// --- COMPONENTS ---


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
        <CardContent className="flex-1 min-h-0 relative px-0 pb-0">
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

  const [timeRange, setTimeRange] = usePersistedTimeRange(30);
  const rangeQuery = buildTimeRangeQuery(timeRange);
  const spanMs = getTimeSpanMs(timeRange);

  const endpoint = `/task/${id}/entity/${encodeURIComponent(String(taskName))}?${rangeQuery}`;
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

  const axisFormatter = useMemo(
    () => (str: string) => formatAxisDate(str, spanMs),
    [spanMs],
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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className="text-2xl font-bold tracking-tight truncate max-w-[60vw]"
                  title={decodedTaskName}
                >
                  {decodedTaskName}
                </h1>
                {signature?.healthState && (
                  <FloatingTooltip content={
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[240px] max-w-[340px] text-xs">
                      {buildHealthTooltipLines(signature).map((line, i) => (
                        <div key={i} className={`flex justify-between gap-4 ${i > 0 ? "mt-1.5 pt-1.5 border-t border-border/40" : ""}`}>
                          <span className="text-muted-foreground whitespace-nowrap">{line.label}</span>
                          <span className="font-mono text-foreground text-right">{line.value}</span>
                        </div>
                      ))}
                    </div>
                  }>
                    <Badge variant="outline" className={`animate-pulse cursor-help ${getHealthBadgeColor(signature.healthState)}`}>
                      {getHealthLabel(signature.healthState)}
                      <Info className="w-3 h-3 ml-1 opacity-50" />
                    </Badge>
                  </FloatingTooltip>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-muted/50 capitalize"
                >
                  {signature?.taskType || "task"}
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
                {signature?.lastRunAt && (
                  <span className="text-muted-foreground font-mono ml-1">
                    Last run {formatDistanceToNow(new Date(signature.lastRunAt))} ago
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={30} />
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
                  content={<ChartTooltip labelFormatter={axisFormatter} unit=" runs" />}
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
