// ============================================================================
// Provider Streaming — Unified streaming for all providers
// ============================================================================
//
// Two modes:
//   1. streamText() — plain text streaming for ReAct protocol (WebLLM)
//   2. streamWithTools() — native tool calling for BYOK cloud providers
//
// Each provider has its own API format but all are normalized into the same
// async generator interface.

import type {
  ChatMessage,
  ToolSchema,
  ProviderConfig,
  NativeToolStreamEvent,
} from '../types';
import { getProvider, getProviderModel } from './registry';

// ---------------------------------------------------------------------------
// SSE Parser (shared by OpenAI-compatible providers)
// ---------------------------------------------------------------------------

async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<any> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal.aborted) {
      try { await reader.cancel(); } catch { /* noop */ }
      throw new DOMException('Aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx;
    while ((nlIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        yield JSON.parse(data);
      } catch {
        // tolerate malformed event
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Text Streaming (for ReAct protocol)
// ---------------------------------------------------------------------------

export async function* streamText(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    signal: AbortSignal;
  },
): AsyncGenerator<string> {
  const stop =
    opts.stop && opts.stop.length > 0 ? opts.stop.slice(0, 4) : undefined;

  // --- WebLLM ---
  if (config.providerId === 'webllm') {
    if (!config.engine) throw new Error('WebLLM engine is not initialized.');
    const stream = (await config.engine.chat.completions.create({
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
      ...(stop ? { stop } : {}),
    })) as AsyncIterable<any>;

    for await (const chunk of stream) {
      if (opts.signal.aborted) {
        try { await config.engine.interruptGenerate?.(); } catch { /* noop */ }
        throw new DOMException('Aborted', 'AbortError');
      }
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) yield delta;
    }
    return;
  }

  // --- Anthropic (uses Messages API, not OpenAI-compatible) ---
  if (config.providerId === 'anthropic') {
    yield* streamAnthropicText(config, messages, opts);
    return;
  }

  // --- Google AI (uses Gemini API) ---
  if (config.providerId === 'google') {
    yield* streamGoogleText(config, messages, opts);
    return;
  }

  // --- OpenAI-compatible (OpenAI, Groq, Mistral, OpenRouter, Custom) ---
  yield* streamOpenAICompatibleText(config, messages, opts);
}

// ---------------------------------------------------------------------------
// OpenAI-Compatible Text Streaming
// ---------------------------------------------------------------------------

function getOpenAICompatibleEndpoint(config: ProviderConfig): string {
  switch (config.providerId) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'mistral':
      return 'https://api.mistral.ai/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    case 'custom':
      return config.customEndpoint
        ? `${config.customEndpoint.replace(/\/+$/, '')}/v1/chat/completions`
        : 'http://localhost:11434/v1/chat/completions';
    default:
      return 'https://api.openai.com/v1/chat/completions';
  }
}

function getExtraHeaders(config: ProviderConfig): Record<string, string> {
  if (config.providerId === 'openrouter') {
    return {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Senzor AI Assistant',
    };
  }
  return {};
}

async function* streamOpenAICompatibleText(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    signal: AbortSignal;
  },
): AsyncGenerator<string> {
  const endpoint = getOpenAICompatibleEndpoint(config);
  const stop =
    opts.stop && opts.stop.length > 0 ? opts.stop.slice(0, 4) : undefined;

  const res = await fetch(endpoint, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...getExtraHeaders(config),
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
      ...(stop ? { stop } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`${config.providerId} API error (${res.status}): ${detail || res.statusText}`);
  }

  for await (const chunk of parseSSE(res.body.getReader(), opts.signal)) {
    const delta = chunk?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta.length > 0) yield delta;
  }
}

// ---------------------------------------------------------------------------
// Anthropic Text Streaming
// ---------------------------------------------------------------------------

