import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Button,
  Input,
  Dialog,
  cn,
} from '@/components/Core';
import { useAIAssistant } from '@/lib/ai/context';
import { MessageBubble } from './MessageBubble';
import { AgentStatusBar } from './AgentTimeline';
import { ContextInspector } from './ContextInspector';
import { ConversationSidebar } from './ConversationSidebar';
import { ModelSelector } from './ModelSelector';
import { ProviderConfigModal } from './ProviderConfigModal';
import { getProvider } from '@/lib/ai/providers/registry';
import type { SuggestedPrompt } from '@/lib/ai/types';
import {
  Square,
  ArrowUp,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  Settings,
  Trash2,
  Download,
  ShieldCheck,
  TrendingUp,
  ServerCog,
  Bug,
  Activity,
  Receipt,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { SenzorAIIcon } from './SenzorAIIcon';
import { Mascot, type MascotMood } from '@/components/Mascot';
import { moodFromAssistantState } from '@/components/Mascot/mood';
import { toast } from 'sonner';

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    category: 'Performance',
    iconKey: 'TrendingUp',
    accent: 'text-blue-500',
    prompts: [
      'Show me the p95 latency for all APM services in the last 24 hours',
      'Which services have the highest error rate right now?',
    ],
  },
  {
    category: 'Infrastructure',
    iconKey: 'ServerCog',
    accent: 'text-emerald-500',
    prompts: [
      'List all VPS instances and their resource usage',
      'Are any servers running low on disk space?',
    ],
  },
  {
    category: 'Errors',
    iconKey: 'Bug',
    accent: 'text-red-500',
    prompts: [
      'Show me unresolved error groups across all services',
      'What are the most frequent errors in the last hour?',
    ],
  },
  {
    category: 'Monitoring',
    iconKey: 'Activity',
    accent: 'text-amber-500',
    prompts: [
      'Are there any active alert incidents?',
      'Show me the status of all monitors',
    ],
  },
];

function PromptIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const icons: Record<string, React.FC<any>> = {
    TrendingUp,
    ServerCog,
    Bug,
    Activity,
    Receipt,
  };
  const Icon = icons[iconKey] || Activity;
  return <Icon className={className} />;
}

