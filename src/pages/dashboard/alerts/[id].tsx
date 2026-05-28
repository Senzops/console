import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import Editor from "@monaco-editor/react";
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
  Dialog,
  Input,
  DataError,
  Select,
  cn,
} from "../../../components/Core";
import {
  ArrowLeft,
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
  ChevronRight,
  VolumeX,
  Volume2,
  TestTube,
  Bug,
  Cpu,
  Globe,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Enterprise Default Alert Pipelines
const DEFAULT_ALERT_QUERIES: Record<string, string> = {
  logs: '[\n  { "$match": {\n    "level": "error",\n    "message": { "$regex": "timeout", "$options": "i" }\n  } }\n]',
  apm: '[\n  { "$match": {\n    "duration": { "$gt": 2000 },\n    "status": { "$gte": 500 }\n  } }\n]',
  vps: '[\n  { "$match": {\n    "metrics.cpu.usagePercent": { "$gt": 90 }\n  } }\n]',
  database:
    '[\n  { "$match": {\n    "latency.read.avg": { "$gt": 150 }\n  } }\n]',
  uptime: '[\n  { "$match": {\n    "status": "down"\n  } }\n]',
  rum: '[\n  { "$match": {\n    "vitals.lcp": { "$gt": 2500 }\n  } }\n]',
  task: '[\n  { "$match": {\n    "status": "failed"\n  } }\n]',
  errors: '[\n  { "$match": {\n    "status": "unresolved"\n  } }\n]',
  runtime: '[\n  { "$match": {\n    "eventLoopLagMs": { "$gt": 100 }\n  } }\n]',
  web: '[\n  { "$match": {\n    "path": "/"\n  } }\n]',
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
    case "errors":
      return <Bug className="h-4 w-4 text-red-500" />;
    case "runtime":
      return <Cpu className="h-4 w-4 text-violet-500" />;
    case "web":
      return <Globe className="h-4 w-4 text-cyan-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

// --- Reusable Schema Explorer Component ---
const SchemaTreeNode = ({ node }: { node: any }) => {
  const [isOpen, setIsOpen] = useState(true);
  const childKeys = Object.keys(node.children || {});
  const hasChildren = childKeys.length > 0;

  return (
    <div className="ml-1">
      <div
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors",
          hasChildren ? "cursor-pointer hover:bg-muted/50" : "",
        )}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform text-muted-foreground",
              isOpen ? "rotate-90" : "",
            )}
          />
        ) : (
          <div className="w-3.5 h-3.5 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-bold text-primary truncate">
              {node.name}
            </code>
            {!hasChildren && node.type && (
              <Badge
                variant="secondary"
                className="text-[9px] uppercase font-mono tracking-wider opacity-80 shrink-0"
              >
                {node.type}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="border-l border-border/40 ml-3.5 pl-1 my-0.5">
          {childKeys.map((key) => (
            <SchemaTreeNode key={key} node={node.children[key]} />
          ))}
        </div>
      )}
    </div>
  );
};

