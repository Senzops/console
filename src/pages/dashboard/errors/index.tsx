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
  Input,
  Select,
  Button,
  Spinner,
  DataError,
} from "../../../components/Core";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertOctagon,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Clock,
  Box,
  Maximize2,
  X,
  ShieldAlert,
  Maximize,
} from "lucide-react";
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

export default function GlobalErrorsDashboard() {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();

  const [range, setRange] = useState("24h");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const [searchInput, setSearchInput] = useState("");

  const { data, error, isLoading } = useSWR(
    token
      ? `/errors?range=${range}&page=${page}&limit=15&search=${search}&status=${statusFilter}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    if (status === "resolved")
      return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    if (status === "ignored")
      return "text-muted-foreground border-border bg-muted/20";
    return "text-destructive border-destructive/20 bg-destructive/10";
  };

  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data?.trend.map((point: any) => {
      const d = new Date(point.time);
      let timeStr;
      if (range === "7d" || range === "30d") {
        timeStr = d.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });
      } else if (range === "24h") {
        timeStr = d.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        timeStr = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return { ...point, time: timeStr };
    });
  }, [data?.trend, range]);

  if (!data && !error && isLoading)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">
            Connecting to Error Trackers...
          </p>
        </div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <DataError />
        </div>
      </DashboardLayout>
    );

  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* --- Header & Range Control --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Global Exception Tracker
              </h1>
            </div>
            <p className="text-xs text-muted-foreground pl-12 font-mono">
              Monitor, triage, and resolve errors across all your services.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              className="w-36 bg-background rounded-md border-border/80"
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
          </div>
        </div>

        {/* --- Stats Cards --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Errors"
            value={data?.stats?.totalErrors?.toLocaleString() || 0}
            subtext={`Events in last ${range}`}
            icon={Activity}
            color="text-primary"
          />
          <StatCard
            title="Unresolved Issues"
            value={data?.stats?.unresolvedCount?.toLocaleString() || 0}
            subtext="Active error groups"
            icon={ShieldAlert}
            color="text-destructive"
          />
          <StatCard
            title="Affected Services"
            value={data?.stats?.affectedServices || 0}
            subtext="Services throwing errors"
            icon={Box}
            color="text-orange-500"
          />
          <StatCard
            title="Error Velocity"
            value={(
              (data?.stats?.totalErrors || 0) /
              (range === "1h"
                ? 60
                : range === "24h"
                  ? 24
                  : range === "7d"
                    ? 168
                    : 720)
            ).toFixed(1)}
            subtext={range === "1h" ? "Errors per minute" : "Errors per hour"}
            icon={Clock}
            color="text-purple-500"
          />
        </div>

        {/* --- Global Trend Graph --- */}
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

        {/* --- Error Table --- */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50">
            <form
              onSubmit={handleSearch}
              className="relative w-full md:w-[350px]"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by error class or message..."
                className="pl-9 h-9 w-full bg-background border-border/80"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>
            <Select
              className="w-full md:w-[180px] h-9 bg-background border-border/80"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="unresolved">Status: Unresolved</option>
              <option value="resolved">Status: Resolved</option>
              <option value="ignored">Status: Ignored</option>
              <option value="all">Status: All</option>
            </Select>
          </CardHeader>
          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                <tr>
                  <th className="px-6 py-3 font-semibold">Service</th>
                  <th className="px-6 py-3 font-semibold">Error Event</th>
                  <th className="px-6 py-3 font-semibold text-center">
                    Status
                  </th>
                  <th className="px-6 py-3 font-semibold text-right">
                    Occurrences
                  </th>
                  <th className="px-6 py-3 font-semibold text-right">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data?.errors?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground font-medium"
                    >
                      No error events found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  data?.errors?.map((err: any) => (
                    <tr
                      key={err._id}
                      onClick={() =>
                        router.push(`/dashboard/errors/${err._id}`)
                      }
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">
                            {err.apmId?.name || "Unknown Service"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[300px] md:max-w-[500px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-semibold text-destructive truncate">
                            {err.errorClass}
                          </span>
                          <span
                            className="text-muted-foreground text-xs truncate"
                            title={err.message}
                          >
                            {err.message}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`capitalize ${getStatusColor(err.status)}`}
                        >
                          {err.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium whitespace-nowrap">
                        {err.totalCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {new Date(err.lastSeen).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>

          {data?.pagination?.pages > 1 && (
            <div className="p-4 border-t border-border/40 bg-card/50 flex items-center justify-between overflow-hidden">
              <span className="text-xs text-muted-foreground font-medium">
                Showing page {page} of {data.pagination.pages} (
                {data.pagination.total} groups)
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
    </DashboardLayout>
  );
}
