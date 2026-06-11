import React, { useState } from 'react';
import { cn } from '@/components/Core';
import type { AgentStatus, AgentStep } from '@/lib/ai/types';
import {
  Brain,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';

function StepIcon({ step }: { step: AgentStep }) {
  switch (step.type) {
    case 'thinking':
      return <Brain className="h-3.5 w-3.5 text-blue-400" />;
    case 'tool_call':
      return <Wrench className="h-3.5 w-3.5 text-amber-400" />;
    case 'tool_result':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case 'tool_error':
      return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  }
}

function StepItem({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);

  let label = '';
  let detail: string | null = null;

  switch (step.type) {
    case 'thinking':
      label = 'Reasoning';
      detail = step.content;
      break;
    case 'tool_call':
      label = step.toolName;
      detail = JSON.stringify(step.args, null, 2);
      break;
    case 'tool_result':
      label = `${step.toolName} (${step.durationMs}ms)`;
      detail =
        typeof step.data === 'string'
          ? step.data.slice(0, 500)
          : JSON.stringify(step.data, null, 2)?.slice(0, 500);
      break;
    case 'tool_error':
      label = `${step.toolName} failed (${step.durationMs}ms)`;
      detail = step.error;
      break;
  }

  return (
    <div className="group">
      <button
        onClick={() => detail && setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2.5 w-full text-left py-1.5 px-2 rounded-md text-xs transition-colors',
          detail ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default',
        )}
      >
        <StepIcon step={step} />
        <span className="text-foreground/80 truncate flex-1 font-medium">{label}</span>
        {detail && (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )
        )}
      </button>
      {expanded && detail && (
        <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded-md p-2.5 mx-2 mt-1 mb-1.5 overflow-x-auto max-h-32 border border-border/30 font-mono leading-relaxed">
          {detail}
        </pre>
      )}
    </div>
  );
}

export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) return null;

  const grouped = new Map<number, AgentStep[]>();
  for (const step of steps) {
    const list = grouped.get(step.iteration) || [];
    list.push(step);
    grouped.set(step.iteration, list);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([iteration, iterSteps]) => (
        <div key={iteration}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
            Iteration {iteration}
          </div>
          <div className="space-y-0.5">
            {iterSteps.map((step, i) => (
              <StepItem key={`${iteration}-${i}`} step={step} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentStatusBar({ status }: { status: AgentStatus }) {
  if (status.phase === 'idle') return null;

  const phaseLabels: Record<string, string> = {
    thinking: 'Reasoning',
    selecting_tools: 'Selecting tools',
    calling_tools: 'Fetching data',
    analyzing: 'Analyzing results',
    responding: 'Composing answer',
  };

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted/30 border-t border-border/30">
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
      <span className="text-xs text-muted-foreground font-medium">
        {phaseLabels[status.phase] || status.phase}
      </span>
      {status.tools && status.tools.length > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground/70">
          {status.tools.join(', ')}
        </span>
      )}
    </div>
  );
}
