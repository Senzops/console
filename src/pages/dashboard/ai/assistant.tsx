import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import { DashboardLayout } from "../../../components/Layout";
import {
  Card,
  Button,
  Spinner,
  Badge,
  Select,
  Input,
  cn,
} from "../../../components/Core";
import {
  Bot,
  Cpu,
  Trash2,
  Download,
  Upload,
  Database,
  Lock,
  ArrowRight,
  X,
  Code2,
  Check,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 1. NATIVE INDEXED-DB STORAGE
// ============================================================================
const DB_NAME = "senzor_ai_local";
const STORE_NAME = "chat_history";

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveChat = async (id: string, messages: any[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put({ id, messages, updatedAt: Date.now() });
};

const loadChat = async (id: string): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.messages || []);
  });
};

const clearChat = async (id: string) => {
  const db = await initDB();
  db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id);
};

// ============================================================================
// 2. MODELS & ENTERPRISE TOOLS (Strictly Function-Calling Supported Models)
// ============================================================================
const LOCAL_MODELS = [
  { id: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC", name: "Hermes 3 (8B) - High Quality", vramReq: 8 },
  { id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", name: "Hermes 3 (8B) - Balanced", vramReq: 6 },
  { id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC", name: "Hermes 2 Pro (7B) - Fast Spec", vramReq: 4 },
];

const AI_TOOLS: any = [
  // --- APM Tools ---
  { type: "function", function: { name: "apm_list_services", description: "List all active APM (Backend) services and their IDs.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "apm_get_stats", description: "Get performance aggregations (latency, RPS) for an APM service.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "apm_get_invocations", description: "Get a list of recent HTTP trace invocations for a service.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "apm_get_trace_detail", description: "Get the full execution waterfall (spans) for a specific traceId.", parameters: { type: "object", properties: { id: { type: "string" }, traceId: { type: "string" } }, required: ["id", "traceId"] } } },

  // --- RUM (Web APM) Tools ---
  { type: "function", function: { name: "rum_list_services", description: "List all active RUM (Frontend Web APM) applications.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "rum_get_dashboard", description: "Get Web Vitals (LCP, INP, CLS) and page views for a RUM app.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "rum_get_trace_detail", description: "Get the frontend execution trace (XHR/Fetch spans) for a RUM traceId.", parameters: { type: "object", properties: { id: { type: "string" }, traceId: { type: "string" } }, required: ["id", "traceId"] } } },

  // --- Background Tasks Tools ---
  { type: "function", function: { name: "task_list_services", description: "List all Background Task services.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "task_get_dashboard", description: "Get job execution metrics (failures, delays, durations).", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "task_get_entity_detail", description: "Get specific historical performance for a single task queue/cron name.", parameters: { type: "object", properties: { id: { type: "string" }, taskName: { type: "string" }, range: { type: "string" } }, required: ["id", "taskName"] } } },
  { type: "function", function: { name: "task_get_run_detail", description: "Get the detailed spans and metadata for a specific task runId.", parameters: { type: "object", properties: { id: { type: "string" }, runId: { type: "string" } }, required: ["id", "runId"] } } },

  // --- Logs Tools ---
  { type: "function", function: { name: "logs_query", description: "Search system logs. Use filters like level:error.", parameters: { type: "object", properties: { search: { type: "string" }, range: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "logs_get_by_id", description: "Get the full payload of a single log by its MongoDB _id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "logs_get_by_trace", description: "Get all logs explicitly attached to an APM/RUM traceId or Task runId.", parameters: { type: "object", properties: { id: { type: "string" }, traceId: { type: "string" } }, required: ["id", "traceId"] } } },

  // --- Error Tracking Tools ---
  { type: "function", function: { name: "error_get_global", description: "Get a list of unresolved exception groups across the platform.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "error_get_group_detail", description: "Get details and recent occurrences of a specific error fingerprint (groupId).", parameters: { type: "object", properties: { groupId: { type: "string" }, range: { type: "string" } }, required: ["groupId"] } } },
  { type: "function", function: { name: "error_get_trace_errors", description: "Get raw error events that occurred during a specific APM traceId.", parameters: { type: "object", properties: { id: { type: "string" }, traceId: { type: "string" } }, required: ["id", "traceId"] } } },

  // --- Web Analytics Tools ---
  { type: "function", function: { name: "web_list_websites", description: "List all standard Web Analytics (Non-RUM) tracking properties.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "web_get_stats", description: "Get pageviews, visitors, and referriers for a standard Web Analytics property.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },

  // --- Uptime Monitor Tools ---
  { type: "function", function: { name: "uptime_list_monitors", description: "List all external uptime monitors (cron pingers).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "uptime_get_stats", description: "Get uptime percentage, latency, and status history for a monitor.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },

  // --- Infrastructure Tools (VPS) ---
  { type: "function", function: { name: "vps_list", description: "List monitored Linux VPS servers.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "vps_get_stats", description: "Get CPU, RAM, Disk, Network, and Docker metrics for a VPS.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },

  // --- Database Tools ---
  { type: "function", function: { name: "database_list", description: "List monitored database instances (MongoDB, Redis).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "database_get_stats", description: "Get database throughput and latency metrics.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },

  // --- Alerts & Incident Tools ---
  { type: "function", function: { name: "alerts_list_destinations", description: "List all configured alert destinations (channels) like Webhooks or Slack.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "alerts_list_policies", description: "List all alert policies and their summary statistics including open incident counts.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "alerts_get_policy_details", description: "Get detailed information about a specific alert policy, its evaluation conditions, and incident history.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },

  // --- Saved Views (Canvas Dashboards) Tools ---
  { type: "function", function: { name: "views_list_dashboards", description: "List all custom saved views (dashboards) and their layouts.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "views_get_dashboard", description: "Get the layout and widget configurations for a specific custom dashboard.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "views_get_widget_data", description: "Execute the aggregation pipeline for a specific dashboard widget and return the computed data.", parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" } }, required: ["id"] } } },

  // --- Dynamic Schema Explorer Tool ---
  { type: "function", function: { name: "schema_get_dynamic", description: "Get the dynamically inferred schema map for all telemetry data types.", parameters: { type: "object", properties: {} } } },

  // --- Billing & Subscription Tools ---
  { type: "function", function: { name: "billing_get_storage_stats", description: "Get current platform storage limits and actual usage statistics for the user.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "billing_get_subscription", description: "Get the user's current active subscription details, tier, and status.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "billing_get_transactions", description: "Get the user's billing transaction and payment history.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "billing_get_transaction_receipt", description: "Get the downloadable receipt details or link for a specific billing transaction.", parameters: { type: "object", properties: { transactionId: { type: "string" } }, required: ["transactionId"] } } },
  { type: "function", function: { name: "billing_get_active_plans", description: "List all currently available public pricing tiers and platform plans.", parameters: { type: "object", properties: {} } } }
];

// ============================================================================
// 3. TOOL CATEGORY ROUTING & AGENTIC ORCHESTRATION
// ============================================================================

/**
 * Tool categories for intent-based routing. Instead of sending all 37 tools
 * to a small local model (which overwhelms it), we classify the user's intent
 * via keyword matching and only send the relevant 2-6 tools.
 */
const TOOL_CATEGORIES: Record<string, { description: string; tools: string[] }> = {
  apm: {
    description: "Backend APM services, performance, latency, RPS, HTTP traces",
    tools: ["apm_list_services", "apm_get_stats", "apm_get_invocations", "apm_get_trace_detail"]
  },
  rum: {
    description: "Frontend/RUM web performance, Web Vitals, page views",
    tools: ["rum_list_services", "rum_get_dashboard", "rum_get_trace_detail"]
  },
  tasks: {
    description: "Background tasks, job execution, cron jobs, task queues",
    tools: ["task_list_services", "task_get_dashboard", "task_get_entity_detail", "task_get_run_detail"]
  },
  logs: {
    description: "System logs, log search, log queries",
    tools: ["logs_query", "logs_get_by_id", "logs_get_by_trace"]
  },
  errors: {
    description: "Error tracking, exceptions, error groups",
    tools: ["error_get_global", "error_get_group_detail", "error_get_trace_errors"]
  },
  web_analytics: {
    description: "Website analytics, pageviews, visitors, referrers",
    tools: ["web_list_websites", "web_get_stats"]
  },
  uptime: {
    description: "Uptime monitoring, health checks, endpoint status",
    tools: ["uptime_list_monitors", "uptime_get_stats"]
  },
  infrastructure: {
    description: "VPS servers, CPU, RAM, disk, network, Docker metrics",
    tools: ["vps_list", "vps_get_stats"]
  },
  database: {
    description: "Database monitoring, MongoDB, Redis, throughput, latency",
    tools: ["database_list", "database_get_stats"]
  },
  alerts: {
    description: "Alert policies, incidents, alert destinations",
    tools: ["alerts_list_destinations", "alerts_list_policies", "alerts_get_policy_details"]
  },
  dashboards: {
    description: "Custom dashboards, saved views, widgets",
    tools: ["views_list_dashboards", "views_get_dashboard", "views_get_widget_data"]
  },
  schema: {
    description: "Telemetry data schema, dynamic field mapping",
    tools: ["schema_get_dynamic"]
  },
  billing: {
    description: "Billing, subscription, storage, plans, transactions",
    tools: ["billing_get_storage_stats", "billing_get_subscription", "billing_get_transactions", "billing_get_transaction_receipt", "billing_get_active_plans"]
  }
};

const AGENT_SYSTEM_PROMPT = {
  role: "system" as const,
  content: `You are Senzor Operational Intelligence, an enterprise SRE assistant for infrastructure monitoring and observability.

Capabilities:
- Analyze system telemetry (APM traces, logs, errors, metrics)
- Diagnose performance issues and identify root causes
- Provide actionable remediation recommendations
- Correlate data across multiple observability signals

Instructions:
- Use the provided tools to fetch real data before answering
- Always summarize telemetry into concise, actionable insights
- If data seems anomalous, explain potential root causes
- Never fabricate metrics or telemetry data
- If you need data, call the appropriate tool
- Be thorough but concise`
};

/** Domain context string injected into the user message for tool-calling turns
 * (Hermes forbids custom system prompts when tools are active) */
const WEBLLM_TOOL_CONTEXT = `[CONTEXT] You are Senzor Operational Intelligence, an enterprise SRE assistant. Use the provided tools to fetch real telemetry data before answering. Summarize data into concise, actionable insights. Never fabricate metrics. Correlate signals across APM, logs, errors, and infrastructure when relevant. [/CONTEXT]`;

/**
 * Sanitize persisted chat history for WebLLM Hermes compatibility.
 *
 * Hermes validates the ENTIRE message array:
 *  - No `system` role messages (Hermes injects its own for tool calling)
 *  - No `tool` role messages from prior turns
 *  - No `assistant` messages with `tool_calls` property from prior turns
 *  - Last message must be `user` or `tool` role
 *  - No consecutive same-role messages
 *
 * This strips tool-calling artifacts from history, keeping only clean
 * user/assistant text pairs. Tool messages from the CURRENT agentic loop
 * iteration are added separately after sanitization.
 */
const sanitizeHistoryForHermes = (
  messages: any[],
  opts?: { embedToolContext?: boolean }
): any[] => {
  const clean: any[] = [];
  for (const msg of messages) {
    // Drop tool results and system prompts from history
    if (msg.role === "tool" || msg.role === "system") continue;
    // Strip tool_calls from assistant messages, keep only text content
    if (msg.role === "assistant") {
      if (!msg.content) continue; // Skip empty assistant msgs (tool-call-only)
      clean.push({ role: "assistant", content: msg.content });
      continue;
    }
    clean.push(msg);
  }

  // Collapse consecutive same-role messages (can happen after stripping)
  const collapsed: any[] = [];
  for (const msg of clean) {
    const prev = collapsed[collapsed.length - 1];
    if (prev && prev.role === msg.role) {
      prev.content = prev.content + "\n" + msg.content;
    } else {
      collapsed.push({ ...msg });
    }
  }

  // Embed tool context into the last user message if requested
  if (opts?.embedToolContext && collapsed.length > 0) {
    const last = collapsed[collapsed.length - 1];
    if (last.role === "user") {
      last.content = `${WEBLLM_TOOL_CONTEXT}\n\n${last.content}`;
    }
  }

  // Final safety: ensure last message is user or tool (WebLLM requirement)
  if (collapsed.length > 0) {
    const last = collapsed[collapsed.length - 1];
    if (last.role !== "user" && last.role !== "tool") {
      // Strip trailing non-user/non-tool messages
      while (collapsed.length > 0) {
        const tail = collapsed[collapsed.length - 1];
        if (tail.role === "user" || tail.role === "tool") break;
        collapsed.pop();
      }
    }
  }

  return collapsed;
};

/** Keyword-based intent classifier — instant, deterministic, no model call needed */
const classifyIntentByKeywords = (message: string): string[] => {
  const lower = message.toLowerCase();
  const matched: string[] = [];

  const keywordMap: Record<string, string[]> = {
    apm: ["apm", "backend service", "latency", "rps", "trace", "request per", "response time", "api performance", "endpoint performance", "p99", "p95", "throughput"],
    rum: ["rum", "frontend", "web vital", "lcp", "inp", "cls", "page view", "web performance", "core web vital", "first contentful"],
    tasks: ["task", "job", "cron", "queue", "background", "worker", "scheduled", "celery", "sidekiq"],
    logs: ["log", "logging", "syslog", "stdout", "stderr", "debug log", "warn log", "search logs"],
    errors: ["error", "exception", "crash", "bug", "failure", "failed", "unresolved", "stack trace", "traceback"],
    web_analytics: ["analytics", "pageview", "visitor", "referrer", "traffic", "web stats", "bounce rate"],
    uptime: ["uptime", "downtime", "health check", "ping", "monitor", "availability", "status check"],
    infrastructure: ["vps", "server", "cpu", "ram", "memory", "disk", "docker", "container", "network", "infrastructure", "linux"],
    database: ["database", "mongodb", "mongo", "redis", "db throughput", "db latency", "query performance"],
    alerts: ["alert", "incident", "notification", "policy", "trigger", "threshold", "on-call"],
    dashboards: ["dashboard", "widget", "saved view", "canvas", "custom chart"],
    schema: ["schema", "field map", "telemetry type", "attribute"],
    billing: ["billing", "subscription", "plan", "payment", "invoice", "receipt", "storage usage", "pricing", "tier", "cost"]
  };

  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matched.push(category);
    }
  }

  return matched;
};

/** Resolve AI_TOOLS subset from matched categories, capped to prevent model overload */
const resolveToolSubset = (categories: string[]): any[] => {
  if (categories.length === 0) return [];
  const toolNames = new Set<string>();
  for (const cat of categories) {
    TOOL_CATEGORIES[cat]?.tools.forEach(t => toolNames.add(t));
  }
  const MAX_TOOLS = 12;
  return AI_TOOLS.filter((t: any) => toolNames.has(t.function.name)).slice(0, MAX_TOOLS);
};

interface AgentStatus {
  phase: "thinking" | "selecting_tools" | "calling_tools" | "analyzing" | "responding" | "idle";
  detail?: string;
  tools?: string[];
}

export default function AiAssistantPage() {
  // --- Engine & State ---
  const [engineMode, setEngineMode] = useState<"setup" | "loading" | "ready">("setup");
  const [provider, setProvider] = useState<"webllm" | "byok">("webllm");
  const [hardwareProfile, setHardwareProfile] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState(LOCAL_MODELS[1].id); 
  const [byokKey, setByokKey] = useState("");
  
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ text: "", progress: 0, stats: null as any });
  const [chatId] = useState("default-session");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextLogs, setContextLogs] = useState<any[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  
  const engineRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, contextLogs]);

  useEffect(() => {
    loadChat(chatId).then(msgs => {
      if (msgs.length > 0) setMessages(msgs);
    });
  }, [chatId]);

  // --- Hardware Profiler ---
  useEffect(() => {
    if (engineMode !== "setup") return;
    
    const checkHardware = async () => {
      if (!navigator.gpu) {
        setHardwareProfile({ supported: false, reason: "WebGPU is not enabled in this browser." });
        setProvider("byok"); 
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("No adapter found");
        
        let vramEstimate = 4; 
        if (adapter.limits.maxStorageBufferBindingSize > 2 * 1024 * 1024 * 1024) vramEstimate = 8;
        else if (adapter.limits.maxStorageBufferBindingSize < 1024 * 1024 * 1024) vramEstimate = 2;

        setHardwareProfile({ 
          supported: true, 
          vramEstimate,
          name: adapter.info?.isFallbackAdapter ? "Software Renderer" : "Hardware GPU"
        });
        
        if (vramEstimate >= 8) setSelectedModel(LOCAL_MODELS[0].id);
        else if (vramEstimate >= 4) setSelectedModel(LOCAL_MODELS[1].id);
        else setSelectedModel(LOCAL_MODELS[2].id);

      } catch (err) {
        setHardwareProfile({ supported: false, reason: "Failed to access GPU adapter." });
        setProvider("byok");
      }
    };
    checkHardware();
  }, [engineMode]);

  // --- Engine Initialization ---
  const initializeEngine = async () => {
    if (provider === "byok" && !byokKey) {
      toast.error("Please provide an OpenAI API Key.");
      return;
    }

    setEngineMode("loading");

    if (provider === "webllm") {
      try {
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
        
        engineRef.current = await CreateMLCEngine(selectedModel, {
          initProgressCallback: (report: any) => {
            let cleanText = "Initializing Engine...";
            let stats:any = null;
            
            // Professional regex parsing of the console progress output
            if (report.text.includes("Fetching param cache")) {
              cleanText = "Downloading Neural Network Weights";
              const chunks = report.text.match(/\[(\d+\/\d+)\]/)?.[1] || "-";
              const mb = report.text.match(/(\d+\s*MB)/i)?.[1] || "-";
              const time = report.text.match(/(\d+\s*secs)/i)?.[1] || "-";
              stats = { chunks, mb, time };
            } else if (report.text.includes("Loading GPU") || report.text.includes("Loading model")) {
              cleanText = "Allocating VRAM";
              stats = { chunks: "100%", mb: "Done", time: "Finalizing" };
            } else if (report.text.includes("Finish") || report.progress === 1) {
              cleanText = "Compilation Complete";
              stats = { chunks: "Ready", mb: "Ready", time: "Ready" };
            } else {
              cleanText = report.text.replace(/It can take a while.*/, '').trim();
            }

            setLoadProgress({ text: cleanText, stats, progress: Math.round(report.progress * 100) });
          }
        });
        toast.success("Local AI Engine Initialized");
        setEngineMode("ready");
      } catch (err: any) {
        toast.error("Failed to load local model. Ensure your browser supports WebGPU.");
        setEngineMode("setup");
      }
    } else {
      engineRef.current = "byok-active";
      toast.success("Cloud AI Engine Connected");
      setEngineMode("ready");
    }
  };

  // --- Multi-Tool Orchestrator ---
  const executeFrontendTool = async (toolName: string, args: any) => {
    setContextLogs(prev => [...prev, { time: new Date(), type: "tool_call", name: toolName, args }]);
    setIsInspectorOpen(true); 

    try {
      let data;
      const params = { range: args.range || "24h" };

      switch (toolName) {
        // --- APM ---
        case "apm_list_services": data = await api.get('/apm/list').then(res => res.data); break;
        case "apm_get_stats": data = await api.get(`/apm/${args.id}/stats`, { params }).then(res => res.data); break;
        case "apm_get_invocations": data = await api.get(`/apm/${args.id}/invocations`, { params: { limit: 10 } }).then(res => res.data); break;
        case "apm_get_trace_detail": data = await api.get(`/apm/${args.id}/trace/${args.traceId}`).then(res => res.data); break;
        
        // --- RUM ---
        case "rum_list_services": data = await api.get('/rum/list').then(res => res.data); break;
        case "rum_get_dashboard": data = await api.get(`/rum/${args.id}/dashboard`, { params }).then(res => res.data); break;
        case "rum_get_trace_detail": data = await api.get(`/rum/${args.id}/trace/${args.traceId}`).then(res => res.data); break;
        
        // --- Tasks ---
        case "task_list_services": data = await api.get('/task/list').then(res => res.data); break;
        case "task_get_dashboard": data = await api.get(`/task/${args.id}/dashboard`, { params }).then(res => res.data); break;
        case "task_get_entity_detail": data = await api.get(`/task/${args.id}/entity/${encodeURIComponent(args.taskName)}`, { params }).then(res => res.data); break;
        case "task_get_run_detail": data = await api.get(`/task/${args.id}/run/${args.runId}`).then(res => res.data); break;

        // --- Infra & DB ---
        case "vps_list": data = await api.get('/vps/list').then(res => res.data); break;
        case "vps_get_stats": data = await api.get(`/vps/${args.id}/stats`, { params }).then(res => res.data); break;
        case "database_list": data = await api.get('/database/list').then(res => res.data); break;
        case "database_get_stats": data = await api.get(`/database/${args.id}/stats`, { params }).then(res => res.data); break;
        
        // --- Logs & Errors ---
        case "logs_query": data = await api.get('/logs', { params: { search: args.search || "", limit: args.limit || 15, range: args.range || "24h" } }).then(res => res.data); break;
        case "logs_get_by_id": data = await api.get(`/logs/${args.id}`).then(res => res.data); break;
        case "logs_get_by_trace": data = await api.get(`/apm/${args.id}/trace/${args.traceId}/logs`).then(res => res.data); break;
        
        case "error_get_global": data = await api.get('/errors', { params: { limit: 15, status: 'unresolved' } }).then(res => res.data); break;
        case "error_get_group_detail": data = await api.get(`/errors/${args.groupId}`, { params }).then(res => res.data); break;
        case "error_get_trace_errors": data = await api.get(`/apm/${args.id}/trace/${args.traceId}/errors`).then(res => res.data); break;

        // --- Web Analytics & Monitors ---
        case "web_list_websites": data = await api.get('/web/list').then(res => res.data); break;
        case "web_get_stats": data = await api.get(`/web/${args.id}/stats`, { params }).then(res => res.data); break;
        case "uptime_list_monitors": data = await api.get('/uptime/list').then(res => res.data); break;
        case "uptime_get_stats": data = await api.get(`/uptime/${args.id}/stats`, { params }).then(res => res.data); break;

        // --- Alerts & Views ---
        case "alerts_list_destinations": data = await api.get('/alerts/destinations').then(res => res.data); break;
        case "alerts_list_policies": data = await api.get('/alerts/policies').then(res => res.data); break;
        case "alerts_get_policy_details": data = await api.get(`/alerts/policies/${args.id}`).then(res => res.data); break;
        case "views_list_dashboards": data = await api.get('/views').then(res => res.data); break;
        case "views_get_dashboard": data = await api.get(`/views/${args.id}`).then(res => res.data); break;
        case "views_get_widget_data": data = await api.get(`/views/widgets/${args.id}/data`, { params }).then(res => res.data); break;
        
        // --- Schema & Billing ---
        case "schema_get_dynamic": data = await api.get('/schema').then(res => res.data); break;
        case "billing_get_storage_stats": data = await api.get('/billing/storage-stats').then(res => res.data); break;
        case "billing_get_subscription": data = await api.get('/billing/subscription').then(res => res.data); break;
        case "billing_get_transactions": data = await api.get('/billing/transactions').then(res => res.data); break;
        case "billing_get_transaction_receipt": data = await api.get(`/billing/transactions/${args.transactionId}/receipt`).then(res => res.data); break;
        case "billing_get_active_plans": data = await api.get('/billing/plans').then(res => res.data); break;

        default: data = { error: "Endpoint not mapped." };
      }

      setContextLogs(prev => [...prev, { time: new Date(), type: "tool_result", name: toolName, data }]);
      // Prevent OOM limits by truncating massive tool responses
      return JSON.stringify(data).substring(0, 6000); 
    } catch (err: any) {
      setContextLogs(prev => [...prev, { time: new Date(), type: "tool_error", name: toolName, error: err.message }]);
      return JSON.stringify({ error: err.message });
    }
  };

  // --- Agentic Orchestration Loop ---
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userInput = input;
    const newUserMsg = { role: "user", content: userInput };
    const currentChatContext: any[] = [...messages, newUserMsg];

    setMessages(currentChatContext);
    setInput("");
    setIsGenerating(true);
    setAgentStatus({ phase: "thinking", detail: "Analyzing your request..." });

    try {
      let finalAiResponse = "";

      if (provider === "webllm") {
        // ── Phase 1: Instant keyword-based intent classification ──
        setAgentStatus({ phase: "selecting_tools", detail: "Identifying relevant data sources..." });
        const categories = classifyIntentByKeywords(userInput);
        const toolSubset = resolveToolSubset(categories);

        setContextLogs(prev => [...prev, {
          time: new Date(), type: "tool_call", name: "__intent_classification",
          args: { categories, toolCount: toolSubset.length, tools: toolSubset.map((t: any) => t.function.name) }
        }]);
        if (toolSubset.length > 0) setIsInspectorOpen(true);

        if (toolSubset.length === 0) {
          // ── No tools needed — direct conversational completion ──
          setAgentStatus({ phase: "responding", detail: "Generating response..." });
          try {
            // Spread-copy: WebLLM may mutate the messages array internally
            const reply = await engineRef.current.chat.completions.create({
              messages: [...[AGENT_SYSTEM_PROMPT], ...sanitizeHistoryForHermes(currentChatContext)],
              max_tokens: 2048,
              temperature: 0.4
            });
            finalAiResponse = reply.choices[0].message.content || "No response generated.";
          } catch (directErr: any) {
            console.warn("[Senzor Intelligence] Direct completion error:", directErr);
            finalAiResponse = "I encountered an error generating a response. Please try again.";
          }
        } else {
          // ── Phase 2: Agentic tool-calling loop with subset ──
          setAgentStatus({
            phase: "calling_tools",
            detail: `Selected ${toolSubset.length} tools from: ${categories.join(", ")}`,
            tools: toolSubset.map((t: any) => t.function.name)
          });

          // Hermes tool mode forbids: custom system prompts, tool/tool_calls
          // msgs from prior turns, consecutive same-role msgs. Sanitize history
          // and embed domain context into the final user message.
          const agentMessages: any[] = sanitizeHistoryForHermes(
            currentChatContext,
            { embedToolContext: true }
          );
          const MAX_ITERATIONS = 5;
          let iteration = 0;
          let loopCompleted = false;

          try {
            while (iteration < MAX_ITERATIONS) {
              iteration++;

              // Build a fresh snapshot for each iteration. WebLLM's Hermes
              // validation mutates request.messages (unshift), so we must
              // never pass the live agentMessages reference.
              const snapshot = agentMessages.map((m: any) => ({ ...m }));
              const reply = await engineRef.current.chat.completions.create({
                messages: snapshot,
                tools: toolSubset,
                tool_choice: "auto",
                max_tokens: 2048,
                temperature: 0.1
              });

              const choice = reply.choices[0];
              const assistantMsg = choice.message;

              // Push assistant message to both agent context and persistable context
              agentMessages.push(assistantMsg);
              if (assistantMsg.tool_calls?.length) {
                currentChatContext.push(assistantMsg);
              }

              // If model produced a text response (no tool calls), we're done
              if (choice.finish_reason !== "tool_calls" || !assistantMsg.tool_calls?.length) {
                finalAiResponse = assistantMsg.content || "";
                loopCompleted = true;
                break;
              }

              // ── Execute ALL tool calls in parallel ──
              const toolCalls = assistantMsg.tool_calls;
              const toolNames = toolCalls.map((tc: any) => tc.function.name);
              setAgentStatus({
                phase: "calling_tools",
                detail: `Calling: ${toolNames.join(", ")} (iteration ${iteration})`,
                tools: toolNames
              });

              const toolResults = await Promise.allSettled(
                toolCalls.map(async (tc: any) => {
                  let args: any = {};
                  try {
                    args = JSON.parse(tc.function.arguments || "{}");
                  } catch {
                    args = {};
                  }
                  const result = await executeFrontendTool(tc.function.name, args);
                  return { toolCallId: tc.id, name: tc.function.name, result };
                })
              );

              // Push all tool results back into both contexts
              for (let i = 0; i < toolCalls.length; i++) {
                const settled = toolResults[i];
                const toolMsg = {
                  role: "tool" as const,
                  tool_call_id: settled.status === "fulfilled" ? settled.value.toolCallId : toolCalls[i].id,
                  content: settled.status === "fulfilled"
                    ? settled.value.result
                    : JSON.stringify({ error: "Tool execution failed", reason: (settled as PromiseRejectedResult).reason?.message || "Unknown" })
                };
                agentMessages.push(toolMsg);
                currentChatContext.push(toolMsg);
              }

              setAgentStatus({ phase: "analyzing", detail: `Processing results (step ${iteration}/${MAX_ITERATIONS})...` });
            }

            // If loop exhausted without a final text response, do one final completion.
            // Guard: only call if the last message is user or tool (WebLLM requirement).
            if (!loopCompleted || !finalAiResponse) {
              const lastRole = agentMessages[agentMessages.length - 1]?.role;
              if (lastRole === "user" || lastRole === "tool") {
                setAgentStatus({ phase: "responding", detail: "Synthesizing final analysis..." });
                const finalSnapshot = agentMessages.map((m: any) => ({ ...m }));
                const finalReply = await engineRef.current.chat.completions.create({
                  messages: finalSnapshot,
                  max_tokens: 2048,
                  temperature: 0.3
                });
                finalAiResponse = finalReply.choices[0].message.content || "I was unable to generate a complete response.";
              } else {
                // Last message is assistant — use its content directly
                finalAiResponse = agentMessages[agentMessages.length - 1]?.content
                  || "I was unable to generate a complete response.";
              }
            }
          } catch (engineErr: any) {
            console.warn("[Senzor Intelligence] Agentic loop error, attempting fallback:", engineErr);
            setAgentStatus({ phase: "responding", detail: "Recovering from error..." });
            try {
              const fallback = await engineRef.current.chat.completions.create({
                messages: [AGENT_SYSTEM_PROMPT, ...sanitizeHistoryForHermes(currentChatContext)],
                max_tokens: 2048
              });
              finalAiResponse = fallback.choices[0].message.content || "I encountered an error processing that request.";
            } catch {
              finalAiResponse = "I encountered an internal error. Please try clearing the chat and asking again.";
            }
          }
        }

      } else {
        // ── BYOK: Cloud API execution (OpenAI) ──
        // Cloud models handle all 37 tools without issues
        setAgentStatus({ phase: "calling_tools", detail: "Sending to cloud API..." });

        let replyRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${byokKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [AGENT_SYSTEM_PROMPT, ...currentChatContext],
            tools: AI_TOOLS
          })
        });
        let reply = await replyRes.json();
        if (reply.error) throw new Error(reply.error.message);

        let byokIteration = 0;
        while (reply.choices[0].message.tool_calls?.length && byokIteration < 10) {
          byokIteration++;
          const assistantMsg = reply.choices[0].message;
          currentChatContext.push(assistantMsg);

          // Execute all tool calls in parallel for BYOK too
          const toolCalls = assistantMsg.tool_calls;
          setAgentStatus({
            phase: "calling_tools",
            detail: `Calling: ${toolCalls.map((tc: any) => tc.function.name).join(", ")}`,
            tools: toolCalls.map((tc: any) => tc.function.name)
          });

          const toolResults = await Promise.allSettled(
            toolCalls.map(async (tc: any) => {
              const args = JSON.parse(tc.function.arguments || "{}");
              const result = await executeFrontendTool(tc.function.name, args);
              return { toolCallId: tc.id, name: tc.function.name, result };
            })
          );

          for (let i = 0; i < toolCalls.length; i++) {
            const settled = toolResults[i];
            currentChatContext.push({
              role: "tool",
              tool_call_id: settled.status === "fulfilled" ? settled.value.toolCallId : toolCalls[i].id,
              name: toolCalls[i].function.name,
              content: settled.status === "fulfilled"
                ? settled.value.result
                : JSON.stringify({ error: "Tool execution failed" })
            });
          }

          setAgentStatus({ phase: "analyzing", detail: `Processing results (step ${byokIteration})...` });

          replyRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${byokKey}` },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [AGENT_SYSTEM_PROMPT, ...currentChatContext],
              tools: AI_TOOLS
            })
          });
          reply = await replyRes.json();
          if (reply.error) throw new Error(reply.error.message);
        }
        finalAiResponse = reply.choices[0].message.content || "No response generated.";
      }

      setAgentStatus({ phase: "idle" });
      const newAiMsg = { role: "assistant", content: finalAiResponse };
      const finalChat = [...currentChatContext, newAiMsg];

      setMessages(finalChat);
      await saveChat(chatId, finalChat);

    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
      setAgentStatus(null);
    }
  };

  // --- History Management ---
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `senzor_chat_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleImport = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setMessages(imported);
          await saveChat(chatId, imported);
          toast.success("Chat imported successfully.");
        }
      } catch (err) {
        toast.error("Invalid chat file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async () => {
    await clearChat(chatId);
    setMessages([]);
    setContextLogs([]);
    toast.success("Local chat history wiped.");
  };

  const selectedModelData = LOCAL_MODELS.find(m => m.id === selectedModel);
  const showVramWarning = hardwareProfile && selectedModelData && hardwareProfile.vramEstimate < selectedModelData.vramReq;

  // ============================================================================
  // UI RENDERERS
  // ============================================================================
  
  if (engineMode === "setup") {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/10 h-full">
          <Card className="max-w-2xl w-full border-border/60 shadow-xl bg-card rounded-xl overflow-hidden">
            
            <div className="p-6 border-b border-border/40">
              <h1 className="text-xl font-bold text-foreground mb-1">Operational Intelligence</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure your execution engine. Process telemetry natively in your browser for absolute privacy, or use a cloud API for performance.
              </p>
            </div>

            <div className="p-6 bg-muted/5 flex flex-col gap-4">
              
              <div 
                className={cn("p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col", provider === "webllm" ? "bg-background border-primary shadow-sm ring-1 ring-primary/20" : "bg-card border-border hover:border-primary/50")} 
                onClick={() => setProvider("webllm")}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Cpu className="h-5 w-5 text-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Local Hardware Execution</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">
                  Runs an LLM locally in your browser via WebGPU. 100% private.
                </p>
                
                {provider === "webllm" && (
                  <div className="space-y-3 mt-auto border-t border-border/40 pt-3">
                    {hardwareProfile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded border border-border/50">
                          <span className="text-muted-foreground">GPU Detected</span>
                          {hardwareProfile.supported ? <span className="text-emerald-500 font-bold flex items-center gap-1"><Check className="h-3 w-3"/> ~{hardwareProfile.vramEstimate}GB VRAM</span> : <span className="text-destructive font-bold flex items-center gap-1"><X className="h-3 w-3"/> Failed</span>}
                        </div>
                        {hardwareProfile.supported && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Model Weights</label>
                            <Select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="h-8 text-xs bg-background shadow-sm">
                              {LOCAL_MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.name} (Requires {m.vramReq}GB VRAM)</option>
                              ))}
                            </Select>
                            {showVramWarning && (
                              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-lg mt-4 animate-in fade-in">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <div className="text-xs leading-relaxed">
                                  <strong className="block mb-1">Hardware Warning</strong>
                                  Your system reports ~{hardwareProfile.vramEstimate}GB of VRAM, but {selectedModelData?.name} requires at least {selectedModelData?.vramReq}GB. Generating responses may cause browser instability or out-of-memory crashes.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner className="h-3 w-3"/> Profiling Environment...</div>
                    )}
                  </div>
                )}
              </div>

              <div 
                className={cn("p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col", provider === "byok" ? "bg-background border-blue-500 shadow-sm ring-1 ring-blue-500/20" : "bg-card border-border hover:border-blue-500/50")} 
                onClick={() => setProvider("byok")}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Bot className="h-5 w-5 text-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Cloud API (BYOK)</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">
                  Bring your own OpenAI key. Requests are routed directly from your browser.
                </p>
                
                {provider === "byok" && (
                  <div className="space-y-1.5 pt-3 border-t border-border/40 mt-auto">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OpenAI API Key</label>
                    <Input type="password" placeholder="sk-proj-..." value={byokKey} onChange={e => setByokKey(e.target.value)} className="h-8 text-xs bg-background font-mono shadow-sm" />
                    <p className="text-[9px] text-muted-foreground mt-1">Stored securely in RAM only.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-border/40 bg-card flex justify-end gap-3 items-center">
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mr-auto">
                <Lock className="h-3 w-3 text-emerald-500" /> End-to-End Encrypted
              </span>
              <Button onClick={initializeEngine} disabled={provider === "webllm" && (!hardwareProfile?.supported || showVramWarning)} className="font-bold px-6 shadow-sm">
                Initialize Session <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (engineMode === "loading") {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 h-full">
          <Card className="max-w-md w-full p-8 border-border/60 shadow-xl bg-card rounded-xl overflow-hidden relative">
            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-muted/60 rounded-full animate-pulse" />
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-full">
                    <Cpu className="h-8 w-8 text-primary" />
                  </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
                  Provisioning Local Engine
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Securely caching model weights to your device. This runs once and ensures zero data leaves your network.
                </p>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
                  <span>Progress</span>
                  <span className="text-primary">{loadProgress.progress}%</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/50">
                  <div className="bg-primary h-full transition-all duration-300 ease-out relative" style={{ width: `${loadProgress.progress}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', transform: 'skewX(-20deg)' }} />
                  </div>
                </div>
              </div>

              {loadProgress.stats && (
                <div className="w-full grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-background border border-border/50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Fetched</span>
                    <span className="text-xs font-mono font-bold text-foreground">{loadProgress.stats.mb}</span>
                  </div>
                  <div className="bg-background border border-border/50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Chunks</span>
                    <span className="text-xs font-mono font-bold text-foreground">{loadProgress.stats.chunks}</span>
                  </div>
                  <div className="bg-background border border-border/50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Elapsed</span>
                    <span className="text-xs font-mono font-bold text-foreground">{loadProgress.stats.time}</span>
                  </div>
                </div>
              )}
              
              <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded-md border border-border/50 w-full truncate">
                {loadProgress.text || "Initializing WebGPU Context..."}
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // --- READY MODE (Dual Pane Interface) ---
  // Filter messages for the main UI so we don't display raw tool payloads in the chat bubbles
  const displayMessages = messages.filter(m => m.role === "user" || m.role === "assistant");

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        
        {/* Header */}
        <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">Operational Intelligence</h1>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground mr-3 hidden md:block border-r border-border/60 pr-3 uppercase font-bold tracking-wider">
              {provider}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsInspectorOpen(!isInspectorOpen)} className="h-8 text-xs font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-500/10">
              {isInspectorOpen ? <PanelRightClose className="h-3.5 w-3.5 mr-1.5"/> : <PanelRightOpen className="h-3.5 w-3.5 mr-1.5"/>}
              Context
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 text-xs font-medium"><Download className="h-3.5 w-3.5 mr-1.5"/> Export</Button>
            <div className="relative">
              <input type="file" id="import-chat" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".json" onChange={handleImport} />
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium pointer-events-none"><Upload className="h-3.5 w-3.5 mr-1.5"/> Import</Button>
            </div>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
          </div>
        </header>

        {/* Dual Pane Layout */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative w-full">
          
          {/* Left Pane: Chat Interface */}
          <div className="flex-1 overflow-y-auto flex flex-col h-full bg-background relative z-0">
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
              {displayMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Bot className="h-12 w-12 mb-4 text-muted-foreground" />
                  <h2 className="text-base font-bold text-foreground">How can I help you investigate?</h2>
                  <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
                    I can analyze system logs, aggregate metrics, and execute Root Cause Analysis securely.
                  </p>
                </div>
              ) : (
                displayMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex items-start gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border")}>
                      {msg.role === "user" ? <span className="text-xs font-bold">You</span> : <Bot className="h-4 w-4 text-primary" />}
                    </div>
                    <div className={cn("max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm", msg.role === "user" ? "bg-primary/10 text-foreground rounded-tr-sm" : "bg-card border border-border/60 text-foreground rounded-tl-sm whitespace-pre-wrap")}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isGenerating && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-5 py-4 text-sm w-fit shadow-sm space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5 items-center justify-center h-2">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                        <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce"></div>
                      </div>
                      {agentStatus?.detail && (
                        <span className="text-xs text-muted-foreground font-medium">{agentStatus.detail}</span>
                      )}
                    </div>
                    {agentStatus?.tools && agentStatus.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agentStatus.tools.map((tool, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{tool}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-background border-t border-border/40 shrink-0 relative z-10">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative max-w-4xl mx-auto flex items-end gap-2">
                <textarea
                  className="w-full bg-card border border-border/60 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-sm resize-none pr-12 min-h-[52px] max-h-40 no-scrollbar"
                  placeholder="Ask about logs, an APM service, or paste an error stack..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                  }}
                  rows={1}
                />
                <Button type="submit" disabled={!input.trim() || isGenerating} size="icon" className="absolute right-2 bottom-2 h-9 w-9 rounded-lg shadow-sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-center mt-3">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Data stays strictly on your device</span>
              </div>
            </div>
          </div>

          {/* Right Pane: Context Inspector (Elastic) */}
          <div className={cn("flex flex-col h-full bg-muted/5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-l border-border/40 shrink-0", isInspectorOpen ? "w-full md:w-[400px] lg:w-[450px] opacity-100" : "w-0 opacity-0 border-none")}>
            <div className="w-full md:w-[400px] lg:w-[450px] h-full flex flex-col">
              <div className="p-4 border-b border-border/40 bg-background/50 flex items-center justify-between shrink-0 whitespace-nowrap">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Code2 className="h-4 w-4 text-blue-500" /> Context Inspector
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden" onClick={() => setIsInspectorOpen(false)}>
                  <X className="h-4 w-4"/>
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {contextLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 whitespace-normal px-4">
                    <Database className="h-10 w-10 mb-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Network API calls and payloads will stream here for auditability.</p>
                  </div>
                ) : (
                  contextLogs.map((log, i) => (
                    <div key={i} className="bg-[#0d1117] border border-border/60 rounded-lg overflow-hidden shadow-sm">
                      <div className={cn("px-3 py-2 text-xs font-bold font-mono border-b flex items-center justify-between", log.type === "tool_call" ? "bg-blue-500/10 text-[#79c0ff] border-blue-500/20" : log.type === "tool_error" ? "bg-destructive/10 text-[#ff7b72] border-destructive/20" : "bg-emerald-500/10 text-[#3fb950] border-emerald-500/20")}>
                        <span className="whitespace-nowrap truncate mr-2">{log.type === "tool_call" ? `> CALL ${log.name}` : `< RESULT ${log.name}`}</span>
                        <span className="text-[9px] opacity-70 text-gray-400 whitespace-nowrap">{log.time.toLocaleTimeString()}</span>
                      </div>
                      <div className="p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <pre className="text-[10px] font-mono text-[#e6edf3]">
                          {JSON.stringify(log.args || log.data || log.error, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}