async function* streamAnthropicText(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    signal: AbortSignal;
  },
): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const nonSystemMsgs: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role = m.role as 'user' | 'assistant';
    const last = nonSystemMsgs[nonSystemMsgs.length - 1];
    if (last && last.role === role) {
      last.content += '\n\n' + m.content;
    } else {
      nonSystemMsgs.push({ role, content: m.content });
    }
  }
  // Anthropic requires first message to be user role
  if (nonSystemMsgs.length > 0 && nonSystemMsgs[0].role !== 'user') {
    nonSystemMsgs.unshift({ role: 'user', content: '(continuing conversation)' });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.3,
      system: systemMsg,
      messages: nonSystemMsgs,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (opts.signal.aborted) {
      try { await reader.cancel(); } catch { /* noop */ }
      throw new DOMException('Aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx;
    while ((nlIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text;
          if (typeof text === 'string' && text.length > 0) yield text;
        }
      } catch { /* tolerate */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Google AI Text Streaming
// ---------------------------------------------------------------------------

async function* streamGoogleText(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    signal: AbortSignal;
  },
): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += '\n\n' + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(continuing conversation)' }] });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
    {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 4096,
          ...(opts.stop ? { stopSequences: opts.stop.slice(0, 5) } : {}),
        },
      }),
    },
  );

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Google AI error (${res.status}): ${detail || res.statusText}`);
  }

  for await (const chunk of parseSSE(res.body.getReader(), opts.signal)) {
    const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === 'string' && text.length > 0) yield text;
  }
}

// ---------------------------------------------------------------------------
// Native Tool Calling Streaming
// ---------------------------------------------------------------------------

export async function* streamWithTools(
  config: ProviderConfig,
  messages: ChatMessage[],
  tools: ToolSchema[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    signal: AbortSignal;
  },
): AsyncGenerator<NativeToolStreamEvent> {
  if (config.providerId === 'anthropic') {
    yield* streamAnthropicWithTools(config, messages, tools, opts);
    return;
  }

  if (config.providerId === 'google') {
    yield* streamGoogleWithTools(config, messages, tools, opts);
    return;
  }

  // OpenAI-compatible (OpenAI, Groq, Mistral, OpenRouter, Custom)
  yield* streamOpenAICompatibleWithTools(config, messages, tools, opts);
}

// ---------------------------------------------------------------------------
// OpenAI-Compatible Native Tool Streaming
// ---------------------------------------------------------------------------

async function* streamOpenAICompatibleWithTools(
  config: ProviderConfig,
  messages: ChatMessage[],
  tools: ToolSchema[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    signal: AbortSignal;
  },
): AsyncGenerator<NativeToolStreamEvent> {
  const endpoint = getOpenAICompatibleEndpoint(config);

  const openaiTools = tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    },
  }));

  const res = await fetch(endpoint, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...getExtraHeaders(config),
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: openaiTools,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`${config.providerId} API error (${res.status}): ${detail || res.statusText}`);
  }

  const toolCallAccumulators: Map<
    number,
    { id: string; name: string; arguments: string }
  > = new Map();

  for await (const chunk of parseSSE(res.body.getReader(), opts.signal)) {
    const choice = chunk?.choices?.[0];
    if (!choice) continue;

    const delta = choice.delta;
    const finishReason = choice.finish_reason;

    if (delta?.content) {
      yield { type: 'text_delta', text: delta.content };
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolCallAccumulators.has(idx)) {
          toolCallAccumulators.set(idx, {
            id: tc.id || `call_${idx}`,
            name: tc.function?.name || '',
            arguments: '',
          });
        }
        const acc = toolCallAccumulators.get(idx)!;
        if (tc.function?.name) acc.name = tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
      }
    }

    if (finishReason === 'tool_calls' || finishReason === 'stop') {
      for (const [, acc] of toolCallAccumulators) {
        if (acc.name) {
          yield {
            type: 'tool_call',
            id: acc.id,
            name: acc.name,
            arguments: acc.arguments,
          };
        }
      }
      yield { type: 'done', finishReason };
      return;
    }
  }

  // Stream ended without explicit finish
  for (const [, acc] of toolCallAccumulators) {
    if (acc.name) {
      yield {
        type: 'tool_call',
        id: acc.id,
        name: acc.name,
        arguments: acc.arguments,
      };
    }
  }
  yield { type: 'done', finishReason: 'stop' };
}

// ---------------------------------------------------------------------------
// Anthropic Native Tool Streaming
// ---------------------------------------------------------------------------

async function* streamAnthropicWithTools(
  config: ProviderConfig,
  messages: ChatMessage[],
  tools: ToolSchema[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    signal: AbortSignal;
  },
): AsyncGenerator<NativeToolStreamEvent> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  // Anthropic requires strictly alternating user/assistant messages.
  // Merge consecutive same-role messages to satisfy this constraint.
  const nonSystemMsgs: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role = m.role as 'user' | 'assistant';
    const last = nonSystemMsgs[nonSystemMsgs.length - 1];
    if (last && last.role === role) {
      last.content += '\n\n' + m.content;
    } else {
      nonSystemMsgs.push({ role, content: m.content });
    }
  }
  if (nonSystemMsgs.length > 0 && nonSystemMsgs[0].role !== 'user') {
    nonSystemMsgs.unshift({ role: 'user', content: '(continuing conversation)' });
  }

  const anthropicTools = tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.3,
      system: systemMsg,
      messages: nonSystemMsgs,
      tools: anthropicTools,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentToolUse: { id: string; name: string; arguments: string } | null = null;

  while (true) {
    if (opts.signal.aborted) {
      try { await reader.cancel(); } catch { /* noop */ }
      throw new DOMException('Aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx;
    while ((nlIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      switch (parsed.type) {
        case 'content_block_start':
          if (parsed.content_block?.type === 'tool_use') {
            currentToolUse = {
              id: parsed.content_block.id || '',
              name: parsed.content_block.name || '',
              arguments: '',
            };
          }
          break;

        case 'content_block_delta':
          if (parsed.delta?.type === 'text_delta') {
            yield { type: 'text_delta', text: parsed.delta.text };
          } else if (parsed.delta?.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.arguments += parsed.delta.partial_json || '';
          }
          break;

        case 'content_block_stop':
          if (currentToolUse) {
            yield {
              type: 'tool_call',
              id: currentToolUse.id,
              name: currentToolUse.name,
              arguments: currentToolUse.arguments,
            };
            currentToolUse = null;
          }
          break;

        case 'message_delta':
          if (parsed.delta?.stop_reason) {
            yield { type: 'done', finishReason: parsed.delta.stop_reason };
            return;
          }
          break;

        case 'message_stop':
          yield { type: 'done', finishReason: 'end_turn' };
          return;
      }
    }
  }

  yield { type: 'done', finishReason: 'stop' };
}

// ---------------------------------------------------------------------------
// Google AI Native Tool Streaming
// ---------------------------------------------------------------------------

async function* streamGoogleWithTools(
  config: ProviderConfig,
  messages: ChatMessage[],
  tools: ToolSchema[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    signal: AbortSignal;
  },
): AsyncGenerator<NativeToolStreamEvent> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += '\n\n' + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(continuing conversation)' }] });
  }

  const geminiTools = [
    {
      function_declarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: {
          ...t.function.parameters,
          // Gemini needs 'object' type explicitly
          type: 'OBJECT',
          properties: Object.fromEntries(
            Object.entries(t.function.parameters.properties).map(
              ([k, v]) => [k, { ...v, type: (v.type || 'string').toUpperCase() }],
            ),
          ),
        },
      })),
    },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
    {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        tools: geminiTools,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 4096,
        },
      }),
    },
  );

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Google AI error (${res.status}): ${detail || res.statusText}`);
  }

  for await (const chunk of parseSSE(res.body.getReader(), opts.signal)) {
    const candidate = chunk?.candidates?.[0];
    if (!candidate?.content?.parts) continue;

    for (const part of candidate.content.parts) {
      if (part.text) {
        yield { type: 'text_delta', text: part.text };
      }
      if (part.functionCall) {
        yield {
          type: 'tool_call',
          id: `gemini_${Date.now()}`,
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        };
      }
    }

    if (candidate.finishReason) {
      yield { type: 'done', finishReason: candidate.finishReason };
      return;
    }
  }

  yield { type: 'done', finishReason: 'STOP' };
}

