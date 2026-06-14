import {
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Layers,
  type LucideIcon,
} from "lucide-react";

// Canonical severities, ordered low → high. Mirrors backend src/utils/severity.ts.
export const SEVERITIES = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface LevelStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
  icon: LucideIcon;
  label: string;
}

export const getLevelColors = (level: string): LevelStyle => {
  switch ((level || "").toLowerCase()) {
    case "error":
    case "fatal":
      return { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive", dot: "bg-destructive", icon: XCircle, label: level };
    case "warn":
      return { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-500", dot: "bg-yellow-500", icon: AlertTriangle, label: level };
    case "debug":
      return { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500", dot: "bg-purple-500", icon: Bug, label: level };
    case "trace":
      return { bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400", icon: Layers, label: level };
    case "info":
    default:
      return { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500", icon: Info, label: level || "info" };
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return String(num ?? 0);
};

// Returns the canonical severity for a log row, tolerating legacy `level`-only docs.
export const logSeverity = (log: any): string =>
  (log?.severityText || log?.level || "info").toLowerCase();

export interface LogRecord {
  _id: string;
  timestamp: string;
  level?: string;
  severityText?: string;
  severityNumber?: number;
  source?: string;
  host?: string;
  environment?: string;
  message: string;
  traceId?: string;
  spanId?: string;
  serviceId?: any;
  serviceModel?: string;
  attributes?: Record<string, any>;
}
