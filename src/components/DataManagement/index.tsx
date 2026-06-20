import React, { useState, useRef, useCallback } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  Spinner,
  Badge,
  cn,
} from "../Core";
import { api } from "../../lib/auth";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileJson,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Key,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Settings,
  BarChart3,
} from "lucide-react";
import { extractErrorMessage } from "@/utils/axiosError";

// ============================================================================
// DATA MANAGEMENT COMPONENT
// ============================================================================
// Reusable component for import/export of config and telemetry data.
// Used in both the Profile page (personal scope) and Organization page (org scope).
//
// Props:
//   scope: 'personal' | 'organization' — determines API header behavior
//   axiosConfig: optional headers override (e.g., { 'x-org-id': '' } for personal)
// ============================================================================

interface DataManagementProps {
  scope: "personal" | "organization";
  axiosConfig?: { headers?: Record<string, string> };
}

// --- Type color map for preview ---
const TYPE_LABELS: Record<string, string> = {
  apmServices: "APM Services",
  rumServices: "RUM Services",
  taskServices: "Task Services",
  databaseServices: "Database Services",
  websites: "Websites",
  servers: "Servers",
  monitors: "Uptime Monitors",
  alertDestinations: "Alert Destinations",
  alertPolicies: "Alert Policies",
  alertConditions: "Alert Conditions",
  alertSilences: "Alert Silences",
  views: "Dashboard Views",
  viewWidgets: "View Widgets",
  mcpKeys: "MCP Keys",
  logApiKey: "Log API Key",
};

// --- Telemetry export types ---
const TELEMETRY_TYPES = [
  { id: "apm-traces", label: "APM Traces", group: "APM" },
  { id: "apm-metrics", label: "APM Metrics", group: "APM" },
  { id: "rum-traces", label: "RUM Traces", group: "RUM" },
  { id: "rum-metrics", label: "RUM Metrics", group: "RUM" },
  { id: "task-runs", label: "Task Runs", group: "Tasks" },
  { id: "task-metrics", label: "Task Metrics", group: "Tasks" },
  { id: "db-metrics", label: "Database Metrics", group: "Database" },
  { id: "queue-metrics", label: "Queue Metrics", group: "Queue" },
  { id: "queue-rollups", label: "Queue Rollups", group: "Queue" },
  { id: "web-events", label: "Web Events", group: "Web Analytics" },
  { id: "web-metrics", label: "Web Metrics", group: "Web Analytics" },
  { id: "logs", label: "Logs", group: "Logs" },
  { id: "error-groups", label: "Error Groups", group: "Errors" },
  { id: "runtime-metrics", label: "Runtime Metrics", group: "APM" },
  { id: "monitor-runs", label: "Monitor Checks", group: "Uptime" },
  { id: "vps-runs", label: "Server Snapshots", group: "Servers" },
] as const;

