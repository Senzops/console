import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../../lib/auth";
import { DashboardLayout } from "../../../components/Layout";
import {
  Card,
  Button,
  Spinner,
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
  ArrowUp,
  X,
  Code2,
  Check,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  Brain,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  Square,
  Search,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ServerCog,
  Bug,
  Activity,
  Receipt,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 1. NATIVE INDEXED-DB STORAGE (clean: only user/assistant text persists)
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

const saveChat = async (id: string, messages: ChatMessage[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put({ id, messages, updatedAt: Date.now() });
};

const loadChat = async (id: string): Promise<ChatMessage[]> => {
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
// 2. MODELS
// ============================================================================
//
// Local-execution lineup. We intentionally do NOT use MLC's native function
// calling (only Hermes-2-Pro supports it) — we drive a tool-use protocol from
// our own prompt, which means any well-aligned instruction model works. That
// lets us pick whatever gives the best quality / footprint tradeoff per tier.
//
// Selection criteria (production):
//   1. Strong instruction following + JSON/XML output (tool calls are XML).
//   2. Available in @mlc-ai/web-llm prebuilt config (no custom model_lib).
//   3. Footprint covers the full hardware spectrum, from <1GB (mobile / iGPU)
//      to ~6GB (workstation GPUs). Sorted descending by `vramReq`.
//   4. At least one well-known model per family (Hermes, Llama, Qwen, Phi)
//      so users can fall back across architectures if a wasm fails to load.
//
// `vramRequiredMB` is the figure WebLLM ships in `prebuiltAppConfig`, used
// purely as informational metadata. `vramReq` is the rounded GB we surface
// in the UI as the recommended floor.
//
type LocalModelTier = "premium" | "balanced" | "light" | "ultralight";

interface LocalModelOption {
  id: string;
  name: string;
  family: string;
  params: number;          // billions of parameters
  vramReq: number;         // recommended VRAM (GB)
  vramRequiredMB: number;  // exact MB required by the WebLLM bundle
  tier: LocalModelTier;
  description: string;
  tags: string[];
}

const LOCAL_MODELS: LocalModelOption[] = [
  // --- Premium tier (6-8 GB VRAM, large parameter count, top quality) ---
  {
    id: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
    name: "Hermes 3 (8B) - High Quality",
    family: "Hermes 3",
    params: 8,
    vramReq: 8,
    vramRequiredMB: 5779,
    tier: "premium",
    description: "Highest reasoning quality. Best for complex multi-tool workflows.",
    tags: ["Tool-Tuned", "Reasoning"],
  },
  {
    id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
    name: "Hermes 3 (8B) - Balanced",
    family: "Hermes 3",
    params: 8,
    vramReq: 6,
    vramRequiredMB: 4876,
    tier: "premium",
    description: "Same model, lower precision. Default for most discrete GPUs.",
    tags: ["Tool-Tuned", "Recommended"],
  },
  {
    id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 (7B) - Strong Tool-Use",
    family: "Qwen 2.5",
    params: 7,
    vramReq: 6,
    vramRequiredMB: 5107,
    tier: "premium",
    description: "Best-in-class instruction following and structured output.",
    tags: ["Recommended", "Fast"],
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3.1 (8B) - Standard",
    family: "Llama 3.1",
    params: 8,
    vramReq: 6,
    vramRequiredMB: 4598,
    tier: "premium",
    description: "Meta's flagship 8B. Reliable general-purpose reasoning.",
    tags: [],
  },

  // --- Balanced tier (4-5 GB VRAM, mid-size, strong quality) ---
  {
    id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
    name: "Hermes 2 Pro (7B) - Tool Specialist",
    family: "Hermes 2 Pro",
    params: 7,
    vramReq: 5,
    vramRequiredMB: 4033,
    tier: "balanced",
    description: "Mistral base, fine-tuned on function-calling data. Classic.",
    tags: ["Tool-Tuned"],
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi 3.5 Mini (3.8B) - Reasoning",
    family: "Phi 3.5",
    params: 3.8,
    vramReq: 4,
    vramRequiredMB: 3672,
    tier: "balanced",
    description: "Microsoft's efficient reasoner. Great logic-per-parameter.",
    tags: ["Reasoning"],
  },

  // --- Light tier (3 GB VRAM, small but capable) ---
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 (3B) - Lightweight Pro",
    family: "Qwen 2.5",
    params: 3,
    vramReq: 3,
    vramRequiredMB: 2505,
    tier: "light",
    description: "Best small-model tool use. Recommended for laptops.",
    tags: ["Recommended", "Fast"],
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 (3B) - Edge",
    family: "Llama 3.2",
    params: 3,
    vramReq: 3,
    vramRequiredMB: 2264,
    tier: "light",
    description: "Edge-optimized by Meta. Solid quality at 3B parameters.",
    tags: ["Edge"],
  },

  // --- Ultralight tier (1-2 GB VRAM, integrated graphics / mobile) ---
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 (1.5B) - Ultra Light",
    family: "Qwen 2.5",
    params: 1.5,
    vramReq: 2,
    vramRequiredMB: 1630,
    tier: "ultralight",
    description: "Runs on integrated GPUs. Surprisingly capable for tool calls.",
    tags: ["Edge", "Fast"],
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 (1B) - Minimal",
    family: "Llama 3.2",
    params: 1,
    vramReq: 1,
    vramRequiredMB: 879,
    tier: "ultralight",
    description: "Smallest viable model. For very constrained devices.",
    tags: ["Edge"],
  },
];

const TIER_ORDER: LocalModelTier[] = ["premium", "balanced", "light", "ultralight"];

const TIER_LABELS: Record<LocalModelTier, string> = {
  premium: "Premium — discrete GPU (6 GB+ VRAM)",
  balanced: "Balanced — mid-range GPU (4–5 GB VRAM)",
  light: "Light — laptops / older GPUs (3 GB VRAM)",
  ultralight: "Ultra-light — integrated graphics (1–2 GB VRAM)",
};

/** Default initial selection before the WebGPU profiler runs. */
const DEFAULT_LOCAL_MODEL_ID = "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";

/**
 * Pick the highest-quality model whose recommended VRAM fits the detected
 * budget. LOCAL_MODELS is sorted descending by `vramReq`, so the first match
 * is also the highest-quality option that fits. Falls back to the smallest
 * model if nothing fits (avoids returning undefined).
 */
function pickModelForVram(gb: number): string {
  const fit = LOCAL_MODELS.find(m => m.vramReq <= gb);
  return (fit ?? LOCAL_MODELS[LOCAL_MODELS.length - 1]).id;
}

// ============================================================================
// 3. TOOL DEFINITIONS (used to build the agent system prompt)
// ============================================================================
type ToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
};

const AI_TOOLS: ToolSchema[] = [
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
  { type: "function", function: { name: "billing_get_active_plans", description: "List all currently available public pricing tiers and platform plans.", parameters: { type: "object", properties: {} } } },
];

// ============================================================================
// 4. AGENT PROTOCOL — ReAct-style XML tags, parsed incrementally from a stream
// ============================================================================
//
// Why we don't use WebLLM's native function-calling:
//   * Hermes function-calling in WebLLM has known bugs (content:null on tool_calls
//     round-trip, ContentTypeError on history replay, custom system prompt rejection).
//   * Forcing a keyword pre-classifier defeats the entire point of an agent.
//   * Streaming + native tool_calls don't compose cleanly today.
//
// Instead we use a battle-tested text protocol that the model emits inside its
// normal chat response. This is exactly how Cursor / Aider / Cline / Continue
// run local models against tools today. Bypasses every WebLLM/Hermes bug class
// and gives us free verbose reasoning.
//
// Per turn the model MUST emit ONE of:
//   <thinking>...</thinking><tool_calls>[{name, arguments}, ...]</tool_calls>
//   <thinking>...</thinking><answer>...markdown...</answer>
//
// We feed tool results back as a synthetic user turn wrapping JSON in
// <observations>...</observations>. Iterate until the model emits <answer>.

const PROTOCOL_TAGS = {
  THINKING_OPEN: "<thinking>",
  THINKING_CLOSE: "</thinking>",
  TOOL_CALLS_OPEN: "<tool_calls>",
  TOOL_CALLS_CLOSE: "</tool_calls>",
  ANSWER_OPEN: "<answer>",
  ANSWER_CLOSE: "</answer>",
} as const;

interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

type ParseEvent =
  | { kind: "thinking_delta"; text: string }
  | { kind: "thinking_end" }
  | { kind: "tool_calls"; calls: ParsedToolCall[] }
  | { kind: "tool_calls_error"; raw: string; error: string }
  | { kind: "answer_delta"; text: string }
  | { kind: "answer_end" };

/**
 * Streaming, single-pass parser that emits structured events as token chunks
 * arrive. Holds back partial-tag tails to avoid emitting half a closing tag
 * as visible content. Tolerant: free-form text outside tags is silently
 * discarded (the model occasionally emits leading whitespace or commentary).
 */
class ProtocolParser {
  private buffer = "";
  private state: "idle" | "thinking" | "tool_calls" | "answer" = "idle";

  feed(chunk: string): ParseEvent[] {
    this.buffer += chunk;
    return this.process();
  }

  flush(): ParseEvent[] {
    const events = this.process();
    // If we end mid-tag, surface remaining text from streaming sections so the
    // user sees the tail. Tool-calls JSON without a closer is dropped (would
    // be invalid JSON anyway).
    if (this.state === "thinking" && this.buffer.length > 0) {
      events.push({ kind: "thinking_delta", text: this.buffer });
      events.push({ kind: "thinking_end" });
    } else if (this.state === "answer" && this.buffer.length > 0) {
      events.push({ kind: "answer_delta", text: this.buffer });
      events.push({ kind: "answer_end" });
    }
    this.buffer = "";
    this.state = "idle";
    return events;
  }

  /** Current parser state. Used by the orchestrator to decide whether to
   * synthesize a closing tag after a stream-side stop sequence fires. */
  getState(): "idle" | "thinking" | "tool_calls" | "answer" { return this.state; }

  /** Whatever is currently buffered but not yet emitted. */
  remainder(): string { return this.buffer; }

