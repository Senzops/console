import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import Editor from "@monaco-editor/react";
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
  Spinner,
  Dialog,
  Input,
  DataError,
  Select,
} from "../../../components/Core";
import {
  ArrowLeft,
  BellRing,
  Plus,
  Trash2,
  AlertTriangle,
  Code2,
  Activity,
  CheckCircle,
  Server,
  Terminal,
  Box,
  MonitorSmartphone,
  Workflow,
  Database,
  Maximize,
  X,
  RefreshCw,
  Edit2,
  BookOpen,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- Schema Documentation Library ---
const SCHEMA_DOCS: Record<
  string,
  { field: string; type: string; desc: string }[]
> = {
  apm: [
    { field: "duration", type: "number", desc: "Execution latency in ms" },
    { field: "status", type: "number", desc: "HTTP Response code (e.g. 500)" },
    {
      field: "route",
      type: "string",
      desc: "Endpoint route (e.g. /api/users)",
    },
    { field: "method", type: "string", desc: "HTTP Method (GET, POST)" },
  ],
  logs: [
    {
      field: "level",
      type: "string",
      desc: "Log severity (error, warn, info)",
    },
    {
      field: "message",
      type: "string",
      desc: "Full log text body (supports regex)",
    },
    { field: "serviceModel", type: "string", desc: "Originating service type" },
  ],
  vps: [
    {
      field: "metrics.cpu.usagePercent",
      type: "number",
      desc: "Total CPU utilization %",
    },
    {
      field: "metrics.memory.usagePercent",
      type: "number",
      desc: "RAM utilization %",
    },
    { field: "isOnline", type: "boolean", desc: "Agent heartbeat status" },
  ],
  database: [
    { field: "latency", type: "number", desc: "Query response time in ms" },
    { field: "connections", type: "number", desc: "Active DB connections" },
    { field: "ops", type: "number", desc: "Operations per second" },
  ],
  uptime: [
    {
      field: "status",
      type: "string",
      desc: "Endpoint health ('up' or 'down')",
    },
    { field: "latency", type: "number", desc: "Ping latency in ms" },
  ],
  rum: [
    {
      field: "metrics.lcp",
      type: "number",
      desc: "Largest Contentful Paint ms",
    },
    { field: "metrics.cls", type: "number", desc: "Cumulative Layout Shift" },
    { field: "browser", type: "string", desc: "User Agent browser string" },
  ],
  task: [
    {
      field: "status",
      type: "string",
      desc: "Job execution ('completed', 'failed')",
    },
    { field: "duration", type: "number", desc: "Job runtime in ms" },
    { field: "taskName", type: "string", desc: "Specific worker/queue name" },
  ],
};

const DEFAULT_QUERIES: Record<string, string> = {
  logs: '{\n  "level": "error",\n  "message": { "$regex": "timeout", "$options": "i" }\n}',
  apm: '{\n  "duration": { "$gt": 2000 },\n  "status": { "$gte": 500 }\n}',
  vps: '{\n  "metrics.cpu.usagePercent": { "$gt": 90 }\n}',
  database: '{\n  "latency": { "$gt": 150 }\n}',
  uptime: '{\n  "status": "down"\n}',
  rum: '{\n  "metrics.lcp": { "$gt": 2500 }\n}',
  task: '{\n  "status": "failed"\n}',
};

const getTargetIcon = (target: string) => {
  switch (target) {
    case "apm":
      return <Box className="h-4 w-4 text-orange-500" />;
    case "rum":
      return <MonitorSmartphone className="h-4 w-4 text-pink-500" />;
    case "logs":
      return <Terminal className="h-4 w-4 text-blue-500" />;
    case "task":
      return <Workflow className="h-4 w-4 text-indigo-500" />;
    case "vps":
      return <Server className="h-4 w-4 text-emerald-500" />;
    case "database":
      return <Database className="h-4 w-4 text-blue-400" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

// --- Conditions Table ---
const ConditionsTable = ({
  conditions,
  onEdit,
  onDelete,
  isValidating,
  mutate,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const limit = isMaximized ? conditions.length : 5;
  const visible = conditions.slice(0, limit);
  const hiddenCount = conditions.length - limit;

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Code2 className="h-4 w-4 text-foreground" /> Evaluation Rules
      </CardTitle>
      <div className="flex items-center gap-2">
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
      className={`flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-auto"}`}
    >
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium w-full">Condition Name</th>
              <th className="px-6 py-3 font-medium w-32">Target</th>
              <th className="px-6 py-3 font-medium w-48">Trigger Logic</th>
              <th className="px-6 py-3 font-medium w-32">Frequency</th>
              <th className="px-6 py-3 text-right font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((cond: any) => (
              <tr
                key={cond._id}
                className="hover:bg-muted/20 group transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-foreground">
                  {cond.name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 capitalize text-xs">
                    {getTargetIcon(cond.target)} {cond.target}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                  COUNT{" "}
                  {cond.threshold.operator === "gt"
                    ? ">"
                    : cond.threshold.operator === "lt"
                      ? "<"
                      : "=="}{" "}
                  {cond.threshold.value}{" "}
                  <span className="opacity-50">
                    in {cond.threshold.windowMins}m
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {cond.frequency}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(cond)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(cond)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No conditions set. Add one to begin monitoring.
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

// --- Incidents Table ---
const IncidentsTable = ({
  incidents,
  onUpdateStatus,
  isValidating,
  mutate,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const limit = isMaximized ? incidents.length : 5;
  const visible = incidents.slice(0, limit);
  const hiddenCount = incidents.length - limit;

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Activity className="h-4 w-4 text-foreground" /> Incident History
      </CardTitle>
      <div className="flex items-center gap-2">
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
      className={`flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-auto"}`}
    >
      {Header}
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium w-32">Status</th>
              <th className="px-6 py-3 font-medium w-full">Origin Condition</th>
              <th className="px-6 py-3 text-right font-medium">
                Trigger Value
              </th>
              <th className="px-6 py-3 text-right font-medium">Opened</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((incident: any) => (
              <tr
                key={incident._id}
                className={`hover:bg-muted/20 group transition-colors ${incident.status === "open" ? "bg-destructive/5" : ""}`}
              >
                <td className="px-6 py-4">
                  {incident.status === "open" ? (
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase animate-pulse"
                    >
                      FIRED
                    </Badge>
                  ) : incident.status === "acknowledged" ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase"
                    >
                      ACKED
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase"
                    >
                      RESOLVED
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {incident.conditionId?.target ? (
                      getTargetIcon(incident.conditionId.target)
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    <span className="font-medium text-foreground">
                      {incident.conditionId?.name || "Deleted Condition"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs font-bold">
                  {incident.triggerValue}
                </td>
                <td
                  className="px-6 py-4 text-right text-xs text-muted-foreground font-mono"
                  title={format(new Date(incident.openedAt), "PPpp")}
                >
                  {formatDistanceToNow(new Date(incident.openedAt))} ago
                </td>
                <td className="px-6 py-4 text-right">
                  {incident.status === "open" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onUpdateStatus(incident._id, "acknowledged")
                        }
                        className="h-7 text-[10px] border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
                      >
                        ACK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(incident._id, "resolved")}
                        className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                      >
                        RESOLVE
                      </Button>
                    </div>
                  )}
                  {incident.status === "acknowledged" && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(incident._id, "resolved")}
                        className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                      >
                        RESOLVE
                      </Button>
                    </div>
                  )}
                  {incident.status === "resolved" && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(incident.resolvedAt), "MMM d, HH:mm")}
                    </span>
                  )}
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
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-16 text-center text-muted-foreground font-medium"
                >
                  <CheckCircle className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
                  No incidents recorded. Everything is healthy.
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

export default function AlertPolicyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { theme } = useTheme();

  // --- Modals State ---
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Form State ---
  const [conditionForm, setConditionForm] = useState({
    name: "",
    target: "apm",
    queryStr: DEFAULT_QUERIES["apm"],
    operator: "gt",
    value: 10,
    windowMins: 5,
    frequency: "once",
  });

  // --- Data Fetching (Poll every 15s) ---
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/alerts/policies/${id}` : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  // Update snippet when target changes, ONLY if creating a new condition
  useEffect(() => {
    if (!editingId) {
      setConditionForm((prev) => ({
        ...prev,
        queryStr: DEFAULT_QUERIES[prev.target] || "{}",
      }));
    }
  }, [conditionForm.target, editingId]);

  // --- Form Handlers ---
  const openCreateCondition = () => {
    setEditingId(null);
    setConditionForm({
      name: "",
      target: "apm",
      queryStr: DEFAULT_QUERIES["apm"],
      operator: "gt",
      value: 10,
      windowMins: 5,
      frequency: "once",
    });
    setIsConditionModalOpen(true);
  };

  const openEditCondition = (c: any) => {
    setEditingId(c._id);
    setConditionForm({
      name: c.name,
      target: c.target,
      queryStr: JSON.stringify(c.query, null, 2),
      operator: c.threshold.operator,
      value: c.threshold.value,
      windowMins: c.threshold.windowMins,
      frequency: c.frequency,
    });
    setIsConditionModalOpen(true);
  };

  const handleSaveCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionForm.name) return;

    let parsedQuery;
    try {
      parsedQuery = JSON.parse(conditionForm.queryStr);
    } catch (err) {
      toast.error("Invalid JSON MQL. Please check syntax.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        policyId: id,
        name: conditionForm.name,
        target: conditionForm.target,
        query: parsedQuery,
        threshold: {
          operator: conditionForm.operator,
          value: Number(conditionForm.value),
          windowMins: Number(conditionForm.windowMins),
        },
        frequency: conditionForm.frequency,
      };

      if (editingId) {
        await api.put(`/alerts/conditions/${editingId}`, payload);
        toast.success("Condition updated successfully!");
      } else {
        await api.post("/alerts/conditions", payload);
        toast.success("Condition deployed successfully!");
      }
      setIsConditionModalOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save condition");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteCondition = async () => {
    if (!deleteModal) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/alerts/conditions/${deleteModal.id}`);
      mutate();
      toast.success("Condition removed.");
      setDeleteModal(null);
    } catch (err) {
      toast.error("Failed to delete condition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIncident = async (
    incidentId: string,
    status: "acknowledged" | "resolved",
  ) => {
    try {
      await api.patch(`/alerts/incidents/${incidentId}/status`, { status });
      mutate();
      toast.success(`Incident marked as ${status}.`);
    } catch (err) {
      toast.error("Failed to update incident.");
    }
  };

  if (!data && !error)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Alert Policy...</p>
        </div>
      </DashboardLayout>
    );
  if (error)
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center p-8">
          <DataError onRetry={() => mutate()} />
        </div>
      </DashboardLayout>
    );

  const { policy, conditions, incidents } = data;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
        {/* --- Header --- */}
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/alerts"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Policies
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {policy.name}
                </h1>
                <Badge
                  variant="outline"
                  className="border-blue-500/20 text-blue-500 bg-blue-500/10 font-mono text-xs font-bold tracking-wider"
                >
                  POLICY
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono">
                  {policy.description || "No description provided."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={openCreateCondition}
                className="h-9 shadow-md bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Condition
              </Button>
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
        </div>

        {/* --- Full Wide Tables --- */}
        <div className="space-y-6">
          <ConditionsTable
            conditions={conditions}
            onEdit={openEditCondition}
            onDelete={(c: any) => setDeleteModal({ id: c._id, name: c.name })}
            isValidating={isValidating}
            mutate={mutate}
          />
          <IncidentsTable
            incidents={incidents}
            onUpdateStatus={handleUpdateIncident}
            isValidating={isValidating}
            mutate={mutate}
          />
        </div>
      </div>

      {/* --- MODAL: MASSIVE CONDITION BUILDER --- */}
      {isConditionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col border-border/60 shadow-2xl bg-card">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between bg-muted/20 shrink-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />{" "}
                {editingId ? "Edit Condition" : "Build Condition"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsConditionModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto overflow-x-hidden">
              <form
                onSubmit={handleSaveCondition}
                className="flex flex-col h-full"
              >
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                  {/* Left: Editor & Logic (Span 2) */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Name & Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Condition Name
                        </label>
                        <Input
                          placeholder="e.g., High APM Latency Spike"
                          value={conditionForm.name}
                          onChange={(e) =>
                            setConditionForm({
                              ...conditionForm,
                              name: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Target Telemetry
                        </label>
                        <Select
                          value={conditionForm.target}
                          onChange={(e) =>
                            setConditionForm({
                              ...conditionForm,
                              target: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                          className="capitalize"
                        >
                          <option value="apm">Backend APM (Traces)</option>
                          <option value="logs">Global Logs</option>
                          <option value="database">Database Metrics</option>
                          <option value="vps">Infrastructure (VPS)</option>
                          <option value="task">Background Tasks</option>
                          <option value="rum">Frontend (RUM)</option>
                          <option value="uptime">Uptime Monitors</option>
                        </Select>
                      </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-[300px] border border-border/60 rounded-xl overflow-hidden bg-[#1e1e1e] flex flex-col shadow-inner">
                      <div className="bg-[#2d2d2d] border-b border-border/40 px-4 py-2 flex items-center justify-between shrink-0">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Terminal className="h-3 w-3 text-blue-400" /> Safe
                          MQL Sandbox
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                          <CheckCircle className="h-3 w-3" /> Tenant Sandbox
                          Active
                        </div>
                      </div>
                      <div className="flex-1 w-full pt-2">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          theme={
                            theme === "light" || theme === "latte"
                              ? "light"
                              : "vs-dark"
                          }
                          value={conditionForm.queryStr}
                          onChange={(val) =>
                            setConditionForm({
                              ...conditionForm,
                              queryStr: val || "{}",
                            })
                          }
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            formatOnPaste: true,
                            tabSize: 2,
                            padding: { top: 10 },
                          }}
                        />
                      </div>
                    </div>

                    {/* Threshold Logic */}
                    <div className="bg-muted/30 border border-border/60 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-orange-500" /> Trigger
                        Thresholds
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Document Count
                          </label>
                          <Select
                            value={conditionForm.operator}
                            onChange={(e) =>
                              setConditionForm({
                                ...conditionForm,
                                operator: e.target.value,
                              })
                            }
                            disabled={isSubmitting}
                          >
                            <option value="gt">Is Greater Than (&gt;)</option>
                            <option value="lt">Is Less Than (&lt;)</option>
                            <option value="eq">Is Exactly (==)</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Threshold Value
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={conditionForm.value}
                            onChange={(e) =>
                              setConditionForm({
                                ...conditionForm,
                                value: Number(e.target.value),
                              })
                            }
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Evaluation Window
                          </label>
                          <Select
                            value={conditionForm.windowMins}
                            onChange={(e) =>
                              setConditionForm({
                                ...conditionForm,
                                windowMins: Number(e.target.value),
                              })
                            }
                            disabled={isSubmitting}
                          >
                            <option value="1">Last 1 Minute</option>
                            <option value="5">Last 5 Minutes</option>
                            <option value="15">Last 15 Minutes</option>
                            <option value="60">Last 1 Hour</option>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <label className="text-xs font-medium text-muted-foreground">
                          Notification Frequency
                        </label>
                        <Select
                          value={conditionForm.frequency}
                          onChange={(e) =>
                            setConditionForm({
                              ...conditionForm,
                              frequency: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                        >
                          <option value="once">
                            Once per signal (Auto-resolves when metrics
                            normalize. Best for reducing noise)
                          </option>
                          <option value="always">
                            Always (Notify on every evaluation tick as long as
                            threshold breaches)
                          </option>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Right: Schema Documentation (Span 1) */}
                  <div className="lg:col-span-1 border-l border-border/40 pl-6 flex flex-col h-full">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                      <BookOpen className="h-4 w-4 text-blue-500" /> Schema
                      Explorer
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Available query attributes for the{" "}
                      <strong>{conditionForm.target}</strong> collection. Use
                      these to build your MongoDB JSON filter.
                    </p>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {SCHEMA_DOCS[conditionForm.target]?.map((doc, i) => (
                        <div
                          key={i}
                          className="bg-card border border-border/60 p-3 rounded-lg shadow-sm hover:border-blue-500/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-xs text-blue-500 font-bold">
                              {doc.field}
                            </code>
                            <Badge
                              variant="secondary"
                              className="text-[9px] uppercase font-mono"
                            >
                              {doc.type}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.desc}
                          </p>
                        </div>
                      ))}
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/40 mt-4">
                        <h4 className="text-xs font-bold mb-2">
                          Example Evaluation
                        </h4>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          If you write <code>{`{ "status": 500 }`}</code>, the
                          engine will trigger if the count of 500 errors exceeds
                          your threshold in the last {conditionForm.windowMins}{" "}
                          minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsConditionModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary min-w-[140px] text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" /> Saving...
                      </>
                    ) : editingId ? (
                      "Update Condition"
                    ) : (
                      "Deploy Condition"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      <Dialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Condition?"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              Deleting <strong>{deleteModal?.name}</strong> will halt all
              monitoring for this rule and permanently delete its incident
              history.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCondition}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}{" "}
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
