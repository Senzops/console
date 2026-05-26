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
} from "lucide-react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { SmartAnimatedValue } from "@/components/Tween";
import { toast } from "sonner";

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
                        className={`p-1.5 rounded-md transition-colors ${hasHighFailure ? "bg-destructive/10 text-destructive" : "bg-indigo-500/10 text-indigo-500"}`}
                      >
                        {hasHighFailure ? (
                          <AlertOctagon className="h-2 w-2" />
                        ) : (
                          <Workflow className="h-2 w-2" />
                        )}
                      </div>
                      <span className="font-mono text-xs text-foreground truncate max-w-[350px]">
                        {t._id}
                      </span>
                    </div>
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
                  colSpan={5}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visibleTasks.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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

  const [range, setRange] = useState("1h");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const endpoint = `/task/${id}/dashboard?range=${range}`;
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
    setEditName(data.service.name || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    setIsUpdating(true);
    setEditError(null);
    try {
      await api.put(`/task/${id}`, { name: editName.trim() });
      await mutate();
      setIsEditOpen(false);
      toast.success('Task service updated');
    } catch (e: any) {
      setEditError(e.response?.data?.error || 'Failed to update service');
    } finally {
      setIsUpdating(false);
    }
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

  const { service, stats, tasksTable } = data;
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
            title="Active Tasks"
            value={stats.uniqueTasks?.length || 0}
            sub="Unique signatures"
            icon={Box}
            color="text-emerald-500"
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

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task Service">
        <div className="space-y-4">
          {editError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Service Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Service name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Spinner className="h-4 w-4 mr-2" />}
              Update
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