  private process(): ParseEvent[] {
    const events: ParseEvent[] = [];
    let progressed = true;

    while (progressed) {
      progressed = false;

      if (this.state === "idle") {
        const candidates: Array<{ tag: string; next: "thinking" | "tool_calls" | "answer" }> = [
          { tag: PROTOCOL_TAGS.THINKING_OPEN, next: "thinking" },
          { tag: PROTOCOL_TAGS.TOOL_CALLS_OPEN, next: "tool_calls" },
          { tag: PROTOCOL_TAGS.ANSWER_OPEN, next: "answer" },
        ];
        let earliest: { tag: string; next: "thinking" | "tool_calls" | "answer"; idx: number } | null = null;
        for (const c of candidates) {
          const idx = this.buffer.indexOf(c.tag);
          if (idx >= 0 && (earliest === null || idx < earliest.idx)) {
            earliest = { ...c, idx };
          }
        }
        if (earliest) {
          this.buffer = this.buffer.slice(earliest.idx + earliest.tag.length);
          this.state = earliest.next;
          progressed = true;
        }
      } else if (this.state === "thinking") {
        const closeIdx = this.buffer.indexOf(PROTOCOL_TAGS.THINKING_CLOSE);
        if (closeIdx >= 0) {
          if (closeIdx > 0) events.push({ kind: "thinking_delta", text: this.buffer.slice(0, closeIdx) });
          events.push({ kind: "thinking_end" });
          this.buffer = this.buffer.slice(closeIdx + PROTOCOL_TAGS.THINKING_CLOSE.length);
          this.state = "idle";
          progressed = true;
        } else {
          const safeLen = Math.max(0, this.buffer.length - PROTOCOL_TAGS.THINKING_CLOSE.length);
          if (safeLen > 0) {
            events.push({ kind: "thinking_delta", text: this.buffer.slice(0, safeLen) });
            this.buffer = this.buffer.slice(safeLen);
          }
        }
      } else if (this.state === "tool_calls") {
        const closeIdx = this.buffer.indexOf(PROTOCOL_TAGS.TOOL_CALLS_CLOSE);
        if (closeIdx >= 0) {
          const raw = this.buffer.slice(0, closeIdx).trim();
          try {
            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            const calls: ParsedToolCall[] = arr
              .filter((c: any) => c && typeof c === "object" && typeof c.name === "string")
              .map((c: any) => ({
                name: String(c.name),
                arguments: (c.arguments && typeof c.arguments === "object") ? c.arguments : {},
              }));
            events.push({ kind: "tool_calls", calls });
          } catch (e: any) {
            events.push({ kind: "tool_calls_error", raw, error: e?.message ?? "JSON parse error" });
          }
          this.buffer = this.buffer.slice(closeIdx + PROTOCOL_TAGS.TOOL_CALLS_CLOSE.length);
          this.state = "idle";
          progressed = true;
        }
      } else if (this.state === "answer") {
        const closeIdx = this.buffer.indexOf(PROTOCOL_TAGS.ANSWER_CLOSE);
        if (closeIdx >= 0) {
          if (closeIdx > 0) events.push({ kind: "answer_delta", text: this.buffer.slice(0, closeIdx) });
          events.push({ kind: "answer_end" });
          this.buffer = this.buffer.slice(closeIdx + PROTOCOL_TAGS.ANSWER_CLOSE.length);
          this.state = "idle";
          progressed = true;
        } else {
          const safeLen = Math.max(0, this.buffer.length - PROTOCOL_TAGS.ANSWER_CLOSE.length);
          if (safeLen > 0) {
            events.push({ kind: "answer_delta", text: this.buffer.slice(0, safeLen) });
            this.buffer = this.buffer.slice(safeLen);
          }
        }
      }
    }

    return events;
  }
}

/**
 * Streaming tag stripper for the synthesis pass. Small models occasionally
 * leak protocol noise into what is supposed to be a plain markdown reply —
 * `<thinking>`, `<tool_calls>`, `<observations>`, role markers like `User:`.
 * This class strips that noise on the fly so the user sees clean markdown
 * during streaming AND in the final stored message.
 *
 * Behavior:
 *   - Tags whose content is internal-only (`<thinking>`, `<tool_calls>`,
 *     `<observations>`) are dropped entirely along with their content.
 *   - Bare markers we don't want shown (`<answer>`, `</answer>`, `User:`,
 *     `Assistant:`) are stripped but surrounding content is preserved.
 *   - Hold-back logic prevents partial tags from being emitted mid-stream.
 *     Worst-case latency = longest suppressed tag (14 chars).
 */
class TagStripper {
  private static readonly SUPPRESSED_TAGS: Array<{ open: string; close: string }> = [
    { open: "<thinking>", close: "</thinking>" },
    { open: "<tool_calls>", close: "</tool_calls>" },
    { open: "<observations>", close: "</observations>" },
  ];
  private static readonly STRIPPED_MARKERS = ["<answer>", "</answer>"];
  /** Every prefix that could grow into a suppressed open-tag or a stripped
   * marker. Used by `partialTailLength` to decide how many trailing chars
   * to hold back across chunks — we only ever delay emission for chars
   * that *could* still be part of a tag, so plain prose streams immediately. */
  private static readonly TAG_PREFIXES: string[] = (() => {
    const all = new Set<string>();
    const add = (full: string) => {
      for (let i = 1; i < full.length; i++) all.add(full.slice(0, i));
    };
    for (const t of TagStripper.SUPPRESSED_TAGS) add(t.open);
    for (const m of TagStripper.STRIPPED_MARKERS) add(m);
    return Array.from(all);
  })();

  private buffer = "";
  private suppressing = false;
  private suppressUntil = "";
  private emitted = "";

  feed(chunk: string): string {
    this.buffer += chunk;
    let output = "";

    // We may need several passes if the buffer contains alternating
    // suppressed regions and visible content.
    let progress = true;
    while (progress) {
      progress = false;

      if (this.suppressing) {
        const idx = this.buffer.indexOf(this.suppressUntil);
        if (idx >= 0) {
          this.buffer = this.buffer.slice(idx + this.suppressUntil.length);
          this.suppressing = false;
          this.suppressUntil = "";
          progress = true;
        } else {
          // Hold back enough chars to detect the closing tag if it
          // arrives split across chunks.
          const hold = this.suppressUntil.length;
          if (this.buffer.length > hold) this.buffer = this.buffer.slice(-hold);
          break;
        }
      } else {
        let earliestIdx = -1;
        let earliest: { open: string; close: string } | null = null;
        for (const tag of TagStripper.SUPPRESSED_TAGS) {
          const idx = this.buffer.indexOf(tag.open);
          if (idx >= 0 && (earliestIdx === -1 || idx < earliestIdx)) {
            earliestIdx = idx;
            earliest = tag;
          }
        }
        if (earliestIdx >= 0 && earliest) {
          output += this.buffer.slice(0, earliestIdx);
          this.buffer = this.buffer.slice(earliestIdx + earliest.open.length);
          this.suppressing = true;
          this.suppressUntil = earliest.close;
          progress = true;
        } else {
          // No suppressed tag found in full. Hold back only the trailing
          // chars that could still grow into a suppressed tag — usually 0.
          // This keeps plain markdown streaming live without delay.
          const holdback = this.partialTailLength();
          const safeLen = this.buffer.length - holdback;
          if (safeLen > 0) {
            output += this.buffer.slice(0, safeLen);
            this.buffer = this.buffer.slice(safeLen);
            progress = true;
          }
        }
      }
    }

    output = TagStripper.stripMarkers(output);
    this.emitted += output;
    return output;
  }

  /** Length of the longest buffer suffix that is a strict prefix of any
   * suppressed open-tag or stripped marker. We must hold back exactly that
   * many chars so we don't accidentally emit "<th" before realizing it
   * grows into "<thinking>". Returns 0 in the common (no partial-tag) case. */
  private partialTailLength(): number {
    if (this.buffer.length === 0) return 0;
    let max = 0;
    // Walk from the longest possible prefix down to 1 — first hit wins.
    const limit = Math.min(this.buffer.length, 14);
    for (let i = limit; i > 0; i--) {
      const tail = this.buffer.slice(-i);
      if (TagStripper.TAG_PREFIXES.includes(tail)) { max = i; break; }
    }
    return max;
  }

  flush(): string {
    let tail = "";
    if (!this.suppressing) {
      tail = this.buffer;
    }
    this.buffer = "";
    this.suppressing = false;
    this.suppressUntil = "";
    tail = TagStripper.stripMarkers(tail);
    this.emitted += tail;
    return tail;
  }

  /** Total clean content emitted so far. */
  getEmitted(): string {
    return this.emitted;
  }

  private static stripMarkers(s: string): string {
    let out = s;
    for (const m of TagStripper.STRIPPED_MARKERS) {
      if (out.includes(m)) out = out.split(m).join("");
    }
    // Strip `User:` / `Assistant:` role markers when they appear at line start.
    out = out.replace(/(^|\n)(?:User|Assistant):[ \t]*/g, "$1");
    return out;
  }
}

/**
 * One-shot sanitizer for an already-finalized answer string. Same rules as
 * `TagStripper` but for non-streaming consumers (cleaning a stored message
 * before persisting, sanitizing the conversational fallback, etc.).
 */
function sanitizeFinalAnswerText(s: string): string {
  if (!s) return "";
  let out = s;
  out = out.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  out = out.replace(/<thinking>[\s\S]*$/gi, ""); // unclosed tail
  out = out.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/gi, "");
  out = out.replace(/<tool_calls>[\s\S]*$/gi, ""); // unclosed tail
  out = out.replace(/<observations>[\s\S]*?<\/observations>/gi, "");
  out = out.replace(/<observations>[\s\S]*$/gi, ""); // unclosed tail
  out = out.replace(/<\/?answer>/gi, "");
  out = out.replace(/(^|\n)(?:User|Assistant):[ \t]*/g, "$1");
  // Collapse runs of blank lines created by the strips above.
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

// ============================================================================
// 5. SYSTEM PROMPT BUILDER
// ============================================================================
const buildToolListForPrompt = (tools: ToolSchema[]): string => {
  return tools.map(t => {
    const fn = t.function;
    const props = fn.parameters?.properties ?? {};
    const required = new Set(fn.parameters?.required ?? []);
    const argParts = Object.entries(props).map(([key, schema]: [string, any]) => {
      const opt = required.has(key) ? "" : "?";
      return `${key}${opt}: ${schema.type ?? "any"}`;
    });
    const sig = argParts.length ? `(${argParts.join(", ")})` : "()";
    return `- ${fn.name}${sig} — ${fn.description}`;
  }).join("\n");
};

const buildAgentSystemPrompt = (tools: ToolSchema[]): string => {
  const toolList = buildToolListForPrompt(tools);
  return `You are Senzor Operational Intelligence — an enterprise SRE assistant for infrastructure monitoring and observability across APM, RUM, logs, errors, infrastructure, and billing.

You operate as an autonomous agent with access to live telemetry tools. Reason briefly, fetch real data with tools, then synthesize a clear answer for the user.

# Available Tools

${toolList}

# Output Protocol — STRICT

You communicate ONLY through XML-tagged blocks. Every response is EXACTLY ONE of these two patterns. Never mix them. Never write any text outside the tags.

## Pattern A — fetch data with tools
<thinking>
One short paragraph (1-3 sentences) of plain prose: what data is needed and which tool(s) will get it.
</thinking>
<tool_calls>
[{"name": "tool_name", "arguments": {"key": "value"}}]
</tool_calls>

## Pattern B — final answer to the user
<thinking>
One short paragraph (1-3 sentences) summarizing what the gathered data shows.
</thinking>
<answer>
Your GitHub-Flavored Markdown response. Cite real values from the observations.
</answer>

# Hard Rules — DO NOT VIOLATE

1. STOP IMMEDIATELY after </tool_calls> or </answer>. Generate nothing more in that turn.
2. NEVER write the literal strings "User:" or "Assistant:" — those are role markers, not content.
3. NEVER write your own <observations> block. The system supplies <observations> for you as the next user message after each <tool_calls>.
4. NEVER simulate a follow-up question from the user. Wait for the real user's next message.
5. Each turn = exactly ONE pattern. Either <tool_calls> OR <answer>, never both, never neither.
6. The body inside <tool_calls> MUST be a valid JSON array. Independent fetches go in the same array (executed in parallel). Use only tool names from the Available Tools list above.
7. NEVER invent metrics, IDs, timestamps, or values. Only cite data that actually appeared in an <observations> block earlier in this conversation.
8. If a tool returns ok:false or empty data, acknowledge it in the next <thinking> and adapt: try a different tool, broaden the time range, or finalize with <answer>.
9. For PURELY conversational input (only "hi", "hello", "what can you do", "thanks", and similar — no data words), skip <tool_calls> and answer directly with <answer>. Anything that mentions logs, errors, services, traces, metrics, monitors, VPS, RUM, APM, billing, alerts, infrastructure, or any specific entity IS a data query and you MUST call a tool — never ask the user for filters or time ranges. Pick sensible defaults (e.g. range:"24h", limit:20).
10. <answer> must be clean GitHub-Flavored Markdown — headings, bullet lists, tables, fenced code blocks where useful. Be concise. SREs are busy.
11. Once you have called a tool, the next turn must be <answer> unless the data clearly requires a follow-up call with DIFFERENT arguments. NEVER call the same tool with the same arguments twice in a row — that is a fatal protocol violation; finalize with <answer> instead.

# Worked Example

The block below shows a complete agent run for ONE example user query. Inside <example>...</example>, you can see what YOU would emit on each turn and what the SYSTEM supplies between your turns. Outside of <example>, never repeat any of these literal values; they are illustrative only.

<example>
[Example user query: "Is my main API healthy?"]

[Your turn 1:]
<thinking>
Need APM service list to find the main API, then its recent stats and unresolved errors.
</thinking>
<tool_calls>
[{"name": "apm_list_services", "arguments": {}}]
</tool_calls>

[System then supplies, as the next user message:]
<observations>
[1] apm_list_services (ok)
{"services":[{"id":"svc_42","name":"main-api"}]}
</observations>

[Your turn 2:]
<thinking>
Found main-api (svc_42). Pulling 24h stats and unresolved errors in parallel.
</thinking>
<tool_calls>
[
  {"name": "apm_get_stats", "arguments": {"id": "svc_42", "range": "24h"}},
  {"name": "error_get_global", "arguments": {}}
]
</tool_calls>

[System then supplies:]
<observations>
[1] apm_get_stats (ok)
{"p50":110,"p95":420,"p99":880,"rps":18,"errorRate":0.4}
[2] error_get_global (ok)
{"errors":[]}
</observations>

[Your turn 3 — final:]
<thinking>
p95 of 420ms is healthy, 18 RPS sustained, error rate 0.4%, no unresolved error groups. Service is healthy.
</thinking>
<answer>
## main-api — Healthy

| Metric | Value |
|---|---|
| p50 latency | 110ms |
| p95 latency | 420ms |
| p99 latency | 880ms |
| Throughput | 18 RPS |
| Error rate | 0.4% |
| Unresolved errors | 0 |

No action needed. The service is operating within normal parameters.
</answer>
</example>

End of example. Now respond to the real user query that follows. Remember: ONE pattern per turn, STOP after </tool_calls> or </answer>, never invent values, never simulate the user.`;
};

