import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Editor from "@monaco-editor/react";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DataError,
  cn,
} from "../../../components/Core";
import { TimeRangePicker, buildTimeRangeQuery, usePersistedTimeRange } from "../../../components/TimeRangePicker";
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
  Minus,
  List,
  Eye,
  EyeOff,
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
  Zap,
  Info,
  RotateCcw,
  Pencil,
  Bug,
  Cpu,
  Globe,
  Flame
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { SmartAnimatedValue } from "@/components/Tween";
import { useServiceModal } from '@/components/ServiceModals/context';

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
    case "uptime":
      return <Activity className="h-4 w-4 text-teal-500" />;
    case "errors":
      return <Bug className="h-4 w-4 text-red-500" />;
    case "runtime":
      return <Cpu className="h-4 w-4 text-violet-500" />;
    case "web":
      return <Globe className="h-4 w-4 text-cyan-500" />;
    case "firebase":
      return <Flame className="h-4 w-4 text-amber-500" />;
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
  errors: '[\n  { "$match": { "status": "unresolved" } },\n  { "$project": { "time": "$lastSeen", "errorClass": 1, "message": 1, "totalCount": 1, "status": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  runtime: '[\n  { "$match": { "eventLoopLagMs": { "$gt": 50 } } },\n  { "$project": { "time": "$timestamp", "eventLoopLagMs": 1, "heapUsedPercent": 1, "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  web: '[\n  { "$match": { "type": "pageview" } },\n  { "$project": { "time": "$createdAt", "path": 1, "browser": 1, "country": 1, "device": 1, "duration": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
  firebase: '[\n  { "$project": { "time": "$timestamp", "totalUsers": "$auth.totalUsers", "dau": "$auth.activeUsersDaily", "mau": "$auth.activeUsersMonthly", "signups": "$auth.newSignups24h", "service": "$service.name" } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]',
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
  ],
  errors: [
    {
      label: "Unresolved by Class (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$match": { "status": "unresolved" } },\n  { "$group": { "_id": "$errorClass", "value": { "$sum": "$totalCount" } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "value": -1 } }\n]`
    },
    {
      label: "Error Status (Pie)",
      config: { viz: "pie" },
      query: `[\n  { "$group": { "_id": "$status", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } }\n]`
    },
    {
      label: "Recent Errors (Table)",
      config: { viz: "table" },
      query: `[\n  { "$project": { "time": "$lastSeen", "errorClass": 1, "message": 1, "totalCount": 1, "status": 1 } },\n  { "$sort": { "time": -1 } },\n  { "$limit": 100 }\n]`
    }
  ],
  runtime: [
    {
      label: "Event Loop Lag (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "Lag": { "$avg": "$eventLoopLagMs" },\n    "P99": { "$avg": "$eventLoopLagP99Ms" }\n  }},\n  { "$project": { "time": "$_id", "Lag": 1, "P99": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Heap Usage (Line)",
      config: { viz: "line" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "HeapUsed": { "$avg": "$heapUsedPercent" }\n  }},\n  { "$project": { "time": "$_id", "HeapUsed": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "GC Pressure (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "GC Duration": { "$sum": "$gcTotalDurationMs" },\n    "Major GCs": { "$sum": "$gcMajorCount" }\n  }},\n  { "$project": { "time": "$_id", "GC Duration": 1, "Major GCs": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    }
  ],
  web: [
    {
      label: "Page Views Trend (Area)",
      config: { viz: "area" },
      query: `[\n  { "$match": { "type": "pageview" } },\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$createdAt" } },\n    "Views": { "$sum": 1 }\n  }},\n  { "$project": { "time": "$_id", "Views": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Top Pages (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$match": { "type": "pageview" } },\n  { "$group": { "_id": "$path", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "value": -1 } },\n  { "$limit": 20 }\n]`
    },
    {
      label: "Devices (Pie)",
      config: { viz: "pie" },
      query: `[\n  { "$group": { "_id": "$device", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } }\n]`
    },
    {
      label: "Traffic by Country (Map)",
      config: { viz: "map" },
      query: `[\n  { "$group": { "_id": "$country", "value": { "$sum": 1 } } },\n  { "$project": { "name": "$_id", "value": 1, "_id": 0 } },\n  { "$sort": { "value": -1 } }\n]`
    }
  ],
  firebase: [
    {
      label: "User Growth (Area)",
      config: { viz: "area" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "Total Users": { "$avg": "$auth.totalUsers" }\n  }},\n  { "$project": { "time": "$_id", "Total Users": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Active Users DAU/MAU (Line)",
      config: { viz: "line" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "DAU": { "$avg": "$auth.activeUsersDaily" },\n    "MAU": { "$avg": "$auth.activeUsersMonthly" }\n  }},\n  { "$project": { "time": "$_id", "DAU": 1, "MAU": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
    },
    {
      label: "Auth Providers (Pie)",
      config: { viz: "pie" },
      query: `[\n  { "$group": {\n    "_id": null,\n    "Password": { "$sum": "$providers.password" },\n    "Google": { "$sum": "$providers.google" },\n    "Apple": { "$sum": "$providers.apple" },\n    "Phone": { "$sum": "$providers.phone" },\n    "GitHub": { "$sum": "$providers.github" }\n  }},\n  { "$project": { "_id": 0 } },\n  { "$unwind": { "path": { "$objectToArray": "$$ROOT" } } },\n  { "$replaceRoot": { "newRoot": { "name": "$$ROOT.k", "value": "$$ROOT.v" } } }\n]`
    },
    {
      label: "New Signups Trend (Bar)",
      config: { viz: "bar" },
      query: `[\n  { "$group": {\n    "_id": { "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } },\n    "Signups": { "$avg": "$auth.newSignups24h" }\n  }},\n  { "$project": { "time": "$_id", "Signups": 1, "_id": 0 } },\n  { "$sort": { "time": 1 } }\n]`
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
const formatAxisDate = (str: string, displayRange: string) => {
  if (!str) return "";
  const date = new Date(str);
  return date.toLocaleString(undefined, {
    month: (displayRange === "30m" || displayRange === "1h") ? undefined : "short",
    day: (displayRange === "30m" || displayRange === "1h") ? undefined : "numeric",
    hour: "numeric",
    minute:"2-digit",
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

// Smooth closed path using Catmull-Rom spline
const smoothRadarPath = (points, tension = 0.3) => {
  if (!points || points.length < 2) return '';
  const n = points.length;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d + ' Z';
};

// --- Shared Chart Interactivity Components ---

const LegendCard = ({
  show,
  title = "Legend",
  keys,
  hiddenSeries,
  hoveredSeries,
  getColor,
  onToggle,
  onHover,
  onReset,
  onMouseEnter,
  onMouseLeave,
  triggerRect,
}: any) => {
  const [cardPos, setCardPos] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !triggerRect) {
      setCardPos((prev: any) => (prev === null ? null : null));
      return;
    }

    const updatePos = () => {
      if (!cardRef.current) return;
      const height = cardRef.current.offsetHeight;
      const width = cardRef.current.offsetWidth || 192;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const padding = 12;

      let top = triggerRect.bottom + 8;
      // Handle bottom overflow
      if (top + height > viewportHeight - padding) {
        top = triggerRect.top - height - 8;
      }
      if (top < padding) top = padding;

      let left = triggerRect.left + (triggerRect.width / 2) - (width / 2);
      // Handle left overflow
      if (left < padding) left = padding;
      // Handle right overflow
      if (left + width > viewportWidth - padding) {
        left = viewportWidth - width - padding;
      }

      setCardPos((prev: any) => {
        if (prev?.top === top && prev?.left === left) return prev;
        return { top, left };
      });
    };

    const rafId = requestAnimationFrame(updatePos);
    const timer = setTimeout(updatePos, 100);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [show, triggerRect, keys.length]);

  if (!show) return null;

  return createPortal(
    <div
      ref={cardRef}
      className={cn(
        "fixed z-[200] w-48 bg-card/95 backdrop-blur-xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden transition-all duration-300 ease-out",
        cardPos ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      style={{
        top: cardPos?.top ?? 0,
        left: cardPos?.left ?? 0,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-3 border-b border-border/40 bg-muted/30 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">{title}</span>
        {hiddenSeries.size > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={onReset}
            title="Reset All"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
        {keys.map((k: string, i: number) => {
          const isHidden = hiddenSeries.has(k);
          const isHovered = hoveredSeries === k;
          const isDimmed = hoveredSeries && hoveredSeries !== k;
          const color = getColor(k, i);

          return (
            <div
              key={k}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-200",
                isHidden ? "opacity-25 grayscale" : "hover:bg-muted/60",
                isDimmed ? "opacity-20" : "opacity-100",
                isHovered ? "bg-muted/40 shadow-sm" : ""
              )}
              onMouseEnter={() => !isHidden && onHover(k)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onToggle(k)}
            >
              <div
                className="h-2 w-2 rounded-full shrink-0 transition-transform duration-300"
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}40`,
                  transform: isHovered ? "scale(1.25)" : "scale(1)"
                }}
              />
              <span className={cn(
                "text-[11px] font-semibold truncate flex-1 transition-colors tracking-tight", 
                isHidden ? "line-through text-muted-foreground" : "text-foreground",
                isHovered ? "text-primary" : ""
              )}>
                {k}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

const LegendTrigger = ({ onMouseEnter, onMouseLeave, active, triggerRef }: any) => (
  <Button
    ref={triggerRef}
    variant="ghost"
    size="icon"
    className={cn(
      "h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-200",
      active ? "bg-primary/10 text-primary opacity-100" : "opacity-100"
    )}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <Info className="h-3.5 w-3.5" />
  </Button>
);

const RadarShape = (props: any) => {
  const { points, color, isHighlighted, isDimmed, safeId } = props;
  return (
    <path
      d={smoothRadarPath(points)}
      stroke={color}
      strokeWidth={isHighlighted ? 3 : 2}
      fill={`url(#${safeId})`}
      fillOpacity={isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.4}
      strokeOpacity={isDimmed ? 0.1 : 1}
      className="transition-all duration-300"
    />
  );
};

const ChartContainer = ({ 
  children, 
  showLegend, 
  legendKeys, 
  hiddenSeries, 
  hoveredSeries, 
  getColor, 
  handleToggleSeries, 
  setHoveredSeries, 
  handleResetSeries,
  buttonRef, 
  triggerRect,
  handleMouseEnterControls,
  handleMouseLeaveControls,
  activeViz,
  headerActionsRef,
  isParentHovered
}: any) => {
  const [headerContainer, setHeaderContainer] = useState<Element | null>(null);

  useEffect(() => {
    if (headerActionsRef?.current) setHeaderContainer(headerActionsRef.current);
  }, [headerActionsRef?.current]);

  const trigger = (isParentHovered || showLegend) && legendKeys.length > 0 && (
    <LegendTrigger 
      onMouseEnter={handleMouseEnterControls} 
      onMouseLeave={handleMouseLeaveControls} 
      active={showLegend} 
      triggerRef={buttonRef} 
    />
  );

  return (
    <div className="w-full h-full relative group/chart">
      {activeViz !== "table" && activeViz !== "json" && activeViz !== "map" && (
        <>
          {headerContainer ? createPortal(trigger, headerContainer) : trigger}
          <LegendCard 
            show={showLegend} 
            keys={legendKeys} 
            hiddenSeries={hiddenSeries} 
            hoveredSeries={hoveredSeries} 
            getColor={getColor}
            onToggle={handleToggleSeries}
            onHover={setHoveredSeries}
            onReset={handleResetSeries}
            onMouseEnter={handleMouseEnterControls}
            onMouseLeave={handleMouseLeaveControls}
            triggerRect={triggerRect}
          />
        </>
      )}
      {children}
    </div>
  );
};

// --- Sub-Component: Chart Renderer ---
const ChartRenderer = ({ data, config, visualization, range, isMono, headerActionsRef, isParentHovered }: any) => {
  const activeViz = visualization || config?.viz || "table";

  // Enterprise Interactive State
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const legendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Schema discovery
   * Handles sparse/dynamic datasets safely.
   */
  const itemKeys = useMemo(() => {
    const keySet = new Set<string>();
    if (data && Array.isArray(data)) {
      for (const item of data) {
        if (!item || typeof item !== "object") continue;
        for (const key of Object.keys(item)) {
          keySet.add(key);
        }
      }
    }
    return Array.from(keySet).sort((a, b) => getStringHash(a) - getStringHash(b));
  }, [data]);

  // Determine time/categorical keys for rendering
  const timeKey = useMemo(() => {
    if (itemKeys.includes("time")) return "time";
    if (itemKeys.includes("name")) return "name";
    return itemKeys.find(k => k.toLowerCase().includes("time") || k.toLowerCase().includes("date") || k === "_id") || itemKeys[0];
  }, [itemKeys]);

  // Legend Item Discovery & Stabilization
  const { legendKeys, nameKey, valueKey } = useMemo(() => {
    let nK = "name";
    let vK = "value";
    let keys: string[] = [];

    if (activeViz === "pie") {
      // Find strings and numbers for Pie
      const first = (data && Array.isArray(data) && data[0]) || {};
      for (const k of Object.keys(first)) {
        if (typeof first[k] === "string" && nK === "name") nK = k;
        if (typeof first[k] === "number" && vK === "value") vK = k;
      }
      keys = (data && Array.isArray(data)) ? data.map((d: any) => String(d[nK] || "Unknown")) : [];
    } else {
      keys = itemKeys.filter(k => k !== timeKey && k !== "_id" && k !== "null" && k !== "undefined" && k !== "name" && k !== "value");
    }

    return { 
      legendKeys: Array.from(new Set(keys)).sort((a, b) => getStringHash(a) - getStringHash(b)),
      nameKey: nK, 
      valueKey: vK 
    };
  }, [data, itemKeys, timeKey, activeViz]);

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

  const handleToggleSeries = (k: string) => {
    const next = new Set(hiddenSeries);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setHiddenSeries(next);
  };

  const handleResetSeries = () => {
    setHiddenSeries(new Set());
  };

  const handleMouseEnterControls = () => {
    if (legendTimeoutRef.current) clearTimeout(legendTimeoutRef.current);
    if (buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect());
    }
    setShowLegend(true);
  };

  const handleMouseLeaveControls = () => {
    legendTimeoutRef.current = setTimeout(() => {
      setShowLegend(false);
    }, 200);
  };

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
                      data={[{ value: 100 }]}
                      dataKey="value"
                      cx="50%"
                      cy="65%"
                      startAngle={200}
                      endAngle={-20}
                      innerRadius="70%"
                      outerRadius="100%"
                      cornerRadius={8}
                      fill="hsl(var(--muted))"
                      stroke="none"
                      isAnimationActive={false}
                      className="focus:outline-none"
                      style={{ outline: "none" }}
                    />
                    <Pie
                      data={[
                        { value: percentage, fill: color },
                      ]}
                      cx="50%"
                      cy="65%"
                      startAngle={200}
                      endAngle={200 - (220 * percentage) / 100}
                      innerRadius="70%"
                      outerRadius="100%"
                      cornerRadius={8}
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
    // Deterministic Pie Slicing Order
    const sortedPieData = [...data].sort((a, b) => {
      const keyA = String(a[nameKey] || "");
      const keyB = String(b[nameKey] || "");
      return getStringHash(keyA) - getStringHash(keyB);
    });

    return (
      <ChartContainer
        {...{
          showLegend,
          legendKeys,
          hiddenSeries,
          hoveredSeries,
          getColor,
          handleToggleSeries,
          setHoveredSeries,
          handleResetSeries,
          buttonRef,
          triggerRect,
          handleMouseEnterControls,
          handleMouseLeaveControls,
          activeViz,
          headerActionsRef,
          isParentHovered
        }}
      >
        <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
          <PieChart className="focus:outline-none" style={{ outline: "none" }}>
            <RechartsTooltip content={<CustomTooltip range={range} />} />
            <Pie
              data={sortedPieData.filter(d => !hiddenSeries.has(String(d[nameKey])))}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={90}
              cornerRadius={4}
              paddingAngle={2}
              stroke="none"
              className="focus:outline-none"
              style={{ outline: "none" }}
            >
              {sortedPieData.map((entry: any, index: number) => {
                const keyValue = String(entry[nameKey] || index);
                if (hiddenSeries.has(keyValue)) return null;
                const isHighlighted = hoveredSeries === keyValue;
                const isDimmed = hoveredSeries && hoveredSeries !== keyValue;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(keyValue, index)} 
                    style={{ outline: "none" }} 
                    className="focus:outline-none transition-all duration-300"
                    opacity={isDimmed ? 0.2 : isHighlighted ? 1 : 0.9}
                  />
                )
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  // 5. Insight Radar Chart
  if (activeViz === "radar") {
    return (
      <ChartContainer
        {...{
          showLegend,
          legendKeys,
          hiddenSeries,
          hoveredSeries,
          getColor,
          handleToggleSeries,
          setHoveredSeries,
          handleResetSeries,
          buttonRef,
          triggerRect,
          handleMouseEnterControls,
          handleMouseLeaveControls,
          activeViz,
          headerActionsRef,
          isParentHovered
        }}
      >
        <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data} className="focus:outline-none" style={{ outline: "none" }}>
            <defs>
              {legendKeys.map((k, i) => {
                const color = getColor(k, i);
                const safeId = `color-radar-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
                return (
                  <radialGradient key={safeId} id={safeId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </radialGradient>
                );
              })}
            </defs>
            <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <PolarAngleAxis dataKey={timeKey} tick={false} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <RechartsTooltip content={<CustomTooltip range={range} />} />
            {legendKeys.map((k, i) => {
              const isHighlighted = hoveredSeries === k;
              const isDimmed = hoveredSeries && hoveredSeries !== k;
              const color = getColor(k, i);
              const safeId = `color-radar-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

              return (
                <Radar 
                  key={k} 
                  name={k} 
                  dataKey={k} 
                  stroke={color} 
                  fill={`url(#${safeId})`} 
                  fillOpacity={isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.4}
                  strokeOpacity={isDimmed ? 0.1 : 1}
                  strokeWidth={isHighlighted ? 3 : 2}
                  hide={hiddenSeries.has(k)}
                  shape={<RadarShape color={color} isHighlighted={isHighlighted} isDimmed={isDimmed} safeId={safeId} />}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>
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

  return (
    <ChartContainer
      {...{
        showLegend,
        legendKeys,
        hiddenSeries,
        hoveredSeries,
        getColor,
        handleToggleSeries,
        setHoveredSeries,
        handleResetSeries,
        buttonRef,
        triggerRect,
        handleMouseEnterControls,
        handleMouseLeaveControls,
        activeViz,
        headerActionsRef,
        isParentHovered
      }}
    >
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
            {legendKeys.map((k, i) => {
              const isHighlighted = hoveredSeries === k;
              const isDimmed = hoveredSeries && hoveredSeries !== k;
              const color = getColor(k, i);
              const safeId = `color-${k.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
              return (
                <React.Fragment key={k}>
                  <defs>
                    <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={isDimmed ? 0.05 : 0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey={k} 
                    stackId="1" 
                    stroke={color} 
                    fill={`url(#${safeId})`} 
                    strokeWidth={isHighlighted ? 3 : 2} 
                    strokeOpacity={isDimmed ? 0.1 : 1}
                    hide={hiddenSeries.has(k)}
                    className="transition-all duration-300"
                  />
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
            {legendKeys.map((k, i) => {
              const isHighlighted = hoveredSeries === k;
              const isDimmed = hoveredSeries && hoveredSeries !== k;
              return (
                <Bar 
                  key={k} 
                  dataKey={k} 
                  stackId="1" 
                  fill={getColor(k, i)} 
                  radius={[2, 2, 0, 0]} 
                  opacity={isDimmed ? 0.2 : isHighlighted ? 1 : 0.9}
                  hide={hiddenSeries.has(k)}
                  className="transition-all duration-300"
                />
              )
            })}
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
            {legendKeys.map((k, i) => {
              const isHighlighted = hoveredSeries === k;
              const isDimmed = hoveredSeries && hoveredSeries !== k;
              return (
                <Line 
                  key={k} 
                  type="monotone" 
                  dataKey={k} 
                  stroke={getColor(k, i)} 
                  strokeWidth={isHighlighted ? 3 : 2} 
                  dot={false} 
                  strokeOpacity={isDimmed ? 0.1 : 1}
                  hide={hiddenSeries.has(k)}
                  className="transition-all duration-300"
                />
              )
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
};

// --- Sub-Component: Single Widget Wrapper ---
const WidgetWrapper = ({
  widget,
  layoutNode,
  rangeQuery,
  displayRange,
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
  const [isHovered, setIsHovered] = useState(false);
  const headerActionsRef = useRef<HTMLDivElement>(null);

  const { data, error, isValidating } = useSWR(
    `/views/widgets/${widget._id}/data?${rangeQuery}`,
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
      <div ref={headerActionsRef} className="flex items-center" />
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
      className={`flex flex-col relative overflow-hidden border-border/60 shadow-sm transition-all duration-300 group/widget ${isMaximized ? "fixed inset-4 z-[100] animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-full"} ${isEditing && draggedId === layoutNode.i ? "opacity-40 scale-95" : "opacity-100 scale-100"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
              range={displayRange}
              isMono={isMono}
              headerActionsRef={headerActionsRef}
              isParentHovered={isHovered}
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

  const [timeRange, setTimeRange] = usePersistedTimeRange(8);
  const rangeQuery = buildTimeRangeQuery(timeRange);
  const displayRange = timeRange.type === 'relative' ? timeRange.range : '24h';
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dashboard Deletion
  const [isDeleteViewOpen, setIsDeleteViewOpen] = useState(false);
  const [isDeletingView, setIsDeletingView] = useState(false);

  const { openModal } = useServiceModal();

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

  const openEditView = () => {
    if (!data?.view) return;
    openModal('view', 'edit', { id: id as string, name: data.view.name, description: data.view.description, onSuccess: () => mutate() });
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
        ...(timeRange.type === 'relative'
          ? { range: timeRange.range }
          : { start: timeRange.start, end: timeRange.end }),
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
      <>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Canvas...</p>
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

  const { view, widgets } = data;
  const orderedLayout = isEditing ? localLayout : data?.view?.layout || [];

  const monacoTheme = theme === "light" || theme === "latte" ? "light" : "vs-dark";

  return (
    <>
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
        <div className="relative z-[301] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 backdrop-blur-sm">
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
            <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={8} />
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
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={openEditView}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive" 
              size="icon"
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
                  rangeQuery={rangeQuery}
                  displayRange={displayRange}
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
                <TimeRangePicker value={timeRange} onChange={setTimeRange} maxRetentionDays={8} />
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
                      onValueChange={(newTarget) => {
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
                    >
                      <SelectTrigger className="capitalize h-9 text-sm bg-background border-border/60 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apm">Backend APM</SelectItem>
                        <SelectItem value="logs">Logs</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="vps">VPS Infra</SelectItem>
                        <SelectItem value="task">Tasks</SelectItem>
                        <SelectItem value="rum">Web RUM</SelectItem>
                        <SelectItem value="uptime">Uptime</SelectItem>
                        <SelectItem value="errors">Error Tracking</SelectItem>
                        <SelectItem value="runtime">Runtime Metrics</SelectItem>
                        <SelectItem value="web">Web Analytics</SelectItem>
                        <SelectItem value="firebase">Firebase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 w-full sm:flex-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Chart Type
                    </label>
                    <Select
                      value={builderForm.visualization}
                      onValueChange={(v) =>
                        setBuilderForm({
                          ...builderForm,
                          visualization: v,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm bg-background border-border/60 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="billboard">Billboard Number</SelectItem>
                        <SelectItem value="gauge">Metric Gauge</SelectItem>
                        <SelectItem value="radar">Insight Radar</SelectItem>
                        <SelectItem value="map">Geospatial Map</SelectItem>
                        <SelectItem value="table">Data Table</SelectItem>
                        <SelectItem value="json">Raw JSON</SelectItem>
                      </SelectContent>
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
                          range={displayRange}
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

    </>
  );
}