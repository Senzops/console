import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
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
  Select,
  DataError,
  cn,
} from "../../../components/Core";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutTemplate,
  Plus,
  Save,
  Edit3,
  Trash2,
  Maximize,
  X,
  GripHorizontal,
  Terminal,
  Server,
  Box,
  MonitorSmartphone,
  Workflow,
  Database,
  Activity,
  RefreshCw,
  AlertTriangle,
  Play,
  BookOpen,
  CheckCircle,
  Zap,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { SmartAnimatedValue } from "@/components/Tween";

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const postFetcher = (url: string, payload: any) =>
  api.post(url, payload).then((res) => res.data);

// --- Helpers & Constants ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num.toString();
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

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

const DEFAULT_QUERIES: Record<string, string> = {
  logs: '{\n  "level": "error",\n  "message": { "$regex": "timeout", "$options": "i" }\n}',
  apm: '{\n  "duration": { "$gt": 2000 },\n  "status": { "$gte": 500 }\n}',
  vps: '{\n  "metrics.cpu.usagePercent": { "$gt": 90 }\n}',
  database: '{\n  "latency": { "$gt": 150 }\n}',
  uptime: '{\n  "status": "down"\n}',
  rum: '{\n  "metrics.lcp": { "$gt": 2500 }\n}',
  task: '{\n  "status": "failed"\n}',
};

const QUICK_TEMPLATES: Record<string, any[]> = {
  apm: [
    {
      label: "Avg Latency",
      config: { viz: "area", agg: "avg", field: "duration", group: "" },
      query: "{}",
    },
    {
      label: "Errors by Service",
      config: { viz: "bar", agg: "count", field: "", group: "serviceId" },
      query: '{\n  "status": { "$gte": 500 }\n}',
    },
    {
      label: "Slow Traces",
      config: { viz: "table", agg: "count", field: "", group: "" },
      query: '{\n  "duration": { "$gt": 1500 }\n}',
    },
  ],
  logs: [
    {
      label: "Errors Trend",
      config: { viz: "line", agg: "count", field: "", group: "" },
      query: '{\n  "level": "error"\n}',
    },
    {
      label: "Severity Split",
      config: { viz: "pie", agg: "count", field: "", group: "level" },
      query: "{}",
    },
  ],
  vps: [
    {
      label: "CPU Usage",
      config: {
        viz: "line",
        agg: "avg",
        field: "metrics.cpu.usagePercent",
        group: "vpsId",
      },
      query: "{}",
    },
    {
      label: "RAM Usage",
      config: {
        viz: "area",
        agg: "max",
        field: "metrics.memory.usagePercent",
        group: "",
      },
      query: "{}",
    },
  ],
  database: [
    {
      label: "Avg Latency",
      config: { viz: "line", agg: "avg", field: "latency", group: "" },
      query: "{}",
    },
    {
      label: "Ops/sec",
      config: { viz: "area", agg: "avg", field: "ops", group: "dbId" },
      query: "{}",
    },
  ],
};

// --- Recharts Tooltip Formatting ---
const formatAxisDate = (str: string, range: string) => {
  if (!str) return "";
  const date = new Date(str);
  return date.toLocaleString(undefined, {
    month: range === "1h" ? undefined : "short",
    day: range === "1h" ? undefined : "numeric",
    hour: "numeric",
    minute: range === "1h" ? "2-digit" : undefined,
  });
};