// ============================================================================
// 6. OBSERVATION FORMATTER (context-budget-aware)
// ============================================================================
interface ToolExecutionResult {
  tool: string;
  args: Record<string, any>;
  ok: boolean;
  data?: any;
  error?: string;
}

const formatObservations = (
  results: ToolExecutionResult[],
  budget: { perTool: number; total: number } = { perTool: 3500, total: 14000 },
): string => {
  const safeStringify = (val: any): string => {
    try { return JSON.stringify(val); } catch { return String(val); }
  };

  const blocks: string[] = [];
  let totalLen = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let body: string;
    if (r.ok) {
      let payload = safeStringify(r.data);
      if (payload.length > budget.perTool) {
        payload = payload.slice(0, budget.perTool) + ` …[truncated ${payload.length - budget.perTool} chars]`;
      }
      body = payload;
    } else {
      body = `ERROR: ${r.error || "Unknown error"}`;
    }
    const block = `[${i + 1}] ${r.tool} (${r.ok ? "ok" : "fail"})\n${body}`;
    if (totalLen + block.length > budget.total) {
      blocks.push(`[${i + 1}+] ${results.length - i} additional results omitted (context budget exceeded)`);
      break;
    }
    blocks.push(block);
    totalLen += block.length;
  }
  return `<observations>\n${blocks.join("\n\n")}\n</observations>`;
};

// ============================================================================
// 7. STREAMING COMPLETION ADAPTER (WebLLM + OpenAI BYOK behind one signature)
// ============================================================================
type ChatRole = "system" | "user" | "assistant";

/**
 * Persisted record of the agent's work for a single assistant turn. UI-only
 * metadata — never participates in the model's conversation context, but is
 * saved alongside the message so users can audit past investigations.
 */
type AgentStep =
  | { iteration: number; type: "thinking"; ts: number; content: string }
  | { iteration: number; type: "tool_call"; ts: number; toolName: string; args: any; durationMs?: number; ok?: boolean }
  | { iteration: number; type: "tool_result"; ts: number; toolName: string; data: any; durationMs: number }
  | { iteration: number; type: "tool_error"; ts: number; toolName: string; error: string; durationMs: number };

interface AgentTrace {
  startedAt: number;
  endedAt?: number;
  iterations: number;
  toolCallCount: number;
  steps: AgentStep[];
  provider: "webllm" | "byok";
  modelHint?: string;
}

interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Present on assistant messages only; populated after each agent run. */
  trace?: AgentTrace;
}

interface StreamOpts {
  provider: "webllm" | "byok";
  engine: any;
  apiKey?: string;
  byokModel?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
  /**
   * Hard stop sequences. Both providers natively support these. We also keep
   * a software-side guard in the consumer (the orchestrator) in case the
   * provider doesn't honor them in streaming mode (some local backends don't).
   */
  stop?: string[];
}

async function* streamCompletion(opts: StreamOpts): AsyncGenerator<string, void, void> {
  // OpenAI's REST API caps `stop` at 4 entries. WebLLM mirrors that contract.
  const stop = opts.stop && opts.stop.length > 0 ? opts.stop.slice(0, 4) : undefined;

  if (opts.provider === "webllm") {
    if (!opts.engine) throw new Error("WebLLM engine is not initialized.");
    const stream = (await opts.engine.chat.completions.create({
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
      ...(stop ? { stop } : {}),
    })) as AsyncIterable<any>;

    for await (const chunk of stream) {
      if (opts.signal.aborted) {
        try { await opts.engine.interruptGenerate?.(); } catch { /* best effort */ }
        throw new DOMException("Aborted", "AbortError");
      }
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) yield delta;
    }
    return;
  }

  // BYOK: OpenAI streaming via fetch SSE
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${opts.apiKey ?? ""}`,
    },
    body: JSON.stringify({
      model: opts.byokModel ?? "gpt-4o",
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
      ...(stop ? { stop } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`OpenAI API error (${res.status}): ${detail || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (opts.signal.aborted) {
      try { await reader.cancel(); } catch { /* noop */ }
      throw new DOMException("Aborted", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // OpenAI SSE: events separated by \n\n, lines start with "data: "
    let nlIdx;
    while ((nlIdx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) yield delta;
      } catch {
        // tolerate malformed event
      }
    }
  }
}

// ============================================================================
// 8. AGENT ORCHESTRATOR
// ============================================================================
type AgentPhase = "thinking" | "selecting_tools" | "calling_tools" | "analyzing" | "responding" | "idle";

interface AgentCallbacks {
  onIterationStart: (iteration: number) => void;
  onPhase: (phase: AgentPhase, detail?: string, tools?: string[]) => void;
  onThinkingDelta: (text: string) => void;
  onThinkingEnd: (full: string, iteration: number) => void;
  onToolCallsStart: (calls: ParsedToolCall[]) => void;
  onToolStart: (call: ParsedToolCall) => void;
  onToolResult: (call: ParsedToolCall, data: any) => void;
  onToolError: (call: ParsedToolCall, error: string) => void;
  onAnswerStart: () => void;
  onAnswerDelta: (text: string) => void;
  onAnswerEnd: (full: string) => void;
}

interface RunAgentOpts {
  provider: "webllm" | "byok";
  engine: any;
  apiKey?: string;
  byokModel?: string;
  history: ChatMessage[];
  userInput: string;
  tools: ToolSchema[];
  callTool: (name: string, args: any) => Promise<any>;
  signal: AbortSignal;
  callbacks: AgentCallbacks;
  maxIterations?: number;
}

/**
 * Stop sequences sent to the model on every iteration. Two purposes:
 *   1. Natural turn-boundary stops (</tool_calls>, </answer>) — the model is
 *      contractually supposed to stop there anyway, but giving the engine an
 *      explicit stop saves compute and prevents runaway hallucination.
 *   2. Hallucination guards (<observations>, "User:") — the model should
 *      NEVER emit these. If a small model hallucinates them, we kill the
 *      stream before the bogus content pollutes our protocol.
 *
 * OpenAI's API caps `stop` at 4. WebLLM mirrors that contract.
 */
const AGENT_STOP_SEQUENCES = ["</tool_calls>", "</answer>", "<observations>", "User:"];

/**
 * Strip a string from the end if present. Used to canonicalize raw model
 * output after a stop sequence fired (the engine excludes the stop string).
 */
const stripTrailing = (s: string, suffix: string): string =>
  s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;

/**
 * Build the system prompt used by the SYNTHESIS pass — a separate, much
 * simpler instruction that does NOT mention the agent protocol at all. We
 * use this whenever the agent loop ends (success, stuck, or capped) and we
 * need to convert gathered telemetry into a clean markdown reply.
 *
 * Why a separate prompt?
 *   Small models (1.5B-3B) often fail to emit `<answer>...</answer>` even
 *   when explicitly asked. By dropping the protocol entirely for synthesis,
 *   we maximize the chance the model just writes plain markdown — which is
 *   all we need at this stage. Any protocol noise that does leak through is
 *   stripped client-side by `TagStripper`.
 */
const SYNTHESIS_SYSTEM_PROMPT = `You are Senzor Operational Intelligence — an enterprise SRE assistant for infrastructure observability across APM, RUM, logs, errors, infrastructure, and billing.

The agent has finished gathering live telemetry from the user's monitoring backend. Your sole task now: write a clear, professional GitHub-Flavored Markdown reply that directly answers the user's question using the data provided below.

# Output Rules — STRICT

1. Output ONLY GitHub-Flavored Markdown. Use headings, bullet lists, tables, and fenced code blocks where useful.
2. NEVER write XML or HTML tags — no <thinking>, <tool_calls>, <answer>, <observations>, or anything similar. Tags will be stripped.
3. NEVER write the literal strings "User:" or "Assistant:" — those are role markers, not content.
4. NEVER fabricate values. Only cite numbers, IDs, timestamps, and statuses that actually appear in the telemetry data below.
5. If the data is empty, missing, or inconclusive, say so honestly and recommend a concrete next step.
6. Do NOT include preamble like "Sure", "Of course", "Let me", "I will", "Here is". Begin immediately with a meaningful headline or summary line.
7. Be concise. SREs are busy — prefer bulleted facts over paragraphs.
8. Format the response so it can stand alone — the user will not see your raw data, only your reply.`;

interface SynthesizeOpts {
  provider: "webllm" | "byok";
  engine: any;
  apiKey?: string;
  byokModel?: string;
  userQuery: string;
  observations: ToolExecutionResult[];
  signal: AbortSignal;
  onAnswerStart: () => void;
  onAnswerDelta: (text: string) => void;
  onAnswerEnd: (full: string) => void;
}

/**
 * Format gathered tool results as plain-text data for the synthesizer's
 * input. Unlike `formatObservations`, this does NOT wrap in <observations>
 * tags (the synthesizer prompt forbids tags) and uses a friendlier, more
 * markdown-compatible layout.
 *
 * Budget: keep total under ~10k chars to leave room in the context window
 * for the system prompt + the user query + the model's own response.
 */
const formatDataForSynthesis = (results: ToolExecutionResult[]): string => {
  if (results.length === 0) return "";
  const PER_TOOL_LIMIT = 3000;
  const TOTAL_LIMIT = 10000;

  const safeStringify = (val: any): string => {
    try { return JSON.stringify(val, null, 2); } catch { return String(val); }
  };

  const blocks: string[] = [];
  let total = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let body: string;
    if (r.ok) {
      let payload = safeStringify(r.data);
      if (payload.length > PER_TOOL_LIMIT) {
        payload = payload.slice(0, PER_TOOL_LIMIT) + ` …[truncated ${payload.length - PER_TOOL_LIMIT} chars]`;
      }
      body = payload;
    } else {
      body = `ERROR: ${r.error || "Unknown error"}`;
    }
    const argSummary = Object.keys(r.args || {}).length === 0
      ? ""
      : ` ${safeStringify(r.args)}`;
    const block = `### ${i + 1}. ${r.tool}${argSummary} (${r.ok ? "ok" : "fail"})\n\n${body}`;
    if (total + block.length > TOTAL_LIMIT) {
      blocks.push(`*[${results.length - i} additional results omitted to fit context budget]*`);
      break;
    }
    blocks.push(block);
    total += block.length;
  }
  return blocks.join("\n\n");
};

