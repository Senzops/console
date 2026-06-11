// ============================================================================
// AI Assistant — Context Budget Enforcement
// ============================================================================
// Manages token estimation and conversation trimming to stay within model
// context windows. Critical for WebLLM (8K) and important for BYOK (128K
// used with 32K operating budget).

import type { ChatMessage, ToolExecutionResult } from './types';

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

/**
 * Conservative token estimator. WebLLM doesn't expose the tokenizer
 * synchronously; for budgeting we only need an upper bound. Empirically,
 * GPT/Llama tokenizers run ~3.6–4.2 chars/token on English+JSON; we use
 * 3.5 to stay safe. Used exclusively for in-loop trim — never for billing.
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 3.5);
}

export function estimateConversationTokens(msgs: ChatMessage[]): number {
  let total = 0;
  for (const m of msgs) {
    total +=
      estimateTokens(typeof m.content === 'string' ? m.content : '') + 6;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Context Budget Enforcement
// ---------------------------------------------------------------------------

/**
 * Drop the oldest user/assistant pairs from the middle of `conversation`
 * until the estimated token cost fits inside `tokenBudget`. The system
 * message (index 0) and the latest user/observation (last index) are always
 * preserved.
 */
export function enforceContextBudget(
  conversation: ChatMessage[],
  tokenBudget: number,
): { trimmedCount: number; finalTokens: number } {
  let trimmedCount = 0;
  let current = estimateConversationTokens(conversation);
  while (current > tokenBudget && conversation.length > 3) {
    conversation.splice(1, 1);
    trimmedCount++;
    current = estimateConversationTokens(conversation);
  }
  return { trimmedCount, finalTokens: current };
}

// ---------------------------------------------------------------------------
// Observation Formatting
// ---------------------------------------------------------------------------

const safeStringify = (val: any): string => {
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
};

/**
 * Format tool execution results as <observations> for the ReAct protocol.
 */
export function formatObservations(
  results: ToolExecutionResult[],
  budget: { perTool: number; total: number } = {
    perTool: 2400,
    total: 7200,
  },
): string {
  const blocks: string[] = [];
  let totalLen = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let body: string;
    if (r.ok) {
      let payload = safeStringify(r.data);
      if (payload.length > budget.perTool) {
        payload =
          payload.slice(0, budget.perTool) +
          ` …[truncated ${payload.length - budget.perTool} chars]`;
      }
      body = payload;
    } else {
      body = `ERROR: ${r.error || 'Unknown error'}`;
    }
    const block = `[${i + 1}] ${r.tool} (${r.ok ? 'ok' : 'fail'})\n${body}`;
    if (totalLen + block.length > budget.total) {
      blocks.push(
        `[${i + 1}+] ${results.length - i} additional results omitted (context budget exceeded)`,
      );
      break;
    }
    blocks.push(block);
    totalLen += block.length;
  }
  return `<observations>\n${blocks.join('\n\n')}\n</observations>`;
}

/**
 * Format tool results for the synthesis pass — plain-text, no XML tags.
 */
export function formatDataForSynthesis(
  results: ToolExecutionResult[],
): string {
  if (results.length === 0) return '';
  const PER_TOOL_LIMIT = 3000;
  const TOTAL_LIMIT = 10000;

  const blocks: string[] = [];
  let total = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let body: string;
    if (r.ok) {
      let payload: string;
      try {
        payload = JSON.stringify(r.data, null, 2);
      } catch {
        payload = String(r.data);
      }
      if (payload.length > PER_TOOL_LIMIT) {
        payload =
          payload.slice(0, PER_TOOL_LIMIT) +
          ` …[truncated ${payload.length - PER_TOOL_LIMIT} chars]`;
      }
      body = payload;
    } else {
      body = `ERROR: ${r.error || 'Unknown error'}`;
    }
    const argSummary =
      Object.keys(r.args || {}).length === 0
        ? ''
        : ` ${safeStringify(r.args)}`;
    const block = `### ${i + 1}. ${r.tool}${argSummary} (${r.ok ? 'ok' : 'fail'})\n\n${body}`;
    if (total + block.length > TOTAL_LIMIT) {
      blocks.push(
        `*[${results.length - i} additional results omitted to fit context budget]*`,
      );
      break;
    }
    blocks.push(block);
    total += block.length;
  }
  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// Observation Budget Presets
// ---------------------------------------------------------------------------

export function getObservationBudget(contextWindow: number): {
  perTool: number;
  total: number;
} {
  if (contextWindow <= 8192) {
    return { perTool: 2400, total: 7200 };
  }
  if (contextWindow <= 16384) {
    return { perTool: 4000, total: 14000 };
  }
  return { perTool: 6000, total: 24000 };
}