// ---------------------------------------------------------------------------
// Key Validation
// ---------------------------------------------------------------------------

export async function validateProviderKey(
  providerId: string,
  apiKey: string,
  customEndpoint?: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (providerId) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
        return { valid: true };
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        // 200 or 400 (bad request) both mean the key works
        if (res.status === 401 || res.status === 403) {
          return { valid: false, error: 'Invalid API key' };
        }
        return { valid: true };
      }

      case 'google': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        );
        if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
        return { valid: true };
      }

      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
        return { valid: true };
      }

      case 'mistral': {
        const res = await fetch('https://api.mistral.ai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
        return { valid: true };
      }

      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
        return { valid: true };
      }

      case 'custom':
        return { valid: true };

      default:
        return { valid: false, error: 'Unknown provider' };
    }
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Connection failed' };
  }
}

// ---------------------------------------------------------------------------
// Key Storage (localStorage, base64-obfuscated — NOT encryption)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'senzor_ai_provider_keys';

export function saveProviderKey(providerId: string, key: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const keys = raw ? JSON.parse(raw) : {};
    keys[providerId] = btoa(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch { /* best effort */ }
}

export function loadProviderKey(providerId: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const keys = JSON.parse(raw);
    const encoded = keys[providerId];
    return encoded ? atob(encoded) : '';
  } catch {
    return '';
  }
}

export function clearProviderKey(providerId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const keys = JSON.parse(raw);
    delete keys[providerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch { /* best effort */ }
}

export function clearAllProviderKeys(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Provider Preferences Persistence
// ---------------------------------------------------------------------------

const PREFS_KEY = 'senzor_ai_provider_prefs';

interface ProviderPrefs {
  providerId: string;
  modelId: string;
  customEndpoint?: string;
}

export function saveProviderPrefs(prefs: ProviderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* best effort */ }
}

export function loadProviderPrefs(): ProviderPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