/**
 * Stream a clean final-answer to the user, free of agent protocol. Used
 * whenever the agent loop ends — including the stuck-loop, bad-turn, and
 * iteration-cap exits. Streams sanitized markdown via the supplied
 * callbacks and returns the final cleaned string.
 */
async function synthesizeFinalAnswer(opts: SynthesizeOpts): Promise<string> {
  const dataBlock = formatDataForSynthesis(opts.observations);
  const userMessage = dataBlock.length > 0
    ? `User question:\n\n${opts.userQuery}\n\n---\n\nLive telemetry data fetched in response (DO NOT echo this section verbatim — analyze it and reply to the user):\n\n${dataBlock}`
    : `User question:\n\n${opts.userQuery}\n\n---\n\nThe agent attempted to gather telemetry but could not retrieve any data — most likely because no matching tool was invoked successfully. In your reply:\n  1. Acknowledge briefly and honestly that you couldn't fetch the requested data this time.\n  2. Suggest one or two concrete next steps the user can take (e.g., rephrase the question with a specific service or VPS name, narrow the time range, or check that monitoring is enabled).\n  3. Do NOT fabricate values, IDs, or status indicators.\nKeep it short — a few lines is ideal.`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const stripper = new TagStripper();
  let started = false;
  let raw = "";
  let aborted = false;

  try {
    for await (const delta of streamCompletion({
      provider: opts.provider,
      engine: opts.engine,
      apiKey: opts.apiKey,
      byokModel: opts.byokModel,
      messages,
      // Slightly higher temp for natural prose; still well below default.
      temperature: 0.3,
      maxTokens: 2048,
      signal: opts.signal,
      // Intentionally NO stop sequences — we want the model to fully
      // complete the markdown reply. Sanitization handles any noise.
    })) {
      raw += delta;
      const clean = stripper.feed(delta);
      if (clean.length > 0) {
        if (!started) { opts.onAnswerStart(); started = true; }
        opts.onAnswerDelta(clean);
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      aborted = true;
      throw err;
    }
    // Network / engine errors — fall through and use whatever we have.
    console.warn("[Senzor Intelligence] synthesis stream failed:", err);
  }

  if (!aborted) {
    const tail = stripper.flush();
    if (tail.length > 0) {
      if (!started) { opts.onAnswerStart(); started = true; }
      opts.onAnswerDelta(tail);
    }
  }

  // Final clean is the streamer's accumulated output, but if the model
  // somehow produced nothing (e.g. all output was suppressed tags), fall
  // back to a sanitized version of the raw text, then to a generic message.
  let cleaned = stripper.getEmitted().trim();
  if (!cleaned) cleaned = sanitizeFinalAnswerText(raw);
  if (!cleaned) {
    cleaned = opts.observations.length > 0
      ? "I gathered some data but couldn't formulate a complete response. Try rephrasing your question or narrowing the time range."
      : "I couldn't gather the data needed to answer that. Please rephrase your question or check that the relevant monitoring is active.";
    if (!started) opts.onAnswerStart();
    opts.onAnswerDelta(cleaned);
  }

  opts.onAnswerEnd(cleaned);
  return cleaned;
}

/**
 * Standard Levenshtein edit distance. Used for fuzzy-matching hallucinated
 * tool names back to the real registry so we can give the model a
 * "did you mean X?" hint instead of a generic rejection.
 */
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
    }
  }
  return dp[b.length];
};

/**
 * Find the most likely real tool the model meant when it emitted
 * `needle`. Strategy (in priority order):
 *   1. Case-insensitive exact match.
 *   2. Substring match in either direction (handles things like
 *      "list_vps_servers" → "vps_list", or "vps_stats" → "vps_get_stats").
 *   3. Levenshtein within a length-proportional threshold.
 * Returns null if no plausible match exists — better silence than a
 * misleading suggestion.
 */
const closestToolName = (needle: string, knownNames: string[]): string | null => {
  if (!needle || knownNames.length === 0) return null;
  const lower = needle.toLowerCase();

  for (const name of knownNames) {
    if (name.toLowerCase() === lower) return name;
  }

  // Token-aware substring: strip non-alphanumerics and check both directions.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const nLower = normalize(lower);
  let bestSubstr: { name: string; overlap: number } | null = null;
  for (const name of knownNames) {
    const nName = normalize(name);
    if (nName.includes(nLower) || nLower.includes(nName)) {
      const overlap = Math.min(nName.length, nLower.length);
      if (!bestSubstr || overlap > bestSubstr.overlap) {
        bestSubstr = { name, overlap };
      }
    }
  }
  if (bestSubstr) return bestSubstr.name;

  let best: { name: string; dist: number } | null = null;
  for (const name of knownNames) {
    const d = levenshtein(lower, name.toLowerCase());
    if (best === null || d < best.dist) best = { name, dist: d };
  }
  // Threshold: allow up to 1/3 of the longer name's length, capped at 5.
  if (best) {
    const longer = Math.max(needle.length, best.name.length);
    const threshold = Math.min(5, Math.max(2, Math.floor(longer / 3)));
    if (best.dist <= threshold) return best.name;
  }
  return null;
};

/**
 * Compare two arrays of tool calls for structural equality. Used to detect
 * the "model is stuck repeating the same call" failure mode.
 */
const sameToolCalls = (a: ParsedToolCall[], b: ParsedToolCall[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name) return false;
    try {
      if (JSON.stringify(a[i].arguments) !== JSON.stringify(b[i].arguments)) return false;
    } catch { return false; }
  }
  return true;
};

