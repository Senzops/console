import React, { useState } from 'react';
import { cn, Button, Input } from '@/components/Core';
import type { ConversationMeta } from '@/lib/ai/types';
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  X,
  PanelLeftClose,
  Loader2,
  ShieldOff,
} from 'lucide-react';

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ConversationSidebar({
  conversations,
  activeId,
  generatingIds,
  chatHistoryEnabled,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  conversations: ConversationMeta[];
  activeId: string | null;
  generatingIds: string[];
  chatHistoryEnabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <div className="flex flex-col h-full w-72 border-r border-border/40 bg-card/80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 shrink-0">
        <h3 className="text-xs font-bold text-foreground">Chats</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNew}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="New chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/30 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="h-7 text-xs pl-8 bg-muted/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!chatHistoryEnabled ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <ShieldOff className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-muted-foreground mb-1">Private Mode</p>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Chat history is not saved. Conversations exist only during this session.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {search
                ? 'No chats match your search.'
                : 'No chats yet. Start a new one!'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => {
              const isGenerating = generatingIds.includes(conv._id);
              return (
                <div
                  key={conv._id}
                  className={cn(
                    'group flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors',
                    conv._id === activeId
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-muted/40 border-l-2 border-transparent',
                  )}
                  onClick={() => onSelect(conv._id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {conv.title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isGenerating ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Generating…
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] text-muted-foreground">
                            {conv.messageCount} msgs
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeDate(conv.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv._id);
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
