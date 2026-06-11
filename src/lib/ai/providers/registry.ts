// ============================================================================
// Provider Registry — Central registry of all supported AI providers
// ============================================================================

import type { ProviderDefinition, ProviderModel } from '../types';

// ---------------------------------------------------------------------------
// WebLLM Local Models
// ---------------------------------------------------------------------------

const WEBLLM_MODELS: ProviderModel[] = [
  // Premium tier (6-8 GB VRAM)
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC',
    name: 'Hermes 3 Llama 8B',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'premium',
    vramRequired: 8,
    description: 'Highest quality local model. Strong instruction following and reasoning.',
    tags: ['8B params', 'q4f32', 'Llama 3.1'],
    supportsToolCalling: false,
  },
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 8B (f16)',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'premium',
    vramRequired: 6,
    description: 'Top-tier quality with lower memory via half-precision quantization.',
    tags: ['8B params', 'q4f16', 'Llama 3.1'],
    supportsToolCalling: false,
  },
  {
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 7B Instruct',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'premium',
    vramRequired: 6,
    description: 'Excellent multilingual and code comprehension from Alibaba.',
    tags: ['7B params', 'q4f16', 'Qwen 2.5'],
    supportsToolCalling: false,
  },
  // Balanced tier (4-5 GB VRAM)
  {
    id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
    name: 'Hermes 2 Pro Mistral 7B',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'balanced',
    vramRequired: 5,
    description: 'Well-rounded model with strong structured output.',
    tags: ['7B params', 'q4f16', 'Mistral'],
    supportsToolCalling: false,
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'balanced',
    vramRequired: 4,
    description: 'Microsoft\'s compact model with strong reasoning per parameter.',
    tags: ['3.8B params', 'q4f16', 'Phi 3.5'],
    supportsToolCalling: false,
  },
  // Fast tier (3 GB VRAM)
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'fast',
    vramRequired: 3,
    description: 'Lightweight but capable. Great speed-to-quality ratio.',
    tags: ['3B params', 'q4f16', 'Qwen 2.5'],
    supportsToolCalling: false,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'fast',
    vramRequired: 3,
    description: 'Meta\'s efficient 3B model. Fast inference on modest hardware.',
    tags: ['3B params', 'q4f16', 'Llama 3.2'],
    supportsToolCalling: false,
  },
  // Local/Ultralight tier (1-2 GB VRAM)
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'local',
    vramRequired: 2,
    description: 'Ultra-compact. Runs on integrated graphics and mobile GPUs.',
    tags: ['1.5B params', 'q4f16', 'Qwen 2.5'],
    supportsToolCalling: false,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    contextWindow: 8192,
    maxOutput: 2048,
    tier: 'local',
    vramRequired: 1,
    description: 'Smallest available. For minimal hardware or quick prototyping.',
    tags: ['1B params', 'q4f16', 'Llama 3.2'],
    supportsToolCalling: false,
  },
];

export const LOCAL_MODEL_VRAM_MAP: Record<string, number> = {
  'Hermes-3-Llama-3.1-8B-q4f32_1-MLC': 8,
  'Hermes-3-Llama-3.1-8B-q4f16_1-MLC': 6,
  'Qwen2.5-7B-Instruct-q4f16_1-MLC': 6,
  'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC': 5,
  'Phi-3.5-mini-instruct-q4f16_1-MLC': 4,
  'Qwen2.5-3B-Instruct-q4f16_1-MLC': 3,
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': 3,
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 2,
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 1,
};

export const ENGINE_CONTEXT_TARGET = 8192;
export const ENGINE_CONTEXT_FALLBACK = 4096;
export const DEFAULT_LOCAL_MODEL_ID = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';

