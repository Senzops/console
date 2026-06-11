import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  cn,
} from '@/components/Core';
import { useAIAssistant } from '@/lib/ai/context';
import { PROVIDERS, getProvider, getProviderModel, LOCAL_MODEL_VRAM_MAP } from '@/lib/ai/providers/registry';
import { ModelSelector } from './ModelSelector';
import { ProviderConfigModal } from './ProviderConfigModal';
import {
  Cpu,
  Lock,
  ArrowRight,
  Settings,
  Check,
  AlertTriangle,
  Monitor,
  HardDrive,
  Info,
} from 'lucide-react';
import { SenzorAIIcon } from './SenzorAIIcon';

interface GpuProfile {
  device: string;
  vendor: string;
  architecture: string;
  maxAllocationGB: number;
}

function useGpuDetection(enabled: boolean) {
  const [gpu, setGpu] = useState<GpuProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    setLoading(true);
    setError(false);

    (async () => {
      try {
        const gpuApi = (navigator as any).gpu;
        if (!gpuApi) { setError(true); return; }

        const adapter = await gpuApi.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter || cancelled) { if (!cancelled) setError(true); return; }

        const info: any = adapter.info ?? (typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : null);
        const maxBuffer = adapter.limits?.maxBufferSize ?? 0;
        const maxStorage = adapter.limits?.maxStorageBufferBindingSize ?? 0;
        const largest = Math.max(maxBuffer, maxStorage);
        const maxAllocationGB = largest > 0 ? Math.round((largest / (1024 ** 3)) * 10) / 10 : 0;

        if (!cancelled) {
          setGpu({
            device: info?.device || info?.description || 'Unknown GPU',
            vendor: info?.vendor || '',
            architecture: info?.architecture || '',
            maxAllocationGB,
          });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return { gpu, loading, error };
}

export function SetupView() {
  const {
    providerId,
    modelId,
    customEndpoint,
    setProviderId,
    setModelId,
    setCustomEndpoint,
    engineStatus,
    loadEngine,
    completeSetup,
    getApiKey,
  } = useAIAssistant();

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const [customModelName, setCustomModelName] = useState(() =>
    providerId === 'custom' && modelId && modelId !== 'custom-model' ? modelId : '',
  );
  const provider = getProvider(providerId);
  const isWebLLM = providerId === 'webllm';
  const isCustom = providerId === 'custom';
  const hasKey = provider?.requiresKey ? !!getApiKey(providerId) : true;

  const webgpuSupported =
    typeof navigator !== 'undefined' && !!(navigator as any).gpu;

  const { gpu, loading: gpuLoading } = useGpuDetection(isWebLLM && webgpuSupported);

  const selectedModel = isWebLLM ? getProviderModel(providerId, modelId) : null;
  const modelVramReq = selectedModel?.vramRequired ?? LOCAL_MODEL_VRAM_MAP[modelId] ?? 0;
  const vramInsufficient = gpu && modelVramReq > 0 && gpu.maxAllocationGB > 0 && modelVramReq > gpu.maxAllocationGB * 2;

  const canProceed = isWebLLM
    ? webgpuSupported
    : isCustom
      ? !!customEndpoint
      : hasKey;

  const handleStart = () => {
    if (isWebLLM) {
      loadEngine();
      return;
    }
    if (isCustom) {
      if (customModelName) {
        setModelId(customModelName);
      }
      completeSetup();
      return;
    }
    if (provider?.requiresKey && !getApiKey(providerId)) {
      setKeyMissing(true);
      setConfigModalOpen(true);
      return;
    }
    completeSetup();
  };

  const webllmProvider = PROVIDERS.find((p) => p.id === 'webllm');
  const cloudProviders = PROVIDERS.filter((p) => p.requiresKey);
  const customProvider = PROVIDERS.find((p) => p.id === 'custom');
  const isCloudSelected = cloudProviders.some((p) => p.id === providerId);

  return (
    <>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 h-full">
        <Card className="w-full max-w-2xl border-border/60 shadow-xl bg-card rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="p-4 sm:p-6 pb-4 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-lg">
                <SenzorAIIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Senzor Intelligence
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enterprise SRE Assistant
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure your execution engine. Process telemetry locally in your
              browser for absolute privacy, or use a cloud API for higher
              throughput and quality.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
            {/* Local (WebLLM) */}
            {webllmProvider && (
              <div
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer',
                  isWebLLM
                    ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                    : 'bg-card border-border hover:border-primary/50',
                )}
                onClick={() => setProviderId('webllm')}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    <Cpu className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {webllmProvider.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {webllmProvider.description}
                </p>

                {isWebLLM && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                    {!webgpuSupported ? (
                      <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          WebGPU is not available in this browser. Please use
                          Chrome 113+ or Edge 113+ for local inference.
                        </span>
                      </div>
                    ) : engineStatus === 'error' ? (
                      <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          Failed to load model. Try a smaller model or check the console for details.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Hardware Profile */}
                        <div className="bg-muted/40 border border-border/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                            Hardware Profile
                          </div>
                          {gpuLoading ? (
                            <p className="text-[11px] text-muted-foreground animate-pulse">
                              Detecting GPU hardware...
                            </p>
                          ) : gpu ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <HardDrive className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">GPU:</span>
                                <span className="font-medium text-foreground truncate" title={gpu.device}>
                                  {gpu.device}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Max Alloc:</span>
                                <span className="font-bold font-mono text-foreground">
                                  {gpu.maxAllocationGB} GB
                                </span>
                              </div>
                              {gpu.vendor && (
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="text-muted-foreground ml-[18px]">Vendor:</span>
                                  <span className="text-foreground/70">{gpu.vendor}</span>
                                </div>
                              )}
                              {gpu.architecture && (
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="text-muted-foreground ml-[18px]">Arch:</span>
                                  <span className="text-foreground/70">{gpu.architecture}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Could not detect GPU. Model may still work — start with a smaller model if unsure.
                            </p>
                          )}
                        </div>

                        <ModelSelector
                          providerId="webllm"
                          modelId={modelId}
                          onModelChange={setModelId}
                        />

                        {/* Selected model details */}
                        {selectedModel && (
                          <div className="space-y-2">
                            {selectedModel.description && (
                              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                {selectedModel.description}
                              </p>
                            )}
                            {selectedModel.tags && selectedModel.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedModel.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted border border-border/50 text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {selectedModel.vramRequired != null && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 border border-primary/20 text-primary">
                                    Requires {selectedModel.vramRequired} GB
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* VRAM warning */}
                        {vramInsufficient && (
                          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-xs">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                              This model requires ~{modelVramReq} GB but your GPU reports ~{gpu!.maxAllocationGB} GB max allocation.
                              It may fail to load or run slowly. Consider a smaller model.
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cloud Providers (BYOK) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cloud Providers (BYOK)
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  Your key, your calls — direct to provider
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cloudProviders.map((p) => {
                  const isSelected = providerId === p.id;
                  const pHasKey = !!getApiKey(p.id);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:border-primary/40',
                      )}
                      onClick={() => setProviderId(p.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-bold text-foreground truncate">
                          {p.name}
                        </h3>
                        {pHasKey && (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">
                        {p.models.length} model{p.models.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Selected cloud provider config */}
              {isCloudSelected && provider && (
                <div className="mt-2.5 p-3.5 rounded-lg border border-border/50 bg-muted/10 space-y-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {provider.description}
                  </p>
                  <ModelSelector
                    providerId={providerId}
                    modelId={modelId}
                    onModelChange={setModelId}
                  />
                  {!hasKey && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfigModalOpen(true);
                      }}
                      className="w-full h-8 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Configure API Key
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Custom Endpoint */}
            {customProvider && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Custom Endpoint
                  </span>
                </div>
                <div
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer',
                    isCustom
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                  onClick={() => setProviderId('custom')}
                >
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    {customProvider.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {customProvider.description}
                  </p>

                  {isCustom && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                          Endpoint URL
                        </label>
                        <Input
                          type="url"
                          placeholder="http://localhost:11434"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                          Model Name
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. llama3.2, mistral, codellama"
                          value={customModelName}
                          onChange={(e) => setCustomModelName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                        Sends requests to <code className="font-mono text-foreground/60">{'{endpoint}'}/v1/chat/completions</code>.
                        Compatible with Ollama, vLLM, LM Studio, and any OpenAI-compatible API.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-border/40 bg-card flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" /> Keys stored locally
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigModalOpen(true)}
                className="h-8 text-xs"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Keys
              </Button>
              <Button
                onClick={handleStart}
                disabled={!canProceed}
                className="font-bold px-6 shadow-sm"
              >
                {isWebLLM ? 'Load Model' : 'Start Chat'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ProviderConfigModal
        open={configModalOpen}
        onClose={() => {
          setConfigModalOpen(false);
          if (keyMissing && getApiKey(providerId)) {
            setKeyMissing(false);
            completeSetup();
          }
        }}
      />
    </>
  );
}