async function runAgent(opts: RunAgentOpts): Promise<string> {
  const maxIter = opts.maxIterations ?? 6;
  const systemPrompt = buildAgentSystemPrompt(opts.tools);
  const knownToolNames = new Set(opts.tools.map(t => t.function.name));

  const conversation: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...opts.history
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0)
      .map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userInput },
  ];

  let finalAnswer = "";
  let iteration = 0;
  let lastCallSignature: ParsedToolCall[] | null = null;
  let consecutiveBadTurns = 0;
  /**
   * Real (not synthetic) tool results gathered across iterations. Powers
   * the synthesis pass at the end of the run. Synthetic system observations
   * (unknown-tool errors, stuck-loop nudges, etc.) are intentionally NOT
   * included — we want the synthesizer to reason from real data only.
   */
  const gatheredObservations: ToolExecutionResult[] = [];

  while (iteration < maxIter) {
    iteration++;
    if (opts.signal.aborted) throw new DOMException("Aborted", "AbortError");

    opts.callbacks.onIterationStart(iteration);
    opts.callbacks.onPhase("thinking", `Reasoning (step ${iteration})…`);

    const parser = new ProtocolParser();
    let assistantOutput = "";
    // State holder: object property writes survive control-flow narrowing,
    // which `let` reassigned inside a closure does not.
    const turn: {
      pendingToolCalls: ParsedToolCall[] | null;
      toolCallsError: { raw: string; error: string } | null;
      answerStarted: boolean;
      answerComplete: boolean;
      answerBuffer: string;
      thinkingBuffer: string;
      /** Per-turn streaming sanitizer for whatever ends up in <answer>. Small
       * models occasionally nest <thinking> or other protocol noise inside
       * <answer>; running every answer chunk through the stripper guarantees
       * the user only ever sees clean markdown — never leaked tags. */
      answerStripper: TagStripper;
    } = {
      pendingToolCalls: null,
      toolCallsError: null,
      answerStarted: false,
      answerComplete: false,
      answerBuffer: "",
      thinkingBuffer: "",
      answerStripper: new TagStripper(),
    };

    const emitAnswerChunk = (chunk: string) => {
      if (!chunk) return;
      if (!turn.answerStarted) {
        turn.answerStarted = true;
        opts.callbacks.onAnswerStart();
        opts.callbacks.onPhase("responding", "Streaming response…");
      }
      turn.answerBuffer += chunk;
      opts.callbacks.onAnswerDelta(chunk);
    };

    const handleEvents = (events: ParseEvent[]) => {
      for (const ev of events) {
        if (ev.kind === "thinking_delta") {
          turn.thinkingBuffer += ev.text;
          opts.callbacks.onThinkingDelta(ev.text);
        } else if (ev.kind === "thinking_end") {
          opts.callbacks.onThinkingEnd(turn.thinkingBuffer.trim(), iteration);
          turn.thinkingBuffer = "";
        } else if (ev.kind === "tool_calls") {
          turn.pendingToolCalls = ev.calls;
        } else if (ev.kind === "tool_calls_error") {
          turn.toolCallsError = { raw: ev.raw, error: ev.error };
        } else if (ev.kind === "answer_delta") {
          emitAnswerChunk(turn.answerStripper.feed(ev.text));
        } else if (ev.kind === "answer_end") {
          emitAnswerChunk(turn.answerStripper.flush());
          turn.answerComplete = true;
          if (turn.answerStarted) {
            opts.callbacks.onAnswerEnd(turn.answerBuffer.trim());
          }
        }
      }
    };

    try {
      for await (const delta of streamCompletion({
        provider: opts.provider,
        engine: opts.engine,
        apiKey: opts.apiKey,
        byokModel: opts.byokModel,
        messages: conversation,
        // Low temperature for deterministic protocol & tool selection. Higher
        // temperatures cause small models like Hermes-3-8B to hallucinate
        // tool names and protocol violations.
        temperature: 0.1,
        maxTokens: 1536,
        signal: opts.signal,
        stop: AGENT_STOP_SEQUENCES,
      })) {
        assistantOutput += delta;
        handleEvents(parser.feed(delta));

        // Once we've fully captured a tool_calls or answer block, halt the
        // stream early to save compute. The model's contract is "exactly one
        // pattern per turn" so anything after is throwaway.
        if (turn.pendingToolCalls || turn.toolCallsError || turn.answerComplete) {
          if (opts.provider === "webllm" && opts.engine?.interruptGenerate) {
            try { await opts.engine.interruptGenerate(); } catch { /* best effort */ }
          }
          break;
        }
      }

      // Stream ended. If a stop sequence fired and we were mid-block, the
      // engine swallowed the closing tag (e.g. "</tool_calls>"). Re-feed the
      // appropriate closer so the parser can finalize cleanly.
      const parserState = parser.getState();
      if (!turn.pendingToolCalls && !turn.toolCallsError && !turn.answerComplete) {
        if (parserState === "tool_calls") {
          handleEvents(parser.feed("</tool_calls>"));
        } else if (parserState === "answer") {
          handleEvents(parser.feed("</answer>"));
        }
      }
      handleEvents(parser.flush());
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      // Network/engine error during streaming — bubble up so caller can show toast
      throw err;
    }

    // Canonicalize the raw output for conversation memory: drop any trailing
    // stop sequence the engine may or may not have included.
    let canonical = assistantOutput;
    for (const seq of AGENT_STOP_SEQUENCES) {
      canonical = stripTrailing(canonical, seq);
    }
    canonical = canonical.trimEnd();
    // If we had to synthesize a closer, append it for memory consistency.
    if (turn.pendingToolCalls && !canonical.endsWith("</tool_calls>")) canonical += "\n</tool_calls>";
    if (turn.answerComplete && !canonical.endsWith("</answer>")) canonical += "\n</answer>";

    conversation.push({ role: "assistant", content: canonical });

    if (turn.answerComplete) {
      // answerBuffer is already sanitized via TagStripper during streaming.
      // If non-empty, accept; otherwise the model only emitted protocol
      // noise inside <answer> — fall through to synthesizer.
      const cleaned = turn.answerBuffer.trim();
      if (cleaned) {
        finalAnswer = cleaned;
      }
      break;
    }

    if (turn.pendingToolCalls && turn.pendingToolCalls.length > 0) {
      // Validate every requested call against the registered tool list.
      // Unknown tools become synthetic ok:false observations so the model
      // can self-correct on the next iteration.
      const validCalls: ParsedToolCall[] = [];
      const invalidCalls: ParsedToolCall[] = [];
      for (const c of turn.pendingToolCalls) {
        if (knownToolNames.has(c.name)) validCalls.push(c);
        else invalidCalls.push(c);
      }

      // ---------------------------------------------------------------
      // CASE 1 — every requested tool name is hallucinated.
      // ---------------------------------------------------------------
      // Without a special branch this path was the silent killer: the
      // model emits <tool_calls>[{name:"list_vps_servers"...}]</tool_calls>,
      // we generate an invalid-tool error observation, results.length is
      // 1 (the synthetic error), the OLD `else` branch resets
      // consecutiveBadTurns to 0, and the loop runs all 6 iterations
      // without ever capturing a real result. We now treat
      // "no valid tools at all" as a bad turn and offer the model a
      // typed-fix hint via closestToolName so it can self-correct.
      if (validCalls.length === 0 && invalidCalls.length > 0) {
        const knownArr = Array.from(knownToolNames);
        const lines = invalidCalls.map((c) => {
          const closest = closestToolName(c.name, knownArr);
          opts.callbacks.onToolError(c, `Unknown tool "${c.name}".`);
          return closest
            ? `- "${c.name}" is not a real tool. Did you mean "${closest}"?`
            : `- "${c.name}" is not a real tool and no close match was found.`;
        });
        conversation.push({
          role: "user",
          content: `<observations>\n[1] system (fail)\nNone of the tool names you requested exist:\n${lines.join("\n")}\n\nUse ONLY tool names from the Available Tools list (look at the # Available Tools section of the system prompt). If unsure, finalize with <answer> instead of guessing.\n</observations>`,
        });
        consecutiveBadTurns++;
        // Two strikes-and-out — if the model can't pick a real tool name
        // after one correction, it likely never will. Synthesize from
        // whatever (if any) prior data we have.
        if (gatheredObservations.length > 0 || consecutiveBadTurns >= 2) {
          opts.callbacks.onPhase("analyzing", "Synthesizing final answer from available context…");
          break;
        }
        opts.callbacks.onPhase("analyzing", "Suggesting valid tool names…");
        continue;
      }

      // ---------------------------------------------------------------
      // CASE 2 — model emitted <tool_calls>[]</tool_calls>. Useless turn.
      // ---------------------------------------------------------------
      if (validCalls.length === 0 && invalidCalls.length === 0) {
        conversation.push({
          role: "user",
          content: `<observations>\n[1] system (warn)\nYour <tool_calls> array was empty. Either choose a valid tool from the list or finalize with <answer>.\n</observations>`,
        });
        consecutiveBadTurns++;
        if (gatheredObservations.length > 0 || consecutiveBadTurns >= 2) break;
        continue;
      }

      // ---------------------------------------------------------------
      // CASE 3 — at least one valid tool call. Normal execution path.
      // ---------------------------------------------------------------
      // Stuck-loop guard: same calls as the previous iteration. Hard-break
      // instead of looping; small models won't change behavior with a
      // corrective nudge, they just re-emit the same call again.
      if (
        lastCallSignature &&
        sameToolCalls(lastCallSignature, validCalls)
      ) {
        opts.callbacks.onPhase("analyzing", "Tool data already gathered. Synthesizing final answer…");
        break;
      }
      lastCallSignature = validCalls;

      const calls: ParsedToolCall[] = validCalls;
      opts.callbacks.onPhase(
        "calling_tools",
        `Executing ${calls.length} tool${calls.length > 1 ? "s" : ""}…`,
        calls.map(c => c.name),
      );
      opts.callbacks.onToolCallsStart(calls);

      const realResults: ToolExecutionResult[] = await Promise.all(
        calls.map(async (call) => {
          opts.callbacks.onToolStart(call);
          try {
            const data = await opts.callTool(call.name, call.arguments || {});
            opts.callbacks.onToolResult(call, data);
            return { tool: call.name, args: call.arguments || {}, ok: true, data };
          } catch (e: any) {
            const message = e?.message || String(e);
            opts.callbacks.onToolError(call, message);
            return { tool: call.name, args: call.arguments || {}, ok: false, error: message };
          }
        }),
      );

      // Build "did you mean" hints for any invalid tools that came along
      // with the valid ones (partial-batch case — much less common).
      const knownArr = Array.from(knownToolNames);
      const invalidResults: ToolExecutionResult[] = invalidCalls.map((c) => {
        const closest = closestToolName(c.name, knownArr);
        const hint = closest ? ` Did you mean "${closest}"?` : "";
        const message = `Unknown tool "${c.name}".${hint} Choose only from the Available Tools list.`;
        opts.callbacks.onToolError(c, message);
        return { tool: c.name, args: c.arguments || {}, ok: false, error: message };
      });

      // Persist real results (not invalid synthetic ones) for the synthesizer.
      // Successful AND failed real calls both carry useful signal.
      gatheredObservations.push(...realResults);

      const results = [...realResults, ...invalidResults];
      conversation.push({ role: "user", content: formatObservations(results) });
      consecutiveBadTurns = 0;
      opts.callbacks.onPhase("analyzing", `Synthesizing ${results.length} result${results.length === 1 ? "" : "s"}…`);
      continue;
    }

    if (turn.toolCallsError) {
      // Tell the model its JSON was bad — it will retry. But if we already
      // have real data, prefer to synthesize rather than risk another bad
      // turn from a small model that can't recover.
      if (gatheredObservations.length > 0) {
        opts.callbacks.onPhase("analyzing", "Recovering from a malformed tool call. Synthesizing final answer…");
        break;
      }
      conversation.push({
        role: "user",
        content: `<observations>\n[1] system (fail)\nCould not parse your <tool_calls> JSON: ${turn.toolCallsError.error}. Retry with a valid JSON array, or skip tools and provide an <answer>.\n</observations>`,
      });
      consecutiveBadTurns++;
      continue;
    }

    // Model produced text but neither tool_calls nor answer parsed cleanly.
    // Two sub-cases:
    //   (a) iteration 1 with no tools used yet AND no protocol noise → treat
    //       as conversational reply (greeting, capability question). Sanitize
    //       defensively in case there's a leaked tag we missed.
    //   (b) any later iteration, OR output that looks like a protocol leak
    //       (contains <thinking>, <tool_calls>, "User:", etc.) → escalate
    //       toward the synthesizer; never accept noisy output as final.
    const fallback = assistantOutput.trim();
    const looksLikeProtocolLeak =
      /<thinking>|<tool_calls>|<answer>|<observations>|^User:|\nUser:|^Assistant:|\nAssistant:/i.test(fallback);

    if (iteration === 1 && fallback && !looksLikeProtocolLeak && gatheredObservations.length === 0) {
      const cleaned = sanitizeFinalAnswerText(fallback);
      if (cleaned) {
        finalAnswer = cleaned;
        break;
      }
    }

    consecutiveBadTurns++;
    // Two-strikes-and-out for clean runs, but ONE strike if we already
    // have real data — at that point another bad turn would just waste
    // tokens; the synthesizer can do the rest.
    if (
      consecutiveBadTurns >= 2 ||
      (gatheredObservations.length > 0 && consecutiveBadTurns >= 1)
    ) {
      break;
    }

    conversation.push({
      role: "user",
      content: `<observations>\n[1] system (warn)\nYour previous response did not follow the protocol. Respond with EXACTLY one pattern: either <thinking>...</thinking><tool_calls>[...]</tool_calls> or <thinking>...</thinking><answer>...</answer>. Do not output anything else.\n</observations>`,
    });
  }

  // Loop ended without a usable <answer> tag. Run a clean, protocol-free
  // synthesis pass using the real observations we gathered. This pass
  //   - uses a separate, simpler system prompt that forbids XML tags;
  //   - does NOT use stop sequences (so the model can complete its reply);
  //   - streams through TagStripper so any leaked tags are scrubbed in
  //     real time before the user sees them;
  //   - always returns a non-empty string (with a graceful fallback if the
  //     model produced nothing usable).
  if (!finalAnswer) {
    if (opts.signal.aborted) throw new DOMException("Aborted", "AbortError");
    opts.callbacks.onPhase("responding", "Synthesizing final answer…");
    finalAnswer = await synthesizeFinalAnswer({
      provider: opts.provider,
      engine: opts.engine,
      apiKey: opts.apiKey,
      byokModel: opts.byokModel,
      userQuery: opts.userInput,
      observations: gatheredObservations,
      signal: opts.signal,
      onAnswerStart: opts.callbacks.onAnswerStart,
      onAnswerDelta: opts.callbacks.onAnswerDelta,
      onAnswerEnd: opts.callbacks.onAnswerEnd,
    });
  }

  return finalAnswer;
}

// ============================================================================
// 9. TOOL EXECUTION (pure data fetcher; UI logging happens in callTool wrapper)
// ============================================================================
const TOOL_RETRYABLE_STATUSES = new Set([502, 503, 504]);

