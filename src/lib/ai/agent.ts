// ============================================================================
// AI Assistant — Dual-Mode Agent Orchestrator
// ============================================================================
//
// Two execution modes sharing the same callbacks/trace interface:
//
//   1. ReAct Agent   — XML protocol parsed by ProtocolParser (WebLLM)
//   2. NativeTool Agent — native function calling (BYOK cloud providers)
//
// The top-level `runAgent()` picks the right mode based on provider config.

import type {
  ChatMessage,
  RunAgentOpts,
  AgentTrace,
  AgentStep,
  ParsedToolCall,
  ToolExecutionResult,
} from './types';
import { ProtocolParser, TagStripper, sanitizeFinalAnswerText, extractMarkdownToolCalls } from './protocol-parser';
import { streamText, streamWithTools } from './providers/streaming';
import {
  estimateConversationTokens,
  enforceContextBudget,
  formatObservations,
  getObservationBudget,
} from './context-budget';
import { buildReActSystemPrompt, buildNativeToolSystemPrompt, SYNTHESIS_SYSTEM_PROMPT } from './system-prompt';
import { getProvider, getProviderModel } from './providers/registry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 8;
const REACT_STOP_SEQUENCES = ['</tool_calls>', '</answer>'];

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

export async function runAgent(opts: RunAgentOpts): Promise<{
  answer: string;
  trace: AgentTrace;
}> {
  const provider = getProvider(opts.provider.providerId);
  const useNativeTools = provider?.supportsNativeTools && opts.provider.providerId !== 'webllm';

  if (useNativeTools) {
    return runNativeToolAgent(opts);
  }
  return runReActAgent(opts);
}

// ---------------------------------------------------------------------------
// ReAct Agent (WebLLM / local models)
// ---------------------------------------------------------------------------

