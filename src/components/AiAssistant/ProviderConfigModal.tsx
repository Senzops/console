import React, { useState, useCallback } from 'react';
import {
  Dialog,
  Button,
  Input,
  Spinner,
  cn,
} from '@/components/Core';
import { PROVIDERS } from '@/lib/ai/providers/registry';
import { validateProviderKey } from '@/lib/ai/providers/streaming';
import { useAIAssistant } from '@/lib/ai/context';
import {
  Check,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

function ProviderKeyRow({
  providerId,
  name,
  keyPlaceholder,
  docsUrl,
}: {
  providerId: string;
  name: string;
  keyPlaceholder: string;
  docsUrl: string;
}) {
  const { getApiKey, setApiKey, clearApiKey } = useAIAssistant();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const storedKey = getApiKey(providerId);
  const maskedKey = storedKey
    ? `${'•'.repeat(Math.max(0, storedKey.length - 3))}${storedKey.slice(-3)}`
    : '';

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;
    setValidating(true);
    setStatus('idle');

    const result = await validateProviderKey(providerId, inputValue.trim());
    if (result.valid) {
      setApiKey(providerId, inputValue.trim());
      setStatus('valid');
      setInputValue('');
    } else {
      setStatus('invalid');
    }
    setValidating(false);
  }, [inputValue, providerId, setApiKey]);

  const handleRemove = () => {
    clearApiKey(providerId);
    setStatus('idle');
    setInputValue('');
  };

  return (
    <div className="p-3.5 rounded-lg border border-border/50 bg-card/50 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <div className="flex items-center gap-2">
          {storedKey && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <Check className="h-3 w-3" /> Configured
            </span>
          )}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Get API key"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {storedKey ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/30 truncate">
            {maskedKey}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            title="Remove key"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setStatus('idle');
                }}
                placeholder={keyPlaceholder}
                className="h-9 text-xs font-mono pr-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!inputValue.trim() || validating}
              className="h-9 text-xs px-4 shrink-0"
            >
              {validating ? (
                <Spinner className="h-3 w-3" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
          {status === 'invalid' && (
            <p className="text-[10px] text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> Invalid API key. Please check and try again.
            </p>
          )}
          {status === 'valid' && (
            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
              <Check className="h-3 w-3" /> API key validated and saved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProviderConfigModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { chatHistoryEnabled, setChatHistoryEnabled } = useAIAssistant();
  const cloudProviders = PROVIDERS.filter((p) => p.requiresKey);

  return (
    <Dialog open={open} onClose={onClose} title="Settings" className="max-w-lg lg:max-w-2xl">
      <div className="space-y-4">
        {/* Privacy */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
          <div className="flex items-start gap-2.5">
            {chatHistoryEnabled ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldOff className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">Chat History</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {chatHistoryEnabled
                  ? 'Conversations are saved to your account.'
                  : 'Private mode — nothing is saved. Chats are lost on page close.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setChatHistoryEnabled(!chatHistoryEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
              chatHistoryEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5',
                chatHistoryEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]',
              )}
            />
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/30">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            API keys are stored locally in your browser and never sent to Senzor
            servers. All API requests go directly from your browser to the
            provider.
          </p>
        </div>

        {/* Provider Keys */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cloudProviders.map((provider) => (
            <ProviderKeyRow
              key={provider.id}
              providerId={provider.id}
              name={provider.name}
              keyPlaceholder={provider.keyPlaceholder}
              docsUrl={provider.docsUrl}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
