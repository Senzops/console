import React, { useState, useMemo, createContext } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  DataError,
} from "../../../components/Core";
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
import { formatAxisDate, getTimeSpanMs, getDisplayLabel } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertOctagon,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Box,
  ExternalLink,
  X,
  Maximize,
  Workflow,
  MonitorSmartphone, // NEW: Added RUM Icon
} from "lucide-react";
import { ErrorEventList } from "../../../components/TraceErrors";
import { createPortal } from "react-dom";
import { SmartAnimatedValue } from "@/components/Tween";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

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


const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {title}
        </p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">
        <SmartAnimatedValue value={value} />
      </div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-1 font-medium">
          <SmartAnimatedValue value={subtext} />
        </div>
      )}
    </CardContent>
  </Card>
);

// Helper for human-readable impact duration
const getImpactRange = (first: string | Date, last: string | Date) => {
  const diffMs = new Date(last).getTime() - new Date(first).getTime();
  const hours = Math.floor(diffMs / (1000 * 3600));

  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins} Min${mins !== 1 ? "s" : ""}`;
  }
  if (hours < 24) {
    return `${hours} Hour${hours !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) return `${days} Day${days !== 1 ? "s" : ""}`;
  return `${days}d ${remainingHours}h`;
};

export default function ErrorDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [timeRange, setTimeRange] = usePersistedTimeRange(30);
  const spanMs = getTimeSpanMs(timeRange);
  const displayRange = timeRange.type === 'relative' ? timeRange.range : getDisplayLabel(timeRange);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/errors/${id}?${buildTimeRangeQuery(timeRange)}` : null,
    fetcher,
  );

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/errors/${id}/status`, { status });
      await mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point: any) => ({
      ...point,
      time: formatAxisDate(point.time, spanMs),
    }));
  }, [data?.trend, spanMs]);

  if (!data && !error)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">
            Connecting to Error Tracker...
          </p>
        </div>
      </>
    );

  if (error)
    return (
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <DataError onRetry={() => mutate()} />
        </div>
      </>
    );

  const { group, events } = data;

  // DYNAMIC RESOLUTION: Determine which service model spawned this error
  const isTask = group.service?.type === "task";
  const isRum = group.service?.type === "rum";
  const serviceId = group.service?._id;
  const serviceName = group.service?.name || "Unknown Service";
  const latestTraceId = events?.[0]?.traceId;

  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-3 mt-2 hover:bg-transparent hover:text-foreground"
          onClick={() => router.push("/dashboard/errors")}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Button>
        {/* --- Header & Controls (Matches Standard Layout) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60">
          <div>
            <Badge
              variant="destructive"
              className="font-mono uppercase tracking-wider shrink-0"
            >
              {group.errorClass}
            </Badge>
            <div className="flex items-center gap-3 mb-2 mt-2">
              <h1
                className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-[60vw] md:max-w-lg"
                title={group.message}
              >
                {group.message}
              </h1>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-4">
              {/* Dynamic Service Icon & Name */}
              <span className="flex items-center gap-1.5 text-foreground">
                {isTask ? (
                  <Workflow className="h-3.5 w-3.5 text-indigo-500" />
                ) : isRum ? (
                  <MonitorSmartphone className="h-3.5 w-3.5 text-pink-500" />
                ) : (
                  <Box className="h-3.5 w-3.5 text-orange-500" />
                )}
                {serviceName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> First Seen:{" "}
                {new Date(group.firstSeen).toLocaleDateString()}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wider ${
                  group.status === "resolved"
                    ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                    : group.status === "ignored"
                      ? "border-muted text-muted-foreground bg-muted/20"
                      : "border-destructive/30 text-destructive bg-destructive/10"
                }`}
              >
                {group.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto md:items-end mt-2 md:mt-0">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={30} />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Dynamic Route & Label for Latest Button */}
              {latestTraceId && serviceId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-background border-primary/30 text-primary hover:bg-primary/10 flex-1 md:flex-none"
                  onClick={() =>
                    router.push(
                      isTask
                        ? `/dashboard/task/${serviceId}/run/${latestTraceId}`
                        : isRum
                          ? `/dashboard/rum/${serviceId}/trace/${latestTraceId}`
                          : `/dashboard/apm/${serviceId}/trace/${latestTraceId}`,
                    )
                  }
                >
                  {isTask
                    ? "Latest Run"
                    : isRum
                      ? "Latest Page Trace"
                      : "Latest Trace"}{" "}
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
              {group.status !== "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus("resolved")}
                  disabled={isUpdating}
                  className="h-9 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500 flex-1 md:flex-none"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Resolve
                </Button>
              )}
              {group.status !== "ignored" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus("ignored")}
                  disabled={isUpdating}
                  className="h-9 text-muted-foreground flex-1 md:flex-none"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Ignore
                </Button>
              )}
              {group.status !== "unresolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus("unresolved")}
                  disabled={isUpdating}
                  className="h-9 border-destructive/30 hover:bg-destructive/10 text-destructive flex-1 md:flex-none"
                >
                  <AlertOctagon className="h-3.5 w-3.5 mr-1.5" /> Unresolve
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Events"
            value={group.totalCount.toLocaleString()}
            subtext="All time occurrences"
            icon={AlertOctagon}
            color="text-destructive"
          />
          <StatCard
            title="Events in Range"
            value={events.length.toLocaleString()}
            subtext={`Occurrences in last ${displayRange}`}
            icon={Activity}
            color="text-primary"
          />
          <StatCard
            title="Last Recorded"
            value={new Date(group.lastSeen).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            subtext={new Date(group.lastSeen).toLocaleDateString()}
            icon={Clock}
            color="text-orange-500"
          />
          <StatCard
            title="Impact Range"
            value={getImpactRange(group.firstSeen, group.lastSeen)}
            subtext="Time span between events"
            icon={Box}
            color="text-blue-500"
          />
        </div>

        {/* --- Full Wide Trend Area Chart --- */}
        <ChartCard title={`Error Trend`}>
          <div className="p-4 w-full h-full">
            {data?.trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={getColor("#ef4444")}
                        stopOpacity={0.2}
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
                    opacity={0.5}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip unit=" events" />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={getColor("#ef4444")}
                    fill={"url(#colorTrend)"}
                    strokeWidth={2}
                    name="Total Errors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No error events recorded in this period.
              </div>
            )}
          </div>
        </ChartCard>

        {/* --- Detailed Error View --- */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            Error Description
          </h3>
          <Card className="border-border/60 shadow-sm bg-card/40">
            <CardContent className="p-4 md:p-6 font-mono text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
              {group.message}
            </CardContent>
          </Card>
        </div>

        {/* --- Recent Event Occurrences List (Using Shared Component) --- */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-foreground">
            Recent Traces & Stack Context{" "}
          </h3>
          {events.length > 0 ? (
            <ErrorEventList
              events={events}
              apmId={serviceId}
              showTraceLink={true}
              serviceType={group.service?.type} // Ensure TraceErrors knows it might be a RUM service
            />
          ) : (
            <div className="p-8 border border-border/60 rounded-xl bg-card text-center text-muted-foreground">
              No events recorded in the selected time range.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
