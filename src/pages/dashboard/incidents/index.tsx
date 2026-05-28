import React, { useState, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { format, formatDistanceToNow } from "date-fns";
import { api, useAuth } from "../../../lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  DataError,
  Select,
} from "../../../components/Core";
import {
  AlertOctagon,
  Search,
  RefreshCw,
  Maximize,
  X,
  CheckCircle,
  Activity,
  Box,
  MonitorSmartphone,
  Terminal,
  Workflow,
  Server,
  Database,
  Filter,
  Check,
  Bug,
  Cpu,
  Globe,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  critical: {
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "CRITICAL",
  },
  high: {
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    label: "HIGH",
  },
  medium: {
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "MEDIUM",
  },
  low: {
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "LOW",
  },
  info: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
    label: "INFO",
  },
};

const getTargetIcon = (target: string) => {
  switch (target) {
    case "apm":
      return <Box className="h-3.5 w-3.5 text-orange-500" />;
    case "rum":
      return <MonitorSmartphone className="h-3.5 w-3.5 text-pink-500" />;
    case "logs":
      return <Terminal className="h-3.5 w-3.5 text-blue-500" />;
    case "task":
      return <Workflow className="h-3.5 w-3.5 text-indigo-500" />;
    case "vps":
      return <Server className="h-3.5 w-3.5 text-emerald-500" />;
    case "database":
      return <Database className="h-3.5 w-3.5 text-blue-400" />;
    case "errors":
      return <Bug className="h-3.5 w-3.5 text-red-500" />;
    case "runtime":
      return <Cpu className="h-3.5 w-3.5 text-violet-500" />;
    case "web":
      return <Globe className="h-3.5 w-3.5 text-cyan-500" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const formatIncidentNumber = (num: number) =>
  `INC-${String(num).padStart(4, "0")}`;

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "open") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase font-bold tracking-wider"
      >
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
        </span>
        FIRING
      </Badge>
    );
  }
  if (status === "acknowledged") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-bold tracking-wider"
      >
        ACKED
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider"
    >
      RESOLVED
    </Badge>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.high;
  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${config.borderColor} text-[10px] uppercase font-bold tracking-wider`}
    >
      {config.label}
    </Badge>
  );
};

export default function IncidentsDashboard() {
  const router = useRouter();
  const { token } = useAuth();

  const [statusFilter, setStatusFilter] = useState("open");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (severityFilter !== "all") queryParams.set("severity", severityFilter);
  queryParams.set("limit", "200");

  const {
    data,
    error,
    mutate,
    isValidating,
  } = useSWR(
    token ? `/alerts/incidents?${queryParams.toString()}` : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const isLoading = !data && !error;
  const incidents = data?.incidents || [];
  const total = data?.total || 0;
  const counts = data?.counts || { open: 0, acknowledged: 0, resolved: 0 };

  const filtered = useMemo(() => {
    if (!searchFilter) return incidents;
    const q = searchFilter.toLowerCase();
    return incidents.filter(
      (inc: any) =>
        inc.title?.toLowerCase().includes(q) ||
        (inc.conditionId?.name || "").toLowerCase().includes(q) ||
        (inc.policyId?.name || "").toLowerCase().includes(q) ||
        formatIncidentNumber(inc.incidentNumber).toLowerCase().includes(q),
    );
  }, [incidents, searchFilter]);

  const limit = isMaximized ? filtered.length : 25;
  const visible = filtered.slice(0, limit);
  const hiddenCount = filtered.length - limit;

  const handleUpdateStatus = async (
    incidentId: string,
    status: "acknowledged" | "resolved",
  ) => {
    try {
      await api.patch(`/alerts/incidents/${incidentId}/status`, { status });
      mutate();
      toast.success(`Incident ${status}.`);
    } catch {
      toast.error("Failed to update incident.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const eligibleIds = visible
      .filter((i: any) => i.status !== "resolved")
      .map((i: any) => i._id);
    if (selectedIds.length === eligibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleIds);
    }
  };

  const handleBulkAction = async (action: "acknowledge" | "resolve") => {
    if (selectedIds.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      await api.post("/alerts/incidents/bulk", {
        incidentIds: selectedIds,
        action,
      });
      mutate();
      setSelectedIds([]);
      toast.success(
        `${selectedIds.length} incident(s) ${action === "acknowledge" ? "acknowledged" : "resolved"}.`,
      );
    } catch {
      toast.error("Bulk action failed.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8 text-orange-500" />
        <p className="text-muted-foreground">Loading Incidents...</p>
      </div>
    );
  if (error)
    return (
      <div className="h-full flex items-center justify-center p-8">
        <DataError onRetry={() => mutate()} />
      </div>
    );

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <AlertOctagon className="h-4 w-4 text-foreground" /> All Incidents
        <span className="text-muted-foreground font-mono text-xs ml-1">
          ({total})
        </span>
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-52">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-primary outline-none"
            placeholder="Search incidents..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => mutate()}
          disabled={isValidating}
        >
          <RefreshCw
            className={`h-3 w-3 ${isValidating ? "animate-spin" : ""}`}
          />
        </Button>
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

  const TableContent = (
    <Card
      className={`flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-auto"}`}
    >
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="px-6 py-2 bg-primary/5 border-b border-border/40 flex items-center gap-3">
            <span className="text-xs font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
              onClick={() => handleBulkAction("acknowledge")}
              disabled={isBulkSubmitting}
            >
              Bulk ACK
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
              onClick={() => handleBulkAction("resolve")}
              disabled={isBulkSubmitting}
            >
              Bulk Resolve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        )}

        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-4 py-3 w-8">
                <div
                  className="h-4 w-4 rounded-sm border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.length > 0 &&
                    selectedIds.length ===
                      visible.filter((i: any) => i.status !== "resolved")
                        .length && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                </div>
              </th>
              <th className="px-4 py-3 font-medium w-28">Status</th>
              <th className="px-4 py-3 font-medium w-24">Severity</th>
              <th className="px-4 py-3 font-medium w-28">Incident</th>
              <th className="px-4 py-3 font-medium w-full">Title</th>
              <th className="px-4 py-3 font-medium w-32">Source</th>
              <th className="px-4 py-3 font-medium w-32">Policy</th>
              <th className="px-4 py-3 text-right font-medium w-20">Value</th>
              <th className="px-4 py-3 text-right font-medium w-32">
                Opened
              </th>
              <th className="px-4 py-3 text-right font-medium w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((incident: any) => {
              const isSelected = selectedIds.includes(incident._id);
              return (
                <tr
                  key={incident._id}
                  className={`hover:bg-muted/20 group transition-colors cursor-pointer ${incident.status === "open" ? "bg-destructive/[0.03]" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {incident.status !== "resolved" && (
                      <div
                        className={`h-4 w-4 rounded-sm border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background hover:border-primary/50"}`}
                        onClick={() => toggleSelection(incident._id)}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    <StatusBadge status={incident.status} />
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-primary font-bold"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    {formatIncidentNumber(incident.incidentNumber)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate block max-w-md">
                      {incident.title ||
                        incident.conditionId?.name ||
                        "Untitled"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    <div className="flex items-center gap-1.5 text-xs capitalize">
                      {getTargetIcon(incident.conditionId?.target)}
                      {incident.conditionId?.target || "—"}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                    title={incident.policyId?.name}
                  >
                    {incident.policyId?.name || "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono text-xs font-bold"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                  >
                    {incident.triggerValue}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-xs text-muted-foreground font-mono"
                    onClick={() =>
                      router.push(`/dashboard/incidents/${incident._id}`)
                    }
                    title={format(new Date(incident.openedAt), "PPpp")}
                  >
                    {formatDistanceToNow(new Date(incident.openedAt))} ago
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {incident.status === "open" && (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(incident._id, "acknowledged")
                          }
                          className="h-7 text-[10px] border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
                        >
                          ACK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(incident._id, "resolved")
                          }
                          className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                        >
                          RESOLVE
                        </Button>
                      </div>
                    )}
                    {incident.status === "acknowledged" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpdateStatus(incident._id, "resolved")
                        }
                        className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                      >
                        RESOLVE
                      </Button>
                    )}
                    {incident.status === "resolved" && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {incident.resolvedAt
                          ? format(new Date(incident.resolvedAt), "MMM d, HH:mm")
                          : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => setIsMaximized(true)}
              >
                <td
                  colSpan={10}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="py-16 text-center text-muted-foreground font-medium"
                >
                  <CheckCircle className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
                  No incidents found matching your filters.
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
      <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Incidents
              </h1>
              {counts.open > 0 && (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold tracking-wider"
                >
                  {counts.open} OPEN
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Manage and respond to all alert incidents across your
              infrastructure.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              disabled={isValidating}
              className="h-9 w-9"
            >
              <RefreshCw
                className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Status Summary Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "All", count: counts.open + counts.acknowledged + counts.resolved },
            { key: "open", label: "Open", count: counts.open },
            { key: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
            { key: "resolved", label: "Resolved", count: counts.resolved },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === tab.key
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
              }`}
            >
              {tab.label}{" "}
              <span className="font-mono ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-8 text-xs w-36"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </Select>
          </div>
        </div>

        {/* Table */}
        {isMaximized &&
          createPortal(
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setIsMaximized(false)}
            />,
            document.body,
          )}
        {isMaximized ? createPortal(TableContent, document.body) : TableContent}
      </div>
    </>
  );
}
