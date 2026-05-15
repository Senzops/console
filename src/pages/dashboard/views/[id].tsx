import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Editor from "@monaco-editor/react";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import { DashboardLayout } from "../../../components/Layout";
import { WorldMap } from "../../../components/WorldMap";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
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
  ChevronRight,
  Zap
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
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#84cc16", // lime-500
  "#a855f7", // fuchsia-500
  "#0ea5e9", // sky-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#2563eb", // blue-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#ea580c", // orange-600
  "#4f46e5", // indigo-600
  "#0d9488", // teal-600
  "#e11d48", // rose-600
  "#65a30d", // lime-600
  "#c026d3", // fuchsia-600
  "#0284c7", // sky-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#f472b6", // pink-400
  "#fb923c", // orange-400
  "#818cf8", // indigo-400
  "#2dd4bf", // teal-400
  "#fb7185", // rose-400
  "#a3e635", // lime-400
  "#e879f9", // fuchsia-400
  "#38bdf8", // sky-400
  "#facc15", // yellow-400
  "#4ade80", // green-400
];

// Enterprise Consistent Color & Stacking Hashing
const getStringHash = (str: string) => {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Enterprise Aggregation Pipeline Defaults
const DEFAULT_QUERIES: Record<string, string> = {
  logs: '[\n  { "$match": { "level": "error" } },\n  { "$project": { "time": "$timestamp", "message": 1, "service": "$serviceModel" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  apm: '[\n  { "$match": { "duration": { "$gt": 1000 } } },\n  { "$project": { "time": "$timestamp", "route": 1, "duration": 1, "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  vps: '[\n  { "$match": { "metrics.cpu.usagePercent": { "$gt": 50 } } },\n  { "$project": { "time": "$createdAt", "cpu": "$metrics.cpu.usagePercent", "ram": "$metrics.memory.usagePercent", "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  database: '[\n  { "$match": { "latency.read.avg": { "$gt": 50 } } },\n  { "$project": { "time": "$timestamp", "readLatency": "$latency.read.avg", "connections": "$connections.current", "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  uptime: '[\n  { "$match": { "status": "down" } },\n  { "$project": { "time": "$createdAt", "url": "$service.url", "status": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  rum: '[\n  { "$match": { "vitals.lcp": { "$gt": 2500 } } },\n  { "$project": { "time": "$createdAt", "browser": 1, "lcp": "$vitals.lcp", "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  task: '[\n  { "$match": { "status": "failed" } },\n  { "$project": { "time": "$timestamp", "taskName": 1, "duration": 1, "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
};

// Universal Pipeline Templates
const QUICK_TEMPLATES: Record<string, any[]> = {
  apm: [
    {
      label: "Avg Latency (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "value": { "$avg": "$duration" }\n  }},\n  { "$project": { "time": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`,
    },
    {
      label: "Errors by Service (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$match": { "status": { "$gte": 500 } } },\n  { "$group": { "_id": "$service.name", "value": { "$sum": 1 } } },\n  { "$project": { "time": "$_id", "name": "$_id", "value": 1, "_id": 0 } }\n]`,
    },
    {
      label: "Slow Traces (Table)",
      config: { viz: "table" },
      query: `[\n  { "$match": { "duration": { "$gt": 1500 } } },\n  { "$project": { "time": "$timestamp", "route": 1, "duration": 1, "service": "$service.name", "status": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]`,
    },
  ],
  logs: [
    {
      label: "Errors Trend (Line)",
      config: { viz: "line" },
      query: `[\n  { "$match": { "level": "error" } },\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "value": { "$sum": 1 }\n  }},\n  { "$project": { "time": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`,
    },
    {
      label: "Recent Errors (Table)",
      config: { viz: "table" },
      query: `[\n  { "$match": { "level": "error" } },\n  { "$project": { "time": "$timestamp", "message": 1, "service": "$serviceModel" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]`,
    },
    {
      label: "Severity Split (Pie)",
      config: { viz: "pie" },
      query: `[\n  { "$group": { "_id": "$level", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } }\n]`
    }
  ],
  vps: [
    {
      label: "Resource Usage (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$createdAt" } },\n    "CPU": { "$avg": "$metrics.cpu.usagePercent" },\n    "RAM": { "$avg": "$metrics.memory.usagePercent" }\n  }},\n  { "$project": { "time": "$_id", "CPU": 1, "RAM": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`,
    },
    {
      label: "High CPU Nodes (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$match": { "metrics.cpu.usagePercent": { "$gt": 80 } } },\n  { "$group": { "_id": "$service.name", "CPU": { "$avg": "$metrics.cpu.usagePercent" } } },\n  { "$project": { "time": "$_id", "name": "$_id", "value": "$CPU", "_id": 0 } }\n]`
    },
  ],
  database: [
    {
      label: "Latency Trend (Line)",
      config: { viz: "line" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "Read": { "$avg": "$latency.read.avg" },\n    "Write": { "$avg": "$latency.write.avg" }\n  }},\n  { "$project": { "time": "$_id", "Read": 1, "Write": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`,
    },
    {
      label: "Active Connections (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "Connections": { "$avg": "$connections.current" }\n  }},\n  { "$project": { "time": "$_id", "Connections": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`,
    }
  ],
  uptime: [
    {
      label: "Downtime Events (Table)",
      config: { viz: "table" },
      query: `[\n  { "$match": { "status": "down" } },\n  { "$project": { "time": "$createdAt", "service": "$service.name", "url": "$service.url", "statusCode": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]`
    },
    {
      label: "Ping Latency (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$createdAt" } },\n    "Latency": { "$avg": "$latency" }\n  }},\n  { "$project": { "time": "$_id", "Latency": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    }
  ],
  rum: [
    {
      label: "LCP Trend (Line)",
      config: { viz: "line" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$createdAt" } },\n    "LCP": { "$avg": "$vitals.lcp" }\n  }},\n  { "$project": { "time": "$_id", "LCP": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Browsers (Pie)",
      config: { viz: "pie" },
      query: `[\n  { "$group": { "_id": "$browser", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } }\n]`
    }
  ],
  task: [
    {
      label: "Failure Trend (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$match": { "status": "failed" } },\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "value": { "$sum": 1 }\n  }},\n  { "$project": { "time": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Slow Tasks (Table)",
      config: { viz: "table" },
      query: `[\n  { "$project": { "time": "$timestamp", "taskName": 1, "duration": 1, "service": "$service.name" } },\n  { "$sort": { "duration": -1 } },\n  { "$limit": 100 }\n]`
    }
  ]
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
          hasChildren ? "cursor-pointer hover:bg-muted/50" : ""
        )}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform text-muted-foreground", isOpen ? "rotate-90" : "")} />
        ) : (
          <div className="w-3.5 h-3.5 shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-bold text-primary truncate">{node.name}</code>
            {!hasChildren && node.type && (
              <Badge variant="secondary" className="text-[9px] uppercase font-mono tracking-wider opacity-80 shrink-0">
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
      let current: any = root; 
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
              className={cn("h-6 px-2 text-[10px] rounded-sm", viewMode === "tree" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              Tree
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn("h-6 px-2 text-[10px] rounded-sm", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              List
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Available attributes for <strong>{target}</strong>. Use these to build your MongoDB Aggregation Pipeline.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {schemaList.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No schema available.</p>
        ) : viewMode === "tree" ? (
          Object.values(tree).map((node: any) => <SchemaTreeNode key={node.name} node={node} />)
        ) : (
          <div className="space-y-2">
            {schemaList.map((doc: any, i: number) => (
              <div key={i} className="bg-card border border-border/60 p-3 rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs text-primary font-bold break-all">{doc.field}</code>
                  <Badge variant="secondary" className="text-[9px] uppercase font-mono opacity-80 shrink-0 ml-2">{doc.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
  const activeViz = visualization || config?.viz || "table";

  if (
    !data ||
    (Array.isArray(data) && data.length === 0)
  ) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium">
        No data available
      </div>
    );
  }

  // Consistent hashing mapping to lock color bindings across renders
  const getColor = (keyStr: string, index: number) => {
    if (isMono) return "hsl(var(--chart-mono))";
    const hash = keyStr ? getStringHash(keyStr) : index;
    return CHART_COLORS[hash % CHART_COLORS.length];
  };

  /**
   * Schema discovery
   * Handles sparse/dynamic datasets safely.
   */
  const keySet = new Set<string>();

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    for (const key of Object.keys(item)) {
      keySet.add(key);
    }
  }

  // Global Deterministic Key Sorting
  // Enforces mathematical consistency for all visual column layouts, table structures, and categorical renders
  const itemKeys = Array.from(keySet).sort((a, b) => getStringHash(a) - getStringHash(b));

  // 1. Enterprise Billboard Render Engine
  if (activeViz === "billboard") {
    const items = Array.isArray(data) ? [...data] : [data];
    const blacklist = ["value", "null", "undefined", "time", "_id", "name"];

    // Deterministic billboard sorting to prevent jumping
    items.sort((a, b) => {
      const keyA = Object.keys(a).filter(k => !blacklist.includes(k.toLowerCase()))[0] || "";
      const keyB = Object.keys(b).filter(k => !blacklist.includes(k.toLowerCase()))[0] || "";
      return getStringHash(keyA) - getStringHash(keyB);
    });

    return (
      <div className="h-full w-full flex flex-row flex-wrap items-center justify-center gap-8 overflow-auto p-4">
        {items.map((item: any, idx: number) => {
          const keys = Object.keys(item).filter((k) => !blacklist.includes(k.toLowerCase()));
          const displayKey = keys.length > 0 ? keys[0] : null;

          let val = 0;
          if (displayKey) val = item[displayKey];
          else if (item.value !== undefined) val = item.value;
          else val = Object.values(item)[0] as number;

          const isNumber = typeof val === "number" || !isNaN(Number(val));
          const displayVal = isNumber ? formatNumber(Number(val)) : String(val || 0);

          return (
            <div key={idx} className="flex flex-col items-center justify-center text-center">
              <div className="text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
                <SmartAnimatedValue value={displayVal} />
              </div>
              {displayKey && (
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 opacity-70">
                  {displayKey}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 2. Metric Gauge (Speedometer)
  if (activeViz === "gauge") {
    const items = Array.isArray(data) ? [...data] : [data];
    const blacklist = ["value", "null", "undefined", "time", "_id", "name"];

    // Deterministic gauge sorting to prevent jumping
    items.sort((a, b) => {
      const keyA = Object.keys(a).filter(k => !blacklist.includes(k.toLowerCase()))[0] || "";
      const keyB = Object.keys(b).filter(k => !blacklist.includes(k.toLowerCase()))[0] || "";
      return getStringHash(keyA) - getStringHash(keyB);
    });

    return (
       <div className="h-full w-full flex flex-row flex-wrap items-center justify-center gap-8 overflow-auto p-4">
         {items.map((item: any, idx: number) => {
           const keys = Object.keys(item).filter((k) => !blacklist.includes(k.toLowerCase()));
           const displayKey = keys.length > 0 ? keys[0] : null;

           let val = 0;
           if (displayKey) val = item[displayKey];
           else if (item.value !== undefined) val = item.value;
           else val = Object.values(item)[0] as number;

           const numVal = Number(val) || 0;
           
           let max = 100;
           if (numVal > 100) {
             max = Math.pow(10, Math.ceil(Math.log10(numVal)));
             if (max - numVal < max * 0.1) max *= 2; 
           }
           
           const percentage = Math.min(100, Math.max(0, (numVal / max) * 100));
           const color = getColor(displayKey || "gauge", idx);

           return (
             <div key={idx} className="flex flex-col items-center justify-center relative w-full h-full max-w-[280px] max-h-[280px]">
                <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
                  <PieChart className="focus:outline-none" style={{ outline: "none" }}>
                    <Pie
                      data={[
                        { value: percentage, fill: color },
                        { value: 100 - percentage, fill: "hsl(var(--muted))" }
                      ]}
                      cx="50%"
                      cy="75%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="75%"
                      outerRadius="100%"
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={true}
                      activeShape={undefined}
                      className="focus:outline-none"
                      style={{ outline: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center text-center w-full">
                   <div className="text-3xl md:text-4xl font-extrabold tracking-tighter text-foreground">
                     <SmartAnimatedValue value={numVal > 1000 ? formatNumber(numVal) : numVal.toFixed(1).replace(/\.0$/, '')} />
                   </div>
                   {displayKey && (
                     <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 opacity-70 truncate max-w-[80%]">
                       {displayKey}
                     </div>
                   )}
                </div>
             </div>
           );
         })}
       </div>
    );
  }

  // 3. Raw JSON
  if (activeViz === "json") {
     return (
       <div className="w-full h-full overflow-auto bg-[#0d1117] p-4 rounded-lg border border-border/40 shadow-inner">
         <pre className="text-[11px] font-mono leading-relaxed text-[#e6edf3]">
           {JSON.stringify(data, null, 2)}
         </pre>
       </div>
     );
  }

  // 4. Geospatial Map
  if (activeViz === "map") {
     const mappedData = data.map((d: any) => {
       let key = d.name || d._id || d.country || "";
       let val = d.value || d.count || 0;
       
       if (!key || !val) {
          const keys = Object.keys(d);
          if (keys.length >= 2) {
             key = key || d[keys[0]];
             val = val || d[keys[1]];
          }
       }
       return { _id: String(key), count: Number(val) };
     });

     // Deterministic map sorting
     mappedData.sort((a: any, b: any) => getStringHash(a._id) - getStringHash(b._id));

     return (
       <div className="w-full h-full bg-card rounded-lg overflow-hidden relative">
         <WorldMap data={mappedData} />
       </div>
     );
  }

  if (activeViz === "pie") {
    let nameK = "name";
    let valK = "value";

    if (!itemKeys.includes("name") && !itemKeys.includes("value")) {
      for (const item of data) {
        if (!item || typeof item !== "object") continue;
        for (const k of Object.keys(item)) {
          if (!nameK && typeof item[k] === "string") nameK = k;
          if (!valK && typeof item[k] === "number" && k !== nameK) valK = k;
        }
      }
      if (!nameK) nameK = itemKeys[0];
      if (!valK) valK = itemKeys.find((k) => k !== nameK) || itemKeys[0];
    }

    // Deterministic Pie Slicing Order
    const sortedPieData = [...data].sort((a, b) => {
      const keyA = String(a[nameK] || "");
      const keyB = String(b[nameK] || "");
      return getStringHash(keyA) - getStringHash(keyB);
    });

    return (
      <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
        <PieChart className="focus:outline-none" style={{ outline: "none" }}>
          <RechartsTooltip content={<CustomTooltip range={range} />} />
          <Pie
            data={sortedPieData}
            dataKey={valK}
            nameKey={nameK}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
            className="focus:outline-none"
            style={{ outline: "none" }}
          >
            {sortedPieData.map((entry: any, index: number) => {
              const keyValue = String(entry[nameK] || index);
              return <Cell key={`cell-${index}`} fill={getColor(keyValue, index)} style={{ outline: "none" }} className="focus:outline-none" />
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // 5. Insight Radar Chart
  if (activeViz === "radar") {
    let timeKey = "name";
    if (!itemKeys.includes("name")) {
       timeKey = itemKeys.find(k => k.toLowerCase().includes("time") || k.toLowerCase().includes("date") || k === "_id") || itemKeys[0];
    }
    const renderKeys = itemKeys.filter(k => k !== timeKey);
    // Note: itemKeys are globally hashed above, so renderKeys inherits determinism automatically.

    return (
      <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data} className="focus:outline-none" style={{ outline: "none" }}>
          <defs>
            {renderKeys.map((k, i) => {
              const color = getColor(k, i);
              const safeId = `color-radar-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
              return (
                <radialGradient key={safeId} id={safeId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </radialGradient>
              );
            })}
          </defs>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey={timeKey} tick={false} />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
          <RechartsTooltip content={<CustomTooltip range={range} />} />
          {renderKeys.map((k, i) => {
            const color = getColor(k, i);
            const safeId = `color-radar-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
            return (
              <Radar 
                key={k} 
                name={k} 
                dataKey={k} 
                stroke={color} 
                fill={`url(#${safeId})`} 
                fillOpacity={1}
                strokeWidth={2} 
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (activeViz === "table") {
    return (
      <div className="w-full h-full overflow-auto rounded-md border border-border/40 bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              {itemKeys.map((k) => (
                <th key={k} className="px-4 py-3 font-semibold">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                {itemKeys.map((k, j) => (
                  <td
                    key={j}
                    className="px-4 py-2 font-mono text-xs truncate max-w-[300px]"
                  >
                    {typeof row[k] === "object"
                      ? JSON.stringify(row[k])
                      : String(row[k] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Time-Series (Area, Line, Bar) automatic key mapping robustness
  let timeKey = "time";
  let renderKeys: string[] = [];

  if (itemKeys.includes("time")) {
    timeKey = "time";
  } else {
    const possibleTime = itemKeys.find(
      (k) =>
        k.toLowerCase().includes("time") ||
        k.toLowerCase().includes("date") ||
        k === "_id"
    );
    if (possibleTime) {
      timeKey = possibleTime;
    }
  }

  renderKeys = itemKeys.filter((k) => {
    if (k === timeKey || k === "name" || k === "_id") return false;
    return data.some((row: any) => row && row[k] !== undefined && row[k] !== null);
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      {activeViz === "area" ? (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={timeKey} hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            content={<CustomTooltip range={range} />}
          />
          {renderKeys.map((k, i) => {
            const color = getColor(k, i);
            const safeId = `color-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
            return (
              <React.Fragment key={k}>
                <defs>
                  <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey={k} stackId="1" stroke={color} fill={`url(#${safeId})`} strokeWidth={2} />
              </React.Fragment>
            )
          })}
        </AreaChart>
      ) : activeViz === "bar" ? (
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={timeKey} hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            content={<CustomTooltip range={range} />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          />
          {renderKeys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="1" fill={getColor(k, i)} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={timeKey} hide />
          <YAxis hide />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            content={<CustomTooltip range={range} />}
          />
          {renderKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={getColor(k, i)} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

// --- Sub-Component: Single Widget Wrapper ---
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
        {isMaximized ? <X className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
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

  const [range, setRange] = useState("1h");
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
    queryStr: DEFAULT_QUERIES["apm"] || "[]",
    config: {},
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
  const { data: schemaData } = useSWR(token ? "/schema" : null, fetcher);

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
      queryStr: template.query,
      visualization: template.config.viz,
    }));
    setTimeout(() => editorRef.current?.setValue(template.query), 50);
  };

  const openCreateWidget = () => {
    setEditingWidgetId(null);
    setBuilderForm({
      name: "",
      target: "apm",
      visualization: "table",
      queryStr: DEFAULT_QUERIES["apm"] || "[]",
      config: {},
    });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(
      () => editorRef.current?.setValue(DEFAULT_QUERIES["apm"] || "[]"),
      100,
    );
  };

  const openEditWidget = (w: any) => {
    setEditingWidgetId(w._id);
    setBuilderForm({
      name: w.name,
      target: w.target,
      visualization: w.visualization || w.config?.viz || "table",
      queryStr: JSON.stringify(w.query, null, 2),
      config: w.config || {},
    });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(
      () => editorRef.current?.setValue(JSON.stringify(w.query, null, 2)),
      100,
    );
  };

  const runLivePreview = async () => {
    const queryStr = editorRef.current?.getValue() || "[]";
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(queryStr);
    } catch (err) {
      toast.error("Invalid JSON format in Pipeline Editor.");
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
    const queryStr = editorRef.current?.getValue() || "[]";
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(queryStr);
    } catch (err) {
      toast.error("Invalid JSON format in Pipeline Editor.");
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

  const monacoTheme = theme === "light" || theme === "latte" ? "light" : "vs-dark";

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
            <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-card overflow-hidden">
              
              {/* Left Panel: Scrollable Configuration & Editor */}
              <div className="w-full md:w-2/3 flex flex-col border-r border-border/40 h-full shrink-0 md:shrink overflow-y-auto bg-background">
                
                {/* Control Row */}
                <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/10 shrink-0">
                  <div className="space-y-1 w-full sm:flex-1">
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
                      className="h-9 text-sm bg-background border-border/60 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 w-full sm:flex-1">
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
                          queryStr: DEFAULT_QUERIES[newTarget] || "[]",
                          visualization: "table"
                        }));
                        setTimeout(
                          () =>
                            editorRef.current?.setValue(
                              DEFAULT_QUERIES[newTarget] || "[]",
                            ),
                          50,
                        );
                        setPreviewData(null);
                      }}
                      className="capitalize h-9 text-sm bg-background border-border/60 shadow-sm"
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
                  <div className="space-y-1 w-full sm:flex-1">
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
                      className="h-9 text-sm bg-background border-border/60 shadow-sm"
                    >
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                      <option value="bar">Bar Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="billboard">Billboard Number</option>
                      <option value="gauge">Metric Gauge</option>
                      <option value="radar">Insight Radar</option>
                      <option value="map">Geospatial Map</option>
                      <option value="table">Data Table</option>
                      <option value="json">Raw JSON</option>
                    </Select>
                  </div>
                </div>

                {/* Editor Area */}
                <div className="p-4 shrink-0">
                  <div
                    className={cn(
                      "flex flex-col relative border rounded-xl overflow-hidden shadow-sm",
                      monacoTheme === "light"
                        ? "bg-background border-border/60"
                        : "bg-[#1e1e1e] border-[#444]"
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
                        <Terminal className="h-3 w-3 text-primary" /> Aggregation Pipeline (MQL)
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
                    <div className="w-full relative h-[250px] sm:h-[300px]">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme={monacoTheme}
                        value={builderForm.queryStr}
                        onMount={handleEditorMount}
                        onChange={(val) =>
                          setBuilderForm({
                            ...builderForm,
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

                {/* Live Preview Area */}
                <div className="px-4 pb-4 shrink-0 flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 mb-3 px-1">
                    <Activity className="h-4 w-4 text-primary" /> Live Preview
                  </h3>
                  <div className="h-[400px] w-full relative flex flex-col rounded-xl border border-border/60 bg-card/50 overflow-hidden shadow-sm">
                    {!previewData && !previewError && !isPreviewLoading ? (
                      <div className="m-auto text-center flex flex-col items-center">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-foreground">
                          Awaiting Execution
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Write your Pipeline above and click Run Query.
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

                <Button
                  onClick={saveWidget}
                  disabled={isSaving || !previewData}
                  className="m-4 mt-0 h-10 font-bold bg-primary sm:hidden"
                >
                  {isSaving ? <Spinner className="h-4 w-4" /> : editingWidgetId ? "Update Widget" : "Save to Dashboard"}
                </Button>
              </div>

              {/* Right Panel: Locked Schema Explorer */}
              <div className="w-full md:w-1/3 flex flex-col h-[400px] md:h-full bg-muted/5 overflow-hidden border-t md:border-t-0 border-border/40">
                <SchemaExplorer target={builderForm.target} schemaData={schemaData} />
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