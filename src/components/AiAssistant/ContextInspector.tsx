import React, { useState } from 'react';
import { cn, Button } from '@/components/Core';
import { AgentTimeline } from './AgentTimeline';
import type { AgentTrace, LogEntry } from '@/lib/ai/types';
import {
  PanelRightClose,
  Brain,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react';

function LogItem({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const iconMap = {
    thinking: <Brain className="h-3.5 w-3.5 text-blue-400" />,
    tool_call: <Wrench className="h-3.5 w-3.5 text-amber-400" />,
    tool_result: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    tool_error: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
  };

  let detail = '';
  switch (entry.type) {
    case 'thinking':
      detail = entry.content;
      break;
    case 'tool_call':
      detail = JSON.stringify(entry.args, null, 2);
      break;
    case 'tool_result':
      detail =
        typeof entry.data === 'string'
          ? entry.data.slice(0, 800)
          : JSON.stringify(entry.data, null, 2)?.slice(0, 800) || '';
      break;
    case 'tool_error':
      detail = entry.error;
      break;
  }

  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => detail && setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full text-left py-2.5 px-4 text-xs hover:bg-muted/30 transition-colors"
      >
        {iconMap[entry.type]}
        <span className="text-foreground/80 truncate flex-1 font-medium">{entry.name}</span>
        <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
          {entry.time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
        {detail &&
          (expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          ))}
      </button>
      {expanded && detail && (
        <pre className="text-[10px] text-muted-foreground bg-muted/20 mx-4 mb-2.5 px-3 py-2.5 rounded-md overflow-x-auto max-h-40 font-mono leading-relaxed border border-border/20">
          {detail}
        </pre>
      )}
    </div>
  );
}

export function ContextInspector({
  trace,
  contextLog,
  onClose,
}: {
  trace: AgentTrace | null;
  contextLog: LogEntry[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'log' | 'trace'>('log');

  return (
    <div className="flex flex-col h-full border-l border-border/40 bg-card/50 w-80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <h3 className="text-xs font-bold text-foreground tracking-wide">Agent Inspector</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 shrink-0 px-2">
        <button
          onClick={() => setTab('log')}
          className={cn(
            'flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
            tab === 'log'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Live Log
        </button>
        <button
          onClick={() => setTab('trace')}
          className={cn(
            'flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
            tab === 'trace'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Trace
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'log' && (
          contextLog.length > 0 ? (
            <div className="py-1">
              {contextLog.map((entry, i) => (
                <LogItem key={i} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
              <Brain className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Agent activity will appear here as it processes your query.
              </p>
            </div>
          )
        )}

        {tab === 'trace' && (
          trace ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    Iterations
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    {trace.iterations}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    Tool Calls
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    {trace.toolCallCount}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    Duration
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    {trace.endedAt
                      ? `${((trace.endedAt - trace.startedAt) / 1000).toFixed(1)}s`
                      : '—'}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    Provider
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground truncate">
                    {trace.provider}
                  </div>
                </div>
              </div>
              <AgentTimeline steps={trace.steps} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
              <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                No trace data yet. Send a message to see the agent trace.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