export const DataManagementSection: React.FC<DataManagementProps> = ({
  scope,
  axiosConfig = {},
}) => {
  // --- Config Export ---
  const [isExportingConfig, setIsExportingConfig] = useState(false);

  // --- Config Import ---
  const [importFile, setImportFile] = useState<any>(null);
  const [importFileName, setImportFileName] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importStrategy, setImportStrategy] = useState<"skip" | "overwrite" | "duplicate">("skip");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Telemetry Export ---
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [selectedTelemetryTypes, setSelectedTelemetryTypes] = useState<string[]>([]);
  const [telemetryTimeRange, setTelemetryTimeRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
  });
  const [isExportingTelemetry, setIsExportingTelemetry] = useState(false);

  // ================================================================
  // CONFIG EXPORT
  // ================================================================
  const handleExportConfig = useCallback(async () => {
    setIsExportingConfig(true);
    try {
      const res = await api.get("/data/export/config", {
        ...axiosConfig,
        responseType: "blob",
      });

      // Trigger download
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `senzops-config-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Configuration exported successfully.");
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to export configuration."));
    } finally {
      setIsExportingConfig(false);
    }
  }, [axiosConfig]);

  // ================================================================
  // CONFIG IMPORT — FILE SELECTION
  // ================================================================
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file type. Please select a .json file.");
      return;
    }

    // 5MB max
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB for config imports.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.platform !== "senzops") {
        toast.error("Invalid file. This does not appear to be a Senzops export file.");
        return;
      }

      setImportFile(parsed);
      setImportFileName(file.name);
      setImportResult(null);
      setPreviewData(null);
      setIsPreviewModalOpen(true);

      // Trigger preview
      setIsPreviewLoading(true);
      try {
        const res = await api.post(
          `/data/import/config/preview?strategy=${importStrategy}`,
          parsed,
          axiosConfig,
        );
        setPreviewData(res.data);
      } catch (previewError: any) {
        toast.error(extractErrorMessage(previewError, "Failed to preview import file."));
        setIsPreviewModalOpen(false);
      } finally {
        setIsPreviewLoading(false);
      }
    } catch {
      toast.error("Failed to parse file. Please ensure it is a valid JSON file.");
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [axiosConfig, importStrategy]);

  // ================================================================
  // CONFIG IMPORT — EXECUTE
  // ================================================================
  const handleImportConfig = useCallback(async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const res = await api.post(
        `/data/import/config?strategy=${importStrategy}`,
        importFile,
        axiosConfig,
      );
      setImportResult(res.data);
      toast.success("Configuration imported successfully.");
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Import failed."));
    } finally {
      setIsImporting(false);
    }
  }, [importFile, importStrategy, axiosConfig]);

  // ================================================================
  // TELEMETRY EXPORT
  // ================================================================
  const handleExportTelemetry = useCallback(async () => {
    if (selectedTelemetryTypes.length === 0) {
      toast.error("Select at least one data type to export.");
      return;
    }

    setIsExportingTelemetry(true);
    try {
      const res = await api.post(
        "/data/export/telemetry",
        {
          types: selectedTelemetryTypes,
          timeRange: {
            start: new Date(telemetryTimeRange.start).toISOString(),
            end: new Date(telemetryTimeRange.end).toISOString(),
          },
        },
        {
          ...axiosConfig,
          responseType: "blob",
        },
      );

      const blob = new Blob([res.data], { type: "application/x-ndjson" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `senzops-telemetry-${timestamp}.ndjson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Telemetry data exported successfully.");
      setIsTelemetryModalOpen(false);
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to export telemetry data."));
    } finally {
      setIsExportingTelemetry(false);
    }
  }, [selectedTelemetryTypes, telemetryTimeRange, axiosConfig]);

  // --- Copy API key helper ---
  const copyToClipboard = useCallback((key: string, label: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  // --- Toggle telemetry type selection ---
  const toggleTelemetryType = useCallback((typeId: string) => {
    setSelectedTelemetryTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  }, []);

  const selectAllTelemetry = useCallback(() => {
    if (selectedTelemetryTypes.length === TELEMETRY_TYPES.length) {
      setSelectedTelemetryTypes([]);
    } else {
      setSelectedTelemetryTypes(TELEMETRY_TYPES.map(t => t.id));
    }
  }, [selectedTelemetryTypes]);

  return (
    <>
      {/* --- Data Management Card --- */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/40 flex items-center gap-2 font-bold text-lg text-foreground bg-muted/20">
          <Database className="w-5 h-5 text-primary" /> Data Management
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {/* --- Config Section --- */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Configuration
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Export or import your monitoring setup including services, monitors,
                alert rules, and custom dashboards. Sensitive data like API keys and
                connection strings are excluded from exports.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center font-semibold shadow-sm"
                  onClick={handleExportConfig}
                  disabled={isExportingConfig}
                >
                  {isExportingConfig ? (
                    <><Spinner className="w-3.5 h-3.5 mr-2" /> Exporting...</>
                  ) : (
                    <><Download className="w-3.5 h-3.5 mr-2" /> Export Config</>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center font-semibold shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-2" /> Import Config
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* --- Telemetry Section --- */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Telemetry Data
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Export collected telemetry data (traces, metrics, logs, events) for
                external analysis, compliance archival, or migration. Select data
                types and a time range.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center font-semibold shadow-sm"
                  onClick={() => setIsTelemetryModalOpen(true)}
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Export Telemetry
                </Button>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="border-t border-border/40 bg-muted/15 px-6 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
              <FileJson className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
              Config exports are JSON files. Telemetry exports use NDJSON format
              (newline-delimited JSON) for streaming large datasets. API keys are
              never included in exports.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* CONFIG IMPORT PREVIEW MODAL                                      */}
      {/* ================================================================ */}
      <Dialog
        open={isPreviewModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsPreviewModalOpen(false);
            setImportResult(null);
          }
        }}
        title={importResult ? "Import Complete" : "Import Configuration"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Loading state */}
          {isPreviewLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner className="w-8 h-8 text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing import file...</p>
            </div>
          )}

          {/* Preview results */}
          {previewData && !importResult && (
            <>
              {/* File info */}
              <div className="bg-muted/30 border border-border/40 rounded-lg p-3 flex items-start gap-3">
                <FileJson className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {importFileName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exported {new Date(previewData.exportedAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })} &middot; Scope: {previewData.scope}
                  </p>
                </div>
              </div>

              {/* Entity counts */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Entities to Import
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(previewData.entityCounts || {}).map(([key, count]) => {
                    if (typeof count !== "number" || count === 0) return null;
                    const hasConflict = previewData.conflicts?.[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md border text-sm",
                          hasConflict
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border/40 bg-card",
                        )}
                      >
                        <span className="text-muted-foreground text-xs">
                          {TYPE_LABELS[key] || key}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground text-xs">
                            {count as number}
                          </span>
                          {hasConflict && (
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conflicts warning */}
              {previewData.conflicts && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs">
                  <p className="font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Name Conflicts Detected
                  </p>
                  <p className="text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                    Some entities have names that already exist.
                    Use the strategy selector below to decide how to handle them.
                  </p>
                </div>
              )}

              {/* Quota warning */}
              {!previewData.quota?.allowed && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs">
                  <p className="font-bold text-destructive mb-1">Quota Exceeded</p>
                  <p className="text-destructive/80 leading-relaxed">
                    Importing would exceed your plan's service limits for:{" "}
                    {previewData.quota.exceeded.map((k: string) => TYPE_LABELS[k] || k).join(", ")}.
                    Please upgrade your plan or reduce the import scope.
                  </p>
                </div>
              )}

              {/* Conflict strategy selector */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Conflict Strategy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["skip", "overwrite", "duplicate"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setImportStrategy(s)}
                      className={cn(
                        "p-2 rounded-lg border text-xs font-semibold transition-all capitalize",
                        importStrategy === s
                          ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                          : "border-border/60 hover:border-foreground/30 text-muted-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  {importStrategy === "skip" && "Existing entities with the same name will be skipped."}
                  {importStrategy === "overwrite" && "Existing entities will be updated with imported values."}
                  {importStrategy === "duplicate" && "Duplicates will be created with an \"(imported)\" suffix."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                <Button
                  variant="ghost"
                  onClick={() => setIsPreviewModalOpen(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportConfig}
                  disabled={isImporting || !previewData.quota?.allowed}
                >
                  {isImporting ? (
                    <><Spinner className="w-4 h-4 mr-2" /> Importing...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Import</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Import result */}
          {importResult && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {importResult.message}
                  </p>
                  {importResult.warnings?.map((w: string, i: number) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {w}
                    </p>
                  ))}
                </div>
              </div>

              {/* Imported counts */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Imported
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(importResult.imported || {}).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between p-1.5 text-xs">
                      <span className="text-muted-foreground">{TYPE_LABELS[key] || key}</span>
                      <span className="font-mono font-bold text-emerald-500">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skipped items */}
              {importResult.skipped && Object.keys(importResult.skipped).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Skipped
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(importResult.skipped).map(([key, items]: [string, any]) =>
                      (items as any[]).map((item: any, i: number) => (
                        <div key={`${key}-${i}`} className="flex items-center justify-between p-1.5 text-xs bg-muted/30 rounded">
                          <span className="text-muted-foreground">{item.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {item.reason}
                          </Badge>
                        </div>
                      )),
                    )}
                  </div>
                </div>
              )}

              {/* New API Keys */}
              {importResult.apiKeys && Object.keys(importResult.apiKeys).length > 0 && (
                <div>
                  <button
                    onClick={() => setShowApiKeys(!showApiKeys)}
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    New API Keys ({Object.keys(importResult.apiKeys).length})
                    {showApiKeys ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {showApiKeys && (
                    <div className="space-y-2 bg-muted/30 border border-border/40 rounded-lg p-3">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-2">
                        Save these keys now. They will not be shown again.
                      </p>
                      {Object.entries(importResult.apiKeys).map(([exportId, keyInfo]: [string, any]) => (
                        <div
                          key={exportId}
                          className="flex items-center justify-between gap-2 p-2 bg-card border border-border/40 rounded-md"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {keyInfo.name}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                              {keyInfo.apiKey}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(keyInfo.apiKey, exportId)}
                            className="shrink-0 p-1.5 hover:bg-muted rounded transition-colors"
                            title="Copy key"
                          >
                            {copiedKey === exportId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setImportResult(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* ================================================================ */}
      {/* TELEMETRY EXPORT MODAL                                           */}
      {/* ================================================================ */}
      <Dialog
        open={isTelemetryModalOpen}
        onClose={() => !isExportingTelemetry && setIsTelemetryModalOpen(false)}
        title="Export Telemetry Data"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Time Range */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Time Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">From</label>
                <input
                  type="datetime-local"
                  value={telemetryTimeRange.start}
                  onChange={e => setTelemetryTimeRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-border/60 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">To</label>
                <input
                  type="datetime-local"
                  value={telemetryTimeRange.end}
                  onChange={e => setTelemetryTimeRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-border/60 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Data Type Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Data Types
              </label>
              <button
                onClick={selectAllTelemetry}
                className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
              >
                {selectedTelemetryTypes.length === TELEMETRY_TYPES.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TELEMETRY_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => toggleTelemetryType(type.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-xs transition-all text-left",
                    selectedTelemetryTypes.includes(type.id)
                      ? "border-primary bg-primary/5 text-foreground font-semibold"
                      : "border-border/40 text-muted-foreground hover:border-foreground/20",
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-all",
                    selectedTelemetryTypes.includes(type.id)
                      ? "border-primary bg-primary"
                      : "border-border",
                  )}>
                    {selectedTelemetryTypes.includes(type.id) && (
                      <Check className="w-2 h-2 text-primary-foreground" />
                    )}
                  </div>
                  <span className="truncate">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>
              The export will stream as an NDJSON file. Large time ranges or multiple data types
              may produce large files. Data is bounded by your plan's retention period.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              onClick={() => setIsTelemetryModalOpen(false)}
              disabled={isExportingTelemetry}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportTelemetry}
              disabled={isExportingTelemetry || selectedTelemetryTypes.length === 0}
            >
              {isExportingTelemetry ? (
                <><Spinner className="w-4 h-4 mr-2" /> Exporting...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Export ({selectedTelemetryTypes.length} types)</>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