async function runReActAgent(opts: RunAgentOpts): Promise<{
  answer: string;
  trace: AgentTrace;
}> {
  const {
    provider,
    history,
    userInput,
    tools,
    callTool,
    signal,
    callbacks,
    maxIterations = MAX_ITERATIONS,
    contextWindow = 8192,
  } = opts;

  const trace: AgentTrace = {
    startedAt: Date.now(),
    iterations: 0,
    toolCallCount: 0,
    steps: [],
    provider: provider.providerId,
    modelHint: provider.modelId,
  };

  const systemPrompt = buildReActSystemPrompt(tools);
  const conversation: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.filter((m) => m.role !== 'system'),
    { role: 'user', content: userInput },
  ];

  const obsBudget = getObservationBudget(contextWindow);
  let finalAnswer = '';

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    trace.iterations = iteration;
    callbacks.onIterationStart(iteration);
    callbacks.onPhase('thinking', `Iteration ${iteration}`);

    enforceContextBudget(conversation, contextWindow);

    const parser = new ProtocolParser();
    const stripper = new TagStripper();
    let thinkingBuffer = '';
    let rawBuffer = '';
    let gotToolCalls = false;
    let gotAnswer = false;
    let toolCalls: ParsedToolCall[] = [];

    for await (const chunk of streamText(provider, conversation, {
      temperature: 0.3,
      maxTokens: 2048,
      stop: REACT_STOP_SEQUENCES,
      signal,
    })) {
      rawBuffer += chunk;
      const events = parser.feed(chunk);

      for (const ev of events) {
        switch (ev.kind) {
          case 'thinking_delta':
            thinkingBuffer += ev.text;
            callbacks.onThinkingDelta(ev.text);
            break;
          case 'thinking_end':
            callbacks.onThinkingEnd(thinkingBuffer, iteration);
            trace.steps.push({
              iteration,
              type: 'thinking',
              ts: Date.now(),
              content: thinkingBuffer,
            });
            thinkingBuffer = '';
            break;
          case 'tool_calls':
            gotToolCalls = true;
            toolCalls = ev.calls;
            callbacks.onPhase(
              'selecting_tools',
              undefined,
              ev.calls.map((c) => c.name),
            );
            break;
          case 'tool_calls_error': {
            const salvaged = extractMarkdownToolCalls(rawBuffer);
            if (salvaged && salvaged.length > 0) {
              gotToolCalls = true;
              toolCalls = salvaged;
              callbacks.onPhase(
                'selecting_tools',
                undefined,
                salvaged.map((c) => c.name),
              );
            }
            break;
          }
          case 'answer_delta': {
            if (!gotAnswer) {
              gotAnswer = true;
              callbacks.onAnswerStart();
            }
            const clean = stripper.feed(ev.text);
            if (clean) callbacks.onAnswerDelta(clean);
            break;
          }
          case 'answer_end': {
            const tail = stripper.flush();
            if (tail) callbacks.onAnswerDelta(tail);
            break;
          }
        }
      }
    }

    // Flush any remaining parser state
    const remaining = parser.flush();
    for (const ev of remaining) {
      switch (ev.kind) {
        case 'thinking_delta':
          thinkingBuffer += ev.text;
          callbacks.onThinkingDelta(ev.text);
          break;
        case 'thinking_end':
          callbacks.onThinkingEnd(thinkingBuffer, iteration);
          trace.steps.push({
            iteration,
            type: 'thinking',
            ts: Date.now(),
            content: thinkingBuffer,
          });
          break;
        case 'tool_calls':
          gotToolCalls = true;
          toolCalls = ev.calls;
          break;
        case 'tool_calls_error': {
          const salvaged = extractMarkdownToolCalls(rawBuffer);
          if (salvaged && salvaged.length > 0) {
            gotToolCalls = true;
            toolCalls = salvaged;
          }
          break;
        }
        case 'answer_delta': {
          if (!gotAnswer) {
            gotAnswer = true;
            callbacks.onAnswerStart();
          }
          const clean = stripper.feed(ev.text);
          if (clean) callbacks.onAnswerDelta(clean);
          break;
        }
        case 'answer_end': {
          const tail = stripper.flush();
          if (tail) callbacks.onAnswerDelta(tail);
          break;
        }
      }
    }

    // --- Handle answer ---
    if (gotAnswer) {
      finalAnswer = sanitizeFinalAnswerText(stripper.getEmitted());
      callbacks.onAnswerEnd(finalAnswer);
      conversation.push({ role: 'assistant', content: rawBuffer });
      trace.endedAt = Date.now();
      return { answer: finalAnswer, trace };
    }

    // --- Handle tool calls ---
    if (gotToolCalls && toolCalls.length > 0) {
      conversation.push({ role: 'assistant', content: rawBuffer });

      callbacks.onPhase(
        'calling_tools',
        undefined,
        toolCalls.map((c) => c.name),
      );
      callbacks.onToolCallsStart(toolCalls);

      const results = await executeToolCalls(
        toolCalls,
        callTool,
        signal,
        iteration,
        trace,
        callbacks,
      );

      trace.toolCallCount += results.length;

      callbacks.onPhase('analyzing', `Processing ${results.length} result(s)`);
      const obsText = formatObservations(results, obsBudget);
      conversation.push({ role: 'user', content: obsText });
      continue;
    }

    // --- No structured output: try synthesis ---
    finalAnswer = await runSynthesisPass(provider, conversation, rawBuffer, signal);
    callbacks.onAnswerStart();
    callbacks.onAnswerDelta(finalAnswer);
    callbacks.onAnswerEnd(finalAnswer);
    trace.endedAt = Date.now();
    return { answer: finalAnswer, trace };
  }

  // Exhausted max iterations
  if (!finalAnswer) {
    finalAnswer = await runSynthesisPass(provider, conversation, '', signal);
    callbacks.onAnswerStart();
    callbacks.onAnswerDelta(finalAnswer);
    callbacks.onAnswerEnd(finalAnswer);
  }

  trace.endedAt = Date.now();
  return { answer: finalAnswer, trace };
}