function WelcomeScreen({
  onSend,
  mood = 'greeting',
}: {
  onSend: (text: string) => void;
  mood?: MascotMood;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <Mascot mood={mood} size="lg" interactive className="mb-6" />
      <h2 className="text-xl font-bold text-foreground mb-2">
        Senzor Intelligence
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
        Your AI-powered SRE assistant. Ask about your infrastructure, services,
        logs, errors, alerts, and more — powered by live telemetry.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_PROMPTS.map((group) => (
          <div
            key={group.category}
            className="space-y-2"
          >
            <div className="flex items-center gap-1.5 px-1">
              <PromptIcon
                iconKey={group.iconKey}
                className={cn('h-3.5 w-3.5', group.accent)}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </span>
            </div>
            {group.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="w-full text-left px-3 py-2.5 text-xs text-foreground/80 bg-card border border-border/50 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all leading-relaxed"
              >
                {prompt}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatView() {
  const {
    providerId,
    modelId,
    setModelId,
    resetSetup,
    engineStatus,
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
    loadConversation,
    newConversation,
    deleteConversation,
    regenerateLastResponse,
    chatHistoryEnabled,
    setChatHistoryEnabled,
    sidebarOpen,
    setSidebarOpen,
    inspectorOpen,
    setInspectorOpen,
  } = useAIAssistant();

  const [input, setInput] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const webllmLoading = providerId === 'webllm' && engineStatus === 'loading';
  const canSend = !isGenerating;

  // --- WebLLM switch warning ---
  const SWITCH_WARNING_KEY = 'senzor_ai_webllm_switch_dismissed';
  const [switchWarningOpen, setSwitchWarningOpen] = useState(false);
  const [switchWarningDontAsk, setSwitchWarningDontAsk] = useState(false);
  const pendingSwitchRef = useRef<string | null>(null);
  const switchDismissedRef = useRef(() => {
    try { return localStorage.getItem(SWITCH_WARNING_KEY) === 'true'; } catch { return false; }
  });

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isGenerating && providerId === 'webllm') {
        if (switchDismissedRef.current()) {
          loadConversation(id);
          return;
        }
        pendingSwitchRef.current = id;
        setSwitchWarningOpen(true);
        return;
      }
      loadConversation(id);
    },
    [isGenerating, providerId, loadConversation],
  );

  const confirmSwitch = useCallback(() => {
    if (switchWarningDontAsk) {
      try { localStorage.setItem(SWITCH_WARNING_KEY, 'true'); } catch { /* noop */ }
    }
    setSwitchWarningOpen(false);
    if (pendingSwitchRef.current) {
      loadConversation(pendingSwitchRef.current);
      pendingSwitchRef.current = null;
    }
  }, [switchWarningDontAsk, loadConversation]);

  const provider = getProvider(providerId);
  const activeModelName =
    provider?.models.find((m) => m.id === modelId)?.name ?? modelId;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  // Focus input on mount and after generation
  useEffect(() => {
    if (!isGenerating) {
      inputRef.current?.focus();
    }
  }, [isGenerating]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !canSend) return;
    setInput('');
    sendMessage(text);
  }, [input, canSend, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExport = () => {
    const exportable = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    if (exportable.length === 0) return;
    const data = JSON.stringify(
      exportable.map((m) => ({ role: m.role, content: m.content })),
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `senzor-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported');
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (!window.confirm('Clear this chat? This cannot be undone.')) return;
    clearChat();
  };

  const displayMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  );

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                'h-8 w-8 shrink-0',
                sidebarOpen
                  ? 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Chats"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <div className="relative shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <SenzorAIIcon className="h-4 w-4 text-primary" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card',
                  webllmLoading
                    ? 'bg-blue-500 animate-pulse'
                    : isGenerating
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500',
                )}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">
                Senzor Intelligence
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-mono uppercase tracking-wider font-semibold',
                    webllmLoading
                      ? 'text-blue-500'
                      : isGenerating
                        ? 'text-amber-500'
                        : 'text-emerald-500',
                  )}
                >
                  {webllmLoading
                    ? 'Initializing'
                    : isGenerating
                      ? 'Working'
                      : 'Ready'}
                </span>
                <span className="opacity-50">&middot;</span>
                <span className="font-mono truncate max-w-[180px]" title={activeModelName}>
                  {activeModelName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isGenerating && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopGeneration}
                className="h-8 text-xs font-medium border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50"
              >
                <Square className="h-3 w-3 mr-1.5 fill-current" /> Stop
              </Button>
            )}
            <ModelSelector
              providerId={providerId}
              modelId={modelId}
              onModelChange={setModelId}
              className="w-40 hidden md:flex"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className={cn(
                'h-8 text-xs font-medium hidden sm:inline-flex',
                inspectorOpen
                  ? 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {inspectorOpen ? (
                <PanelRightClose className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5 mr-1.5" />
              )}
              Inspector
            </Button>
            <div className="w-px h-4 bg-border mx-0.5 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              onClick={resetSetup}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Change provider"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigModalOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Provider settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Export chat"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          {sidebarOpen && (
            <ConversationSidebar
              conversations={conversations}
              activeId={activeConversationId}
              generatingIds={generatingConvoIds}
              chatHistoryEnabled={chatHistoryEnabled}
              onSelect={handleSelectConversation}
              onNew={newConversation}
              onDelete={deleteConversation}
              onClose={() => setSidebarOpen(false)}
            />
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
              {loadingConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading conversation...</span>
                </div>
              ) : displayMessages.length === 0 ? (
                <WelcomeScreen
                  onSend={sendMessage}
                  mood={moodFromAssistantState(
                    { engineStatus, isGenerating },
                    'greeting',
                  )}
                />
              ) : (
                <div className="py-4">
                  {displayMessages.map((msg, idx) => {
                    const isLast = idx === displayMessages.length - 1;
                    const showRegenerate = isLast && msg.role === 'assistant' && !isGenerating;
                    return (
                      <MessageBubble
                        key={msg.id || `${msg.role}-${idx}`}
                        message={msg}
                        isLatest={isLast}
                        isGenerating={isGenerating}
                        onRegenerate={showRegenerate ? regenerateLastResponse : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Agent Status */}
            <AgentStatusBar status={agentStatus} />

            {/* Input Area */}
            <div className="border-t border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3 shrink-0">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your infrastructure..."
                  disabled={!canSend}
                  rows={1}
                  className={cn(
                    'flex-1 min-w-0 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm',
                    'shadow-sm transition-colors placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'min-h-[42px] max-h-[120px]',
                  )}
                  style={{
                    height: 'auto',
                    overflow: input.split('\n').length > 3 ? 'auto' : 'hidden',
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || !canSend}
                  className="h-[42px] w-[42px] rounded-xl shrink-0"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center mt-2">
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {providerId === 'webllm'
                    ? 'Running locally — data never leaves your device'
                    : 'BYOK — API calls go directly to the provider'}
                </span>
              </div>
            </div>
          </div>

          {/* Inspector Panel */}
          {inspectorOpen && (
            <ContextInspector
              trace={agentTrace}
              contextLog={contextLog}
              onClose={() => setInspectorOpen(false)}
            />
          )}
        </div>
      </div>

      <ProviderConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />

      {/* WebLLM switch warning */}
      <Dialog
        open={switchWarningOpen}
        onClose={() => {
          setSwitchWarningOpen(false);
          pendingSwitchRef.current = null;
        }}
        title="Switch Chat?"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              The local model is currently generating a response. Switching chats
              will stop the generation — it cannot continue in the background.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={switchWarningDontAsk}
              onChange={(e) => setSwitchWarningDontAsk(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">
              Don&apos;t ask again
            </span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSwitchWarningOpen(false);
                pendingSwitchRef.current = null;
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmSwitch}
              className="h-8 text-xs"
            >
              Switch Chat
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
