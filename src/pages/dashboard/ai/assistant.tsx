import React from 'react';
import { AIAssistantProvider, useAIAssistant } from '@/lib/ai/context';
import { SetupView } from '@/components/AiAssistant/SetupView';
import { ChatView } from '@/components/AiAssistant/ChatView';
import { LoadingView } from '@/components/AiAssistant/LoadingView';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Core';

class AIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error.message || 'An unexpected error occurred in the AI Assistant.'}
            </p>
            <Button
              onClick={() => this.setState({ error: null })}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AssistantContent() {
  const { providerId, setupComplete, engineStatus, engineProgress, engineProgressText } = useAIAssistant();

  if (!setupComplete && providerId === 'webllm' && engineStatus === 'loading') {
    return (
      <LoadingView progress={engineProgress} progressText={engineProgressText} />
    );
  }

  if (!setupComplete) {
    return <SetupView />;
  }

  return <ChatView />;
}

export default function AiAssistantPage() {
  return (
    <AIAssistantProvider>
      <AIErrorBoundary>
        <div className="h-full flex flex-col overflow-hidden">
          <AssistantContent />
        </div>
      </AIErrorBoundary>
    </AIAssistantProvider>
  );
}