// ---------------------------------------------------------------------------
// NativeTool Agent (BYOK cloud providers)
// ---------------------------------------------------------------------------

async function runNativeToolAgent(opts: RunAgentOpts): Promise<{
  answer: string;
  trace: AgentTrace;
}> {
  const {
    provider,
    history,
    userInput,
    tools,
    callTool,
    signal,
    callbacks,
    maxIterations = MAX_ITERATIONS,
    contextWindow = 128000,
  } = opts;

  const trace: AgentTrace = {
    startedAt: Date.now(),
    iterations: 0,
    toolCallCount: 0,
    steps: [],
    provider: provider.providerId,
    modelHint: provider.modelId,
  };

  const systemPrompt = buildNativeToolSystemPrompt(tools);
  const conversation: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.filter((m) => m.role !== 'system'),
    { role: 'user', content: userInput },
  ];

  let finalAnswer = '';
  let answerSlotCreated = false;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    trace.iterations = iteration;
    callbacks.onIterationStart(iteration);
    callbacks.onPhase('thinking', `Iteration ${iteration}`);

    enforceContextBudget(conversation, contextWindow);

    // Reset answer buffer for new iteration (idempotent — only resets if slot exists)
    if (answerSlotCreated) {
      callbacks.onAnswerStart();
    }

    let textBuffer = '';
    const pendingToolCalls: Array<{
      id: string;
      name: string;
      arguments: string;
    }> = [];
    let finishReason = '';

    for await (const event of streamWithTools(provider, conversation, tools, {
      temperature: 0.3,
      maxTokens: 4096,
      signal,
    })) {
      switch (event.type) {
        case 'text_delta':
          textBuffer += event.text;
          callbacks.onThinkingDelta(event.text);
          if (!answerSlotCreated) {
            answerSlotCreated = true;
            callbacks.onAnswerStart();
          }
          callbacks.onAnswerDelta(event.text);
          break;
        case 'tool_call':
          pendingToolCalls.push({
            id: event.id,
            name: event.name,
            arguments: event.arguments,
          });
          break;
        case 'done':
          finishReason = event.finishReason;
          break;
      }
    }

    // --- No tool calls: the text IS the answer (already streamed to UI) ---
    if (pendingToolCalls.length === 0) {
      finalAnswer = textBuffer.trim();
      if (!finalAnswer) {
        finalAnswer = 'I was unable to generate a response. Please try again.';
        if (!answerSlotCreated) {
          callbacks.onAnswerStart();
          answerSlotCreated = true;
        }
        callbacks.onAnswerDelta(finalAnswer);
      }
      conversation.push({ role: 'assistant', content: finalAnswer });
      callbacks.onAnswerEnd(finalAnswer);
      trace.endedAt = Date.now();
      return { answer: finalAnswer, trace };
    }

    // --- Tool calls found: text was thinking, not the answer ---
    if (textBuffer) {
      callbacks.onThinkingEnd(textBuffer, iteration);
      trace.steps.push({
        iteration,
        type: 'thinking',
        ts: Date.now(),
        content: textBuffer,
      });
    }

    const parsedCalls: ParsedToolCall[] = pendingToolCalls.map((tc) => {
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(tc.arguments || '{}');
      } catch {
        args = {};
      }
      return { name: tc.name, arguments: args };
    });

    const assistantContent = textBuffer || `[Calling tool${parsedCalls.length > 1 ? 's' : ''}: ${parsedCalls.map(c => c.name).join(', ')}]`;
    conversation.push({ role: 'assistant', content: assistantContent });

    callbacks.onPhase(
      'calling_tools',
      undefined,
      parsedCalls.map((c) => c.name),
    );
    callbacks.onToolCallsStart(parsedCalls);

    const results = await executeToolCalls(
      parsedCalls,
      callTool,
      signal,
      iteration,
      trace,
      callbacks,
    );

    trace.toolCallCount += results.length;

    const resultSummary = results
      .map((r) => {
        if (r.ok) {
          let payload: string;
          try {
            payload = JSON.stringify(r.data);
          } catch {
            payload = String(r.data);
          }
          if (payload.length > 6000) {
            payload = payload.slice(0, 6000) + `…[truncated]`;
          }
          return `Tool "${r.tool}" returned:\n${payload}`;
        }
        return `Tool "${r.tool}" failed: ${r.error}`;
      })
      .join('\n\n');

    callbacks.onPhase('analyzing', `Processing ${results.length} result(s)`);
    conversation.push({ role: 'user', content: resultSummary });
  }

  // Exhausted max iterations
  if (!finalAnswer) {
    finalAnswer = 'The agent completed the maximum number of tool-calling iterations. Please review the results above or try a more specific question.';
    if (!answerSlotCreated) {
      callbacks.onAnswerStart();
    }
    callbacks.onAnswerDelta(finalAnswer);
    callbacks.onAnswerEnd(finalAnswer);
  }

  trace.endedAt = Date.now();
  return { answer: finalAnswer, trace };
}

