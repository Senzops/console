import React, { useState, useMemo, createContext } from "react";
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
  Button,
  Select,
  Spinner,
  DataError,
} from "../../../components/Core";
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
  AlertOctagon,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Box,
  ExternalLink,
  Maximize2,
  X,
  MessageSquareWarning,
  Maximize,
} from "lucide-react";
import { ErrorEventList } from "../../../components/TraceErrors";
import { createPortal } from "react-dom";

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

const CustomTooltip = ({ active, payload, label, suffix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 mb-1"
            style={{ color: entry.color || entry.stroke || entry.fill }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: entry.color || entry.stroke || entry.fill,
              }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">
              {entry.value === null
                ? "0"
                : `${Number(entry.value).toFixed(0)}${suffix}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-1 font-medium">
          {subtext}
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

  const [range, setRange] = useState("24h");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/errors/${id}?range=${range}` : null,
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
    return data.trend.map((point: any) => {
      const d = new Date(point.time);
      const timeStr =
        range === "7d" || range === "30d"
          ? d.toLocaleDateString([], { month: "short", day: "numeric" })
          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { ...point, time: timeStr };
    });
  }, [data?.trend, range]);

  if (!data && !error)
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  if (error)
    return (
      <DashboardLayout>
        <div className="p-8">
          <DataError onRetry={() => mutate()} />
        </div>
      </DashboardLayout>
    );

  const { group, events } = data;
  const latestTraceId = events?.[0]?.traceId;

  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  return (
    <DashboardLayout>
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
            <div className="flex items-center gap-3 mb-2">
              {/* Strictly truncated title in the header */}
              <h1
                className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-[60vw] md:max-w-lg"
                title={group.message}
              >
                {group.message}
              </h1>
            </div>
            <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-foreground">
                <Box className="h-3.5 w-3.5 text-orange-500" />{" "}
                {group.apmId?.name || "Unknown Service"}
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
            {/* Time Range Selector Moved to Header */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select
                className="w-full md:w-36 bg-background border-border/80 h-9 text-xs"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                disabled={isValidating}
              >
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {latestTraceId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-background border-primary/30 text-primary hover:bg-primary/10 flex-1 md:flex-none"
                  onClick={() =>
                    router.push(
                      `/dashboard/apm/${group.apmId._id}/trace/${latestTraceId}`,
                    )
                  }
                >
                  Latest Trace <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
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
            subtext={`Occurrences in last ${range}`}
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
                    stroke="#333"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip suffix=" events" />} />
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
              apmId={group.apmId?._id}
              showTraceLink={true}
            />
          ) : (
            <div className="p-8 border border-border/60 rounded-xl bg-card text-center text-muted-foreground">
              No events recorded in the selected time range.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
