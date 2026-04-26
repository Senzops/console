import React, { useState, useEffect, useRef, useCallback } from "react";
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
const LOCAL_MODELS = [
  { id: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC", name: "Hermes 3 (8B) - High Quality", vramReq: 8 },
  { id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", name: "Hermes 3 (8B) - Balanced", vramReq: 6 },
  { id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC", name: "Hermes 2 Pro (7B) - Fast Spec", vramReq: 4 },
];

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
  return `You are Senzor Operational Intelligence — an enterprise SRE assistant for infrastructure monitoring and observability. You analyze APM, RUM, logs, errors, and infrastructure metrics to help the user diagnose issues, understand system behavior, and make data-driven decisions.

You operate as an autonomous agent with access to live telemetry tools. Reason step-by-step, fetch real data with tools, then synthesize a clear answer.

# Tools

${toolList}

# Protocol

You MUST communicate using XML-style tags. Each turn must follow ONE of these patterns exactly. Never mix patterns in a single turn. Never emit text outside the tags.

## Pattern A — gather data with tools

<thinking>
One short paragraph: what data do you need and which tools will get it? Be specific.
</thinking>
<tool_calls>
[
  {"name": "tool_name", "arguments": { "key": "value" }}
]
</tool_calls>

## Pattern B — provide the final answer

<thinking>
One short paragraph: what does the gathered data show?
</thinking>
<answer>
Your markdown response to the user. Cite real values from the observations.
</answer>

# Rules

1. ALWAYS open with a <thinking> block. Keep it 1-3 sentences.
2. Each turn outputs EXACTLY ONE pattern — either <tool_calls> OR <answer>, never both, never neither.
3. The <tool_calls> body MUST be a valid JSON array. Multiple tools execute in parallel, so include independent fetches together.
4. NEVER invent metrics, IDs, or values. Only cite data that appeared in an <observations> block in the conversation.
5. If a tool returns ok:false or empty data, acknowledge it in your next <thinking> and adapt (try a different tool, or answer with what you have).
6. If the user's request is conversational (greeting, capability question, clarification), skip <tool_calls> and answer directly with <answer>.
7. If you cannot make further progress, write a clear <answer> explaining what you found and what is missing.
8. Format <answer> in clean markdown: headings, bullet lists, tables, fenced code blocks where useful. Keep it scannable.
9. Be concise. SREs are busy.

# Example

User: "Is my main API healthy?"

<thinking>
I need the user's APM services and the main one's recent latency plus unresolved errors.
</thinking>
<tool_calls>
[{"name": "apm_list_services", "arguments": {}}]
</tool_calls>

<observations>
[1] apm_list_services (ok)
{"services":[{"id":"svc_42","name":"main-api"}]}
</observations>

<thinking>
Found "main-api" (svc_42). Fetching stats and unresolved errors in parallel.
</thinking>
<tool_calls>
[
  {"name": "apm_get_stats", "arguments": {"id": "svc_42", "range": "24h"}},
  {"name": "error_get_global", "arguments": {}}
]
</tool_calls>

<observations>
[1] apm_get_stats (ok)
{"p50":110,"p95":420,"p99":880,"rps":18,"errorRate":0.4}
[2] error_get_global (ok)
{"errors":[]}
</observations>

<thinking>
Latency healthy (p95 420ms), 18 RPS sustained, error rate < 1%, no unresolved exception groups. The service is healthy.
</thinking>
<answer>
## main-api — Healthy

| Metric | Value |
|--------|-------|
| p50 latency | 110ms |
| p95 latency | 420ms |
| p99 latency | 880ms |
| Throughput | 18 RPS |
| Error rate | 0.4% |
| Unresolved errors | 0 |

No action needed. The service is operating within normal parameters.
</answer>`;
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
interface ChatMessage { role: ChatRole; content: string; }

interface StreamOpts {
  provider: "webllm" | "byok";
  engine: any;
  apiKey?: string;
  byokModel?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
}

async function* streamCompletion(opts: StreamOpts): AsyncGenerator<string, void, void> {
  if (opts.provider === "webllm") {
    if (!opts.engine) throw new Error("WebLLM engine is not initialized.");
    const stream = (await opts.engine.chat.completions.create({
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
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

async function runAgent(opts: RunAgentOpts): Promise<string> {
  const maxIter = opts.maxIterations ?? 8;
  const systemPrompt = buildAgentSystemPrompt(opts.tools);

  const conversation: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...opts.history
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0)
      .map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userInput },
  ];

  let finalAnswer = "";
  let iteration = 0;

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
    } = {
      pendingToolCalls: null,
      toolCallsError: null,
      answerStarted: false,
      answerComplete: false,
      answerBuffer: "",
      thinkingBuffer: "",
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
          if (!turn.answerStarted) {
            turn.answerStarted = true;
            opts.callbacks.onAnswerStart();
            opts.callbacks.onPhase("responding", "Streaming response…");
          }
          turn.answerBuffer += ev.text;
          opts.callbacks.onAnswerDelta(ev.text);
        } else if (ev.kind === "answer_end") {
          turn.answerComplete = true;
          opts.callbacks.onAnswerEnd(turn.answerBuffer.trim());
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
        temperature: 0.3,
        maxTokens: 2048,
        signal: opts.signal,
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
      handleEvents(parser.flush());
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      // Network/engine error during streaming — bubble up so caller can show toast
      throw err;
    }

    // Persist this turn into the agent's working memory (system + assistant raw)
    conversation.push({ role: "assistant", content: assistantOutput });

    if (turn.answerComplete && turn.answerBuffer.trim()) {
      finalAnswer = turn.answerBuffer.trim();
      break;
    }

    if (turn.pendingToolCalls && turn.pendingToolCalls.length > 0) {
      const calls: ParsedToolCall[] = turn.pendingToolCalls;
      opts.callbacks.onPhase(
        "calling_tools",
        `Executing ${calls.length} tool${calls.length > 1 ? "s" : ""}…`,
        calls.map(c => c.name),
      );
      opts.callbacks.onToolCallsStart(calls);

      const results: ToolExecutionResult[] = await Promise.all(
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

      conversation.push({ role: "user", content: formatObservations(results) });
      opts.callbacks.onPhase("analyzing", `Synthesizing ${results.length} result${results.length > 1 ? "s" : ""}…`);
      continue;
    }

    if (turn.toolCallsError) {
      // Tell the model its JSON was bad — it will retry.
      conversation.push({
        role: "user",
        content: `<observations>\n[1] system (fail)\nERROR: Could not parse your <tool_calls> JSON (${turn.toolCallsError.error}). Retry with a valid JSON array, or skip tools and provide an <answer>.\n</observations>`,
      });
      continue;
    }

    // Model produced text but neither pattern parsed — graceful fallback:
    // treat the whole raw output as the answer if it looks like prose.
    const fallback = assistantOutput.trim();
    if (fallback) {
      finalAnswer = fallback;
      break;
    }

    // Empty output — bail to avoid infinite loop.
    finalAnswer = "I was unable to generate a response. Please try rephrasing.";
    break;
  }

  // Hit iteration cap without a final <answer> — force synthesis
  if (!finalAnswer) {
    if (opts.signal.aborted) throw new DOMException("Aborted", "AbortError");
    opts.callbacks.onPhase("responding", "Synthesizing final answer…");
    conversation.push({
      role: "user",
      content: `<observations>\n[1] system (info)\nYou have used the maximum number of tool iterations. Provide your <answer> now using only the data already gathered. Do NOT call any more tools.\n</observations>`,
    });

    const parser = new ProtocolParser();
    let buf = "";
    let answered = false;
    let raw = "";
    try {
      for await (const delta of streamCompletion({
        provider: opts.provider,
        engine: opts.engine,
        apiKey: opts.apiKey,
        byokModel: opts.byokModel,
        messages: conversation,
        temperature: 0.4,
        maxTokens: 2048,
        signal: opts.signal,
      })) {
        raw += delta;
        for (const ev of parser.feed(delta)) {
          if (ev.kind === "answer_delta") {
            if (!answered) { answered = true; opts.callbacks.onAnswerStart(); }
            buf += ev.text;
            opts.callbacks.onAnswerDelta(ev.text);
          } else if (ev.kind === "answer_end") {
            opts.callbacks.onAnswerEnd(buf.trim());
          }
        }
      }
      for (const ev of parser.flush()) {
        if (ev.kind === "answer_delta") {
          if (!answered) { answered = true; opts.callbacks.onAnswerStart(); }
          buf += ev.text;
          opts.callbacks.onAnswerDelta(ev.text);
        } else if (ev.kind === "answer_end") {
          opts.callbacks.onAnswerEnd(buf.trim());
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      // fall through with whatever we have
    }
    finalAnswer = buf.trim() || raw.trim() || "I gathered some data but could not finalize a response. Please try rephrasing your question.";
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
// 10. REACT COMPONENT
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextLogs, setContextLogs] = useState<LogEntry[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  const engineRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, contextLogs]);

  useEffect(() => {
    loadChat(chatId).then(msgs => {
      // Defensive: only accept clean user/assistant text from disk. Older
      // builds persisted tool / assistant-with-tool_calls messages; strip them.
      const cleaned = (Array.isArray(msgs) ? msgs : [])
        .filter((m: any) =>
          m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        ) as ChatMessage[];
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

  // --- Agentic Send ---
  const handleSendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    if (provider === "webllm" && !engineRef.current) {
      toast.error("Local engine is not ready.");
      return;
    }
    if (provider === "byok" && !byokKey) {
      toast.error("Please provide an OpenAI API Key.");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const historyBeforeTurn = messages;
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);
    setAgentStatus({ phase: "thinking", detail: "Analyzing your request…" });

    const abort = new AbortController();
    abortRef.current = abort;

    // Live-streaming assistant message: index inside `messages` is captured
    // when streaming begins. We use a closure variable rather than chasing
    // state because React batches setMessages and we need stable identity.
    let assistantIndex: number | null = null;
    let streamingContent = "";
    let thinkingTail = "";

    const callbacks: AgentCallbacks = {
      onIterationStart: (iteration) => {
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
        // Surface live thinking in the status bubble.
        setAgentStatus(prev => ({
          phase: prev?.phase === "responding" ? prev.phase : "thinking",
          detail: thinkingTail.trim(),
          tools: prev?.tools,
        }));
      },
      onThinkingEnd: (full, iteration) => {
        if (full) {
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
        setAgentStatus({
          phase: "calling_tools",
          detail: `Calling ${calls.length} tool${calls.length > 1 ? "s" : ""}: ${calls.map(c => c.name).join(", ")}`,
          tools: calls.map(c => c.name),
        });
      },
      onToolStart: () => { /* per-call logging happens in callToolForAgent */ },
      onToolResult: () => { /* logged in wrapper */ },
      onToolError: () => { /* logged in wrapper */ },
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
        history: historyBeforeTurn,
        userInput: trimmed,
        tools: AI_TOOLS,
        callTool: (name, args) => callToolForAgent(name, args),
        signal: abort.signal,
        callbacks,
        maxIterations: 8,
      });

      // Reconcile final state: if streaming UI never started (e.g. fallback
      // path), append the final answer now. Otherwise normalize the streamed
      // bubble to the canonical final answer (covers cases where post-end
      // whitespace differs).
      setMessages(prev => {
        let next: ChatMessage[];
        if (assistantIndex === null) {
          next = [...prev, { role: "assistant", content: finalAnswer }];
        } else {
          next = prev.slice();
          next[assistantIndex] = { role: "assistant", content: finalAnswer };
        }
        // Persist clean state asynchronously.
        saveChat(chatId, next).catch(err =>
          console.warn("[Senzor Intelligence] saveChat failed:", err)
        );
        return next;
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.info("Generation cancelled");
      } else {
        console.error("[Senzor Intelligence] runAgent error:", err);
        toast.error("Generation failed: " + (err?.message || "Unknown error"));
        // Don't leave a dangling empty assistant bubble in the chat.
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
      abortRef.current = null;
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
                      <div className={cn("px-3 py-2 text-xs font-bold font-mono border-b flex items-center justify-between", log.type === "tool_call" ? "bg-blue-500/10 text-[#79c0ff] border-blue-500/20" : log.type === "tool_error" ? "bg-destructive/10 text-[#ff7b72] border-destructive/20" : log.type === "thinking" ? "bg-violet-500/10 text-[#c4a8ff] border-violet-500/20" : "bg-emerald-500/10 text-[#3fb950] border-emerald-500/20")}>
                        <span className="whitespace-nowrap truncate mr-2">{log.type === "tool_call" ? `> CALL ${log.name}` : log.type === "thinking" ? `~ THOUGHT ${log.name}` : `< RESULT ${log.name}`}</span>
                        <span className="text-[9px] opacity-70 text-gray-400 whitespace-nowrap">{log.time.toLocaleTimeString()}</span>
                      </div>
                      <div className="p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {log.type === "thinking" ? (
                          <pre className="text-[10px] font-mono text-[#e6edf3] whitespace-pre-wrap">{log.content}</pre>
                        ) : (
                          <pre className="text-[10px] font-mono text-[#e6edf3]">
                            {JSON.stringify(log.type === "tool_call" ? log.args : log.type === "tool_error" ? log.error : log.data, null, 2)}
                          </pre>
                        )}
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
