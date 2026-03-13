import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { DashboardLayout } from "../Layout";
import {
  ShieldCheck,
  Server,
  Globe,
  Cpu,
  Activity,
  MousePointer,
  Timer,
  Code,
  Zap,
  LayoutGrid,
  List as ListIcon,
  ArrowRight,
  Search,
  Box,
  ChartNoAxesCombined,
  Database,
  Settings,
  Workflow
} from "lucide-react";
import useSWR from "swr";
import { api, useAuth } from "../../lib/auth";
import Link from "next/link";
import {
  Badge,
  Spinner,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  DataError,
} from "../Core";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "@/lib/theme";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Hexagon CSS Clip Path
const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

interface DashboardViewProps {
  filterType?: "server" | "web" | "apm" | "monitor" | "database" | "task";
}

export default function DashboardView({ filterType }: DashboardViewProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { defaultViewMode } = useTheme(); // Get Global Setting

  // Initialize with global preference
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);
  const [search, setSearch] = useState("");

  const {
    data: serverList,
    error: serverErr,
    mutate: mutateServer,
  } = useSWR(token ? "/vps/list" : null, fetcher);
  const {
    data: webList,
    error: webErr,
    mutate: mutateWeb,
  } = useSWR(token ? "/web/list" : null, fetcher);
  const {
    data: monitorList,
    error: monitorErr,
    mutate: mutateMonitor,
  } = useSWR(token ? "/uptime/list" : null, fetcher);
  const {
    data: apmList,
    error: apmErr,
    mutate: mutateApm,
  } = useSWR(token ? "/apm/list" : null, fetcher);
  const {
    data: dbList,
    error: dbErr,
    mutate: mutateDb,
  } = useSWR(token ? "/database/list" : null, fetcher);
  const {
    data: taskList,
    error: taskErr,
    mutate: mutateTask,
  } = useSWR(token ? "/task/list" : null, fetcher);

  const hasError = serverErr || webErr || monitorErr || apmErr || dbErr || taskErr;
  const isLoading =
    !serverList && !webList && !monitorList && !apmList && !dbList && !taskList && !hasError;

  const isEmpty =
    (serverList?.length || 0) === 0 &&
    (webList?.length || 0) === 0 &&
    (monitorList?.length || 0) === 0 &&
    (dbList?.length || 0) === 0 &&
    (apmList?.length || 0) === 0 &&
    (taskList?.length || 0) === 0;

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

  const handleRetryAll = () => {
    mutateServer();
    mutateWeb();
    mutateMonitor();
    mutateApm();
    mutateDb();
    mutateTask();
  };

  if (hasError) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center p-8">
          <DataError onRetry={handleRetryAll} />
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (isEmpty) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
          <div className="h-24 w-24 bg-card rounded-full flex items-center content-center justify-center mb-6 border border-border shadow-lg p-2">
            <img
              src="/logo.svg"
              alt="Logo"
              className="object-cover h-full w-full logo"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to Senzor
          </h2>
          <p className="max-w-md text-center">
            Add a "Service" from the sidebar to start monitoring your
            infrastructure.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  let items = [
    ...(serverList || []).map((s: any) => ({ ...s, type: "server" })),
    ...(dbList || []).map((d: any) => ({ ...d, type: "database", meta: `${d.type}` })),
    ...(webList || []).map((w: any) => ({ ...w, type: "web" })),
    ...(apmList || []).map((a: any) => ({ ...a, type: "apm" })),
    ...(taskList || []).map((t: any) => ({ ...t, type: "task" })),
    ...(monitorList || []).map((m: any) => ({ ...m, type: "monitor" })),
  ];

  if (filterType) items = items.filter((i) => i.type === filterType);
  if (search)
    items = items.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase()),
    );

  // --- Helpers ---
  const getHref = (item: any) => {
    if (item.type === "server") return `/dashboard/server/${item._id}`;
    if (item.type === "web") return `/dashboard/web/${item._id}`;
    if (item.type === "apm") return `/dashboard/apm/${item._id}`;
    if (item.type === "task") return `/dashboard/task/${item._id}`;
    if (item.type === "database") return `/dashboard/db/${item._id}`;
    return `/dashboard/monitor/${item._id}`;
  };

  const getStatusBadge = (item: any) => {
    if (item.type === "server")
      return (
        <Badge variant={item.status === "online" ? "success" : "destructive"}>
          {item.status === "online" ? "ONLINE" : "OFFLINE"}
        </Badge>
      );
    if (item.type === "web")
      return (
        <Badge variant={item.status === "online" ? "success" : "destructive"}>
          {item.status === "online" ? "ONLINE" : "OFFLINE"}
        </Badge>
      );
    if (item.type === "database")
      return (
        <Badge
          variant="secondary"
          className="text-blue-500 bg-blue-500/10 border-blue-500/20"
        >
          ACTIVE
        </Badge>
      );
    if (item.type === "monitor")
      return (
        <Badge
          variant={
            item.status === "up"
              ? "success"
              : item.status === "timeout"
                ? "warning"
                : "destructive"
          }
        >
          {item.status.toUpperCase()}
        </Badge>
      );
    if (item.type === "apm") {
      const isApmActive =
        item.lastSeen &&
        new Date().getTime() - new Date(item.lastSeen).getTime() <
          5 * 60 * 1000;
      return isApmActive ? (
        <Badge
          variant="outline"
          className="text-orange-500 border-orange-500/30 bg-orange-500/5"
        >
          LIVE
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground font-mono">
          Inactive
        </span>
      );
    }
    if (item.type === "task") {
      const isTaskActive =
        item.status === "online" || (item.lastSeen && new Date().getTime() - new Date(item.lastSeen).getTime() < 5 * 60 * 1000);
      return isTaskActive ? (
        <Badge
          variant="outline"
          className="text-indigo-500 border-indigo-500/30 bg-indigo-500/5"
        >
          ACTIVE
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground font-mono">
          Inactive
        </span>
      );
    }
  };

  const getIcon = (type: string, status?: string) => {
    switch (type) {
      case "server":
        return (
          <Server
            className={`h-5 w-5 ${status === "online" ? "text-emerald-500" : "bg-destructive/10 text-destructive"}`}
          />
        );
      case "web":
        return <Globe className="h-5 w-5 text-blue-500" />;
      case "apm":
        return <Code className={`h-5 w-5 text-orange-500`} />;
      case "task":
        return <Workflow className={`h-5 w-5 text-indigo-500`} />;
      case "database":
        return <Database className={`h-5 w-5 text-emerald-500`} />;
      case "monitor":
        return (
          <Activity
            className={`h-5 w-5 ${status === "up" ? "text-emerald-500" : "bg-destructive/10 text-destructive"}`}
          />
        );
      default:
        return <Box className="h-5 w-5" />;
    }
  };

  const getSubText = (item: any) => {
    if (item.type === "server")
      return (
        <>
          <Cpu className="h-3 w-3" />{" "}
          {item.metadata?.os?.split(" ")[0] || "Linux"}
        </>
      );
    if (item.type === "web")
      return (
        <>
          <ChartNoAxesCombined className="h-3 w-3" /> Analytics
        </>
      );
    if (item.type === "apm")
      return (
        <>
          <Zap className="h-3 w-3" />{" "}
          {item.framework && item.framework !== "unknown"
            ? item.framework
            : "APM"}
        </>
      );
    if (item.type === "task")
      return (
        <>
          <Workflow className="h-3 w-3" /> Background Jobs
        </>
      );
    if (item.type === "database")
      return (
        <>
          <Settings className="h-3 w-3" /> {item.meta}
        </>
      );
    return (
      <>
        <Timer className="h-3 w-3" /> {item.interval}m Check
      </>
    );
  };

  const title = filterType
    ? filterType === "apm"
      ? "APM Services"
      : filterType === "task"
        ? "Background Tasks"
        : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)}s`
    : "Global Infra";

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-8 pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? "resource" : "resources"}{" "}
              active
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {items.length > 0 && viewMode === "grid" ? (
            <div className="flex flex-wrap justify-center gap-y-4 px-8 max-w-7xl">
              {items.map((item, i) => {
                // Logic for APM Active state (Last seen within 5 mins)
                const isApmActive =
                  item.type === "apm" &&
                  item.lastSeen &&
                  new Date().getTime() - new Date(item.lastSeen).getTime() <
                    5 * 60 * 1000;
                    
                // Logic for Task Active state
                const isTaskActive = 
                  item.type === "task" &&
                  (item.status === 'online' || (item.lastSeen && new Date().getTime() - new Date(item.lastSeen).getTime() < 5 * 60 * 1000));

                return (
                  <Link
                    href={getHref(item)}
                    key={`${item.type}-${item._id}`}
                    className="relative group transition-transform hover:z-20 duration-300 -mx-3 even:mt-16 even:z-20"
                  >
                    {/* Hexagon Shape - Medium Size */}
                    <div
                      className="w-[190px] h-[220px] bg-card transition-all flex flex-col items-center justify-center p-6 text-center shadow-lg relative group-hover:scale-105 duration-300"
                      style={{
                        clipPath: HEX_CLIP,
                      }}
                    >
                      {/* Hexagon Border Hack (Inset Shadow for depth) */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/10 pointer-events-none" />

                      {item.type === "server" && (
                        <>
                          {/* Status Indicator Ring */}
                          <div
                            className={`mb-3 p-3 rounded-full transition-colors ${item.status === "online" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
                          >
                            <Server className="h-6 w-6" />
                          </div>

                          <h3 className="font-bold text-sm mb-1 truncate w-full px-2 leading-tight">
                            {item.name}
                          </h3>

                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-70">
                            <Cpu className="h-3 w-3" />{" "}
                            {item.metadata?.os?.split(" ")[0] || "Linux"}
                          </div>

                          <Badge
                            variant={
                              item.status === "online"
                                ? "success"
                                : "destructive"
                            }
                            className="px-2 py-0 text-[10px]"
                          >
                            {item.status === "online" ? "ONLINE" : "OFFLINE"}
                          </Badge>
                        </>
                      )}

                      {item.type === "database" && (
                        <>
                          {/* Status Indicator Ring */}
                          <div
                            className={`mb-3 p-3 rounded-full transition-colors ${item.status === "online" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
                          >
                            <Database className="h-6 w-6" />
                          </div>

                          <h3 className="font-bold text-sm mb-1 truncate w-full px-2 leading-tight">
                            {item.name}
                          </h3>

                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-70">
                            <Settings className="h-3 w-3" />{" "}
                            {item.meta}
                          </div>

                          <Badge
                            variant={
                              item.status === "online"
                                ? "success"
                                : "destructive"
                            }
                            className="px-2 py-0 text-[10px]"
                          >
                            {item.status === "online" ? "ONLINE" : "OFFLINE"}
                          </Badge>
                        </>
                      )}

                      {item.type === "web" && (
                        <>
                          {/* Status Indicator Ring */}
                          <div
                            className={`mb-3 p-3 rounded-full bg-blue-500/10 text-blue-500`}
                          >
                            <Globe className="h-6 w-6" />
                          </div>

                          <h3 className="font-bold text-sm mb-1 truncate w-full px-2 leading-tight">
                            {item.name}
                          </h3>

                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-70">
                            <ChartNoAxesCombined className="h-3 w-3" />{" "}
                            Analytics
                          </div>
                        </>
                      )}

                      {item.type === "apm" && (
                        <>
                          <div
                            className={`mb-3 p-3 rounded-full transition-colors ${isApmActive ? "bg-orange-500/10 text-orange-500" : "bg-secondary text-muted-foreground"}`}
                          >
                            <Code className="h-6 w-6" />
                          </div>
                          <h3 className="font-bold text-sm mb-1 truncate w-full px-4">
                            {item.name}
                          </h3>
                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-80">
                            <Zap className="h-3 w-3" />{" "}
                            {item.framework && item.framework !== "unknown"
                              ? item.framework
                              : "APM"}
                          </div>
                          {isApmActive ? (
                            <Badge
                              variant="outline"
                              className="px-2 py-0.5 text-[10px] text-orange-500 border-orange-500/30 bg-orange-500/5"
                            >
                              LIVE
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {item.lastSeen
                                ? formatDistanceToNow(new Date(item.lastSeen))
                                : "Never"}
                            </span>
                          )}
                        </>
                      )}

                      {item.type === "task" && (
                        <>
                          <div
                            className={`mb-3 p-3 rounded-full transition-colors ${isTaskActive ? "bg-indigo-500/10 text-indigo-500" : "bg-secondary text-muted-foreground"}`}
                          >
                            <Workflow className="h-6 w-6" />
                          </div>
                          <h3 className="font-bold text-sm mb-1 truncate w-full px-4">
                            {item.name}
                          </h3>
                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-80">
                            <Workflow className="h-3 w-3" /> Background Jobs
                          </div>
                          {isTaskActive ? (
                            <Badge
                              variant="outline"
                              className="px-2 py-0.5 text-[10px] text-indigo-500 border-indigo-500/30 bg-indigo-500/5"
                            >
                              ACTIVE
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {item.lastSeen
                                ? formatDistanceToNow(new Date(item.lastSeen))
                                : "Never"}
                            </span>
                          )}
                        </>
                      )}

                      {item.type === "monitor" && (
                        <>
                          {/* Status Indicator Ring */}
                          <div
                            className={`mb-3 p-3 rounded-full transition-colors ${item.status === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
                          >
                            <Activity className="h-6 w-6" />
                          </div>

                          <h3 className="font-bold text-sm mb-1 truncate w-full px-2 leading-tight">
                            {item.name}
                          </h3>

                          <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-70">
                            <Timer className="h-3 w-3" /> {item.interval}m Check
                          </div>

                          <Badge
                            variant={
                              item.status === "up"
                                ? "success"
                                : item.status === "timeout"
                                  ? "warning"
                                  : "destructive"
                            }
                            className="px-2 py-0 text-[10px] uppercase"
                          >
                            {item.status}
                          </Badge>
                        </>
                      )}

                      {/* Hover Info (Overlay) */}
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-muted/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10"
                        style={{
                          clipPath: HEX_CLIP,
                        }}
                      >
                        <div className="text-xs text-foreground font-medium">
                          View Metrics
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : items.length > 0 ? (
            <Card className="max-w-[1400px] mx-auto overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-6 py-4 w-1/3">Resource Name</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {items.map((item, i) => (
                      // Clickable Row
                      <tr
                        key={i}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => router.push(getHref(item))}
                      >
                        <td className="px-6 py-4 font-medium">
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                item.type === "server" || item.type === "database"
                                  ? "bg-emerald-500/5"
                                  : item.type === "apm"
                                    ? "bg-orange-500/5"
                                    : item.type === "task"
                                      ? "bg-indigo-500/5"
                                      : item.type === "monitor"
                                        ? "bg-emerald-500/5"
                                        : "bg-blue-500/5"
                              }`}
                            >
                              {getIcon(item.type, item.status)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {item.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono opacity-80 bg-muted/30 px-2 py-1 rounded w-fit border border-border/30">
                            {getSubText(item)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground capitalize font-medium">
                          {item.type}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="text-center py-24 text-muted-foreground border border-dashed border-border rounded-xl bg-card/30 flex flex-col items-center justify-center gap-2">
              <Search className="h-10 w-10 opacity-20 mb-2" />
              <p className="font-medium">No resources found</p>
              <p className="text-xs opacity-60">
                Try adjusting your filters or add a new service.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}