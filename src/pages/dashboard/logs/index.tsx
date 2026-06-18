import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { toast } from "sonner";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Input,
  Button,
  Spinner,
  DataError,
} from "../../../components/Core";
import { TablePageSkeleton } from "../../../components/Skeletons";
import {
  TimeRangePicker,
  buildTimeRangeQuery,
  usePersistedTimeRange,
} from "../../../components/TimeRangePicker";
import { usePlanRetention } from "@/lib/usePlanRetention";
import { formatAxisDate, getTimeSpanMs } from "@/lib/formatAxisDate";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Terminal,
  X,
  Key,
  Activity,
  XCircle,
  RefreshCw,
  Box,
  Radio,
  Download,
  HelpCircle,
  FileJson,
  FileText,
} from "lucide-react";
import { SmartAnimatedValue } from "@/components/Tween";
import { LogKeyManager } from "@/components/logs/LogKeyManager";
import { LogFacetsPopover } from "@/components/logs/LogFacetsPopover";
import { LogDetailDrawer } from "@/components/logs/LogDetailDrawer";
import { LogVolumeChart } from "@/components/logs/LogVolumeChart";
import { SavedViews } from "@/components/logs/SavedViews";
import { LogColumnsMenu, readColumns, writeColumns, columnLabel, getColumnValue } from "@/components/logs/LogColumnsMenu";
import { SEVERITIES, getLevelColors, formatNumber, logSeverity } from "@/components/logs/shared";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`h-4 w-4 ${isMono ? "text-[hsl(var(--chart-mono))]" : color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground"><SmartAnimatedValue value={value} /></div>
      {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
    </CardContent>
  </Card>
);

const QUERY_EXAMPLES = [
  ["level:error", "Single severity"],
  ["level:(error OR fatal)", "Multiple severities"],
  ["status:>=500", "Numeric range"],
  ["userId:123 env:production", "Combine fields (AND)"],
  ["message:\"connection refused\"", "Exact phrase"],
  ["path:/api/*", "Wildcard"],
  ["NOT level:debug", "Negation"],
  ["userId:*", "Field exists"],
];

// Loading/success/error toast using the app's proven toast.custom pattern
// (matches the AI assistant): a single fixed-id toast updated in place.
const EXPORT_TOAST_ID = "log-export";
const exportToast = (state: "loading" | "success" | "error", msg: string) => {
  const duration = state === "loading" ? Infinity : state === "success" ? 3000 : 5000;
  toast.custom(
    () => (
      <div className="flex items-center gap-3 w-full">
        {state === "loading" && <div className="h-5 w-5 shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        {state === "success" && <svg className="h-5 w-5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        {state === "error" && <svg className="h-5 w-5 shrink-0 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>}
        <span className="text-xs font-semibold text-foreground">{msg}</span>
      </div>
    ),
    { id: EXPORT_TOAST_ID, duration, className: "!max-w-[360px]" },
  );
};

export default function GlobalLogsDashboard() {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();

  const logId = router.query.logId as string | undefined;
  const initSearch = router.query.search as string | undefined;

  const retentionDays = usePlanRetention();
  const [timeRange, setTimeRange] = usePersistedTimeRange(retentionDays);
  const spanMs = getTimeSpanMs(timeRange);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(initSearch || "");
  const [debouncedSearch, setDebouncedSearch] = useState(initSearch || "");
  const [severities, setSeverities] = useState<Set<string>>(new Set());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [liveTail, setLiveTail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [columns, setColumns] = useState<string[]>(() => readColumns());
  const helpRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const pendingEdge = useRef<"first" | "last" | null>(null);

  const updateColumns = (cols: string[]) => { setColumns(cols); writeColumns(cols); };

  // Debounce free-text search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== searchInput) { setDebouncedSearch(searchInput); setPage(1); }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, debouncedSearch]);

  // Close popovers on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Effective query = severity chips + free-text
  const effectiveSearch = useMemo(() => {
    const sevs = [...severities];
    const sevClause = sevs.length ? `level:(${sevs.join(" OR ")})` : "";
    return [sevClause, debouncedSearch.trim()].filter(Boolean).join(" ");
  }, [severities, debouncedSearch]);

  const baseQuery = `${buildTimeRangeQuery(timeRange)}&search=${encodeURIComponent(effectiveSearch)}`;
  const endpoint = `/logs?${baseQuery}&page=${page}&limit=100`;

  const { data, error, isLoading, mutate, isValidating } = useSWR(token ? endpoint : null, fetcher, {
    keepPreviousData: true,
    refreshInterval: liveTail ? 4000 : 0,
  });

  // Trend only returns on page 1. When browsing deeper pages, fetch it from a
  // lightweight page-1 request so the chart stays populated (SWR dedupes/caches).
  const { data: trendData } = useSWR(
    token && page > 1 ? `/logs?${baseQuery}&page=1&limit=1` : null,
    fetcher,
    { keepPreviousData: true },
  );
  const trend: any[] = (page <= 1 ? data?.trend : trendData?.trend) || [];

  const { data: singleLogData, isLoading: isSingleLoading } = useSWR(
    token && logId ? `/logs/${logId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Lightweight ingestion-health probe to flag drops on the Ingestion button.
  const { data: ingestStats } = useSWR(token ? "/logs/ingest-stats?hours=24" : null, fetcher, { refreshInterval: 60000 });
  const hasDrops = (ingestStats?.totals?.dropped || 0) > 0;

  // Stats
  const totalLogs = data?.pagination?.total ?? data?.logs?.length ?? 0;
  const logVelocity = useMemo(() => {
    if (!totalLogs) return 0;
    const mins = spanMs / 60_000;
    return mins > 0 ? (totalLogs / mins).toFixed(1) : "0";
  }, [totalLogs, spanMs]);
  const errorCount = useMemo(() => (data?.logs || []).filter((l: any) => ["error", "fatal"].includes(logSeverity(l))).length, [data?.logs]);
  const uniqueServices = useMemo(() => new Set((data?.logs || []).map((l: any) => l.serviceId?._id || l.serviceId).filter(Boolean)).size, [data?.logs]);

  const chartData = trend.map((p: any) => ({ ...p, rawTime: p._id }));
  const axisFormatter = (str: string) => formatAxisDate(str, spanMs);

  // Attribute keys present in the current page — offered as optional columns.
  const attrKeys = (() => {
    const s = new Set<string>();
    for (const l of data?.logs || []) for (const k of Object.keys(l.attributes || {})) s.add(k);
    return Array.from(s).sort().slice(0, 40);
  })();

  // Drawer log resolution
  const selectedLog = useMemo(() => {
    if (!logId) return null;
    return data?.logs?.find((l: any) => l._id === logId) || singleLogData?.log || null;
  }, [logId, data?.logs, singleLogData]);

  const totalPages = data?.pagination?.pages || 1;
  const currentIndex = logId && data?.logs ? data.logs.findIndex((l: any) => l._id === logId) : -1;
  // Prev/next span page boundaries (when not live-tailing).
  const hasPrev = currentIndex > 0 || (!liveTail && page > 1);
  const hasNext = (currentIndex !== -1 && !!data?.logs && currentIndex < data.logs.length - 1) || (!liveTail && page < totalPages);

  const openLog = (id: string) => router.push({ query: { ...router.query, logId: id } }, undefined, { shallow: true });
  const navigateLog = (dir: "prev" | "next") => {
    if (!data?.logs) return;
    const ni = dir === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (ni >= 0 && ni < data.logs.length) { openLog(data.logs[ni]._id); return; }
    // Cross page boundary: load the adjacent page and select its edge row.
    if (dir === "prev" && page > 1) { pendingEdge.current = "last"; setPage((p) => p - 1); }
    else if (dir === "next" && page < totalPages) { pendingEdge.current = "first"; setPage((p) => p + 1); }
  };

  // After a cross-page navigation, select the appropriate edge row once it loads.
  useEffect(() => {
    if (!pendingEdge.current || !data?.logs?.length) return;
    const target = pendingEdge.current === "first" ? data.logs[0] : data.logs[data.logs.length - 1];
    pendingEdge.current = null;
    if (target) openLog(target._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.logs]);
  const closeDrawer = () => {
    const q = { ...router.query }; delete q.logId;
    router.push({ query: q }, undefined, { shallow: true });
  };

  const toggleSeverity = (sev: string) => {
    setSeverities((prev) => { const n = new Set(prev); if (n.has(sev)) n.delete(sev); else n.add(sev); return n; });
    setPage(1);
  };

  const addFilter = (field: string, value: string, negate = false) => {
    const base = /\s/.test(value) ? `${field}:"${value}"` : `${field}:${value}`;
    const clause = negate ? `-${base}` : base;
    setSearchInput((prev) => (prev.includes(clause) ? prev : `${prev} ${clause}`.trim()));
    setPage(1);
  };

  const onZoom = (start: string, end: string) => {
    setTimeRange({ type: "custom", start, end });
    setPage(1);
  };

  const doExport = async (format: "ndjson" | "csv") => {
    setShowExport(false);
    exportToast("loading", `Exporting ${format.toUpperCase()}…`);
    try {
      const res = await api.get(`/logs/export?${baseQuery}&format=${format}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      exportToast("success", "Export ready");
    } catch {
      exportToast("error", "Export failed");
    }
  };

  const getTraceLink = (log: any): string | null => {
    if (!log.traceId || !log.serviceId) return null;
    const sid = log.serviceId._id || log.serviceId;
    if (log.serviceModel === "TaskService") return `/dashboard/task/${sid}/run/${log.traceId}`;
    if (log.serviceModel === "RumService") return `/dashboard/rum/${sid}/trace/${log.traceId}`;
    return `/dashboard/apm/${sid}/trace/${log.traceId}`;
  };

  if (!data && !error && isLoading) {
    return <TablePageSkeleton stats={4} chart actions={1} columns={5} rows={10} label="Loading logs" maxWidthClass="max-w-[1600px]" />;
  }

  if (error) {
    return <div className="h-full flex items-center justify-center p-8"><DataError onRetry={() => mutate()} /></div>;
  }

  const getColor = (c: string) => (isMono ? "hsl(var(--chart-mono))" : c);

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24 relative">
        {/* Header — identity row + toolbar row (responsive, no justify-between whitespace) */}
        <div className="bg-card/50 rounded-xl border border-border/60">
          {/* Row 1: identity + primary mode toggle */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0"><Terminal className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">Log Management</h1>
                <p className="text-xs text-muted-foreground truncate">Centralized, searchable logging across APM, RUM, and custom events.</p>
              </div>
            </div>
            <Button
              variant={liveTail ? "default" : "outline"}
              size="sm"
              className={`h-9 shrink-0 ${liveTail ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : ""}`}
              onClick={() => { setLiveTail((v) => !v); setPage(1); }}
            >
              <Radio className={`h-4 w-4 sm:mr-2 ${liveTail ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{liveTail ? "Live" : "Live Tail"}</span>
            </Button>
          </div>

          {/* Row 2: actions toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <SavedViews currentSearch={searchInput} onApply={(s) => { setSearchInput(s); setDebouncedSearch(s); setPage(1); }} />

              <div className="relative" ref={exportRef}>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setShowExport((v) => !v)}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                {showExport && (
                  <div className="absolute left-0 mt-2 w-44 rounded-lg border border-border/60 bg-card shadow-xl z-50 overflow-hidden">
                    <button onClick={() => doExport("ndjson")} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted/50"><FileJson className="h-4 w-4 text-blue-500" /> NDJSON</button>
                    <button onClick={() => doExport("csv")} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 border-t border-border/40"><FileText className="h-4 w-4 text-emerald-500" /> CSV</button>
                  </div>
                )}
              </div>

              <Button variant="outline" size="sm" className="h-9 relative" onClick={() => setIsKeyModalOpen(true)} title={hasDrops ? "Some logs were dropped — view ingestion health" : "Ingestion keys & health"}>
                <Key className="h-4 w-4 mr-2" /> Ingestion
                {hasDrops && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-yellow-500 ring-2 ring-background" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <TimeRangePicker value={timeRange} onChange={(val) => { setTimeRange(val); setPage(1); }} maxRetentionDays={retentionDays} />
              <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating} className="h-9 w-9 shrink-0" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Logs" value={formatNumber(totalLogs)} sub="Logs in range" icon={Terminal} color="text-blue-500" isMono={isMono} />
          <StatCard title="Log Velocity" value={logVelocity} sub="Logs per minute" icon={Activity} color="text-purple-500" isMono={isMono} />
          <StatCard title="Error Count" value={errorCount} sub="In current view" icon={XCircle} color="text-destructive" isMono={isMono} />
          <StatCard title="Active Services" value={uniqueServices} sub="In current view" icon={Box} color="text-emerald-500" isMono={isMono} />
        </div>

        {/* Volume chart */}
        <LogVolumeChart data={chartData} axisFormatter={axisFormatter} color={getColor("#3b82f6")} onZoom={onZoom} />

        {/* Search + filters toolbar */}
        <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 space-y-3">
                <div className="relative w-full" ref={helpRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder='Search... e.g. level:error status:>=500 message:"timeout"'
                    className="pl-9 pr-20 h-10 w-full bg-background border-border/80 font-mono text-sm"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchInput && (
                      <button onClick={() => setSearchInput("")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setShowHelp((v) => !v)} className="text-muted-foreground hover:text-foreground"><HelpCircle className="h-4 w-4" /></button>
                  </div>
                  {showHelp && (
                    <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border/60 bg-card shadow-xl z-50 p-2">
                      <p className="text-[11px] text-muted-foreground px-2 py-1.5 font-semibold uppercase tracking-wider">Query syntax</p>
                      {QUERY_EXAMPLES.map(([ex, desc]) => (
                        <button key={ex} onClick={() => { setSearchInput((p) => `${p} ${ex}`.trim()); setShowHelp(false); }} className="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 text-left">
                          <code className="text-[11px] font-mono text-blue-500 truncate">{ex}</code>
                          <span className="text-[10px] text-muted-foreground shrink-0">{desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SEVERITIES.map((sev) => {
                      const active = severities.has(sev);
                      const c = getLevelColors(sev);
                      return (
                        <button
                          key={sev}
                          onClick={() => toggleSeverity(sev)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase transition-all ${active ? `${c.bg} ${c.border} ${c.text}` : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? c.dot : "bg-muted-foreground/40"}`} />
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <LogFacetsPopover queryString={baseQuery} onAddFilter={addFilter} />
                    <LogColumnsMenu attrKeys={attrKeys} selected={columns} onChange={updateColumns} />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Table */}
            <Card className="border-border/60 shadow-sm flex flex-col">
              <CardContent className="p-0 overflow-auto bg-card relative">
                {isValidating && !liveTail && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-card/90 border border-border/50 rounded-full px-2.5 py-1 shadow-sm">
                    <Spinner className="h-3 w-3 text-blue-500" /> Updating
                  </div>
                )}
                <table className={`w-full text-sm text-left transition-opacity ${isValidating && !liveTail ? "opacity-60" : ""}`}>
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold w-32">Timestamp</th>
                      <th className="px-4 py-3 font-semibold w-24">Level</th>
                      {columns.map((c) => (
                        <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">{columnLabel(c)}</th>
                      ))}
                      <th className="px-4 py-3 font-semibold">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.logs?.length === 0 ? (
                      <tr><td colSpan={3 + columns.length} className="px-6 py-12 text-center text-muted-foreground font-medium">No logs found matching your query.</td></tr>
                    ) : (
                      data?.logs?.map((log: any) => {
                        const colors = getLevelColors(logSeverity(log));
                        const isSelected = logId === log._id;
                        return (
                          <tr key={log._id} onClick={() => openLog(log._id)} className={`hover:bg-muted/40 transition-colors cursor-pointer group ${isSelected ? "bg-muted/20" : ""}`}>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`${colors.bg} ${colors.border} ${colors.text} uppercase text-[9px] font-bold px-1.5`}>{logSeverity(log)}</Badge>
                            </td>
                            {columns.map((c) => {
                              const v = getColumnValue(log, c);
                              const display = v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                              return (
                                <td key={c} className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap max-w-[180px] truncate" title={display}>{display}</td>
                              );
                            })}
                            <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-sm md:max-w-xl lg:max-w-2xl xl:max-w-3xl">{log.message}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>

              {/* Pagination (hidden during live tail) */}
              {!liveTail && data?.pagination?.pages > 1 && (
                <div className="p-4 border-t border-border/40 bg-card/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Page {page} of {data.pagination.pages} ({data.pagination.total} logs)</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8"><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className="h-8">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </div>
              )}
            </Card>
      </div>

      {/* Drawer */}
      {logId && (
        <LogDetailDrawer
          log={selectedLog}
          isLoading={isSingleLoading}
          onClose={closeDrawer}
          onNavigate={navigateLog}
          hasPrev={hasPrev}
          hasNext={!!hasNext}
          onSelectLog={openLog}
          getTraceLink={getTraceLink}
          onOpenTrace={(href) => router.push(href)}
          onAddFilter={addFilter}
        />
      )}

      {/* Ingestion key manager + integrations */}
      <LogKeyManager open={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
    </>
  );
}
