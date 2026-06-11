import React, { useState } from 'react';
import { cn, Button } from '@/components/Core';
import { Copy, Check, User, RefreshCw } from 'lucide-react';
import { AssistantMarkdown } from './AssistantMarkdown';
import { SenzorAIIcon } from './SenzorAIIcon';
import type { ChatMessage } from '@/lib/ai/types';

export function MessageBubble({
  message,
  isLatest,
  isGenerating,
  onRegenerate,
}: {
  message: ChatMessage;
  isLatest: boolean;
  isGenerating: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = isLatest && isGenerating && !isUser;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 group',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <SenzorAIIcon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative max-w-[85%] md:max-w-[75%]',
          isUser ? 'order-first' : '',
        )}
      >
        <div
          className={cn(
            'rounded-xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border border-border/50 rounded-bl-sm',
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <>
              {message.content ? (
                <AssistantMarkdown content={message.content} />
              ) : isStreaming ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </div>
              ) : null}
              {isStreaming && message.content && (
                <span className="inline-block w-0.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </>
          )}
        </div>

        {!isUser && message.content && !isStreaming && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