export const SchemaExplorer = ({ target, schemaData }: any) => {
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const schemaList = schemaData?.schema?.[target] || [];

  const tree = useMemo(() => {
    const root = { children: {} as Record<string, any> };
    schemaList.forEach((item: any) => {
      const parts = item.field.split(".");
      let current: any = root; // FIX: Typed as any to support dynamic schema mapping
      parts.forEach((part: string, i: number) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: parts.slice(0, i + 1).join("."),
            children: {},
          };
        }
        current = current.children[part];
        if (i === parts.length - 1) {
          current.type = item.type;
          current.desc = item.desc;
        }
      });
    });
    return root.children;
  }, [schemaList]);

  return (
    <div className="flex flex-col h-full border-l border-border/40 bg-muted/5">
      <div className="p-4 border-b border-border/40 shrink-0 bg-background/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Schema Explorer
          </h3>
          <div className="flex items-center bg-muted p-0.5 rounded-md border border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("tree")}
              className={cn(
                "h-6 px-2 text-[10px] rounded-sm",
                viewMode === "tree"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Tree
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-6 px-2 text-[10px] rounded-sm",
                viewMode === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground",
              )}
            >
              List
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Available attributes for <strong>{target}</strong>. Use these to build
          your MongoDB Aggregation Pipeline filter.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {schemaList.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No schema available.
          </p>
        ) : viewMode === "tree" ? (
          Object.values(tree).map((node: any) => (
            <SchemaTreeNode key={node.name} node={node} />
          ))
        ) : (
          <div className="space-y-2">
            {schemaList.map((doc: any, i: number) => (
              <div
                key={i}
                className="bg-card border border-border/60 p-3 rounded-lg shadow-sm hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs text-primary font-bold break-all">
                    {doc.field}
                  </code>
                  <Badge
                    variant="secondary"
                    className="text-[9px] uppercase font-mono opacity-80 shrink-0 ml-2"
                  >
                    {doc.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{doc.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  info: "text-gray-500 bg-gray-500/10 border-gray-500/20",
};

// --- Conditions Table ---
const ConditionsTable = ({
  conditions,
  onEdit,
  onDelete,
  onMute,
  onUnmute,
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
              <th className="px-6 py-3 font-medium w-24">Severity</th>
              <th className="px-6 py-3 font-medium w-32">Target</th>
              <th className="px-6 py-3 font-medium w-48">Trigger Logic</th>
              <th className="px-6 py-3 font-medium w-32">Frequency</th>
              <th className="px-6 py-3 text-right font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((cond: any) => {
              const isMuted = cond.muteUntil && new Date(cond.muteUntil) > new Date();
              const sevStyle = SEVERITY_COLORS[cond.severity] || SEVERITY_COLORS.high;
              return (
                <tr
                  key={cond._id}
                  className={cn("hover:bg-muted/20 group transition-colors", isMuted ? "opacity-60" : "")}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{cond.name}</span>
                      {isMuted && (
                        <Badge variant="outline" className="text-[9px] bg-muted/50 text-muted-foreground border-border/60">
                          <VolumeX className="h-3 w-3 mr-1" /> MUTED
                        </Badge>
                      )}
                    </div>
                    {cond.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-sm">{cond.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${sevStyle}`}>
                      {(cond.severity || "high").toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 capitalize text-xs">
                      {getTargetIcon(cond.target)} {cond.target}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    COUNT{" "}
                    {({ gt: ">", lt: "<", eq: "==", gte: ">=", lte: "<=", neq: "!=" } as any)[cond.threshold.operator] || cond.threshold.operator}{" "}
                    {cond.threshold.value}{" "}
                    <span className="opacity-50">in {cond.threshold.windowMins}m</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {cond.frequency}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {isMuted ? (
                        <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => onUnmute(cond._id)} title="Unmute">
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => onMute(cond._id, 60)} title="Mute for 1 hour">
                          <VolumeX className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(cond)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(cond)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={6}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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
  onNavigateIncident,
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
              <th className="px-6 py-3 font-medium w-28">Status</th>
              <th className="px-6 py-3 font-medium w-24">Severity</th>
              <th className="px-6 py-3 font-medium w-28">Incident</th>
              <th className="px-6 py-3 font-medium w-full">Origin Condition</th>
              <th className="px-6 py-3 text-right font-medium">Value</th>
              <th className="px-6 py-3 text-right font-medium">Opened</th>
              <th className="px-6 py-3 text-right font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((incident: any) => {
              const sevStyle = SEVERITY_COLORS[incident.severity || (incident.conditionId?.severity) || "high"] || SEVERITY_COLORS.high;
              return (
                <tr
                  key={incident._id}
                  className={`hover:bg-muted/20 group transition-colors cursor-pointer ${incident.status === "open" ? "bg-destructive/[0.03]" : ""}`}
                >
                  <td className="px-6 py-4" onClick={() => onNavigateIncident(incident._id)}>
                    {incident.status === "open" ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase font-bold tracking-wider">
                        <span className="relative flex h-1.5 w-1.5 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
                        </span>
                        FIRING
                      </Badge>
                    ) : incident.status === "acknowledged" ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-bold tracking-wider">ACKED</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">RESOLVED</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4" onClick={() => onNavigateIncident(incident._id)}>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${sevStyle}`}>
                      {(incident.severity || incident.conditionId?.severity || "high").toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary font-bold" onClick={() => onNavigateIncident(incident._id)}>
                    {incident.incidentNumber ? `INC-${String(incident.incidentNumber).padStart(4, "0")}` : "—"}
                  </td>
                  <td className="px-6 py-4" onClick={() => onNavigateIncident(incident._id)}>
                    <div className="flex items-center gap-2">
                      {incident.conditionId?.target ? getTargetIcon(incident.conditionId.target) : <Activity className="h-4 w-4" />}
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {incident.conditionId?.name || "Deleted Condition"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-bold" onClick={() => onNavigateIncident(incident._id)}>
                    {incident.triggerValue}
                  </td>
                  <td
                    className="px-6 py-4 text-right text-xs text-muted-foreground font-mono"
                    title={format(new Date(incident.openedAt), "PPpp")}
                    onClick={() => onNavigateIncident(incident._id)}
                  >
                    {formatDistanceToNow(new Date(incident.openedAt))} ago
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {incident.status === "open" && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => onUpdateStatus(incident._id, "acknowledged")} className="h-7 text-[10px] border-amber-500/50 hover:bg-amber-500/10 text-amber-500">ACK</Button>
                        <Button size="sm" variant="outline" onClick={() => onUpdateStatus(incident._id, "resolved")} className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500">RESOLVE</Button>
                      </div>
                    )}
                    {incident.status === "acknowledged" && (
                      <Button size="sm" variant="outline" onClick={() => onUpdateStatus(incident._id, "resolved")} className="h-7 text-[10px] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500">RESOLVE</Button>
                    )}
                    {incident.status === "resolved" && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {incident.resolvedAt ? format(new Date(incident.resolvedAt), "MMM d, HH:mm") : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={7}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={7}
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
    description: "",
    target: "apm",
    queryStr: DEFAULT_ALERT_QUERIES["apm"],
    operator: "gt",
    value: 10,
    windowMins: 5,
    frequency: "once",
    severity: "high",
    labels: "",
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // --- Data Fetching ---
  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/alerts/policies/${id}` : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  // Add the dynamic Schema hook
  const { data: schemaData } = useSWR(token ? "/schema" : null, fetcher);

  // Update snippet when target changes, ONLY if creating a new condition
  useEffect(() => {
    if (!editingId) {
      setConditionForm((prev) => ({
        ...prev,
        queryStr: DEFAULT_ALERT_QUERIES[prev.target] || "[]",
      }));
    }
  }, [conditionForm.target, editingId]);

  // --- Form Handlers ---
  const openCreateCondition = () => {
    setEditingId(null);
    setTestResult(null);
    setConditionForm({
      name: "",
      description: "",
      target: "apm",
      queryStr: DEFAULT_ALERT_QUERIES["apm"],
      operator: "gt",
      value: 10,
      windowMins: 5,
      frequency: "once",
      severity: "high",
      labels: "",
    });
    setIsConditionModalOpen(true);
  };

  const openEditCondition = (c: any) => {
    setEditingId(c._id);
    setTestResult(null);
    setConditionForm({
      name: c.name,
      description: c.description || "",
      target: c.target,
      queryStr: JSON.stringify(c.query, null, 2),
      operator: c.threshold.operator,
      value: c.threshold.value,
      windowMins: c.threshold.windowMins,
      frequency: c.frequency,
      severity: c.severity || "high",
      labels: (c.labels || []).join(", "),
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
        description: conditionForm.description,
        target: conditionForm.target,
        query: parsedQuery,
        threshold: {
          operator: conditionForm.operator,
          value: Number(conditionForm.value),
          windowMins: Number(conditionForm.windowMins),
        },
        frequency: conditionForm.frequency,
        severity: conditionForm.severity,
        labels: conditionForm.labels
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
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

  const handleTestCondition = async () => {
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(conditionForm.queryStr);
    } catch {
      toast.error("Invalid JSON MQL. Please check syntax.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/alerts/conditions/test", {
        target: conditionForm.target,
        query: parsedQuery,
        threshold: {
          operator: conditionForm.operator,
          value: Number(conditionForm.value),
          windowMins: Number(conditionForm.windowMins),
        },
      });
      setTestResult(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleMuteCondition = async (conditionId: string, durationMins: number) => {
    try {
      await api.post(`/alerts/conditions/${conditionId}/mute`, { durationMins });
      mutate();
      toast.success(`Condition muted for ${durationMins} minutes.`);
    } catch {
      toast.error("Failed to mute condition.");
    }
  };

  const handleUnmuteCondition = async (conditionId: string) => {
    try {
      await api.post(`/alerts/conditions/${conditionId}/unmute`);
      mutate();
      toast.success("Condition unmuted.");
    } catch {
      toast.error("Failed to unmute condition.");
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
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Alert Policy...</p>
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

  const { policy, conditions, incidents } = data;
  const monacoTheme =
    theme === "light" || theme === "latte" ? "light" : "vs-dark";

  return (
    <>
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
            onMute={handleMuteCondition}
            onUnmute={handleUnmuteCondition}
            isValidating={isValidating}
            mutate={mutate}
          />
          <IncidentsTable
            incidents={incidents}
            onUpdateStatus={handleUpdateIncident}
            onNavigateIncident={(incidentId: string) => router.push(`/dashboard/incidents/${incidentId}`)}
            isValidating={isValidating}
            mutate={mutate}
          />
        </div>
      </div>

      {/* --- MODAL: MASSIVE CONDITION BUILDER --- */}
      {isConditionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-background/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !isSubmitting && setIsConditionModalOpen(false)}
          />

          <Card className="w-full max-w-[1600px] h-full md:h-[95vh] flex flex-col border-border/60 md:rounded-xl shadow-2xl bg-background overflow-hidden relative z-10">
            {/* Header */}
            <div className="h-14 border-b border-border/40 bg-muted/20 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />{" "}
                {editingId ? "Edit Condition" : "Build Condition"}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveCondition}
                  disabled={isSubmitting}
                  className="h-8 text-xs font-semibold bg-primary shadow-sm hidden sm:flex"
                >
                  {isSubmitting ? (
                    <Spinner className="h-3 w-3" />
                  ) : editingId ? (
                    "Update Condition"
                  ) : (
                    "Deploy Condition"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsConditionModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive ml-1 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Enterprise Two-Pane Layout */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-card overflow-hidden">
              {/* Left Panel: Scrollable Configuration & Editor */}
              <div className="w-full md:w-2/3 flex flex-col border-r border-border/40 h-full shrink-0 md:shrink overflow-y-auto bg-background">
                {/* Control Row */}
                <div className="p-4 border-b border-border/40 space-y-4 bg-muted/10 shrink-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="space-y-1 w-full sm:flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                        className="h-9 text-sm bg-background border-border/60 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1 w-full sm:w-48">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Target Telemetry
                      </label>
                      <Select
                        value={conditionForm.target}
                        onChange={(e) =>
                          setConditionForm({
                            ...conditionForm,
                            target: e.target.value,
                            queryStr:
                              DEFAULT_ALERT_QUERIES[e.target.value] || "[]",
                          })
                        }
                        disabled={isSubmitting}
                        className="capitalize h-9 text-sm bg-background border-border/60 shadow-sm"
                      >
                        <option value="apm">Backend APM</option>
                        <option value="logs">Logs</option>
                        <option value="database">Database</option>
                        <option value="vps">VPS Infra</option>
                        <option value="task">Tasks</option>
                        <option value="rum">Web RUM</option>
                        <option value="uptime">Uptime</option>
                        <option value="errors">Errors</option>
                        <option value="runtime">Runtime Metrics</option>
                        <option value="web">Web Analytics</option>
                      </Select>
                    </div>
                    <div className="space-y-1 w-full sm:w-36">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Severity
                      </label>
                      <Select
                        value={conditionForm.severity}
                        onChange={(e) =>
                          setConditionForm({
                            ...conditionForm,
                            severity: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                        className="h-9 text-sm bg-background border-border/60 shadow-sm"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="info">Info</option>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="space-y-1 w-full sm:flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Description <span className="font-normal opacity-60">(Optional)</span>
                      </label>
                      <Input
                        placeholder="What does this condition monitor?"
                        value={conditionForm.description}
                        onChange={(e) =>
                          setConditionForm({
                            ...conditionForm,
                            description: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                        className="h-9 text-sm bg-background border-border/60 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1 w-full sm:w-64">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Labels <span className="font-normal opacity-60">(Comma-separated)</span>
                      </label>
                      <Input
                        placeholder="e.g., production, api, critical-path"
                        value={conditionForm.labels}
                        onChange={(e) =>
                          setConditionForm({
                            ...conditionForm,
                            labels: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                        className="h-9 text-sm bg-background border-border/60 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Editor Area */}
                <div className="p-4 shrink-0">
                  <div
                    className={cn(
                      "flex flex-col relative border rounded-xl overflow-hidden shadow-sm",
                      monacoTheme === "light"
                        ? "bg-background border-border/60"
                        : "bg-[#1e1e1e] border-[#444]",
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-2 border-b flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2",
                        monacoTheme === "light"
                          ? "bg-muted/50 border-border/40"
                          : "bg-[#2d2d2d] border-[#444]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                          monacoTheme === "light"
                            ? "text-foreground"
                            : "text-gray-300",
                        )}
                      >
                        <Terminal className="h-3 w-3 text-primary" />{" "}
                        Aggregation Pipeline Filter
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" /> Tenant Sandbox
                        Active
                      </div>
                    </div>
                    {/* Native Fixed Height for Monaco to prevent Flexbox Collapse */}
                    <div className="w-full relative h-[250px] sm:h-[300px]">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme={monacoTheme}
                        value={conditionForm.queryStr}
                        onChange={(val) =>
                          setConditionForm({
                            ...conditionForm,
                            queryStr: val || "[]",
                          })
                        }
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 13,
                          formatOnPaste: true,
                          tabSize: 2,
                          padding: { top: 16 },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Threshold Logic Area */}
                <div className="px-4 pb-4 shrink-0">
                  <div className="bg-muted/10 border border-border/60 rounded-xl p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-500" /> Trigger
                      Thresholds
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                          className="bg-background shadow-sm"
                        >
                          <option value="gt">Greater Than (&gt;)</option>
                          <option value="gte">Greater or Equal (&gt;=)</option>
                          <option value="lt">Less Than (&lt;)</option>
                          <option value="lte">Less or Equal (&lt;=)</option>
                          <option value="eq">Exactly (==)</option>
                          <option value="neq">Not Equal (!=)</option>
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
                          className="bg-background shadow-sm"
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
                          className="bg-background shadow-sm"
                        >
                          <option value="1">Last 1 Minute</option>
                          <option value="5">Last 5 Minutes</option>
                          <option value="15">Last 15 Minutes</option>
                          <option value="60">Last 1 Hour</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Frequency
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
                          className="bg-background shadow-sm"
                        >
                          <option value="once">Notify Once</option>
                          <option value="always">Notify Always</option>
                        </Select>
                      </div>
                    </div>

                    {/* Test & Result Row */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestCondition}
                        disabled={isTesting}
                        className="h-8 text-xs"
                      >
                        {isTesting ? <Spinner className="h-3 w-3 mr-1.5" /> : <TestTube className="h-3.5 w-3.5 mr-1.5" />}
                        Test Condition
                      </Button>
                      {testResult && (
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium",
                          testResult.breached
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {testResult.breached ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          Count: <span className="font-mono font-bold">{testResult.count}</span>
                          {" — "}
                          {testResult.breached ? "Would fire" : "Would not fire"}
                          {testResult.error && <span className="text-destructive"> ({testResult.error})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveCondition}
                  disabled={isSubmitting}
                  className="m-4 mt-0 h-10 font-bold bg-primary sm:hidden"
                >
                  {isSubmitting ? (
                    <Spinner className="h-4 w-4" />
                  ) : editingId ? (
                    "Update Condition"
                  ) : (
                    "Deploy Condition"
                  )}
                </Button>
              </div>

              {/* Right Panel: Locked Schema Explorer */}
              <div className="w-full md:w-1/3 flex flex-col h-[400px] md:h-full bg-muted/5 overflow-hidden border-t md:border-t-0 border-border/40">
                <SchemaExplorer
                  target={conditionForm.target}
                  schemaData={schemaData}
                />
              </div>
            </div>
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
    </>
  );
}
