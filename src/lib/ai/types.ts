// ============================================================================
// AI Assistant — Shared Types
// ============================================================================

// ---------------------------------------------------------------------------
// Chat & Messages
// ---------------------------------------------------------------------------

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  trace?: AgentTrace;
}

// ---------------------------------------------------------------------------
// Agent Orchestration
// ---------------------------------------------------------------------------

export type AgentPhase =
  | 'thinking'
  | 'selecting_tools'
  | 'calling_tools'
  | 'analyzing'
  | 'responding'
  | 'idle';

export interface AgentStatus {
  phase: AgentPhase;
  detail?: string;
  tools?: string[];
}

export type AgentStep =
  | { iteration: number; type: 'thinking'; ts: number; content: string }
  | {
      iteration: number;
      type: 'tool_call';
      ts: number;
      toolName: string;
      args: any;
      durationMs?: number;
      ok?: boolean;
    }
  | {
      iteration: number;
      type: 'tool_result';
      ts: number;
      toolName: string;
      data: any;
      durationMs: number;
    }
  | {
      iteration: number;
      type: 'tool_error';
      ts: number;
      toolName: string;
      error: string;
      durationMs: number;
    };

export interface AgentTrace {
  startedAt: number;
  endedAt?: number;
  iterations: number;
  toolCallCount: number;
  steps: AgentStep[];
  provider: string;
  modelHint?: string;
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export interface ToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface ToolExecutionResult {
  tool: string;
  args: Record<string, any>;
  ok: boolean;
  data?: any;
  error?: string;
}

export interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Protocol Parser Events
// ---------------------------------------------------------------------------

export type ParseEvent =
  | { kind: 'thinking_delta'; text: string }
  | { kind: 'thinking_end' }
  | { kind: 'tool_calls'; calls: ParsedToolCall[] }
  | { kind: 'tool_calls_error'; raw: string; error: string }
  | { kind: 'answer_delta'; text: string }
  | { kind: 'answer_end' };

// ---------------------------------------------------------------------------
// Agent Callbacks
// ---------------------------------------------------------------------------

export interface AgentCallbacks {
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

// ---------------------------------------------------------------------------
// Agent Runner Options
// ---------------------------------------------------------------------------

export interface RunAgentOpts {
  provider: ProviderConfig;
  history: ChatMessage[];
  userInput: string;
  tools: ToolSchema[];
  callTool: (name: string, args: any) => Promise<any>;
  signal: AbortSignal;
  callbacks: AgentCallbacks;
  maxIterations?: number;
  contextWindow?: number;
}

// ---------------------------------------------------------------------------
// Provider System
// ---------------------------------------------------------------------------

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice?: number;
  outputPrice?: number;
  vramRequired?: number;
  description?: string;
  tags?: string[];
  tier: 'premium' | 'balanced' | 'fast' | 'local';
  supportsToolCalling: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  models: ProviderModel[];
  requiresKey: boolean;
  keyPlaceholder: string;
  keyPattern?: RegExp;
  docsUrl: string;
  supportsNativeTools: boolean;
}

export interface ProviderConfig {
  providerId: string;
  modelId: string;
  apiKey?: string;
  customEndpoint?: string;
  engine?: any;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export interface StreamCompletionOpts {
  provider: ProviderConfig;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
  stop?: string[];
}

export interface NativeToolStreamOpts {
  provider: ProviderConfig;
  messages: ChatMessage[];
  tools: ToolSchema[];
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
}

export type NativeToolStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: string }
  | { type: 'done'; finishReason: string };

// ---------------------------------------------------------------------------
// Conversation Persistence
// ---------------------------------------------------------------------------

export interface ConversationMeta {
  _id: string;
  title: string;
  provider: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation extends ConversationMeta {
  messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Context Inspector
// ---------------------------------------------------------------------------

export type LogEntry =
  | { time: Date; type: 'thinking'; name: string; content: string }
  | { time: Date; type: 'tool_call'; name: string; args: any }
  | { time: Date; type: 'tool_result'; name: string; data: any }
  | { time: Date; type: 'tool_error'; name: string; error: string };

// ---------------------------------------------------------------------------
// Suggested Prompts
// ---------------------------------------------------------------------------

export interface SuggestedPrompt {
  category: string;
  iconKey: string;
  accent: string;
  prompts: string[];
}
