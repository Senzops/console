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
import { api, useAuth } from "../../../../lib/auth";
import { useTheme } from "../../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Dialog,
  DataError,
} from "../../../../components/Core";
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../../components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
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
  Trash2,
  AlertTriangle,
  Maximize2,
  X,
  RefreshCw,
  Box,
  AlertOctagon,
  Workflow,
  Timer,
  Search,
  Maximize,
  ChevronRight,
  Pencil,
  HeartPulse,
  Info,
} from "lucide-react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { SmartAnimatedValue } from "@/components/Tween";
import { useServiceModal } from '@/components/ServiceModals/context';

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

const getHealthBadge = (state: string) => {
  switch (state) {
    case "missing":
      return { label: "Missing", color: "text-destructive border-destructive/20 bg-destructive/10" };
    case "failing":
      return { label: "Failing", color: "text-yellow-500 border-yellow-500/20 bg-yellow-500/10" };
    default:
      return { label: "Healthy", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" };
  }
};

const getServiceHealthBadge = (summary: any) => {
  if (!summary || summary.total === 0) return { label: "No Tasks", color: "text-muted-foreground border-border bg-muted/50" };
  if (summary.missing > 0) return { label: "Critical", color: "text-destructive border-destructive/20 bg-destructive/10" };
  if (summary.failing > 0) return { label: "Degraded", color: "text-yellow-500 border-yellow-500/20 bg-yellow-500/10" };
  return { label: "Healthy", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" };
};

const buildHealthTooltip = (task: any) => {
  const state = task.healthState || "healthy";
  const lines: { label: string; value: string }[] = [];

  lines.push({ label: "Status", value: state.charAt(0).toUpperCase() + state.slice(1) });

  if (state === "healthy") {
    lines.push({ label: "Condition", value: "No threshold breaches detected" });
    lines.push({ label: "Evaluation interval", value: "120s (every sweep cycle)" });
  } else if (state === "missing") {
    lines.push({ label: "Condition", value: "lastRunAt < expectedPreviousRun - 5s jitter" });
    if (task.consecutiveMisses > 0) lines.push({ label: "Consecutive misses", value: String(task.consecutiveMisses) });
    if (task.scheduleExpression) lines.push({ label: "Cron expression", value: task.scheduleExpression });
    lines.push({ label: "Grace period", value: `${((task.gracePeriodMs || 120000) / 1000).toFixed(0)}s after expected run` });
    lines.push({ label: "Recovery condition", value: "Run completes within next schedule window" });
  } else if (state === "failing") {
    const threshold = task.failureRateThreshold || 0.5;
    lines.push({ label: "Condition", value: `failureRate ≥ ${(threshold * 100).toFixed(0)}% over 10m window` });
    lines.push({ label: "Min sample size", value: "3 runs required to evaluate" });
    if (task.consecutiveFailures > 0) lines.push({ label: "Consecutive evaluations", value: `${task.consecutiveFailures} sweep cycles` });
    lines.push({ label: "Recovery condition", value: `failureRate < ${(threshold * 50).toFixed(0)}% (hysteresis)` });
  }

  if (task.lastHealthTransition && state !== "healthy") {
    lines.push({ label: "In this state since", value: formatDistanceToNow(new Date(task.lastHealthTransition)) + " ago" });
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
    const spaceAbove = rect.top - gap;
    const placeAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;

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

const HealthTooltipContent = ({ lines }: { lines: { label: string; value: string }[] }) => (
  <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[240px] max-w-[340px] text-xs">
    {lines.map((line, i) => (
      <div key={i} className={`flex justify-between gap-6 ${i > 0 ? "mt-1.5 pt-1.5 border-t border-border/40" : ""}`}>
        <span className="text-muted-foreground whitespace-nowrap">{line.label}</span>
        <span className="font-mono text-foreground text-right">{line.value}</span>
      </div>
    ))}
  </div>
);

const HealthBadgeWithTooltip = ({ task }: { task: any }) => {
  const badge = getHealthBadge(task.healthState || "healthy");
  const lines = buildHealthTooltip(task);

  return (
    <FloatingTooltip content={<HealthTooltipContent lines={lines} />}>
      <Badge variant="outline" className={`font-mono text-[10px] cursor-help ${badge.color}`}>
        {badge.label}
        <Info className="w-2.5 h-2.5 ml-0.5 opacity-40" />
      </Badge>
    </FloatingTooltip>
  );
};

// 4. Tasks Table (Dedicated Component modeled after EndpointsTable)
const TasksTable = ({ tasks, router, serviceId }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [filter, setFilter] = useState("");

  const filteredTasks = useMemo(() => {
    if (!filter) return tasks;
    return tasks.filter((t: any) =>
      t._id.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [tasks, filter]);

  // Limit to 6 when minimized
  const limit = isMaximized ? filteredTasks.length : 6;
  const visibleTasks = filteredTasks.slice(0, limit);
  const hiddenCount = filteredTasks.length - limit;

  const Header = (
    <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-16 shrink-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Active Background Tasks
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Filter tasks..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setIsMaximized(!isMaximized)}
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
              <th className="px-6 py-3 text-left font-medium">
                Name / Signature
              </th>
              <th className="px-6 py-3 font-medium">Health</th>
              <th className="px-6 py-3 text-right font-medium">Runs</th>
              <th className="px-6 py-3 text-right font-medium">Failure Rate</th>
              <th className="px-6 py-3 text-right font-medium">Avg Duration</th>
              <th className="px-6 py-3 text-right font-medium">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t: any, i: number) => {
              const failPct =
                t.totalRuns > 0 ? (t.failures / t.totalRuns) * 100 : 0;
              const avgDur = t.totalRuns > 0 ? t.durationSum / t.totalRuns : 0;
              const hasHighFailure = failPct > 10;

              return (
                <tr
                  key={i}
                  className="border-b border-border hover:bg-muted/20 group cursor-pointer transition-colors"
                  onClick={() =>
                    router.push(
                      `/dashboard/task/${serviceId}/entity/${encodeURIComponent(t._id)}`,
                    )
                  }
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-md transition-colors ${hasHighFailure || (t.healthState && t.healthState !== "healthy") ? "bg-destructive/10 text-destructive" : "bg-indigo-500/10 text-indigo-500"}`}
                      >
                        {hasHighFailure || (t.healthState && t.healthState !== "healthy") ? (
                          <AlertOctagon className="h-2 w-2" />
                        ) : (
                          <Workflow className="h-2 w-2" />
                        )}
                      </div>
                      <span className="font-mono text-xs text-foreground truncate max-w-[300px]">
                        {t._id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <HealthBadgeWithTooltip task={t} />
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    <SmartAnimatedValue value={formatNumber(t.totalRuns)} />
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    <span
                      className={
                        hasHighFailure ? "text-destructive" : "text-emerald-500"
                      }
                    >
                      <SmartAnimatedValue value={`${failPct.toFixed(1)}%`} />
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs text-muted-foreground">
                    <SmartAnimatedValue value={formatDuration(avgDur)} />
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-muted-foreground font-mono">
                    {t.lastRun
                      ? formatDistanceToNow(new Date(t.lastRun)) + " ago"
                      : "Never"}
                  </td>
                </tr>
              );
            })}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => setIsMaximized(true)}
              >
                <td
                  colSpan={6}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visibleTasks.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground text-xs"
                >
                  No tasks found
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

// --- MAIN DASHBOARD PAGE ---
export default function TaskServiceDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const rangeQuery = buildTimeRangeQuery(timeRange);
  const spanMs = getTimeSpanMs(timeRange);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { openModal } = useServiceModal();

  const endpoint = `/task/${id}/dashboard?${rangeQuery}`;
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? endpoint : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/task/${id}`);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  const openEdit = () => {
    if (!data?.service) return;
    openModal('task', 'edit', { id: id as string, name: data.service.name, onSuccess: () => mutate() });
  };

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
          <p className="text-muted-foreground">Connecting to Task Service...</p>
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
            Failed to load Task Service.
          </div>
        </div>
      </>
    );

  const { service, stats, tasksTable, watchdogSummary } = data;
  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  // Calculated Metrics
  const failureRate =
    stats.totalRuns > 0
      ? ((stats.totalFailures / stats.totalRuns) * 100).toFixed(2)
      : "0.00";
  const avgQueueDelay =
    stats.totalRuns > 0 ? stats.queueDelaySum / stats.totalRuns : 0;
  const isActive =
    service.lastSeen &&
    new Date().getTime() - new Date(service.lastSeen).getTime() < 5 * 60 * 1000;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  {service.name}
                </h1>
                {watchdogSummary && watchdogSummary.total > 0 && (
                  <FloatingTooltip content={
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px] text-xs">
                      {[
                        { label: "Healthy", value: watchdogSummary.healthy, color: "text-emerald-500" },
                        { label: "Missing", value: watchdogSummary.missing, color: "text-destructive" },
                        { label: "Failing", value: watchdogSummary.failing, color: "text-yellow-500" },
                      ].map((item, i) => (
                        <div key={i} className={`flex justify-between gap-4 ${i > 0 ? "mt-1.5 pt-1.5 border-t border-border/40" : ""}`}>
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={`font-mono font-bold ${item.value > 0 ? item.color : "text-muted-foreground"}`}>{item.value}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-border/40 text-muted-foreground">
                        {watchdogSummary.total} tasks evaluated every 120s
                      </div>
                    </div>
                  }>
                    <Badge variant="outline" className={`animate-pulse cursor-help ${getServiceHealthBadge(watchdogSummary).color}`}>
                      {getServiceHealthBadge(watchdogSummary).label}
                      <Info className="w-3 h-3 ml-1 opacity-50" />
                    </Badge>
                  </FloatingTooltip>
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
                <span className="text-muted-foreground font-mono ml-2">
                  Last Seen:{" "}
                  {service.lastSeen
                    ? formatDistanceToNow(new Date(service.lastSeen)) + " ago"
                    : "Never"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={retentionDays} />
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
            color="text-red-500"
            isMono={isMono}
          />
          <StatCard
            title="Avg Queue Delay"
            value={formatDuration(avgQueueDelay)}
            sub="Wait time before start"
            icon={Timer}
            color="text-orange-500"
            isMono={isMono}
          />
          <StatCard
            title="Task Health"
            value={`${watchdogSummary?.healthy || 0}/${watchdogSummary?.total || stats.uniqueTasks?.length || 0}`}
            sub={watchdogSummary && (watchdogSummary.missing + watchdogSummary.failing) > 0
              ? `${watchdogSummary.missing + watchdogSummary.failing} unhealthy`
              : "All tasks healthy"}
            icon={HeartPulse}
            color={watchdogSummary && (watchdogSummary.missing + watchdogSummary.failing) > 0 ? "text-destructive" : "text-emerald-500"}
            isMono={isMono}
          />
        </div>

        {/* Global Throughput vs Failures */}
        <ChartCard title="Task Throughput & Failures">
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
                {/* Using StackId creates the perfect stacked view for Success + Failure = Total */}
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

        {/* Tasks Table (reusing EndpointsTable logic) */}
        <TasksTable tasks={tasksTable} router={router} serviceId={id} />
      </div>

      {/* Delete Dialog */}
      <Dialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Task Service?"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              This will delete <strong>{service?.name}</strong> and all
              associated task history.
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