// ---------------------------------------------------------------------------
// Shared: Execute Tool Calls
// ---------------------------------------------------------------------------

async function executeToolCalls(
  calls: ParsedToolCall[],
  callTool: (name: string, args: any) => Promise<any>,
  signal: AbortSignal,
  iteration: number,
  trace: AgentTrace,
  callbacks: RunAgentOpts['callbacks'],
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  // Execute all calls in parallel
  const promises = calls.map(async (call) => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    callbacks.onToolStart(call);
    trace.steps.push({
      iteration,
      type: 'tool_call',
      ts: Date.now(),
      toolName: call.name,
      args: call.arguments,
    });

    const t0 = Date.now();
    try {
      const data = await callTool(call.name, call.arguments);
      const durationMs = Date.now() - t0;

      trace.steps.push({
        iteration,
        type: 'tool_result',
        ts: Date.now(),
        toolName: call.name,
        data,
        durationMs,
      });

      callbacks.onToolResult(call, data);
      return { tool: call.name, args: call.arguments, ok: true, data } as ToolExecutionResult;
    } catch (err: any) {
      const durationMs = Date.now() - t0;
      const error = err?.message || 'Unknown error';

      trace.steps.push({
        iteration,
        type: 'tool_error',
        ts: Date.now(),
        toolName: call.name,
        error,
        durationMs,
      });

      callbacks.onToolError(call, error);
      return { tool: call.name, args: call.arguments, ok: false, error } as ToolExecutionResult;
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      results.push(s.value);
    } else {
      results.push({
        tool: 'unknown',
        args: {},
        ok: false,
        error: s.reason?.message || 'Execution failed',
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Synthesis Pass (fallback when ReAct loop fails to emit <answer>)
// ---------------------------------------------------------------------------

async function runSynthesisPass(
  provider: { providerId: string; modelId: string; apiKey?: string; customEndpoint?: string; engine?: any },
  conversation: ChatMessage[],
  rawBuffer: string,
  signal: AbortSignal,
): Promise<string> {
  const synthMessages: ChatMessage[] = [
    { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
  ];

  // Include the last few exchanges for context
  const recent = conversation.slice(-6);
  for (const msg of recent) {
    if (msg.role !== 'system') {
      synthMessages.push({ role: msg.role, content: msg.content });
    }
  }

  if (rawBuffer) {
    synthMessages.push({
      role: 'user',
      content: `The agent produced the following output. Synthesize a clean answer:\n\n${rawBuffer}`,
    });
  }

  let result = '';
  try {
    for await (const chunk of streamText(provider, synthMessages, {
      temperature: 0.2,
      maxTokens: 2048,
      signal,
    })) {
      result += chunk;
    }
  } catch {
    if (rawBuffer) {
      result = sanitizeFinalAnswerText(rawBuffer);
    }
  }

  return sanitizeFinalAnswerText(result) || 'I was unable to generate a response. Please try again.';
}
