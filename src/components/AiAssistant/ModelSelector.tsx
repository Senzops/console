import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  cn,
} from '@/components/Core';
import { getProvider } from '@/lib/ai/providers/registry';

const tierLabels: Record<string, string> = {
  premium: 'Premium (6-8 GB VRAM)',
  balanced: 'Balanced (4-5 GB VRAM)',
  fast: 'Fast (3 GB VRAM)',
  local: 'Ultralight (1-2 GB VRAM)',
};

const cloudTierLabels: Record<string, string> = {
  premium: 'Premium',
  balanced: 'Balanced',
  fast: 'Fast',
};

const tierOrder = ['premium', 'balanced', 'fast', 'local'];

export function ModelSelector({
  providerId,
  modelId,
  onModelChange,
  className,
}: {
  providerId: string;
  modelId: string;
  onModelChange: (id: string) => void;
  className?: string;
}) {
  const provider = getProvider(providerId);
  if (!provider) return null;

  const isLocal = providerId === 'webllm';
  const models = provider.models;
  const tiers = tierOrder.filter((t) => models.some((m) => m.tier === t));
  const labels = isLocal ? tierLabels : cloudTierLabels;

  return (
    <Select value={modelId} onValueChange={onModelChange}>
      <SelectTrigger className={cn('h-8 text-xs bg-background', className)}>
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {tiers.map((tier) => {
          const tierModels = models.filter((m) => m.tier === tier);
          return (
            <SelectGroup key={tier}>
              <SelectLabel>{labels[tier] || tier}</SelectLabel>
              {tierModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name}
                    {m.vramRequired != null && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {m.vramRequired}GB
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