const fetchToolData = async (toolName: string, args: any): Promise<any> => {
  const params = { range: args?.range || "24h" };

  switch (toolName) {
    // --- APM ---
    case "apm_list_services": return (await api.get('/apm/list')).data;
    case "apm_get_stats": return (await api.get(`/apm/${args.id}/stats`, { params })).data;
    case "apm_get_invocations": return (await api.get(`/apm/${args.id}/invocations`, { params: { limit: 10 } })).data;
    case "apm_get_trace_detail": return (await api.get(`/apm/${args.id}/trace/${args.traceId}`)).data;

    // --- RUM ---
    case "rum_list_services": return (await api.get('/rum/list')).data;
    case "rum_get_dashboard": return (await api.get(`/rum/${args.id}/dashboard`, { params })).data;
    case "rum_get_trace_detail": return (await api.get(`/rum/${args.id}/trace/${args.traceId}`)).data;

    // --- Tasks ---
    case "task_list_services": return (await api.get('/task/list')).data;
    case "task_get_dashboard": return (await api.get(`/task/${args.id}/dashboard`, { params })).data;
    case "task_get_entity_detail": return (await api.get(`/task/${args.id}/entity/${encodeURIComponent(args.taskName)}`, { params })).data;
    case "task_get_run_detail": return (await api.get(`/task/${args.id}/run/${args.runId}`)).data;

    // --- Infra & DB ---
    case "vps_list": return (await api.get('/vps/list')).data;
    case "vps_get_stats": return (await api.get(`/vps/${args.id}/stats`, { params })).data;
    case "database_list": return (await api.get('/database/list')).data;
    case "database_get_stats": return (await api.get(`/database/${args.id}/stats`, { params })).data;

    // --- Logs & Errors ---
    case "logs_query": return (await api.get('/logs', { params: { search: args?.search || "", limit: args?.limit || 15, range: args?.range || "24h" } })).data;
    case "logs_get_by_id": return (await api.get(`/logs/${args.id}`)).data;
    case "logs_get_by_trace": return (await api.get(`/apm/${args.id}/trace/${args.traceId}/logs`)).data;

    case "error_get_global": return (await api.get('/errors', { params: { limit: 15, status: 'unresolved' } })).data;
    case "error_get_group_detail": return (await api.get(`/errors/${args.groupId}`, { params })).data;
    case "error_get_trace_errors": return (await api.get(`/apm/${args.id}/trace/${args.traceId}/errors`)).data;

    // --- Web Analytics & Monitors ---
    case "web_list_websites": return (await api.get('/web/list')).data;
    case "web_get_stats": return (await api.get(`/web/${args.id}/stats`, { params })).data;
    case "uptime_list_monitors": return (await api.get('/uptime/list')).data;
    case "uptime_get_stats": return (await api.get(`/uptime/${args.id}/stats`, { params })).data;

    // --- Alerts & Views ---
    case "alerts_list_destinations": return (await api.get('/alerts/destinations')).data;
    case "alerts_list_policies": return (await api.get('/alerts/policies')).data;
    case "alerts_get_policy_details": return (await api.get(`/alerts/policies/${args.id}`)).data;
    case "views_list_dashboards": return (await api.get('/views')).data;
    case "views_get_dashboard": return (await api.get(`/views/${args.id}`)).data;
    case "views_get_widget_data": return (await api.get(`/views/widgets/${args.id}/data`, { params })).data;

    // --- Schema & Billing ---
    case "schema_get_dynamic": return (await api.get('/schema')).data;
    case "billing_get_storage_stats": return (await api.get('/billing/storage-stats')).data;
    case "billing_get_subscription": return (await api.get('/billing/subscription')).data;
    case "billing_get_transactions": return (await api.get('/billing/transactions')).data;
    case "billing_get_transaction_receipt": return (await api.get(`/billing/transactions/${args.transactionId}/receipt`)).data;
    case "billing_get_active_plans": return (await api.get('/billing/plans')).data;

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

const fetchToolDataWithRetry = async (toolName: string, args: any): Promise<any> => {
  try {
    return await fetchToolData(toolName, args);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && TOOL_RETRYABLE_STATUSES.has(status)) {
      await new Promise(r => setTimeout(r, 600));
      return await fetchToolData(toolName, args);
    }
    // Surface the most useful error message available
    const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
    if (apiMsg) throw new Error(apiMsg);
    throw err;
  }
};

// ============================================================================
// 10. PRESENTATION COMPONENTS
// ============================================================================
interface AgentStatus {
  phase: AgentPhase;
  detail?: string;
  tools?: string[];
}

type LogEntry =
  | { time: Date; type: "thinking"; name: string; content: string }
  | { time: Date; type: "tool_call"; name: string; args: any }
  | { time: Date; type: "tool_result"; name: string; data: any }
  | { time: Date; type: "tool_error"; name: string; error: string };

interface SuggestedPrompt {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  prompts: string[];
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    category: "Performance",
    icon: TrendingUp,
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    prompts: [
      "Which APM service has the highest p99 latency in the last 24 hours?",
      "Summarize the slowest 5 backend traces today and what they have in common.",
    ],
  },
  {
    category: "Errors",
    icon: Bug,
    accent: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    prompts: [
      "List my top unresolved error groups and rank them by impact.",
      "Has any new error appeared in the last hour that wasn't there yesterday?",
    ],
  },
  {
    category: "Infrastructure",
    icon: ServerCog,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    prompts: [
      "Are any of my VPS servers approaching 80% memory or CPU usage?",
      "Show me the slowest database instance and its query throughput.",
    ],
  },
  {
    category: "Reliability",
    icon: ShieldCheck,
    accent: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    prompts: [
      "Which uptime monitors had downtime this week?",
      "Are there any open incidents in my alert policies right now?",
    ],
  },
  {
    category: "Background Jobs",
    icon: Activity,
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    prompts: [
      "Which background tasks have failed most often in the last 24 hours?",
      "Find the cron job with the worst average duration.",
    ],
  },
  {
    category: "Billing",
    icon: Receipt,
    accent: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    prompts: [
      "How much storage am I using vs my plan limit?",
      "Show my last 3 billing transactions and their amounts.",
    ],
  },
];

const PHASE_META: Record<AgentPhase, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  thinking: { icon: Brain, label: "Reasoning", color: "text-violet-500" },
  selecting_tools: { icon: Sparkles, label: "Planning", color: "text-amber-500" },
  calling_tools: { icon: Wrench, label: "Calling tools", color: "text-blue-500" },
  analyzing: { icon: Zap, label: "Analyzing", color: "text-cyan-500" },
  responding: { icon: Bot, label: "Responding", color: "text-emerald-500" },
  idle: { icon: Bot, label: "Idle", color: "text-muted-foreground" },
};

const PHASE_ORDER: AgentPhase[] = ["thinking", "selecting_tools", "calling_tools", "analyzing", "responding"];

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

/** Compact button with an icon-only mode and a copy-to-clipboard helper. */
const CopyButton: React.FC<{ value: string; className?: string; label?: string }> = ({ value, className, label }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={label ?? "Copy"}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md px-1.5 py-1 hover:bg-muted",
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
};

/**
 * Markdown renderer tuned for the design system. We deliberately do NOT enable
 * raw HTML (security) and we restrict to GFM (tables, task lists, autolinks,
 * strikethrough) which is what we instruct the model to produce.
 */