export function pickModelForVram(gb: number): string {
  const entries = Object.entries(LOCAL_MODEL_VRAM_MAP);
  const fit = entries.find(([, vram]) => vram <= gb);
  return fit ? fit[0] : entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// Provider Definitions
// ---------------------------------------------------------------------------

export const PROVIDERS: ProviderDefinition[] = [
  // --- WebLLM (Local) ---
  {
    id: 'webllm',
    name: 'Local (WebLLM)',
    description: 'Run AI locally in your browser via WebGPU. No API key required.',
    iconKey: 'Cpu',
    models: WEBLLM_MODELS,
    requiresKey: false,
    keyPlaceholder: '',
    docsUrl: '',
    supportsNativeTools: false,
  },

  // --- OpenAI ---
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, o-series reasoning, and GPT-4 Turbo models.',
    iconKey: 'openai',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        tier: 'fast',
        supportsToolCalling: true,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        contextWindow: 200000,
        maxOutput: 100000,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'o1',
        name: 'o1',
        contextWindow: 200000,
        maxOutput: 100000,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'o1-mini',
        name: 'o1-mini',
        contextWindow: 128000,
        maxOutput: 65536,
        tier: 'balanced',
        supportsToolCalling: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutput: 4096,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    keyPattern: /^sk-[a-zA-Z0-9_-]{20,}$/,
    docsUrl: 'https://platform.openai.com/api-keys',
    supportsNativeTools: true,
  },

  // --- Anthropic ---
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Opus, Sonnet, and Haiku with native tool use.',
    iconKey: 'anthropic',
    models: [
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200000,
        maxOutput: 32768,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 16384,
        tier: 'balanced',
        supportsToolCalling: true,
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        maxOutput: 8192,
        tier: 'fast',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
    keyPattern: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
    docsUrl: 'https://console.anthropic.com/settings/keys',
    supportsNativeTools: true,
  },

  // --- Google AI ---
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.5 Flash, Pro, and 2.0 Flash models.',
    iconKey: 'google',
    models: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        maxOutput: 65536,
        tier: 'fast',
        supportsToolCalling: true,
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextWindow: 1048576,
        maxOutput: 65536,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        maxOutput: 8192,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'AI...',
    keyPattern: /^AI[a-zA-Z0-9_-]{30,}$/,
    docsUrl: 'https://aistudio.google.com/apikey',
    supportsNativeTools: true,
  },

  // --- Groq ---
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference on Llama, Mixtral, and Gemma via LPU hardware.',
    iconKey: 'groq',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 128000,
        maxOutput: 32768,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        contextWindow: 128000,
        maxOutput: 8192,
        tier: 'fast',
        supportsToolCalling: true,
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextWindow: 32768,
        maxOutput: 32768,
        tier: 'balanced',
        supportsToolCalling: true,
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        contextWindow: 8192,
        maxOutput: 8192,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    keyPattern: /^gsk_[a-zA-Z0-9]{20,}$/,
    docsUrl: 'https://console.groq.com/keys',
    supportsNativeTools: true,
  },

  // --- Mistral ---
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Small, Nemo, and Codestral models.',
    iconKey: 'mistral',
    models: [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        contextWindow: 128000,
        maxOutput: 8192,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        contextWindow: 128000,
        maxOutput: 8192,
        tier: 'fast',
        supportsToolCalling: true,
      },
      {
        id: 'open-mistral-nemo',
        name: 'Mistral Nemo',
        contextWindow: 128000,
        maxOutput: 8192,
        tier: 'balanced',
        supportsToolCalling: true,
      },
      {
        id: 'codestral-latest',
        name: 'Codestral',
        contextWindow: 32768,
        maxOutput: 8192,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'API key',
    docsUrl: 'https://console.mistral.ai/api-keys',
    supportsNativeTools: true,
  },

  // --- OpenRouter ---
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models from multiple providers with a single API key.',
    iconKey: 'openrouter',
    models: [
      {
        id: 'anthropic/claude-opus-4',
        name: 'Claude Opus 4 (via OR)',
        contextWindow: 200000,
        maxOutput: 32768,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4 (via OR)',
        contextWindow: 200000,
        maxOutput: 16384,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o (via OR)',
        contextWindow: 128000,
        maxOutput: 16384,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash (via OR)',
        contextWindow: 1048576,
        maxOutput: 65536,
        tier: 'fast',
        supportsToolCalling: true,
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro (via OR)',
        contextWindow: 1048576,
        maxOutput: 65536,
        tier: 'premium',
        supportsToolCalling: true,
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B (via OR)',
        contextWindow: 128000,
        maxOutput: 32768,
        tier: 'balanced',
        supportsToolCalling: true,
      },
      {
        id: 'mistralai/mistral-large-latest',
        name: 'Mistral Large (via OR)',
        contextWindow: 128000,
        maxOutput: 8192,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-or-...',
    keyPattern: /^sk-or-[a-zA-Z0-9_-]{20,}$/,
    docsUrl: 'https://openrouter.ai/keys',
    supportsNativeTools: true,
  },

  // --- Custom OpenAI-Compatible ---
  {
    id: 'custom',
    name: 'Custom Endpoint',
    description: 'Connect any OpenAI-compatible API (vLLM, Ollama, LM Studio, etc.).',
    iconKey: 'Settings',
    models: [
      {
        id: 'custom-model',
        name: 'Default',
        contextWindow: 32768,
        maxOutput: 4096,
        tier: 'balanced',
        supportsToolCalling: true,
      },
    ],
    requiresKey: false,
    keyPlaceholder: 'API key (optional)',
    docsUrl: '',
    supportsNativeTools: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getProvider(id: string): ProviderDefinition | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProviderModel(
  providerId: string,
  modelId: string,
): ProviderModel | undefined {
  const provider = getProvider(providerId);
  return provider?.models.find((m) => m.id === modelId);
}

export function getCloudProviders(): ProviderDefinition[] {
  return PROVIDERS.filter((p) => p.requiresKey);
}

export function getDefaultModel(providerId: string): string {
  const provider = getProvider(providerId);
  if (!provider || provider.models.length === 0) return '';
  return provider.models[0].id;
}
