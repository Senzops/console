// ============================================================================
// AI Assistant — React Context Provider
// ============================================================================
//
// Central state management for the AI Assistant feature. Follows the same
// Context + hooks pattern as AuthProvider and ThemeProvider in this codebase.
//
// Manages:
//   - Provider/model selection & persistence
//   - WebLLM engine lifecycle
//   - Conversation CRUD (via backend API)
//   - Agent execution loop
//   - UI state (sidebar, modals, loading)

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ChatMessage,
  AgentTrace,
  AgentStatus,
  AgentStep,
  ParsedToolCall,
  ToolSchema,
  ConversationMeta,
  Conversation,
  LogEntry,
  ProviderConfig,
} from './types';
import { runAgent } from './agent';
import { AI_TOOLS, fetchToolDataWithRetry } from './tools';
import {
  getProvider,
  getDefaultModel,
  getProviderModel,
  PROVIDERS,
  LOCAL_MODEL_VRAM_MAP,
  pickModelForVram,
  DEFAULT_LOCAL_MODEL_ID,
  ENGINE_CONTEXT_TARGET,
  ENGINE_CONTEXT_FALLBACK,
} from './providers/registry';
import {
  loadProviderKey,
  saveProviderKey,
  clearProviderKey,
  loadProviderPrefs,
  saveProviderPrefs,
  streamText,
} from './providers/streaming';
import { api } from '@/lib/auth';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIAssistantState {
  // Provider
  providerId: string;
  modelId: string;
  customEndpoint: string;
  setProviderId: (id: string) => void;
  setModelId: (id: string) => void;
  setCustomEndpoint: (url: string) => void;

  // Setup
  setupComplete: boolean;
  completeSetup: () => void;
  resetSetup: () => void;

  // WebLLM
  engineStatus: 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';
  engineProgress: number;
  engineProgressText: string;
  loadEngine: () => Promise<void>;
  unloadEngine: () => void;

  // Chat
  messages: ChatMessage[];
  isGenerating: boolean;
  agentStatus: AgentStatus;
  agentTrace: AgentTrace | null;
  contextLog: LogEntry[];
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;

  // Conversations
  conversations: ConversationMeta[];
  activeConversationId: string | null;
  loadingConversation: boolean;
  generatingConvoIds: string[];
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  regenerateLastResponse: () => void;

  // Privacy
  chatHistoryEnabled: boolean;
  setChatHistoryEnabled: (enabled: boolean) => void;

  // API Key Management
  getApiKey: (providerId: string) => string;
  setApiKey: (providerId: string, key: string) => void;
  clearApiKey: (providerId: string) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantState | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIAssistant(): AIAssistantState {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    throw new Error('useAIAssistant must be used within <AIAssistantProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

export function AIAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- Provider / Model ---
  const prefs = useMemo(() => loadProviderPrefs(), []);
  const [providerId, setProviderIdRaw] = useState(prefs?.providerId || 'webllm');
  const [modelId, setModelIdRaw] = useState(prefs?.modelId || DEFAULT_LOCAL_MODEL_ID);
  const [customEndpoint, setCustomEndpointRaw] = useState(prefs?.customEndpoint || '');

  const setProviderId = useCallback(
    (id: string) => {
      setProviderIdRaw(id);
      const defaultModel = getDefaultModel(id);
      setModelIdRaw(defaultModel);
      saveProviderPrefs({ providerId: id, modelId: defaultModel, customEndpoint });
    },
    [customEndpoint],
  );

  const setModelId = useCallback(
    (id: string) => {
      setModelIdRaw(id);
      saveProviderPrefs({ providerId, modelId: id, customEndpoint });
    },
    [providerId, customEndpoint],
  );

  const setCustomEndpoint = useCallback(
    (url: string) => {
      setCustomEndpointRaw(url);
      saveProviderPrefs({ providerId, modelId, customEndpoint: url });
    },
    [providerId, modelId],
  );

  // --- Setup State ---
  const SETUP_KEY = 'senzor_ai_setup_complete';
  const [setupComplete, setSetupComplete] = useState(() => {
    try {
      return localStorage.getItem(SETUP_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const completeSetup = useCallback(() => {
    setSetupComplete(true);
    try { localStorage.setItem(SETUP_KEY, 'true'); } catch { /* noop */ }
  }, []);

  const resetSetup = useCallback(() => {
    setSetupComplete(false);
    try { localStorage.removeItem(SETUP_KEY); } catch { /* noop */ }
  }, []);

  // --- WebLLM Engine ---
  const [engineStatus, setEngineStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error' | 'unsupported'
  >('idle');
  const [engineProgress, setEngineProgress] = useState(0);
  const [engineProgressText, setEngineProgressText] = useState('');
  const engineRef = useRef<any>(null);

  const loadEngine = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.gpu) {
      setEngineStatus('unsupported');
      return;
    }

    setEngineStatus('loading');
    setEngineProgress(0);
    setEngineProgressText('Initializing WebLLM...');

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      let selectedModel = modelId;
      if (providerId === 'webllm') {
        // Auto-select model based on VRAM if not already selected
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            const info = await adapter.requestAdapterInfo?.();
            const vramBytes =
              (adapter as any).limits?.maxBufferSize ||
              ((adapter as any).features?.has?.('shader-f16')
                ? 6 * 1024 * 1024 * 1024
                : 4 * 1024 * 1024 * 1024);
            const vramGB = Math.floor(vramBytes / (1024 * 1024 * 1024));
            if (!LOCAL_MODEL_VRAM_MAP[modelId] || LOCAL_MODEL_VRAM_MAP[modelId] > vramGB) {
              selectedModel = pickModelForVram(vramGB);
              setModelIdRaw(selectedModel);
            }
          }
        } catch {
          // VRAM detection failed, use selected model
        }
      }

      const initProgressCallback = (report: any) => {
        const pct = typeof report === 'object' ? report.progress : report;
        const text = typeof report === 'object' ? report.text : '';
        setEngineProgress(Math.round((pct ?? 0) * 100));
        setEngineProgressText(text || `Loading ${selectedModel}...`);
      };

      let engine;
      try {
        engine = await CreateMLCEngine(
          selectedModel,
          { initProgressCallback },
          { context_window_size: ENGINE_CONTEXT_TARGET },
        );
      } catch (primaryErr) {
        console.warn(
          `[Senzor Intelligence] context_window_size=${ENGINE_CONTEXT_TARGET} failed, retrying with ${ENGINE_CONTEXT_FALLBACK}.`,
          primaryErr,
        );
        engine = await CreateMLCEngine(
          selectedModel,
          { initProgressCallback },
          { context_window_size: ENGINE_CONTEXT_FALLBACK },
        );
      }

      engineRef.current = engine;
      setEngineStatus('ready');
      setEngineProgress(100);
      setEngineProgressText('Model loaded');
      completeSetup();
    } catch (err: any) {
      console.error('WebLLM load failed:', err);
      setEngineStatus('error');
      setEngineProgressText(err?.message || 'Failed to load model');
    }
  }, [modelId, providerId, completeSetup]);

  const unloadEngine = useCallback(() => {
    if (engineRef.current) {
      try {
        engineRef.current.unload?.();
      } catch { /* noop */ }
      engineRef.current = null;
    }
    setEngineStatus('idle');
    setEngineProgress(0);
    setEngineProgressText('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        try { engineRef.current.unload?.(); } catch { /* noop */ }
      }
    };
  }, []);

  // Auto-load WebLLM engine when returning to ChatView after page reload
  useEffect(() => {
    if (setupComplete && providerId === 'webllm' && engineStatus === 'idle') {
      loadEngine();
    }
  }, [setupComplete, providerId, engineStatus, loadEngine]);

  // Show toast for WebLLM loading progress on reload (non-blocking)
  const showedLoadToast = useRef(false);
  useEffect(() => {
    if (providerId !== 'webllm' || !setupComplete) {
      if (showedLoadToast.current) {
        toast.dismiss('webllm-load');
        showedLoadToast.current = false;
      }
      return;
    }
    if (engineStatus === 'loading') {
      showedLoadToast.current = true;
      toast.custom(
        () => (
          <div className="flex items-center gap-3 w-full">
            <div className="h-5 w-5 shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Loading local model</span>
                <span className="text-[10px] font-mono font-bold text-primary tabular-nums">{engineProgress}%</span>
              </div>
              <div className="w-full h-1 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${engineProgress}%` }}
                />
              </div>
              {engineProgressText && (
                <p className="text-[10px] text-muted-foreground truncate">{engineProgressText}</p>
              )}
            </div>
          </div>
        ),
        { id: 'webllm-load', duration: Infinity, className: '!max-w-[360px]' },
      );
    } else if (engineStatus === 'ready' && showedLoadToast.current) {
      toast.custom(
        () => (
          <div className="flex items-center gap-3 w-full">
            <svg className="h-5 w-5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            <span className="text-xs font-semibold text-foreground">Local model ready</span>
          </div>
        ),
        { id: 'webllm-load', duration: 3000, className: '!max-w-[360px]' },
      );
      showedLoadToast.current = false;
    } else if (engineStatus === 'error' && showedLoadToast.current) {
      toast.custom(
        () => (
          <div className="flex items-center gap-3 w-full">
            <svg className="h-5 w-5 shrink-0 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground">Failed to load local model</span>
              {engineProgressText && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{engineProgressText}</p>
              )}
            </div>
          </div>
        ),
        { id: 'webllm-load', duration: 5000, className: '!max-w-[360px]' },
      );
      showedLoadToast.current = false;
    }
  }, [providerId, setupComplete, engineStatus, engineProgress, engineProgressText]);

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const msgIdCounter = useRef(0);
  const nextMsgId = useCallback(() => `msg-${++msgIdCounter.current}-${Date.now()}`, []);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    phase: 'idle',
  });
  const [agentTrace, setAgentTrace] = useState<AgentTrace | null>(null);
  const [contextLog, setContextLog] = useState<LogEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const engineStatusRef = useRef(engineStatus);
  useEffect(() => { engineStatusRef.current = engineStatus; }, [engineStatus]);
  // --- Conversations ---
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConvoIdRef = useRef<string | null>(null);
  useEffect(() => { activeConvoIdRef.current = activeConversationId; }, [activeConversationId]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [generatingConvoIds, setGeneratingConvoIds] = useState<string[]>([]);
  const generationId = useRef(0);

  // --- Privacy Mode ---
  const CHAT_HISTORY_KEY = 'senzor_ai_chat_history';
  const [chatHistoryEnabled, setChatHistoryEnabledRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const setChatHistoryEnabled = useCallback((enabled: boolean) => {
    setChatHistoryEnabledRaw(enabled);
    try { localStorage.setItem(CHAT_HISTORY_KEY, String(enabled)); } catch { /* noop */ }
    if (!enabled) {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, []);

  // --- Stop Generation (kill switch) — defined early so loadConversation can use it ---
  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    if (engineRef.current?.interruptGenerate) {
      try { engineRef.current.interruptGenerate(); } catch { /* noop */ }
    }
    generationId.current++;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setAgentStatus({ phase: 'idle' });
    abortRef.current = null;
    const convoId = activeConvoIdRef.current;
    if (convoId) {
      setGeneratingConvoIds((prev) => prev.filter((id) => id !== convoId));
    }
  }, []);

  const loadConversations = useCallback(async () => {
    if (!chatHistoryEnabled) return;
    try {
      const res = await api.get('/ai/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      // Silently handle — conversations feature is optional
    }
  }, [chatHistoryEnabled]);

  const loadConversation = useCallback(async (id: string) => {
    if (isGeneratingRef.current) {
      if (providerId === 'webllm') {
        stopGeneration();
      } else {
        // Cloud: detach from UI but let generation finish in background
        generationId.current++;
        isGeneratingRef.current = false;
        setIsGenerating(false);
        setAgentStatus({ phase: 'idle' });
      }
    }

    setMessages([]);
    setActiveConversationId(id);
    setAgentTrace(null);
    setContextLog([]);
    setLoadingConversation(true);

    try {
      const res = await api.get(`/ai/conversations/${id}`);
      const conv: Conversation = res.data.conversation;
      setMessages(conv.messages || []);
      completeSetup();
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoadingConversation(false);
    }
  }, [completeSetup, stopGeneration, providerId]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setAgentTrace(null);
    setContextLog([]);
    setAgentStatus({ phase: 'idle' });
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/ai/conversations/${id}`);
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (activeConversationId === id) {
          newConversation();
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeConversationId, newConversation],
  );

  // --- Generate AI title for new conversations ---
  const generateTitle = useCallback(
    async (convoId: string, question: string, config: ProviderConfig) => {
      try {
        const prompt = `Generate a brief title (3-6 words) for this conversation:\n"${question.slice(0, 200)}"\nRespond with only the title, nothing else.`;
        let rawTitle = '';
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 15_000);
        try {
          for await (const chunk of streamText(
            config,
            [{ role: 'user', content: prompt }],
            { signal: ctrl.signal, maxTokens: 30, temperature: 0.5 },
          )) {
            rawTitle += chunk;
            if (rawTitle.length > 100) break;
          }
        } finally {
          clearTimeout(timeout);
        }
        const title = rawTitle
          .trim()
          .replace(/^["'`]+|["'`]+$/g, '')
          .replace(/\.+$/, '')
          .trim()
          .slice(0, 100);
        if (title && title.length > 2) {
          await api.patch(`/ai/conversations/${convoId}`, { title });
          setConversations((prev) =>
            prev.map((c) => (c._id === convoId ? { ...c, title } : c)),
          );
        }
      } catch {
        // Title generation failed — question-based title remains
      }
    },
    [],
  );

  // --- Tool Executor ---
  const callTool = useCallback(async (name: string, args: any) => {
    return fetchToolDataWithRetry(name, args);
  }, []);

  // --- Send Message ---
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isGeneratingRef.current) return;
      isGeneratingRef.current = true;

      const thisGenId = ++generationId.current;
      const isActive = () => generationId.current === thisGenId;

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setAgentStatus({ phase: 'thinking' });
      setContextLog([]);

      const controller = new AbortController();
      abortRef.current = controller;

      const config: ProviderConfig = {
        providerId,
        modelId,
        apiKey: loadProviderKey(providerId),
        customEndpoint: customEndpoint || undefined,
        engine: providerId === 'webllm' ? engineRef.current : undefined,
      };

      if (providerId === 'webllm' && !engineRef.current) {
        const loading = engineStatusRef.current === 'loading';
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            role: 'assistant',
            content: loading
              ? 'The local model is still loading — please wait a moment and try again.'
              : 'The local model is not loaded. Please load a model from the setup panel.',
          },
        ]);
        isGeneratingRef.current = false;
        setIsGenerating(false);
        setAgentStatus({ phase: 'idle' });
        return;
      }

      const providerDef = getProvider(providerId);
      if (providerDef?.requiresKey && !config.apiKey) {
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: `No API key configured for ${providerDef.name}. Please add your API key in the provider settings.` },
        ]);
        isGeneratingRef.current = false;
        setIsGenerating(false);
        setAgentStatus({ phase: 'idle' });
        return;
      }

      // --- Create conversation in backend immediately for new conversations ---
      const isNewConvo = !activeConversationId;
      let convoId = activeConversationId;

      if (isNewConvo && chatHistoryEnabled) {
        try {
          const res = await api.post('/ai/conversations', {
            title: text.slice(0, 100),
            provider: providerId,
            model: modelId,
            messages: [{ role: 'user', content: text }],
          });
          convoId = res.data.conversation?._id;
          if (convoId) {
            setActiveConversationId(convoId);
            setConversations((prev) => [
              {
                _id: convoId!,
                title: text.slice(0, 100),
                provider: providerId,
                model: modelId,
                messageCount: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }
        } catch (err: any) {
          console.error('[Senzor AI] Failed to create conversation:', err?.response?.data || err?.message || err);
        }
      }

      // For existing conversations, persist user message in background (maintains ordering)
      if (convoId) {
        setGeneratingConvoIds((prev) => [...new Set([...prev, convoId!])]);
      }

      let userMsgPersisted: Promise<void> | null = null;
      if (chatHistoryEnabled && convoId && !isNewConvo) {
        userMsgPersisted = api
          .post(`/ai/conversations/${convoId}/messages`, {
            messages: [{ role: 'user', content: text }],
          })
          .then(() => {
            setConversations((prev) =>
              prev.map((c) =>
                c._id === convoId ? { ...c, messageCount: c.messageCount + 1, updatedAt: new Date().toISOString() } : c,
              ),
            );
          })
          .catch((err: any) => {
            console.error('[Senzor AI] Failed to persist user message:', err?.response?.data || err?.message || err);
          });
      }

      const modelDef = getProviderModel(providerId, modelId);
      const contextWindow = modelDef?.contextWindow ?? 8192;

      let answerBuffer = '';
      const assistantMsgIndex = { current: -1 };
      const assistantMsgId = nextMsgId();
      let rafId = 0;
      let rafPending = false;

      const flushAnswer = () => {
        rafPending = false;
        if (!isActive()) return;
        const snapshot = answerBuffer;
        setMessages((prev) => {
          const updated = [...prev];
          const idx = assistantMsgIndex.current;
          if (idx >= 0 && idx < updated.length) {
            updated[idx] = { ...updated[idx], content: snapshot };
          }
          return updated;
        });
      };

      const scheduleFlush = () => {
        if (!rafPending) {
          rafPending = true;
          rafId = requestAnimationFrame(flushAnswer);
        }
      };

      try {
        const { answer, trace } = await runAgent({
          provider: config,
          history: messagesRef.current,
          userInput: text,
          tools: AI_TOOLS,
          callTool,
          signal: controller.signal,
          contextWindow,
          callbacks: {
            onIterationStart: (iteration) => {
              if (!isActive()) return;
              setContextLog((prev) => [
                ...prev,
                { time: new Date(), type: 'thinking', name: `Iteration ${iteration}`, content: '' },
              ]);
            },
            onPhase: (phase, detail, tools) => {
              if (!isActive()) return;
              setAgentStatus({ phase, detail, tools });
            },
            onThinkingDelta: (delta) => {
              if (!isActive()) return;
              setContextLog((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.type === 'thinking') {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + delta },
                  ];
                }
                return prev;
              });
            },
            onThinkingEnd: () => {},
            onToolCallsStart: () => {},
            onToolStart: (call) => {
              if (!isActive()) return;
              setContextLog((prev) => [
                ...prev,
                { time: new Date(), type: 'tool_call', name: call.name, args: call.arguments },
              ]);
            },
            onToolResult: (call, data) => {
              if (!isActive()) return;
              setContextLog((prev) => [
                ...prev,
                { time: new Date(), type: 'tool_result', name: call.name, data },
              ]);
            },
            onToolError: (call, error) => {
              if (!isActive()) return;
              setContextLog((prev) => [
                ...prev,
                { time: new Date(), type: 'tool_error', name: call.name, error },
              ]);
            },
            onAnswerStart: () => {
              if (!isActive()) return;
              answerBuffer = '';
              if (assistantMsgIndex.current >= 0) {
                scheduleFlush();
              } else {
                setMessages((prev) => {
                  assistantMsgIndex.current = prev.length;
                  return [...prev, { id: assistantMsgId, role: 'assistant', content: '' }];
                });
              }
            },
            onAnswerDelta: (delta) => {
              if (!isActive()) return;
              answerBuffer += delta;
              scheduleFlush();
            },
            onAnswerEnd: (full) => {
              answerBuffer = full;
            },
          },
        });

        cancelAnimationFrame(rafId);
        rafPending = false;

        if (isActive()) {
          const finalMessages = messagesRef.current.slice();
          const idx = assistantMsgIndex.current;
          if (idx >= 0 && idx < finalMessages.length) {
            finalMessages[idx] = { ...finalMessages[idx], content: answer, trace };
          } else if (answer) {
            finalMessages.push({ id: assistantMsgId, role: 'assistant', content: answer, trace });
          }

          setMessages(finalMessages);
          setAgentTrace(trace);
        }

        // Persist assistant response to backend (even for background generations)
        if (chatHistoryEnabled && convoId && answer) {
          try {
            if (userMsgPersisted) await userMsgPersisted;
            await api.post(`/ai/conversations/${convoId}/messages`, {
              messages: [{ role: 'assistant', content: answer }],
            });
            setConversations((prev) =>
              prev.map((c) =>
                c._id === convoId ? { ...c, messageCount: c.messageCount + 1, updatedAt: new Date().toISOString() } : c,
              ),
            );
          } catch (err: any) {
            console.error('[Senzor AI] Failed to persist assistant message:', err?.response?.data || err?.message || err);
          }
        }

        // Generate AI title for new conversations (cloud providers only — WebLLM skips to avoid engine contention)
        if (chatHistoryEnabled && isNewConvo && convoId && answer && providerId !== 'webllm') {
          generateTitle(convoId, text, config);
        }
      } catch (err: any) {
        cancelAnimationFrame(rafId);
        rafPending = false;
        if (isActive()) {
          if (err?.name === 'AbortError') {
            setMessages((prev) => {
              if (assistantMsgIndex.current >= 0) {
                const updated = [...prev];
                const idx = assistantMsgIndex.current;
                if (idx < updated.length && !updated[idx].content) {
                  updated[idx] = { ...updated[idx], content: '_Generation stopped._' };
                }
                return updated;
              }
              return [...prev, { id: nextMsgId(), role: 'assistant', content: '_Generation stopped._' }];
            });
          } else {
            const errorContent = `An error occurred: ${err?.message || 'Unknown error'}. Please try again.`;
            setMessages((prev) => {
              if (assistantMsgIndex.current >= 0) {
                const updated = [...prev];
                const idx = assistantMsgIndex.current;
                if (idx < updated.length) {
                  updated[idx] = { ...updated[idx], content: errorContent };
                }
                return updated;
              }
              return [...prev, { id: nextMsgId(), role: 'assistant', content: errorContent }];
            });
          }
        }
      } finally {
        if (generationId.current === thisGenId) {
          isGeneratingRef.current = false;
          setIsGenerating(false);
          setAgentStatus({ phase: 'idle' });
        }
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (convoId) {
          setGeneratingConvoIds((prev) => prev.filter((id) => id !== convoId));
        }
      }
    },
    [
      providerId,
      modelId,
      customEndpoint,
      activeConversationId,
      chatHistoryEnabled,
      nextMsgId,
      callTool,
      generateTitle,
    ],
  );

  const clearChat = useCallback(() => {
    stopGeneration();
    newConversation();
  }, [stopGeneration, newConversation]);

  // --- Regenerate Last Response ---
  const regenerateLastResponse = useCallback(() => {
    if (isGeneratingRef.current) return;
    const msgs = messagesRef.current;
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const userText = msgs[lastUserIdx].content;
    const trimmed = msgs.slice(0, lastUserIdx);
    messagesRef.current = trimmed;
    setMessages(trimmed);
    sendMessage(userText);
  }, [sendMessage]);

  // --- API Key Management ---
  const getApiKey = useCallback((pid: string) => loadProviderKey(pid), []);

  const setApiKey = useCallback((pid: string, key: string) => {
    saveProviderKey(pid, key);
  }, []);

  const clearApiKey = useCallback((pid: string) => {
    clearProviderKey(pid);
  }, []);

  // --- UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // --- Load conversations on mount ---
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // --- Context Value ---
  const value = useMemo<AIAssistantState>(
    () => ({
      providerId,
      modelId,
      customEndpoint,
      setProviderId,
      setModelId,
      setCustomEndpoint,
      setupComplete,
      completeSetup,
      resetSetup,
      engineStatus,
      engineProgress,
      engineProgressText,
      loadEngine,
      unloadEngine,
      messages,
      isGenerating,
      agentStatus,
      agentTrace,
      contextLog,
      sendMessage,
      stopGeneration,
      clearChat,
      conversations,
      activeConversationId,
      loadingConversation,
      generatingConvoIds,
      loadConversations,
      loadConversation,
      newConversation,
      deleteConversation,
      regenerateLastResponse,
      chatHistoryEnabled,
      setChatHistoryEnabled,
      getApiKey,
      setApiKey,
      clearApiKey,
      sidebarOpen,
      setSidebarOpen,
      inspectorOpen,
      setInspectorOpen,
    }),
    [
      providerId,
      modelId,
      customEndpoint,
      setProviderId,
      setModelId,
      setCustomEndpoint,
      setupComplete,
      completeSetup,
      resetSetup,
      engineStatus,
      engineProgress,
      engineProgressText,
      loadEngine,
      unloadEngine,
      messages,
      isGenerating,
      agentStatus,
      agentTrace,
      contextLog,
      sendMessage,
      stopGeneration,
      clearChat,
      conversations,
      activeConversationId,
      loadingConversation,
      generatingConvoIds,
      loadConversations,
      loadConversation,
      newConversation,
      deleteConversation,
      regenerateLastResponse,
      chatHistoryEnabled,
      setChatHistoryEnabled,
      getApiKey,
      setApiKey,
      clearApiKey,
      sidebarOpen,
      setSidebarOpen,
      inspectorOpen,
      setInspectorOpen,
    ],
  );

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}