const CustomTooltip = ({ active, payload, label, range }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        {label && (
          <p className="font-semibold text-foreground mb-1">
            {formatAxisDate(label, range)}
          </p>
        )}
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2"
            style={{ color: entry.color || entry.fill }}
          >
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">
              {typeof entry.value === "number"
                ? entry.value.toFixed(2)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Sub-Component: Chart Renderer ---
const ChartRenderer = ({ data, config, visualization, range, isMono }: any) => {
  if (
    !data ||
    (Array.isArray(data) && data.length === 0 && visualization !== "billboard")
  ) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium">
        No data available
      </div>
    );
  }

  const getColor = (index: number) =>
    isMono
      ? "hsl(var(--chart-mono))"
      : CHART_COLORS[index % CHART_COLORS.length];

  if (visualization === "billboard") {
    const val =
      Array.isArray(data) && data.length > 0 ? data[0].value : data.value || 0;
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-6xl font-bold tracking-tighter text-foreground">
          <SmartAnimatedValue value={formatNumber(val || 0)} />
        </div>
      </div>
    );
  }

  if (visualization === "pie") {
    return (
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="focus:outline-none"
      >
        <PieChart className="focus:outline-none" style={{ outline: "none" }}>
          <RechartsTooltip content={<CustomTooltip range={range} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
            className="focus:outline-none"
            style={{ outline: "none" }}
          >
            {data.map((_: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(index)}
                style={{ outline: "none" }}
                className="focus:outline-none"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (visualization === "table") {
    return (
      <div className="w-full h-full overflow-auto rounded-md border border-border/40 bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              {Object.keys(data[0] || {}).map((k) => (
                <th key={k} className="px-4 py-3 font-semibold">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                {Object.values(row).map((val: any, j: number) => (
                  <td
                    key={j}
                    className="px-4 py-2 font-mono text-xs truncate max-w-[300px]"
                  >
                    {typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Time-Series (Area, Line, Bar)
  const keys = config.groupBy
    ? Object.keys(data[0] || {}).filter((k) => k !== "time")
    : ["value"];

  return (
    <ResponsiveContainer width="100%" height="100%">
      {visualization === "area" ? (
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis dataKey="time" hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
            content={<CustomTooltip range={range} />}
          />
          {keys.map((k, i) => (
            <React.Fragment key={k}>
              <defs>
                <linearGradient id={`color-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor(i)} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={getColor(i)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={k}
                stroke={getColor(i)}
                fill={`url(#color-${k})`}
                strokeWidth={2}
              />
            </React.Fragment>
          ))}
        </AreaChart>
      ) : visualization === "bar" ? (
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis dataKey="time" hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
            content={<CustomTooltip range={range} />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          />
          {keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={getColor(i)}
              radius={config.groupBy ? [0, 0, 0, 0] : [2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      ) : (
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis dataKey="time" hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
            content={<CustomTooltip range={range} />}
          />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={getColor(i)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

// --- Sub-Component: Single Widget Wrapper (Strict ApmView Parity) ---
const WidgetWrapper = ({
  widget,
  layoutNode,
  range,
  isEditing,
  isMono,
  onEdit,
  onDelete,
  onResizeStart,
  onDragStart,
  onDrop,
  draggedId,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { data, error, isValidating } = useSWR(
    `/views/widgets/${widget._id}/data?range=${range}`,
    fetcher,
    { refreshInterval: 60000 },
  );

  const actions = isEditing ? (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => onEdit(widget)}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:bg-destructive/10 transition-colors"
        onClick={() => onDelete(widget._id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-1 shrink-0">
      {isValidating && (
        <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin mr-1" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:bg-muted/50 shrink-0 transition-colors"
        onClick={() => setIsMaximized(!isMaximized)}
      >
        {isMaximized ? (
          <X className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const Header = (
    <CardHeader
      className={`pt-3 px-4 pb-0 flex flex-row items-center justify-between space-y-0 h-11 shrink-0 bg-transparent ${isEditing ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      draggable={isEditing}
      onDragStart={(e) => onDragStart(e, layoutNode.i)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => onDrop(e, layoutNode.i)}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {isEditing && (
          <GripHorizontal className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        )}
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 truncate">
          {getTargetIcon(widget.target)} {widget.name}
        </CardTitle>
      </div>
      {actions}
    </CardHeader>
  );

  const Content = (
    <Card
      className={`flex flex-col relative overflow-hidden border-border/60 shadow-sm transition-all duration-300 ${isMaximized ? "fixed inset-4 z-[100] animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-full"} ${isEditing && draggedId === layoutNode.i ? "opacity-40 scale-95" : "opacity-100 scale-100"}`}
    >
      {Header}
      <CardContent className="flex-1 min-h-0 relative px-0 pb-0 overflow-hidden">
        <div className="w-full h-full relative px-4 pb-4">
          {!data && !error ? (
            <div className="h-full flex items-center justify-center">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-xs text-destructive">
              Failed to load data
            </div>
          ) : (
            <ChartRenderer
              data={data.data}
              config={widget.config}
              visualization={widget.visualization}
              range={range}
              isMono={isMono}
            />
          )}
        </div>
      </CardContent>

      {/* Native Fluid Resize Handle */}
      {isEditing && !isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 text-muted-foreground/30 hover:text-primary transition-colors z-20"
          onMouseDown={(e) =>
            onResizeStart(e, layoutNode.i, layoutNode.w, layoutNode.h)
          }
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-current rounded-br-sm" />
        </div>
      )}
    </Card>
  );

  return (
    <>
      {isMaximized &&
        createPortal(
          <div
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50"
            onClick={() => setIsMaximized(false)}
          />,
          document.body,
        )}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

// --- Main Canvas Dashboard ---
export default function CustomDashboardView() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { theme, isMono } = useTheme();

  const [range, setRange] = useState("24h");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dashboard Deletion
  const [isDeleteViewOpen, setIsDeleteViewOpen] = useState(false);
  const [isDeletingView, setIsDeletingView] = useState(false);

  // Layout & Resizing State
  const [localLayout, setLocalLayout] = useState<any[]>([]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Builder Form & Editor
  const [builderForm, setBuilderForm] = useState({
    name: "",
    target: "apm",
    visualization: "line",
    queryStr: DEFAULT_QUERIES["apm"] || "{}",
    config: { aggregate: "count", aggregateField: "", groupBy: "" },
  });
  const editorRef = useRef<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/views/${id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: schemaData } = useSWR(token ? "/views/schema" : null, fetcher);

  useEffect(() => {
    if (data?.view?.layout) setLocalLayout([...data.view.layout]);
  }, [data?.view?.layout, isEditing]);

  // Native CSS Grid Resizing Engine
  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const colDelta = Math.round((e.clientX - resizing.startX) / 100);
      const rowDelta = Math.round((e.clientY - resizing.startY) / 120);
      const newW = Math.max(3, Math.min(12, resizing.startW + colDelta));
      const newH = Math.max(2, Math.min(8, resizing.startH + rowDelta));
      setLocalLayout((prev) =>
        prev.map((n) => (n.i === resizing.id ? { ...n, w: newW, h: newH } : n)),
      );
    };
    const handleMouseUp = () => setResizing(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

  const toggleEditMode = async () => {
    if (isEditing) {
      setIsSaving(true);
      try {
        await api.put(`/views/${id}`, { layout: localLayout });
        mutate();
        toast.success("Dashboard layout saved.");
      } catch (err) {
        toast.error("Failed to save layout.");
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const deleteView = async () => {
    setIsDeletingView(true);
    try {
      await api.delete(`/views/${id}`);
      toast.success("Dashboard deleted.");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Failed to delete dashboard.");
      setIsDeletingView(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditing) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggedWidgetId(widgetId);
  };
  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) return;
    const newLayout = [...localLayout];
    const draggedIndex = newLayout.findIndex((l) => l.i === draggedWidgetId);
    const targetIndex = newLayout.findIndex((l) => l.i === targetWidgetId);
    const [draggedItem] = newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, draggedItem);
    setLocalLayout(newLayout);
    setDraggedWidgetId(null);
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const applyTemplate = (template: any) => {
    setBuilderForm((prev) => ({
      ...prev,
      visualization: template.config.viz,
      queryStr: template.query,
      config: {
        aggregate: template.config.agg,
        aggregateField: template.config.field,
        groupBy: template.config.group,
      },
    }));
    setTimeout(() => editorRef.current?.setValue(template.query), 50);
  };

  const openCreateWidget = () => {
    setEditingWidgetId(null);
    setBuilderForm({
      name: "",
      target: "apm",
      visualization: "line",
      queryStr: DEFAULT_QUERIES["apm"] || "{}",
      config: { aggregate: "count", aggregateField: "", groupBy: "" },
    });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(
      () => editorRef.current?.setValue(DEFAULT_QUERIES["apm"] || "{}"),
      100,
    );
  };

  const openEditWidget = (w: any) => {
    setEditingWidgetId(w._id);
    setBuilderForm({
      name: w.name,
      target: w.target,
      visualization: w.visualization,
      queryStr: JSON.stringify(w.query, null, 2),
      config: {
        aggregate: w.config.aggregate,
        aggregateField: w.config.aggregateField || "",
        groupBy: w.config.groupBy || "",
      },
    });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(
      () => editorRef.current?.setValue(JSON.stringify(w.query, null, 2)),
      100,
    );
  };

  const runLivePreview = async () => {
    const queryStr = editorRef.current?.getValue() || "{}";
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(queryStr);
    } catch (err) {
      toast.error("Invalid JSON MQL format in Editor.");
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await postFetcher("/views/execute", {
        target: builderForm.target,
        query: parsedQuery,
        visualization: builderForm.visualization,
        config: builderForm.config,
        range,
      });
      setPreviewData(res);
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || "Failed to execute preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const saveWidget = async () => {
    if (!builderForm.name) {
      toast.error("Widget needs a name");
      return;
    }
    const queryStr = editorRef.current?.getValue() || "{}";
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(queryStr);
    } catch (err) {
      toast.error("Invalid JSON MQL format.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        viewId: id,
        name: builderForm.name,
        target: builderForm.target,
        query: parsedQuery,
        visualization: builderForm.visualization,
        config: builderForm.config,
      };
      if (editingWidgetId) {
        await api.put(`/views/widgets/${editingWidgetId}`, payload);
        toast.success("Widget updated!");
      } else {
        const res = await api.post("/views/widgets", payload);
        setLocalLayout(res.data.layout);
        toast.success("Widget added!");
      }
      setIsBuilderOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save widget");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteWidget = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/views/widgets/${deleteModal}`);
      setLocalLayout((prev) => prev.filter((l) => l.i !== deleteModal));
      mutate();
      toast.success("Widget removed.");
      setDeleteModal(null);
    } catch (err) {
      toast.error("Failed to delete widget.");
    }
  };

  if (!data && !error)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Canvas...</p>
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

  const { view, widgets } = data;
  const orderedLayout = isEditing ? localLayout : data?.view?.layout || [];
  const availableTargets = Object.keys(schemaData?.schema || {});

  // Dynamic Theme Logic for IDE Component
  const monacoTheme =
    theme === "light" || theme === "latte" ? "light" : "vs-dark";

  return (
    <DashboardLayout>
      {/* Background blueprint dots during edit mode for professional aesthetic */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ${isEditing ? "opacity-20" : "opacity-0"}`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-32 relative z-10">
        {/* --- Unified Enterprise Header (ALWAYS VISIBLE) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {view.name}
              </h1>
              <Badge
                variant="outline"
                className="border-teal-500/20 text-teal-500 bg-teal-500/10 font-mono text-[10px] font-bold tracking-wider"
              >
                SAVED VIEW
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {view.description || "Custom Dashboard Canvas"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Select
              className="w-32 bg-background h-9 text-xs"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Select>
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
            <div className="h-6 w-px bg-border mx-1 hidden md:block"></div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10 border-destructive/20 bg-background"
              onClick={() => setIsDeleteViewOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* --- Custom HTML5 Grid Engine --- */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 768px) { .responsive-grid-item { grid-column: span 12 !important; } }
        `,
          }}
        />

        <div
          className="grid grid-cols-1 md:grid-cols-12 gap-4 transition-all"
          style={{ gridAutoRows: "120px" }}
        >
          {orderedLayout.map((node: any) => {
            const widget = widgets.find((w: any) => w._id === node.i);
            if (!widget) return null;

            return (
              <div
                key={node.i}
                className="responsive-grid-item transition-all duration-200 ease-in-out"
                style={{
                  gridColumn: `span ${node.w || 4}`,
                  gridRow: `span ${node.h || 3}`,
                }}
              >
                <WidgetWrapper
                  widget={widget}
                  layoutNode={node}
                  range={range}
                  isEditing={isEditing}
                  isMono={isMono}
                  onEdit={openEditWidget}
                  onDelete={(id: string) => setDeleteModal(id)}
                  draggedId={draggedWidgetId}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onResizeStart={(e: any, id: any, w: any, h: any) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setResizing({
                      id,
                      startX: e.clientX,
                      startY: e.clientY,
                      startW: w,
                      startH: h,
                    });
                  }}
                />
              </div>
            );
          })}
          {orderedLayout.length === 0 && !isEditing && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center border border-dashed border-border/60 rounded-xl bg-card/30">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Canvas is Empty
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Enter Edit Mode to start adding widgets to your view.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- FLOATING EDIT MODE DOCK --- */}
      {isEditing ? (
        <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 md:left-[calc(50vw+8rem)] w-[calc(100%-2rem)] max-w-fit bg-card/95 backdrop-blur-md border border-border/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] px-3 py-2.5 md:px-6 md:py-3 rounded-full flex items-center justify-center gap-2 md:gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 md:pr-4 md:border-r border-border/40 shrink-0">
            <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-foreground hidden sm:block">
              Edit Mode
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Button
              onClick={openCreateWidget}
              variant="secondary"
              className="h-8 md:h-9 rounded-full px-3 md:px-5 shadow-sm font-semibold border-none text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />{" "}
              <span className="hidden sm:inline">Add Widget</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setLocalLayout([...(data?.view?.layout || [])]);
              }}
              disabled={isSaving}
              className="h-8 md:h-9 rounded-full px-3 md:px-5 hover:bg-destructive/10 hover:text-destructive font-medium text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={toggleEditMode}
              disabled={isSaving}
              className="h-8 md:h-9 shadow-md bg-primary text-primary-foreground rounded-full px-4 md:px-6 font-semibold transition-all text-xs"
            >
              {isSaving ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />{" "}
                  <span className="hidden sm:inline">Save Layout</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-8 right-8 z-40">
          <Button
            onClick={() => setIsEditing(true)}
            size="icon"
            className="h-12 w-12 rounded-full shadow-2xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border group transition-all"
          >
            <Edit3 className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      )}

      {/* --- ENTERPRISE WIDGET BUILDER MODAL --- */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-background/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !isSaving && setIsBuilderOpen(false)}
          />

          <Card className="w-full max-w-[1600px] h-full md:h-[95vh] flex flex-col border-border/60 md:rounded-xl shadow-2xl bg-background overflow-hidden relative z-10">
            {/* Header */}
            <div className="h-14 border-b border-border/40 bg-muted/20 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-teal-500" />
                <h2 className="text-sm font-bold text-foreground">
                  {editingWidgetId ? "Edit Visualization" : "Data Explorer"}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  className="w-32 bg-background h-8 text-xs font-medium border-border/40 hidden sm:block"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="1h">Last 1 Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </Select>
                <Button
                  variant="outline"
                  onClick={runLivePreview}
                  disabled={isPreviewLoading}
                  className="h-8 text-xs font-semibold shadow-sm bg-background"
                >
                  {isPreviewLoading ? (
                    <Spinner className="h-3 w-3 sm:mr-2" />
                  ) : (
                    <Play className="h-3 w-3 sm:mr-2 fill-current" />
                  )}{" "}
                  <span className="hidden sm:inline">Run Query</span>
                </Button>
                <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
                <Button
                  onClick={saveWidget}
                  disabled={isSaving || !previewData}
                  className="h-8 text-xs font-semibold bg-primary shadow-sm hidden sm:flex"
                >
                  {isSaving ? (
                    <Spinner className="h-3 w-3" />
                  ) : editingWidgetId ? (
                    "Update Widget"
                  ) : (
                    "Save to Dashboard"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsBuilderOpen(false)}
                  disabled={isSaving}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive ml-1 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Enterprise Two-Pane Layout */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-card overflow-y-auto md:overflow-hidden">
              {/* Left Panel: Fixed Layout (Editor Top, Preview Bottom) */}
              <div className="w-full md:w-2/3 flex flex-col border-r border-border/40 h-auto md:h-full shrink-0 md:shrink">
                {/* Editor Area (Top Half) */}
                <div className="flex-1 flex flex-col relative min-h-[300px] border-b border-border/40 bg-background">
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
                      <Terminal className="h-3 w-3 text-blue-500" /> Filter
                      Engine (MQL)
                    </span>
                    {QUICK_TEMPLATES[builderForm.target] && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px]",
                            monacoTheme === "light"
                              ? "text-muted-foreground"
                              : "text-gray-400",
                          )}
                        >
                          <Zap className="h-3 w-3 inline text-amber-500" />{" "}
                          Templates:
                        </span>
                        {QUICK_TEMPLATES[builderForm.target].map((t, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="cursor-pointer text-[9px] hover:bg-primary hover:text-primary-foreground transition-colors border border-border/60 shadow-sm"
                            onClick={() => applyTemplate(t)}
                          >
                            {t.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 w-full relative",
                      monacoTheme === "light"
                        ? "bg-background"
                        : "bg-[#1e1e1e]",
                    )}
                  >
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      theme={monacoTheme}
                      value={builderForm.queryStr}
                      onMount={handleEditorMount}
                      onChange={(val) =>
                        setBuilderForm({
                          ...builderForm,
                          queryStr: val || "{}",
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

                {/* Live Preview Area (Bottom Half) */}
                <div className="h-[400px] md:h-[45%] bg-background p-4 sm:p-6 flex flex-col relative shrink-0">
                  <div className="h-full w-full relative flex flex-col rounded-lg border border-border/60 bg-card/50 overflow-hidden">
                    {!previewData && !previewError && !isPreviewLoading ? (
                      <div className="m-auto text-center flex flex-col items-center">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-foreground">
                          Awaiting Execution
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Write your MQL filter above and click Run Query.
                        </p>
                      </div>
                    ) : isPreviewLoading ? (
                      <div className="m-auto">
                        <Spinner className="h-8 w-8 text-teal-500" />
                      </div>
                    ) : previewError ? (
                      <div className="m-auto text-destructive text-sm font-mono text-center flex flex-col items-center p-4">
                        <AlertTriangle className="h-8 w-8 mb-3" />
                        {previewError}
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 w-full p-4">
                        <ChartRenderer
                          data={previewData?.data}
                          config={builderForm.config}
                          visualization={builderForm.visualization}
                          range={range}
                          isMono={isMono}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Scrollable Options */}
              <div className="w-full md:w-1/3 flex flex-col h-auto md:h-full bg-muted/5 md:overflow-y-auto">
                <div className="p-5 space-y-6">
                  {/* Source & Name */}
                  <div className="space-y-4 pb-5 border-b border-border/40">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Widget Title
                      </label>
                      <Input
                        placeholder="e.g., API Latency Trend"
                        value={builderForm.name}
                        onChange={(e) =>
                          setBuilderForm({
                            ...builderForm,
                            name: e.target.value,
                          })
                        }
                        className="h-9 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Target Data Source
                      </label>
                      <Select
                        value={builderForm.target}
                        onChange={(e) => {
                          const newTarget = e.target.value;
                          setBuilderForm((prev) => ({
                            ...prev,
                            target: newTarget,
                            queryStr: DEFAULT_QUERIES[newTarget] || "{}",
                            config: {
                              aggregate: "count",
                              aggregateField: "",
                              groupBy: "",
                            },
                          }));
                          setTimeout(
                            () =>
                              editorRef.current?.setValue(
                                DEFAULT_QUERIES[newTarget] || "{}",
                              ),
                            50,
                          );
                          setPreviewData(null);
                        }}
                        className="capitalize h-9 text-sm bg-background"
                      >
                        <option value="apm">Backend APM</option>
                        <option value="logs">Logs</option>
                        <option value="database">Database</option>
                        <option value="vps">VPS Infra</option>
                        <option value="task">Tasks</option>
                        <option value="rum">Web RUM</option>
                        <option value="uptime">Uptime</option>
                      </Select>
                    </div>
                  </div>

                  {/* Display Config */}
                  <div className="space-y-4 pb-5 border-b border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <LayoutTemplate className="h-3.5 w-3.5 text-orange-500" />{" "}
                      Visualization Options
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Chart Type
                      </label>
                      <Select
                        value={builderForm.visualization}
                        onChange={(e) =>
                          setBuilderForm({
                            ...builderForm,
                            visualization: e.target.value,
                          })
                        }
                        className="h-9 text-sm bg-background"
                      >
                        <option value="line">Line Chart</option>
                        <option value="area">Area Chart</option>
                        <option value="bar">Bar Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="billboard">Billboard Number</option>
                        <option value="table">Data Table</option>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Math
                        </label>
                        <Select
                          value={builderForm.config.aggregate}
                          onChange={(e) =>
                            setBuilderForm({
                              ...builderForm,
                              config: {
                                ...builderForm.config,
                                aggregate: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-sm bg-background"
                        >
                          <option value="count">Count Rows</option>
                          <option value="avg">Average</option>
                          <option value="sum">Sum</option>
                          <option value="max">Max</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Target Field
                        </label>
                        <Input
                          placeholder="e.g. duration"
                          value={builderForm.config.aggregateField}
                          onChange={(e) =>
                            setBuilderForm({
                              ...builderForm,
                              config: {
                                ...builderForm.config,
                                aggregateField: e.target.value,
                              },
                            })
                          }
                          disabled={builderForm.config.aggregate === "count"}
                          className="h-9 text-sm bg-background"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Group By{" "}
                        <span className="lowercase font-normal opacity-70">
                          (Optional)
                        </span>
                      </label>
                      <Input
                        placeholder="e.g. status"
                        value={builderForm.config.groupBy}
                        onChange={(e) =>
                          setBuilderForm({
                            ...builderForm,
                            config: {
                              ...builderForm.config,
                              groupBy: e.target.value,
                            },
                          })
                        }
                        disabled={builderForm.visualization === "billboard"}
                        className="h-9 text-sm bg-background"
                      />
                    </div>

                    <Button
                      onClick={saveWidget}
                      disabled={isSaving || !previewData}
                      className="w-full mt-4 h-10 font-bold bg-primary sm:hidden"
                    >
                      {isSaving ? (
                        <Spinner className="h-4 w-4" />
                      ) : editingWidgetId ? (
                        "Update Widget"
                      ) : (
                        "Save to Dashboard"
                      )}
                    </Button>
                  </div>

                  {/* Schema Docs */}
                  <div className="space-y-3 pb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />{" "}
                      Dictionary
                    </h3>
                    <div className="space-y-2">
                      {schemaData?.schema?.[builderForm.target]?.map(
                        (doc: any, i: number) => (
                          <div
                            key={i}
                            className="bg-card border border-border/60 p-3 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-xs text-blue-500 font-bold">
                                {doc.field}
                              </code>
                              <span className="text-[9px] uppercase font-mono opacity-50">
                                {doc.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {doc.desc}
                            </p>
                          </div>
                        ),
                      )}
                      {(!schemaData?.schema?.[builderForm.target] ||
                        schemaData.schema[builderForm.target].length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No dictionary available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- MODAL: DELETE WIDGET --- */}
      <Dialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Remove Widget?"
      >
        <div className="space-y-4">
          <p className="text-sm">
            Are you sure you want to remove this visualization from your
            dashboard?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteWidget}>
              <Trash2 className="h-4 w-4 mr-2" /> Remove
            </Button>
          </div>
        </div>
      </Dialog>

      {/* --- MODAL: DELETE DASHBOARD --- */}
      <Dialog
        open={isDeleteViewOpen}
        onClose={() => setIsDeleteViewOpen(false)}
        title="Delete Dashboard?"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              This will permanently delete the dashboard{" "}
              <strong>{view?.name}</strong> and all its widgets.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteViewOpen(false)}
              disabled={isDeletingView}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteView}
              disabled={isDeletingView}
            >
              {isDeletingView ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}{" "}
              Delete Dashboard
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
