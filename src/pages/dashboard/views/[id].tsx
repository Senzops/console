import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Editor from "@monaco-editor/react";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import { DashboardLayout } from "../../../components/Layout";
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Dialog, Input, Select, DataError
} from "../../../components/Core";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import {
  LayoutTemplate, Plus, Save, Edit3, Trash2, Maximize, X, GripHorizontal, 
  Terminal, Server, Box, MonitorSmartphone, Workflow, Database, Activity, RefreshCw, AlertTriangle, Play, BookOpen, CheckCircle, Zap
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { SmartAnimatedValue } from "@/components/Tween";

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const postFetcher = (url: string, payload: any) => api.post(url, payload).then(res => res.data);

// --- Helpers & Constants ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

const getTargetIcon = (target: string) => {
  switch (target) {
    case 'apm': return <Box className="h-4 w-4 text-orange-500" />;
    case 'rum': return <MonitorSmartphone className="h-4 w-4 text-pink-500" />;
    case 'logs': return <Terminal className="h-4 w-4 text-blue-500" />;
    case 'task': return <Workflow className="h-4 w-4 text-indigo-500" />;
    case 'vps': return <Server className="h-4 w-4 text-emerald-500" />;
    case 'database': return <Database className="h-4 w-4 text-blue-400" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const DEFAULT_QUERIES: Record<string, string> = {
  logs: '{\n  "level": "error",\n  "message": { "$regex": "timeout", "$options": "i" }\n}',
  apm: '{\n  "duration": { "$gt": 2000 },\n  "status": { "$gte": 500 }\n}',
  vps: '{\n  "metrics.cpu.usage": { "$gt": 90 }\n}',
  database: '{\n  "latency": { "$gt": 150 }\n}',
  uptime: '{\n  "status": "down"\n}',
  rum: '{\n  "metrics.lcp": { "$gt": 2500 }\n}',
  task: '{\n  "status": "failed"\n}'
};

// --- Quick Templates Engine ---
const QUICK_TEMPLATES: Record<string, any[]> = {
  apm: [
    { label: "Avg Latency Trend", config: { viz: "area", agg: "avg", field: "duration", group: "" }, query: "{}" },
    { label: "Latency by Service", config: { viz: "line", agg: "avg", field: "duration", group: "serviceId" }, query: "{}" },
    { label: "Error Count by Service", config: { viz: "bar", agg: "count", field: "", group: "serviceId" }, query: "{\n  \"status\": { \"$gte\": 500 }\n}" },
    { label: "Slow Traces Table", config: { viz: "table", agg: "count", field: "", group: "" }, query: "{\n  \"duration\": { \"$gt\": 1500 }\n}" }
  ],
  logs: [
    { label: "Error Logs Count", config: { viz: "line", agg: "count", field: "", group: "" }, query: "{\n  \"level\": \"error\"\n}" },
    { label: "Logs by Level", config: { viz: "pie", agg: "count", field: "", group: "level" }, query: "{}" }
  ],
  vps: [
    { label: "CPU Usage Trend", config: { viz: "line", agg: "avg", field: "metrics.cpu.usage", group: "vpsId" }, query: "{}" },
    { label: "Max RAM Usage", config: { viz: "area", agg: "max", field: "metrics.memory.usedPercent", group: "" }, query: "{}" }
  ],
  database: [
    { label: "Avg Query Latency", config: { viz: "line", agg: "avg", field: "latency", group: "" }, query: "{}" },
    { label: "Ops/sec by DB", config: { viz: "area", agg: "avg", field: "ops", group: "dbId" }, query: "{}" }
  ]
};

// --- Recharts Tooltip Formatting ---
const formatAxisDate = (str: string, range: string) => {
  if (!str) return '';
  const date = new Date(str);
  return date.toLocaleString(undefined, { 
    month: range === '1h' ? undefined : 'short', 
    day: range === '1h' ? undefined : 'numeric', 
    hour: 'numeric', 
    minute: range === '1h' ? '2-digit' : undefined 
  });
};

const CustomTooltip = ({ active, payload, label, range }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-semibold text-foreground mb-1">{formatAxisDate(label, range)}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Sub-Component: Chart Renderer ---
const ChartRenderer = ({ data, config, visualization, range, isMono }: any) => {
  if (!data || (Array.isArray(data) && data.length === 0 && visualization !== 'billboard')) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium">No data available for this query</div>;
  }

  const getColor = (index: number) => isMono ? 'hsl(var(--chart-mono))' : CHART_COLORS[index % CHART_COLORS.length];

  if (visualization === 'billboard') {
    const val = Array.isArray(data) && data.length > 0 ? data[0].value : (data.value || 0);
    return (
      <div className="h-full flex flex-col items-center justify-center">
         <div className="text-5xl font-bold tracking-tighter text-foreground">
           <SmartAnimatedValue value={formatNumber(val || 0)} />
         </div>
      </div>
    );
  }

  if (visualization === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip content={<CustomTooltip range={range} />} />
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
            {data.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={getColor(index)} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (visualization === 'table') {
    return (
      <div className="w-full h-full overflow-auto rounded-md border border-border/40 bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
           <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                {Object.keys(data[0] || {}).map(k => <th key={k} className="px-4 py-3 font-semibold">{k}</th>)}
              </tr>
           </thead>
           <tbody className="divide-y divide-border/40">
              {data.map((row:any, i:number) => (
                 <tr key={i} className="hover:bg-muted/30 transition-colors">
                    {Object.values(row).map((val:any, j:number) => (
                      <td key={j} className="px-4 py-2 font-mono text-xs truncate max-w-[300px]">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                    ))}
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
    );
  }

  // Time-Series (Area, Line, Bar)
  const keys = config.groupBy ? Object.keys(data[0] || {}).filter(k => k !== 'time') : ['value'];

  return (
    <ResponsiveContainer width="100%" height="100%">
       {visualization === 'area' ? (
         <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
           <XAxis dataKey="time" hide />
           <YAxis hide />
           <RechartsTooltip contentStyle={{backgroundColor:'hsl(var(--card))', border:'1px solid hsl(var(--border))'}} content={<CustomTooltip range={range} />} />
           {keys.map((k, i) => (
             <React.Fragment key={k}>
               <defs><linearGradient id={`color-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={getColor(i)} stopOpacity={0.3}/><stop offset="95%" stopColor={getColor(i)} stopOpacity={0}/></linearGradient></defs>
               <Area type="monotone" dataKey={k} stackId={config.groupBy ? "1" : undefined} stroke={getColor(i)} fill={`url(#color-${k})`} strokeWidth={2} />
             </React.Fragment>
           ))}
         </AreaChart>
       ) : visualization === 'bar' ? (
         <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
           <XAxis dataKey="time" hide />
           <YAxis hide />
           <RechartsTooltip contentStyle={{backgroundColor:'hsl(var(--card))', border:'1px solid hsl(var(--border))'}} content={<CustomTooltip range={range} />} />
           {keys.map((k, i) => <Bar key={k} dataKey={k} stackId={config.groupBy ? "1" : undefined} fill={getColor(i)} radius={config.groupBy ? [0,0,0,0] : [2,2,0,0]} />)}
         </BarChart>
       ) : (
         <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
           <XAxis dataKey="time" hide />
           <YAxis hide />
           <RechartsTooltip contentStyle={{backgroundColor:'hsl(var(--card))', border:'1px solid hsl(var(--border))'}} content={<CustomTooltip range={range} />} />
           {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={getColor(i)} strokeWidth={2} dot={false} />)}
         </LineChart>
       )}
    </ResponsiveContainer>
  );
};

// --- Sub-Component: Widget Data Fetcher Wrapper ---
const WidgetWrapper = ({ widget, layoutNode, range, isEditing, isMono, onWidthChange, onEdit, onDelete, dragHandleProps }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { data, error, isValidating } = useSWR(`/views/widgets/${widget._id}/data?range=${range}`, fetcher, { refreshInterval: 60000 });

  const Header = (
    <CardHeader className="p-3 pb-2 border-b border-border/40 flex flex-row items-center justify-between shrink-0 bg-card/50 cursor-default group/header">
       <div className="flex items-center gap-2 overflow-hidden">
         {isEditing && (
           <div {...dragHandleProps} className="cursor-grab hover:text-primary active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 transition-colors">
             <GripHorizontal className="h-4 w-4" />
           </div>
         )}
         {getTargetIcon(widget.target)}
         <CardTitle className="text-sm font-semibold truncate">{widget.name}</CardTitle>
       </div>
       <div className="flex items-center gap-1 transition-opacity">
         {isEditing ? (
           <>
             <div className="flex bg-muted/50 rounded border border-border/50 p-0.5 mr-2">
               <button type="button" onClick={() => onWidthChange(widget._id, 4)} className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${layoutNode.w === 4 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>1/3</button>
               <button type="button" onClick={() => onWidthChange(widget._id, 6)} className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${layoutNode.w === 6 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>1/2</button>
               <button type="button" onClick={() => onWidthChange(widget._id, 12)} className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${layoutNode.w === 12 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>FULL</button>
             </div>
             <Button type="button" variant="outline" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground bg-background" onClick={() => onEdit(widget)}><Edit3 className="h-3.5 w-3.5" /></Button>
             <Button type="button" variant="outline" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 border-destructive/20 bg-background" onClick={() => onDelete(widget._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
           </>
         ) : (
           <>
             {isValidating && <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin mr-2" />}
             <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsMaximized(!isMaximized)}>
               {isMaximized ? <X className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
             </Button>
           </>
         )}
       </div>
    </CardHeader>
  );

  const Content = (
    <Card className={`flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden ${isMaximized ? 'fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card' : 'h-[320px]'}`}>
       {Header}
       <CardContent className="p-4 flex-1 overflow-hidden relative">
          {!data && !error ? <div className="h-full flex items-center justify-center"><Spinner className="h-6 w-6 text-primary" /></div> 
           : error ? <div className="h-full flex items-center justify-center text-xs text-destructive">Failed to load data</div>
           : <ChartRenderer data={data.data} config={widget.config} visualization={widget.visualization} range={range} isMono={isMono} />}
       </CardContent>
    </Card>
  );

  return <>{isMaximized && createPortal(<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsMaximized(false)} />, document.body)}{isMaximized ? createPortal(Content, document.body) : Content}</>;
};

export default function CustomDashboardView() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const { theme, isMono } = useTheme();

  // --- State ---
  const [range, setRange] = useState('24h');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Dashboard Deletion State
  const [isDeleteViewOpen, setIsDeleteViewOpen] = useState(false);
  const [isDeletingView, setIsDeletingView] = useState(false);

  // Custom Drag & Drop State
  const [localLayout, setLocalLayout] = useState<any[]>([]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  // Modals & Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  
  // Builder Form & Uncontrolled Editor Ref
  const [builderForm, setBuilderForm] = useState({
    name: "", target: "apm", visualization: "line", queryStr: DEFAULT_QUERIES['apm'] || "{}",
    config: { aggregate: "count", aggregateField: "", groupBy: "" }
  });
  const editorRef = useRef<any>(null);
  
  // Live Preview State
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // --- Data Fetching ---
  const { data, error, mutate, isValidating } = useSWR(token && id ? `/views/${id}` : null, fetcher, { revalidateOnFocus: false });
  const { data: schemaData } = useSWR(token ? '/views/schema' : null, fetcher);

  useEffect(() => {
    if (data?.view?.layout) setLocalLayout([...data.view.layout]);
  }, [data?.view?.layout, isEditing]);

  // --- Actions ---
  const toggleEditMode = async () => {
    if (isEditing) {
      setIsSaving(true);
      try {
        await api.put(`/views/${id}`, { layout: localLayout });
        mutate();
        toast.success("Dashboard layout saved.");
      } catch (err) { toast.error("Failed to save layout."); }
      finally { setIsSaving(false); setIsEditing(false); }
    } else {
      setIsEditing(true);
    }
  };

  const deleteView = async () => {
    setIsDeletingView(true);
    try {
      await api.delete(`/views/${id}`);
      toast.success("Dashboard deleted.");
      router.push('/dashboard');
    } catch (err) { 
      toast.error("Failed to delete dashboard."); 
      setIsDeletingView(false);
    }
  };

  // --- Custom Drag & Drop Engine ---
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditing) return;
    e.dataTransfer.effectAllowed = 'move';
    setDraggedWidgetId(widgetId);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) return;
    const newLayout = [...localLayout];
    const draggedIndex = newLayout.findIndex(l => l.i === draggedWidgetId);
    const targetIndex = newLayout.findIndex(l => l.i === targetWidgetId);
    const [draggedItem] = newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, draggedItem);
    setLocalLayout(newLayout);
    setDraggedWidgetId(null);
  };

  const handleWidthChange = (widgetId: string, newWidth: number) => {
    setLocalLayout(prev => prev.map(l => l.i === widgetId ? { ...l, w: newWidth } : l));
  };

  // --- Widget Builder Handlers ---
  const handleEditorMount = (editor: any) => { editorRef.current = editor; };

  const applyTemplate = (template: any) => {
    setBuilderForm(prev => ({
      ...prev,
      visualization: template.config.viz,
      queryStr: template.query,
      config: { aggregate: template.config.agg, aggregateField: template.config.field, groupBy: template.config.group }
    }));
    setTimeout(() => {
      editorRef.current?.setValue(template.query);
    }, 50);
  };

  const openCreateWidget = () => {
    setEditingWidgetId(null);
    setBuilderForm({ name: "", target: "apm", visualization: "line", queryStr: DEFAULT_QUERIES['apm'] || "{}", config: { aggregate: "count", aggregateField: "", groupBy: "" } });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(() => editorRef.current?.setValue(DEFAULT_QUERIES['apm'] || "{}"), 100); 
  };

  const openEditWidget = (w: any) => {
    setEditingWidgetId(w._id);
    setBuilderForm({ name: w.name, target: w.target, visualization: w.visualization, queryStr: JSON.stringify(w.query, null, 2), config: { aggregate: w.config.aggregate, aggregateField: w.config.aggregateField || "", groupBy: w.config.groupBy || "" } });
    setPreviewData(null);
    setIsBuilderOpen(true);
    setTimeout(() => editorRef.current?.setValue(JSON.stringify(w.query, null, 2)), 100);
  };

  const runLivePreview = async () => {
    const queryStr = editorRef.current?.getValue() || "{}";
    let parsedQuery;
    try { parsedQuery = JSON.parse(queryStr); } 
    catch (err) { toast.error("Invalid JSON MQL format in Editor."); return; }

    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await postFetcher('/views/execute', {
        target: builderForm.target,
        query: parsedQuery,
        visualization: builderForm.visualization,
        config: builderForm.config,
        range
      });
      setPreviewData(res);
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || "Failed to execute preview");
    } finally { setIsPreviewLoading(false); }
  };

  const saveWidget = async () => {
    if (!builderForm.name) { toast.error("Widget needs a name"); return; }
    const queryStr = editorRef.current?.getValue() || "{}";
    let parsedQuery;
    try { parsedQuery = JSON.parse(queryStr); } 
    catch (err) { toast.error("Invalid JSON MQL format."); return; }

    setIsSaving(true);
    try {
      const payload = {
        viewId: id,
        name: builderForm.name,
        target: builderForm.target,
        query: parsedQuery,
        visualization: builderForm.visualization,
        config: builderForm.config
      };

      if (editingWidgetId) {
        await api.put(`/views/widgets/${editingWidgetId}`, payload);
        toast.success("Widget updated!");
      } else {
        const res = await api.post("/views/widgets", payload);
        setLocalLayout(res.data.layout);
        toast.success("Widget added to dashboard!");
      }
      setIsBuilderOpen(false);
      mutate();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to save widget"); }
    finally { setIsSaving(false); }
  };

  const confirmDeleteWidget = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/views/widgets/${deleteModal}`);
      setLocalLayout(prev => prev.filter(l => l.i !== deleteModal));
      mutate();
      toast.success("Widget removed.");
      setDeleteModal(null);
    } catch (err) { toast.error("Failed to delete widget."); }
  };

  if (!data && !error) return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8 text-emerald-500" />
        <p className="text-muted-foreground">Loading saved view...</p>
      </div>
    </DashboardLayout>
  );
  if (error) return (
    <DashboardLayout>
      <div className="h-full flex items-center justify-center p-8">
        <DataError onRetry={() => mutate()} />
      </div>
    </DashboardLayout>
  );

  const { view, widgets } = data;
  const orderedLayout = isEditing ? localLayout : (data?.view?.layout || []);
  const availableTargets = Object.keys(schemaData?.schema || {});

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
        
        {/* --- Unified APM Style Header --- */}
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isEditing ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-card/50 border-border/60'}`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{view.name}</h1>
              <Badge variant="outline" className="border-teal-500/20 text-teal-500 bg-teal-500/10 font-mono text-[10px] font-bold tracking-wider">SAVED VIEW</Badge>
              {isEditing && <Badge variant="default" className="animate-pulse text-[10px] uppercase font-bold tracking-wider">EDIT MODE</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{view.description || "Custom Dashboard Canvas"}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!isEditing ? (
              <>
                <Select className="w-32 bg-background h-9 text-xs" value={range} onChange={(e) => setRange(e.target.value)}>
                  <option value="1h">Last 1 Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </Select>
                <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isValidating} className="h-9 w-9"><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></Button>
                <div className="h-6 w-px bg-border mx-1 hidden md:block"></div>
                <Button onClick={toggleEditMode} className="h-9 shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  <Edit3 className="h-4 w-4 mr-2" /> Edit
                </Button>
              </>
            ) : (
              <>
                <Button onClick={openCreateWidget} variant="outline" className="h-9 border-dashed border-primary/50 text-primary hover:bg-primary/10 bg-background"><Plus className="h-4 w-4 mr-2" /> Add Widget</Button>
                <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 border-destructive/20 bg-background" onClick={() => setIsDeleteViewOpen(true)}><Trash2 className="h-4 w-4" /></Button>
                <div className="h-6 w-px bg-border mx-1 hidden md:block"></div>
                <Button onClick={toggleEditMode} disabled={isSaving} className="h-9 shadow-md bg-primary text-primary-foreground">
                  {isSaving ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* --- Custom Drag & Drop Grid Engine --- */}
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 transition-all ${isEditing ? 'p-4 border-2 border-dashed border-primary/20 rounded-xl bg-muted/10 min-h-[400px]' : ''}`}>
           {orderedLayout.map((node: any) => {
              const widget = widgets.find((w: any) => w._id === node.i);
              if (!widget) return null;
              const spanClass = node.w === 12 ? 'col-span-1 md:col-span-12' : node.w === 6 ? 'col-span-1 md:col-span-6' : 'col-span-1 md:col-span-4';

              return (
                <div key={node.i} className={`${spanClass} transition-all duration-300 ease-in-out`} draggable={isEditing} onDragStart={(e) => handleDragStart(e, node.i)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, node.i)}>
                  <div className={`h-full ${draggedWidgetId === node.i ? 'opacity-50 scale-95' : 'opacity-100 scale-100'} transition-transform`}>
                     <WidgetWrapper widget={widget} layoutNode={node} range={range} isEditing={isEditing} isMono={isMono} onWidthChange={handleWidthChange} onEdit={openEditWidget} onDelete={(id:string) => setDeleteModal(id)} dragHandleProps={{}} />
                  </div>
                </div>
              );
           })}
           {orderedLayout.length === 0 && !isEditing && (
             <div className="col-span-full py-24 flex flex-col items-center justify-center text-center border border-dashed border-border/60 rounded-xl bg-card/30">
               <LayoutTemplate className="h-12 w-12 text-muted-foreground/30 mb-4" />
               <h3 className="text-lg font-medium text-foreground">Canvas is Empty</h3>
               <p className="text-sm text-muted-foreground mt-1 mb-6">Enter Edit Mode to add visualization widgets.</p>
               <Button onClick={toggleEditMode}><Edit3 className="h-4 w-4 mr-2"/> Edit Dashboard</Button>
             </div>
           )}
        </div>
      </div>

      {/* --- MODAL: MASSIVE WIDGET BUILDER --- */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in">
          {/* Background click overlay to allow closing like a Dialog */}
          <div className="absolute inset-0" onClick={() => !isSaving && setIsBuilderOpen(false)} />
          
          <Card className="w-full max-w-[1600px] h-[95vh] flex flex-col border-border/60 shadow-2xl bg-background overflow-hidden relative z-10">
             {/* BUILDER HEADER */}
             <div className="border-b border-border/40 bg-card/50 flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 shrink-0 z-10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shrink-0"><Box className="h-4 w-4 text-teal-500" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-foreground leading-none mb-1">{editingWidgetId ? "Edit Widget" : "Data Explorer & Builder"}</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Real-time Preview Engine</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setIsBuilderOpen(false)} disabled={isSaving} className="h-8 w-8 md:hidden hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <Select className="w-full sm:w-32 bg-muted/50 h-8 text-xs font-medium border-border/40" value={range} onChange={(e) => setRange(e.target.value)}>
                     <option value="1h">Last 1 Hour</option><option value="24h">Last 24 Hours</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option>
                   </Select>
                   <Button variant="secondary" onClick={runLivePreview} disabled={isPreviewLoading} className="h-8 text-xs font-bold border border-border/50 shadow-sm flex-1 sm:flex-none">
                     {isPreviewLoading ? <><Spinner className="h-3 w-3 mr-2 hidden sm:inline" /> Executing...</> : <><Play className="h-3 w-3 mr-1.5 fill-current hidden sm:inline" /> Run Query</>}
                   </Button>
                   <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
                   <Button onClick={saveWidget} disabled={isSaving || !previewData} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-md flex-1 sm:flex-none sm:min-w-[120px]">
                     {isSaving ? <Spinner className="h-3 w-3 mx-auto" /> : (editingWidgetId ? "Update Widget" : "Save to Dashboard")}
                   </Button>
                   <Button variant="ghost" size="icon" onClick={() => setIsBuilderOpen(false)} disabled={isSaving} className="h-8 w-8 ml-2 hover:bg-destructive/10 hover:text-destructive transition-colors hidden md:flex shrink-0"><X className="h-4 w-4" /></Button>
                </div>
             </div>

             <div className="p-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                   
                   {/* LEFT PANE: Core Info & Editor */}
                   <div className="lg:col-span-2 flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Widget Name</label>
                          <Input placeholder="e.g., API Latency Trend" value={builderForm.name} onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Source</label>
                          <Select value={builderForm.target} onChange={(e) => {
                              const newTarget = e.target.value;
                              setBuilderForm(prev => ({ 
                                ...prev, 
                                target: newTarget, 
                                queryStr: DEFAULT_QUERIES[newTarget] || "{}", 
                                config: { aggregate: "count", aggregateField: "", groupBy: "" } 
                              }));
                              setTimeout(() => editorRef.current?.setValue(DEFAULT_QUERIES[newTarget] || "{}"), 50);
                              setPreviewData(null);
                          }} className="capitalize h-9 font-medium">
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

                      <div className="flex-1 min-h-[200px] border border-border/60 rounded-xl overflow-hidden bg-[#1e1e1e] flex flex-col shadow-inner">
                        <div className="bg-[#2d2d2d] border-b border-border/40 px-4 py-2 flex flex-col gap-2 shrink-0">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Terminal className="h-3 w-3 text-blue-400" /> Filter Engine (MQL)</label>
                            <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 uppercase font-mono tracking-wider"><CheckCircle className="h-3 w-3" /> Tenant Sandbox Enforced</div>
                          </div>
                          {/* QUICK TEMPLATES */}
                          {QUICK_TEMPLATES[builderForm.target] && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-muted-foreground mr-1"><Zap className="h-3 w-3 inline mr-0.5 fill-current text-amber-500"/> Examples:</span>
                              {QUICK_TEMPLATES[builderForm.target].map((template, i) => (
                                 <Badge key={i} variant="outline" className="cursor-pointer bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a] text-[9px] text-gray-300 transition-colors py-0.5" onClick={() => applyTemplate(template)}>
                                   {template.label}
                                 </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full pt-2">
                          <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme={theme === "light" ? "light" : "vs-dark"}
                            value={builderForm.queryStr}
                            onMount={handleEditorMount}
                            onChange={(val) => setBuilderForm({ ...builderForm, queryStr: val || "{}" })}
                            options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13, formatOnPaste: true, tabSize: 2 }}
                          />
                        </div>
                      </div>
                   </div>

                   {/* RIGHT PANE: Visual Config & Docs */}
                   <div className="lg:col-span-1 flex flex-col gap-6">
                      <div className="bg-muted/30 border border-border/60 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-orange-500" /> Visualization Config</h3>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Chart Type</label>
                          <Select value={builderForm.visualization} onChange={(e) => setBuilderForm({ ...builderForm, visualization: e.target.value })}>
                            <option value="line">Line Chart (Time Series)</option>
                            <option value="area">Area Chart (Time Series)</option>
                            <option value="bar">Bar Chart (Time Series)</option>
                            <option value="pie">Pie Chart (Categorical)</option>
                            <option value="billboard">Billboard (Big Number)</option>
                            <option value="table">Raw Data Table</option>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Aggregate Math</label>
                            <Select value={builderForm.config.aggregate} onChange={(e) => setBuilderForm({ ...builderForm, config: { ...builderForm.config, aggregate: e.target.value } })}>
                              <option value="count">Count Rows</option><option value="avg">Average</option><option value="sum">Sum</option><option value="max">Maximum</option>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Target Field</label>
                            <Input placeholder="e.g., duration" value={builderForm.config.aggregateField} onChange={(e) => setBuilderForm({ ...builderForm, config: { ...builderForm.config, aggregateField: e.target.value } })} disabled={builderForm.config.aggregate === 'count'} className="h-9" />
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <label className="text-xs font-medium text-muted-foreground">Group By Field <span className="lowercase font-normal opacity-70">(Optional)</span></label>
                          <Input placeholder="e.g., serviceId, status" value={builderForm.config.groupBy} onChange={(e) => setBuilderForm({ ...builderForm, config: { ...builderForm.config, groupBy: e.target.value } })} disabled={builderForm.visualization === 'billboard'} className="h-9" />
                        </div>
                      </div>

                      {/* Schema Docs */}
                      <div className="border border-border/40 rounded-xl flex flex-col flex-1 overflow-hidden">
                        <div className="bg-muted/50 p-3 border-b border-border/40"><h3 className="text-xs font-bold flex items-center gap-2"><BookOpen className="h-3 w-3 text-blue-500" /> Available Attributes</h3></div>
                        <div className="p-3 space-y-2 overflow-y-auto max-h-[150px] scrollbar-thin">
                           {schemaData?.schema?.[builderForm.target]?.map((doc:any, i:number) => (
                             <div key={i} className="flex flex-col gap-0.5 bg-card border border-border/60 p-2.5 rounded-lg shadow-sm"><div className="flex items-center gap-2"><code className="text-xs text-blue-500 font-bold">{doc.field}</code><span className="text-[9px] uppercase font-mono opacity-50 bg-secondary px-1 rounded">{doc.type}</span></div><p className="text-[10px] text-muted-foreground mt-0.5">{doc.desc}</p></div>
                           ))}
                           {(!schemaData?.schema?.[builderForm.target] || schemaData.schema[builderForm.target].length === 0) && (
                             <p className="text-[10px] text-muted-foreground text-center py-4">No schema attributes available for this target.</p>
                           )}
                        </div>
                      </div>
                   </div>

                </div>

                {/* BOTTOM PANE: Live Preview */}
                <div className="px-6 pb-6 pt-0 flex-1 flex flex-col min-h-[300px]">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Play className="h-4 w-4 text-teal-500" /> Live Preview Engine</h3>
                     <Button size="sm" variant="secondary" onClick={runLivePreview} disabled={isPreviewLoading} className="h-8 text-xs font-bold">
                       {isPreviewLoading ? <><Spinner className="h-3 w-3 mr-2" /> Running Engine...</> : "Run Preview Data"}
                     </Button>
                   </div>
                   <div className="flex-1 bg-card rounded-xl border border-border/60 p-4 shadow-inner relative overflow-hidden flex flex-col">
                      {!previewData && !previewError && !isPreviewLoading ? (
                        <div className="m-auto text-center text-muted-foreground text-xs"><Activity className="h-8 w-8 mx-auto mb-2 opacity-20" /> Configure widget and click Run Preview</div>
                      ) : isPreviewLoading ? (
                        <div className="m-auto"><Spinner className="h-8 w-8 text-teal-500" /></div>
                      ) : previewError ? (
                        <div className="m-auto text-destructive text-sm font-mono text-center"><AlertTriangle className="h-6 w-6 mx-auto mb-2" />{previewError}</div>
                      ) : (
                        <div className="h-full w-full"><ChartRenderer data={previewData?.data} config={builderForm.config} visualization={builderForm.visualization} range={range} isMono={isMono} /></div>
                      )}
                   </div>
                </div>
             </div>
          </Card>
        </div>
      )}

      {/* --- MODAL: DELETE WIDGET --- */}
      <Dialog open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Widget?">
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
               <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
               <div className="text-sm">
                  <span className="font-bold block mb-1">Warning: Irreversible Action</span>
                  This will permanently remove this visualization from your dashboard.
               </div>
            </div>
            <div className="flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setDeleteModal(null)}>Cancel</Button>
               <Button variant="destructive" onClick={confirmDeleteWidget}><Trash2 className="h-4 w-4 mr-2" /> Remove</Button>
            </div>
        </div>
      </Dialog>

      {/* --- MODAL: DELETE DASHBOARD --- */}
      <Dialog open={isDeleteViewOpen} onClose={() => setIsDeleteViewOpen(false)} title="Delete Dashboard?">
        <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
               <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
               <div className="text-sm">
                  <span className="font-bold block mb-1">Warning: Irreversible Action</span>
                  This will permanently delete the dashboard <strong>{view?.name}</strong> and all its configured widgets.
               </div>
            </div>
            <div className="flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setIsDeleteViewOpen(false)} disabled={isDeletingView}>Cancel</Button>
               <Button variant="destructive" onClick={deleteView} disabled={isDeletingView}>
                  {isDeletingView ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete Dashboard
               </Button>
            </div>
        </div>
      </Dialog>

    </DashboardLayout>
  );
}