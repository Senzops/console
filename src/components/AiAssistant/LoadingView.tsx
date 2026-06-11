import React from 'react';
import { Card } from '@/components/Core';
import { Cpu } from 'lucide-react';

export function LoadingView({
  progress,
  progressText,
}: {
  progress: number;
  progressText: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 h-full">
      <Card className="max-w-md w-full p-8 border-border/60 shadow-xl bg-card rounded-xl overflow-hidden relative">
        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-muted/60 rounded-full animate-pulse" />
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-full">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
              Provisioning Local Engine
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Securely caching model weights to your device. This runs once and
              ensures zero data leaves your network.
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
              <span>Progress</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded-md border border-border/50 w-full truncate">
            {progressText || 'Initializing WebGPU Context...'}
          </div>
        </div>
      </Card>
    </div>
  );
}