const AssistantMarkdown: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const components = useMemo(() => ({
    h1: (props: any) => <h1 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0" {...props} />,
    h2: (props: any) => <h2 className="text-[15px] font-bold text-foreground mt-4 mb-2 first:mt-0 tracking-tight" {...props} />,
    h3: (props: any) => <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0" {...props} />,
    h4: (props: any) => <h4 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0" {...props} />,
    p: (props: any) => <p className="text-sm leading-relaxed text-foreground my-2 first:mt-0 last:mb-0" {...props} />,
    ul: (props: any) => <ul className="my-2 list-disc pl-5 space-y-1 text-sm text-foreground marker:text-muted-foreground" {...props} />,
    ol: (props: any) => <ol className="my-2 list-decimal pl-5 space-y-1 text-sm text-foreground marker:text-muted-foreground" {...props} />,
    li: (props: any) => <li className="leading-relaxed" {...props} />,
    strong: (props: any) => <strong className="font-bold text-foreground" {...props} />,
    em: (props: any) => <em className="italic" {...props} />,
    a: (props: any) => <a className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: (props: any) => <blockquote className="border-l-2 border-border pl-3 my-2 text-muted-foreground italic" {...props} />,
    hr: () => <hr className="my-3 border-border/60" />,
    table: (props: any) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs" {...props} />
      </div>
    ),
    thead: (props: any) => <thead className="bg-muted/50" {...props} />,
    tbody: (props: any) => <tbody className="divide-y divide-border/40" {...props} />,
    tr: (props: any) => <tr {...props} />,
    th: (props: any) => <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60" {...props} />,
    td: (props: any) => <td className="px-3 py-2 text-foreground" {...props} />,
    code: ({ inline, className: cls, children, ...props }: any) => {
      const text = String(children ?? "").replace(/\n$/, "");
      // Heuristic: react-markdown 10 doesn't always pass `inline`; treat
      // single-line code without `language-` class as inline.
      const isInline = inline ?? (!cls && !text.includes("\n"));
      if (isInline) {
        return <code className="px-1.5 py-0.5 rounded bg-muted text-[12px] font-mono text-foreground border border-border/60" {...props}>{children}</code>;
      }
      const lang = (cls ?? "").replace("language-", "") || "code";
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-border/60 bg-[#0d1117] shadow-sm group/code">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{lang}</span>
            <CopyButton value={text} className="text-slate-400 hover:text-slate-100 hover:bg-white/10" />
          </div>
          <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
            <code {...props}>{children}</code>
          </pre>
        </div>
      );
    },
    pre: (props: any) => <>{props.children}</>,
  }), []);

  return (
    <div className={cn("min-w-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as any}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Persisted per-message agent activity (collapsible). Renders the trace
 * captured during the assistant's turn so users can audit past investigations.
 */
const AgentActivityTimeline: React.FC<{ trace: AgentTrace; defaultOpen?: boolean }> = ({ trace, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const elapsedMs = (trace.endedAt ?? Date.now()) - trace.startedAt;
  const summary = `${trace.iterations} iteration${trace.iterations === 1 ? "" : "s"} · ${trace.toolCallCount} tool call${trace.toolCallCount === 1 ? "" : "s"} · ${formatDuration(elapsedMs)}`;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <Brain className="h-3.5 w-3.5 text-violet-500 shrink-0" />
          <span className="text-xs font-semibold text-foreground">Reasoning trace</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground truncate">{summary}</span>
      </button>
      {open && (
        <div className="border-t border-border/40 bg-background/50 p-3 space-y-2 max-h-[420px] overflow-y-auto">
          {trace.steps.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No recorded steps for this turn.</div>
          ) : (
            trace.steps.map((step, i) => <AgentStepRow key={i} step={step} />)
          )}
        </div>
      )}
    </div>
  );
};

const AgentStepRow: React.FC<{ step: AgentStep }> = ({ step }) => {
  const [expanded, setExpanded] = useState(false);

  if (step.type === "thinking") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Brain className="h-3 w-3 text-violet-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Thought</span>
            <span className="text-[10px] font-mono text-muted-foreground">step {step.iteration}</span>
          </div>
          <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{step.content}</div>
        </div>
      </div>
    );
  }

  if (step.type === "tool_call") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Wrench className="h-3 w-3 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Call</span>
            <span className="text-xs font-mono text-foreground truncate">{step.toolName}</span>
            {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </button>
          {expanded && (
            <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(step.args ?? {}, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (step.type === "tool_result") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Result</span>
            <span className="text-xs font-mono text-foreground truncate">{step.toolName}</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">{formatDuration(step.durationMs)}</span>
            {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </button>
          {expanded && (
            <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
              {JSON.stringify(step.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // tool_error
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <AlertCircle className="h-3 w-3 text-rose-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Error</span>
          <span className="text-xs font-mono text-foreground truncate">{step.toolName}</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">{formatDuration(step.durationMs)}</span>
        </div>
        <div className="text-xs leading-relaxed text-rose-500/90 mt-0.5 break-words">{step.error}</div>
      </div>
    </div>
  );
};

/**
 * Live agent timeline shown while the assistant is currently generating.
 * Mirrors AgentActivityTimeline but driven by mutable refs/state, not a
 * persisted trace.
 */
const LiveAgentTimeline: React.FC<{
  status: AgentStatus | null;
  trace: AgentTrace | null;
}> = ({ status, trace }) => {
  const meta = status ? PHASE_META[status.phase] : PHASE_META.idle;
  const PhaseIcon = meta.icon;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3">
        <div className="relative shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <PhaseIcon className={cn("h-3.5 w-3.5", meta.color)} />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{meta.label}</span>
            <div className="flex space-x-1 items-center justify-center">
              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
              <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
              <span className="w-1 h-1 bg-primary/80 rounded-full animate-bounce" />
            </div>
          </div>
          {status?.detail && (
            <div className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2 break-words">{status.detail}</div>
          )}
        </div>
      </div>

      {/* Phase pills */}
      <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {PHASE_ORDER.map((p) => {
          const m = PHASE_META[p];
          const isActive = status?.phase === p;
          const isPast = status ? PHASE_ORDER.indexOf(status.phase) > PHASE_ORDER.indexOf(p) : false;
          const Icon = m.icon;
          return (
            <span
              key={p}
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border transition-all whitespace-nowrap",
                isActive ? "border-primary/40 bg-primary/10 text-primary" : isPast ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500/80" : "border-border/40 bg-background text-muted-foreground/60",
              )}
            >
              {isPast ? <Check className="h-2.5 w-2.5" /> : <Icon className="h-2.5 w-2.5" />}
              {m.label}
            </span>
          );
        })}
      </div>

      {/* Active tools */}
      {status?.tools && status.tools.length > 0 && (
        <div className="px-4 py-2 border-b border-border/40 flex flex-wrap gap-1.5">
          {status.tools.map((tool, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Spinner className="h-2.5 w-2.5" /> {tool}
            </span>
          ))}
        </div>
      )}

      {/* Live timeline */}
      {trace && trace.steps.length > 0 && (
        <div className="px-4 py-3 max-h-[280px] overflow-y-auto space-y-2">
          {trace.steps.slice(-12).map((step, i) => <AgentStepRow key={i} step={step} />)}
        </div>
      )}
    </div>
  );
};

/**
 * Renders a single chat message — user bubble (right) or assistant bubble
 * (left) with trace timeline + markdown + action bar.
 */
const MessageBubble: React.FC<{
  msg: ChatMessage;
  isLastAssistant: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
}> = ({ msg, isLastAssistant, isGenerating, onRegenerate }) => {
  if (msg.role === "user") {
    return (
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary text-primary-foreground shadow-sm">
          <span className="text-xs font-bold">You</span>
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed bg-primary/10 text-foreground border border-primary/20 whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group/msg">
      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 max-w-[92%]">
        {msg.trace && msg.trace.steps.length > 0 && (
          <AgentActivityTimeline trace={msg.trace} />
        )}
        <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-3 shadow-sm">
          {msg.content ? (
            <AssistantMarkdown content={msg.content} />
          ) : (
            <span className="text-xs italic text-muted-foreground">No response generated.</span>
          )}
        </div>
        {msg.content && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <CopyButton value={msg.content} label="Copy" />
            {isLastAssistant && !isGenerating && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md px-1.5 py-1 hover:bg-muted"
                title="Regenerate response"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 11. REACT COMPONENT
// ============================================================================

export default function AiAssistantPage() {
  // --- Engine & State ---
  const [engineMode, setEngineMode] = useState<"setup" | "loading" | "ready">("setup");
  const [provider, setProvider] = useState<"webllm" | "byok">("webllm");
  const [hardwareProfile, setHardwareProfile] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_LOCAL_MODEL_ID);
  const [byokKey, setByokKey] = useState("");

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ text: "", progress: 0, stats: null as any });
  const [chatId] = useState("default-session");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextLogs, setContextLogs] = useState<LogEntry[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [liveTrace, setLiveTrace] = useState<AgentTrace | null>(null);

  const engineRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, contextLogs, liveTrace]);

  useEffect(() => {
    loadChat(chatId).then(msgs => {
      // Defensive: only accept clean user/assistant text from disk. Older
      // builds persisted tool / assistant-with-tool_calls messages; strip them.
      // We accept the optional `trace` field (UI-only metadata) so users can
      // re-open past investigations.
      const cleaned = (Array.isArray(msgs) ? msgs : [])
        .filter((m: any) =>
          m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
        .map((m: any) => {
          const out: ChatMessage = { role: m.role, content: m.content };
          if (m.role === "assistant" && m.trace && typeof m.trace === "object") {
            out.trace = m.trace as AgentTrace;
          }
          return out;
        });
      if (cleaned.length > 0) setMessages(cleaned);
    });
  }, [chatId]);

  useEffect(() => {
    return () => {
      // Abort any in-flight generation when the component unmounts.
      abortRef.current?.abort();
    };
  }, []);

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

        // WebGPU does not expose total VRAM directly. We estimate from
        // `maxStorageBufferBindingSize`, which scales with device memory:
        //   discrete GPUs (>=8 GB VRAM)   ~ 4+ GB max buffer
        //   mid-range / mobile dGPUs       ~ 2-4 GB
        //   thin-and-light dGPUs           ~ 1-2 GB
        //   integrated graphics            ~ 256 MB-1 GB
        // These thresholds map onto our model tiers without false positives.
        const maxBuf = adapter.limits.maxStorageBufferBindingSize;
        const GB = 1024 * 1024 * 1024;
        let vramEstimate: number;
        if (maxBuf >= 4 * GB) vramEstimate = 8;
        else if (maxBuf >= 2 * GB) vramEstimate = 6;
        else if (maxBuf >= 1 * GB) vramEstimate = 4;
        else if (maxBuf >= 0.5 * GB) vramEstimate = 2;
        else vramEstimate = 1;

        setHardwareProfile({
          supported: true,
          vramEstimate,
          name: adapter.info?.isFallbackAdapter ? "Software Renderer" : "Hardware GPU"
        });

        setSelectedModel(pickModelForVram(vramEstimate));

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
            let stats: any = null;

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

  // --- UI-aware tool caller (logs to inspector + retries on transient failures) ---
  const callToolForAgent = useCallback(async (name: string, args: any): Promise<any> => {
    setContextLogs(prev => [...prev, { time: new Date(), type: "tool_call", name, args }]);
    setIsInspectorOpen(true);
    try {
      const data = await fetchToolDataWithRetry(name, args);
      setContextLogs(prev => [...prev, { time: new Date(), type: "tool_result", name, data }]);
      return data;
    } catch (err: any) {
      const message = err?.message || String(err);
      setContextLogs(prev => [...prev, { time: new Date(), type: "tool_error", name, error: message }]);
      throw err;
    }
  }, []);

  /**
   * Core turn runner. Drives runAgent with React-state-aware callbacks,
   * captures a structured trace, and reconciles streaming UI state.
   * Used by both the user send flow and the regenerate flow.
   */
  const runTurn = useCallback(async (userText: string, history: ChatMessage[]) => {
    if (provider === "webllm" && !engineRef.current) {
      toast.error("Local engine is not ready.");
      return;
    }
    if (provider === "byok" && !byokKey) {
      toast.error("Please provide an OpenAI API Key.");
      return;
    }

    setIsGenerating(true);
    setAgentStatus({ phase: "thinking", detail: "Analyzing your request…" });

    const abort = new AbortController();
    abortRef.current = abort;

    const trace: AgentTrace = {
      startedAt: Date.now(),
      iterations: 0,
      toolCallCount: 0,
      steps: [],
      provider,
      modelHint: provider === "webllm" ? selectedModel : "gpt-4o",
    };
    setLiveTrace(trace);

    const toolStartTimes = new WeakMap<ParsedToolCall, number>();
    let assistantIndex: number | null = null;
    let streamingContent = "";
    let thinkingTail = "";

    const pushStep = (step: AgentStep) => {
      trace.steps.push(step);
      // Trigger React re-render for the live timeline by replacing the ref.
      setLiveTrace({ ...trace, steps: [...trace.steps] });
    };

    const callbacks: AgentCallbacks = {
      onIterationStart: (iteration) => {
        trace.iterations = Math.max(trace.iterations, iteration);
        setAgentStatus({ phase: "thinking", detail: `Reasoning (step ${iteration})…` });
        thinkingTail = "";
      },
      onPhase: (phase, detail, tools) => {
        setAgentStatus(prev => ({
          phase,
          detail: detail ?? prev?.detail,
          tools: tools ?? (phase === "calling_tools" ? prev?.tools : undefined),
        }));
      },
      onThinkingDelta: (text) => {
        thinkingTail = (thinkingTail + text).slice(-220);
        setAgentStatus(prev => ({
          phase: prev?.phase === "responding" ? prev.phase : "thinking",
          detail: thinkingTail.trim(),
          tools: prev?.tools,
        }));
      },
      onThinkingEnd: (full, iteration) => {
        if (full) {
          pushStep({ iteration, type: "thinking", ts: Date.now(), content: full });
          setContextLogs(prev => [...prev, {
            time: new Date(),
            type: "thinking",
            name: `Reasoning · step ${iteration}`,
            content: full,
          }]);
        }
        thinkingTail = "";
      },
      onToolCallsStart: (calls) => {
        trace.toolCallCount += calls.length;
        setAgentStatus({
          phase: "calling_tools",
          detail: `Calling ${calls.length} tool${calls.length > 1 ? "s" : ""}: ${calls.map(c => c.name).join(", ")}`,
          tools: calls.map(c => c.name),
        });
      },
      onToolStart: (call) => {
        toolStartTimes.set(call, performance.now());
        pushStep({
          iteration: trace.iterations,
          type: "tool_call",
          ts: Date.now(),
          toolName: call.name,
          args: call.arguments,
        });
      },
      onToolResult: (call, data) => {
        const start = toolStartTimes.get(call) ?? performance.now();
        const durationMs = performance.now() - start;
        pushStep({
          iteration: trace.iterations,
          type: "tool_result",
          ts: Date.now(),
          toolName: call.name,
          data,
          durationMs,
        });
      },
      onToolError: (call, error) => {
        const start = toolStartTimes.get(call) ?? performance.now();
        const durationMs = performance.now() - start;
        pushStep({
          iteration: trace.iterations,
          type: "tool_error",
          ts: Date.now(),
          toolName: call.name,
          error,
          durationMs,
        });
      },
      onAnswerStart: () => {
        setAgentStatus({ phase: "responding", detail: "Streaming response…" });
        setMessages(prev => {
          const next = [...prev, { role: "assistant" as const, content: "" }];
          assistantIndex = next.length - 1;
          return next;
        });
      },
      onAnswerDelta: (text) => {
        streamingContent += text;
        setMessages(prev => {
          if (assistantIndex === null || assistantIndex >= prev.length) return prev;
          const copy = prev.slice();
          copy[assistantIndex] = { role: "assistant", content: streamingContent };
          return copy;
        });
      },
      onAnswerEnd: () => { /* finalization happens after runAgent returns */ },
    };

    try {
      const finalAnswer = await runAgent({
        provider,
        engine: engineRef.current,
        apiKey: provider === "byok" ? byokKey : undefined,
        history,
        userInput: userText,
        tools: AI_TOOLS,
        callTool: (name, args) => callToolForAgent(name, args),
        signal: abort.signal,
        callbacks,
        maxIterations: 6,
      });

      trace.endedAt = Date.now();

      setMessages(prev => {
        let next: ChatMessage[];
        const finalMsg: ChatMessage = { role: "assistant", content: finalAnswer, trace };
        if (assistantIndex === null) {
          next = [...prev, finalMsg];
        } else {
          next = prev.slice();
          next[assistantIndex] = finalMsg;
        }
        saveChat(chatId, next).catch(err =>
          console.warn("[Senzor Intelligence] saveChat failed:", err)
        );
        return next;
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        trace.endedAt = Date.now();
        // Keep whatever was streamed; attach the partial trace so the user
        // can still inspect what happened. Drop the bubble only if it never
        // produced any content.
        setMessages(prev => {
          if (assistantIndex === null) return prev;
          const copy = prev.slice();
          const current = copy[assistantIndex];
          if (current && !current.content) {
            copy.splice(assistantIndex, 1);
          } else if (current) {
            copy[assistantIndex] = { ...current, trace };
          }
          saveChat(chatId, copy).catch(() => {});
          return copy;
        });
        toast.info("Generation cancelled");
      } else {
        console.error("[Senzor Intelligence] runAgent error:", err);
        toast.error("Generation failed: " + (err?.message || "Unknown error"));
        setMessages(prev => {
          if (assistantIndex === null) return prev;
          const copy = prev.slice();
          if (copy[assistantIndex] && !copy[assistantIndex].content) {
            copy.splice(assistantIndex, 1);
          }
          return copy;
        });
      }
    } finally {
      setIsGenerating(false);
      setAgentStatus(null);
      setLiveTrace(null);
      abortRef.current = null;
    }
  }, [provider, byokKey, selectedModel, chatId, callToolForAgent]);

  // --- Agentic Send ---
  const handleSendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const historyBeforeTurn = messages;
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    await runTurn(trimmed, historyBeforeTurn);
  };

  /** Submit a suggested prompt from the empty state. */
  const handleSuggestedPrompt = (prompt: string) => {
    if (isGenerating) return;
    const userMessage: ChatMessage = { role: "user", content: prompt };
    const historyBeforeTurn = messages;
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    runTurn(prompt, historyBeforeTurn);
  };

  /** Re-run the most recent user message, replacing the last assistant turn. */
  const handleRegenerate = async () => {
    if (isGenerating) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return;
    const lastUserText = messages[lastUserIdx].content;
    // Drop everything after (and including) the assistant turn(s) that follow.
    const truncated = messages.slice(0, lastUserIdx + 1);
    const historyBeforeTurn = messages.slice(0, lastUserIdx);
    setMessages(truncated);
    await runTurn(lastUserText, historyBeforeTurn);
  };

  /** Abort an in-flight generation. */
  const handleStop = () => {
    abortRef.current?.abort();
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
          const cleaned: ChatMessage[] = imported.filter((m: any) =>
            m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
          );
          setMessages(cleaned);
          await saveChat(chatId, cleaned);
          toast.success("Chat imported successfully.");
        }
      } catch (err) {
        toast.error("Invalid chat file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async () => {
    abortRef.current?.abort();
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
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Senzor Intelligence</h1>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure your execution engine. Process telemetry natively in your browser for absolute privacy, or use a cloud API for higher throughput.
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
                              {TIER_ORDER.map(tier => {
                                const tierModels = LOCAL_MODELS.filter(m => m.tier === tier);
                                if (tierModels.length === 0) return null;
                                return (
                                  <optgroup key={tier} label={TIER_LABELS[tier]}>
                                    {tierModels.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {m.name} · {m.vramReq}GB VRAM
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </Select>
                            {selectedModelData && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {selectedModelData.description}
                                </p>
                                {selectedModelData.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedModelData.tags.map(tag => (
                                      <span
                                        key={tag}
                                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
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

  let lastAssistantIdx = -1;
  for (let i = displayMessages.length - 1; i >= 0; i--) {
    if (displayMessages[i].role === "assistant") { lastAssistantIdx = i; break; }
  }

  const activeModelLabel = provider === "webllm"
    ? (LOCAL_MODELS.find(m => m.id === selectedModel)?.name?.split(" - ")[0] ?? "Local Model")
    : "GPT-4o (Cloud)";

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        
        {/* Header */}
        <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card",
                  isGenerating ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
                )}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">Senzor Intelligence</h1>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                <span className={cn("inline-flex items-center gap-1 font-mono uppercase tracking-wider font-semibold", isGenerating ? "text-amber-500" : "text-emerald-500")}>
                  {isGenerating ? "Working" : "Ready"}
                </span>
                <span className="opacity-50">·</span>
                <span className="font-mono truncate max-w-[180px]" title={activeModelLabel}>{activeModelLabel}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isGenerating && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="h-8 text-xs font-medium border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50"
              >
                <Square className="h-3 w-3 mr-1.5 fill-current" /> Stop
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={cn("h-8 text-xs font-medium hidden sm:inline-flex", isInspectorOpen ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/15 hover:text-blue-500" : "text-muted-foreground hover:text-foreground")}
            >
              {isInspectorOpen ? <PanelRightClose className="h-3.5 w-3.5 mr-1.5"/> : <PanelRightOpen className="h-3.5 w-3.5 mr-1.5"/>}
              Inspector
            </Button>
            <div className="w-px h-4 bg-border mx-0.5 hidden sm:block" />
            <Button variant="ghost" size="icon" onClick={handleExport} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Export chat">
              <Download className="h-3.5 w-3.5"/>
            </Button>
            <div className="relative">
              <input type="file" id="import-chat" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".json" onChange={handleImport} />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground pointer-events-none" title="Import chat">
                <Upload className="h-3.5 w-3.5"/>
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Clear conversation">
              <Trash2 className="h-3.5 w-3.5"/>
            </Button>
          </div>
        </header>

        {/* Dual Pane Layout */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative w-full">
          
          {/* Left Pane: Chat Interface */}
          <div className="flex-1 flex flex-col h-full bg-background relative z-0 min-w-0">
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
              <div className="max-w-3xl mx-auto space-y-6">
                {displayMessages.length === 0 && !isGenerating ? (
                  <EmptyState onSelect={handleSuggestedPrompt} disabled={isGenerating} />
                ) : (
                  displayMessages.map((msg, idx) => (
                    <MessageBubble
                      key={idx}
                      msg={msg}
                      isLastAssistant={idx === lastAssistantIdx}
                      isGenerating={isGenerating}
                      onRegenerate={handleRegenerate}
                    />
                  ))
                )}
                {isGenerating && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0 max-w-[92%]">
                      <LiveAgentTimeline status={agentStatus} trace={liveTrace} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 bg-background border-t border-border/40 shrink-0 relative z-10">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="relative max-w-3xl mx-auto"
              >
                <div className={cn(
                  "relative bg-card border border-border/60 rounded-2xl shadow-sm transition-all",
                  "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
                  isGenerating && "opacity-90",
                )}>
                  <textarea
                    className="w-full bg-transparent rounded-2xl px-4 py-3.5 text-sm focus:outline-none resize-none pr-14 min-h-[52px] max-h-40 no-scrollbar placeholder:text-muted-foreground"
                    placeholder={isGenerating ? "Generating response — press Stop to cancel…" : "Ask about errors, performance, infrastructure, or billing…"}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    }}
                    rows={1}
                    disabled={isGenerating}
                  />
                  {isGenerating ? (
                    <Button
                      type="button"
                      onClick={handleStop}
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 bottom-2 h-9 w-9 rounded-xl shadow-sm"
                      title="Stop generating"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!input.trim()}
                      size="icon"
                      className="absolute right-2 bottom-2 h-9 w-9 rounded-xl shadow-sm"
                      title="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-2.5 w-2.5 text-emerald-500" />
                    {provider === "webllm" ? "Runs locally on your device" : "Routed via your OpenAI key"}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-2">
                    <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd>
                    <span>to send</span>
                    <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px]">Shift</kbd>
                    <span>+</span>
                    <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd>
                    <span>for newline</span>
                  </span>
                </div>
              </form>
            </div>
          </div>

          {/* Right Pane: Context Inspector (Elastic) */}
          <div className={cn("flex flex-col h-full bg-muted/10 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-l border-border/40 shrink-0", isInspectorOpen ? "w-full md:w-[420px] lg:w-[460px] opacity-100" : "w-0 opacity-0 border-none")}>
            <div className="w-full md:w-[420px] lg:w-[460px] h-full flex flex-col">
              <ContextInspector
                logs={contextLogs}
                onClose={() => setIsInspectorOpen(false)}
                onClear={() => setContextLogs([])}
              />
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// 12. EMPTY STATE & CONTEXT INSPECTOR
// ============================================================================

const EmptyState: React.FC<{
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}> = ({ onSelect, disabled }) => (
  <div className="h-full flex flex-col items-center justify-center py-10 px-2">
    <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
      <Sparkles className="h-7 w-7 text-primary" />
      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
    </div>
    <h2 className="text-lg font-bold text-foreground tracking-tight">How can I help you investigate?</h2>
    <p className="text-sm text-muted-foreground mt-1.5 max-w-md text-center leading-relaxed">
      I can analyze logs, traces, errors, infrastructure, and billing across your Senzor workspace. Ask anything — I'll plan the steps, call the right tools, and summarize the findings.
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
      {SUGGESTED_PROMPTS.map((category) => {
        const Icon = category.icon;
        return (
          <div
            key={category.category}
            className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:border-border transition-colors"
          >
            <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2 bg-muted/20">
              <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0", category.accent)}>
                <Icon className="h-3 w-3" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{category.category}</span>
            </div>
            <div className="p-1">
              {category.prompts.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  disabled={disabled}
                  onClick={() => onSelect(p)}
                  className="group/p w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors flex items-start gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ArrowRight className="h-3 w-3 text-muted-foreground mt-1 shrink-0 group-hover/p:text-primary group-hover/p:translate-x-0.5 transition-all" />
                  <span className="text-xs text-muted-foreground group-hover/p:text-foreground leading-relaxed">{p}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ContextInspector: React.FC<{
  logs: LogEntry[];
  onClose: () => void;
  onClear: () => void;
}> = ({ logs, onClose, onClear }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter((l) => {
      if (l.name.toLowerCase().includes(q)) return true;
      if (l.type === "thinking") return l.content.toLowerCase().includes(q);
      if (l.type === "tool_error") return l.error.toLowerCase().includes(q);
      try {
        const payload = l.type === "tool_call" ? l.args : (l as any).data;
        return JSON.stringify(payload).toLowerCase().includes(q);
      } catch {
        return false;
      }
    });
  }, [logs, query]);

  const counts = useMemo(() => ({
    calls: logs.filter(l => l.type === "tool_call").length,
    results: logs.filter(l => l.type === "tool_result").length,
    errors: logs.filter(l => l.type === "tool_error").length,
    thoughts: logs.filter(l => l.type === "thinking").length,
  }), [logs]);

  return (
    <>
      <div className="px-4 py-3 border-b border-border/40 bg-background/60 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Code2 className="h-4 w-4 text-blue-500" /> Inspector
          </h3>
          <div className="flex items-center gap-1">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-0.5 rounded hover:bg-muted"
                title="Clear inspector logs"
              >
                Clear
              </button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden" onClick={onClose}>
              <X className="h-4 w-4"/>
            </Button>
          </div>
        </div>
        {logs.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Wrench className="h-2.5 w-2.5" />
                {counts.calls} calls
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {counts.results} results
              </span>
              {counts.errors > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {counts.errors} errors
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
                <Brain className="h-2.5 w-2.5" />
                {counts.thoughts} thoughts
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filter by tool name, payload, or message…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-xs pl-7"
              />
            </div>
          </>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10 text-muted-foreground/60">
              <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center mb-3">
                <Database className="h-5 w-5" />
              </div>
              <p className="text-xs leading-relaxed max-w-[240px]">Tool calls, results, and reasoning will stream here for full auditability.</p>
            </div>
          ) : (
            <div className="text-xs text-center text-muted-foreground py-8">No entries match "{query}".</div>
          )
        ) : (
          filtered.map((log, i) => <ContextInspectorRow key={i} log={log} />)
        )}
      </div>
    </>
  );
};

const ContextInspectorRow: React.FC<{ log: LogEntry }> = ({ log }) => {
  const meta = (() => {
    if (log.type === "tool_call") return { Icon: Wrench, label: "Call", chip: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (log.type === "tool_result") return { Icon: CheckCircle2, label: "Result", chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (log.type === "tool_error") return { Icon: AlertCircle, label: "Error", chip: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    return { Icon: Brain, label: "Thought", chip: "bg-violet-500/10 text-violet-400 border-violet-500/20" };
  })();
  const { Icon } = meta;

  const payload = log.type === "thinking"
    ? log.content
    : JSON.stringify(
        log.type === "tool_call" ? log.args : log.type === "tool_error" ? log.error : log.data,
        null,
        2,
      );

  return (
    <div className="bg-[#0d1117] border border-border/60 rounded-lg overflow-hidden shadow-sm group">
      <div className={cn("px-3 py-2 text-[11px] font-bold font-mono border-b flex items-center justify-between gap-2", meta.chip)}>
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="uppercase tracking-wider opacity-90 shrink-0">{meta.label}</span>
          <span className="truncate text-slate-200/80 normal-case">{log.name}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-slate-500 whitespace-nowrap font-normal">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            {log.time.toLocaleTimeString()}
          </span>
          <CopyButton value={payload} className="text-slate-400 hover:text-slate-100 hover:bg-white/10 opacity-0 group-hover:opacity-100" />
        </span>
      </div>
      <div className="p-3 overflow-x-auto max-h-56">
        <pre className="text-[10px] font-mono text-[#e6edf3] whitespace-pre-wrap break-all">{payload}</pre>
      </div>
    </div>
  );
};
