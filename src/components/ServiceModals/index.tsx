/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api } from "../../lib/auth";
import { Button, Dialog, Spinner, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "../Core";
import {
  Copy,
  Key,
  Server,
  Globe,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  EyeOff,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/axiosError";
import { useServiceModal } from "./context";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Snippet Generators (pure functions — no component state needed)
// ---------------------------------------------------------------------------

const getServerSnippet = (method: string, vpsId?: string, apiKey?: string) => {
  switch (method) {
    case "Quick Install":
      return `export SERVER_ID="${vpsId}" && export API_KEY="${apiKey}" && \\\ncurl -fsSL https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh | sudo -E bash -`;
    case "Interactive":
      return `curl -fsSLO https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh\nchmod +x install_agent.sh\nsudo bash install_agent.sh\n\n# When prompted, enter:\n#   Server ID: ${vpsId}\n#   API Key:   ${apiKey}`;
    case "Docker Compose":
      return `services:\n  senzor:\n    image: ghcr.io/senzops/server-agent:latest\n    container_name: senzor\n    restart: unless-stopped\n    network_mode: "host"\n    pid: "host"\n    volumes:\n      - /:/host/root:ro\n      - /sys:/host/sys:ro\n      - /proc:/host/proc:ro\n      - /etc/os-release:/etc/os-release:ro\n      - /etc/hostname:/etc/hostname:ro\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n    environment:\n      - SERVER_ID=${vpsId}\n      - API_KEY=${apiKey}\n      - API_ENDPOINT=https://api.senzor.dev/api/ingest/stats\n      - INTERVAL=60`;
    default:
      return "";
  }
};

const getWebSnippet = (method: string, webId?: string) => {
  switch (method) {
    case "CDN Script":
      return `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>\n  window.Senzor.init({ webId: "${webId}" });\n\n  // Track custom events anywhere in your app\n  window.Senzor.track("Signup", { plan: "pro" });\n</script>`;
    case "NPM Package":
      return `npm install @senzops/web\n\nimport { Senzor } from "@senzops/web";\n\nSenzor.init({\n  webId: "${webId}",\n});\n\n// Track custom events anywhere in your app\nSenzor.track("Signup", { plan: "pro" });`;
    default:
      return "";
  }
};

const getRumSnippet = (method: string, apiKey?: string) => {
  switch (method) {
    case "CDN Script":
      return `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>\n  window.Senzor.initRum({\n    apiKey: "${apiKey}",\n    sampleRate: 1.0,\n    allowedOrigins: ["https://api.yourbackend.com"]\n  });\n</script>`;
    case "NPM Package":
      return `npm install @senzops/web\n\nimport { Senzor } from "@senzops/web";\n\nSenzor.initRum({\n  apiKey: "${apiKey}",\n  sampleRate: 1.0,\n  allowedOrigins: ["https://api.yourbackend.com"],\n});`;
    default:
      return "";
  }
};

const getApmSnippet = (framework: string, apiKey?: string) => {
  switch (framework) {
    case "Express":
      return `npm install @senzops/apm-node\n\nconst senzor = require('@senzops/apm-node');\nsenzor.init({ apiKey: "${apiKey}" });\n\n// 1. Request Handler (First)\napp.use(senzor.requestHandler());\n\n// ... your routes ...\n\n// 2. Error Handler (Last)\napp.use(senzor.errorHandler());`;
    case "Next.js (App)":
      return `npm install @senzops/apm-node\n\n// app/api/route.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nexport const GET = Senzor.wrapNextRoute(async (req) => {\n  return Response.json({ ok: true });\n});`;
    case "Next.js (Pages)":
      return `npm install @senzops/apm-node\n\n// pages/api/hello.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nconst handler = (req, res) => res.json({ ok: true });\nexport default Senzor.wrapNextPages(handler);`;
    case "Fastify":
      return `npm install @senzops/apm-node\n\nimport {Senzor} from '@senzops/apm-node';\n\nfastify.register(Senzor.fastifyPlugin, {\n  apiKey: "${apiKey}"\n});`;
    case "NestJS":
      return `npm install @senzops/apm-node\n\n// main.ts\nimport {Senzor} from '@senzops/apm-node';\n\nasync function bootstrap() {\n  Senzor.init({ apiKey: "${apiKey}" });\n  const app = await NestFactory.create(AppModule);\n  app.use(Senzor.requestHandler());\n  await app.listen(3000);\n}`;
    case "Nuxt / Nitro":
      return `npm install @senzops/apm-node\n\n// server/middleware/senzor.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nexport default Senzor.wrapH3(defineEventHandler((event) => {\n  // Your logic\n}));`;
    case "Nitro + CloudFlare worker":
      return `npm install @senzops/apm-node\n\n// server/plugins/senzor.ts\nimport { Senzor } from "@senzops/apm-node";\n\nexport default defineNitroPlugin((nitroApp) => {\n  Senzor.init({\n    apiKey: "${apiKey}",\n  });\n\n  Senzor.nitroPlugin(nitroApp);\n});`;
    case "Lambda (Layer)":
      return `# Zero Code Changes — Senzor Lambda Extension Layer\n\n# 1. Create the layer\nmkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs\nnpm init -y && npm install @senzops/apm-node\ncd .. && zip -r senzor-apm-layer.zip nodejs/\n\n# 2. Publish the layer\naws lambda publish-layer-version \\\n  --layer-name senzor-apm-node \\\n  --zip-file fileb://senzor-apm-layer.zip \\\n  --compatible-runtimes nodejs18.x nodejs20.x nodejs22.x\n\n# 3. Configure your Lambda function\naws lambda update-function-configuration \\\n  --function-name <YOUR_FUNCTION> \\\n  --layers <LAYER_ARN> \\\n  --handler @senzops/apm-node/dist/lambda-handler.handler \\\n  --environment Variables="{\\\n    SENZOR_API_KEY=${apiKey},\\\n    SENZOR_LAMBDA_HANDLER=index.handler,\\\n    NODE_OPTIONS=--require @senzops/apm-node/register\\\n  }"`;
    case "Lambda (CDK)":
      return `import * as lambda from 'aws-cdk-lib/aws-lambda';\nimport * as path from 'path';\n\nconst senzorLayer = new lambda.LayerVersion(this, 'SenzorApmLayer', {\n  code: lambda.Code.fromAsset(path.join(__dirname, 'senzor-layer')),\n  compatibleRuntimes: [\n    lambda.Runtime.NODEJS_18_X,\n    lambda.Runtime.NODEJS_20_X,\n  ],\n  description: 'Senzor APM Lambda Extension Layer',\n});\n\nconst fn = new lambda.Function(this, 'MyFunction', {\n  runtime: lambda.Runtime.NODEJS_20_X,\n  handler: '@senzops/apm-node/dist/lambda-handler.handler',\n  code: lambda.Code.fromAsset('lambda'),\n  layers: [senzorLayer],\n  environment: {\n    SENZOR_API_KEY: '${apiKey}',\n    SENZOR_LAMBDA_HANDLER: 'index.handler',\n    NODE_OPTIONS: '--require @senzops/apm-node/register',\n  },\n});`;
    case "Lambda (Code)":
      return `npm install @senzops/apm-node\n\n// handler.ts\nimport { Senzor } from '@senzops/apm-node';\n\nSenzor.init({ apiKey: "${apiKey}" });\n\nexport const handler = Senzor.wrapLambda(async (event, context) => {\n  // Your Lambda logic\n  return { statusCode: 200, body: JSON.stringify({ ok: true }) };\n});`;
    default:
      return "";
  }
};

const getTaskSnippet = (apiKey?: string) => {
  return `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// Initialize as early as possible in your worker entry file\nSenzor.init({\n  apiKey: "${apiKey}"\n});\n\n// BullMQ and Node-Cron are now automatically instrumented!`;
};

const getAiSnippet = (apiKey?: string, type: string = "server") => {
  if (type === "browser") {
    return `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// AI Monitoring sources have their own key — pass it under \`ai\`.\nSenzor.init({ ai: { apiKey: "${apiKey}" } });\n\n// Wrap an in-browser model (e.g. WebLLM) — content capture stays off in the browser\nawait Senzor.ai.wrapGeneration(\n  { provider: 'webllm', model: 'Llama-3-8B', operation: 'chat' },\n  () => engine.chat.completions.create({ messages })\n);`;
  }
  return `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// Initialize as early as possible in your entry file.\n// Already using Senzor APM/Task? Keep your existing apiKey and just add \`ai\`.\nSenzor.init({\n  ai: { apiKey: "${apiKey}", captureContent: false } // captureContent: opt-in to store prompts/outputs\n});\n\n// OpenAI, Anthropic, Gemini, etc. are auto-instrumented.\n// Or monitor ANY model manually:\nawait Senzor.ai.wrapGeneration(\n  {\n    provider: 'openai', model: 'gpt-4o', operation: 'chat',\n    extract: (r) => ({ tokensIn: r.usage.prompt_tokens, tokensOut: r.usage.completion_tokens })\n  },\n  () => openai.chat.completions.create({ model: 'gpt-4o', messages })\n);`;
};

const getCollectorEnv = (system: string, apiKey: string) => {
  const base = `SENZOR_API_ENDPOINT=https://api.senzor.dev\nSENZOR_QUEUE_API_KEY=${apiKey}\nSENZOR_QUEUE_SYSTEM=${system}`;
  const perSystem: Record<string, string> = {
    bullmq: `\nSENZOR_QUEUE_REDIS_URL=redis://:password@host:6379/0\nSENZOR_QUEUE_PREFIX=bull`,
    rabbitmq: `\nSENZOR_QUEUE_RABBIT_API_URL=http://host:15672\nSENZOR_QUEUE_RABBIT_USER=guest\nSENZOR_QUEUE_RABBIT_PASS=********`,
    kafka: `\nSENZOR_QUEUE_KAFKA_BROKERS=broker1:9092,broker2:9092\nSENZOR_QUEUE_KAFKA_SSL=false`,
    sqs: `\nAWS_REGION=us-east-1\nAWS_ACCESS_KEY_ID=AKIA...\nAWS_SECRET_ACCESS_KEY=********`,
  };
  return `${base}${perSystem[system] || ""}\n\n# Then run the Senzor queue collector in your infrastructure:\n# node dist/collector/queue.js`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ServiceModals: React.FC = () => {
  const router = useRouter();
  const ctx = useServiceModal();
  const {
    activeModal,
    mode,
    editData,
    closeModal,
    name,
    setName,
    domain,
    setDomain,
    domains,
    setDomains,
    url,
    setUrl,
    interval,
    setInterval,
    dbType,
    setDbType,
    description,
    setDescription,
    showUri,
    setShowUri,
    creds,
    setCreds,
    loading,
    setLoading,
    error,
    setError,
    isQuotaError,
    setIsQuotaError,
    selectedFramework,
    setSelectedFramework,
    selectedServerMethod,
    setSelectedServerMethod,
    selectedWebMethod,
    setSelectedWebMethod,
    monitorMethod,
    setMonitorMethod,
    monitorHeaders,
    setMonitorHeaders,
    monitorBody,
    setMonitorBody,
    monitorExpectedStatus,
    setMonitorExpectedStatus,
    selectedRumMethod,
    setSelectedRumMethod,
    mutateFns,
  } = ctx;

  const isEdit = mode === "edit";
  const apmTabsRef = useRef<HTMLDivElement>(null);

  // Queue-modal-local fields (not part of the shared form state).
  const [queueSystem, setQueueSystem] = useState<string>("bullmq");
  const [queueMode, setQueueMode] = useState<"agentless" | "collector">("agentless");
  const [qc, setQc] = useState<Record<string, any>>({ prefix: "bull", vhost: "/", ssl: false });
  const [queueFilter, setQueueFilter] = useState("");
  const [queueMgmtUrl, setQueueMgmtUrl] = useState("");
  const [collectorResult, setCollectorResult] = useState<{ apiKey: string } | null>(null);
  const setQcField = (k: string, v: any) => setQc((p) => ({ ...p, [k]: v }));

  // AI monitoring source type (server vs in-browser).
  const [aiType, setAiType] = useState<"server" | "browser">("server");
  const [aiCaptureContent, setAiCaptureContent] = useState(false);
  const [aiSampleRate, setAiSampleRate] = useState("1");
  const [aiMaskingRules, setAiMaskingRules] = useState("");
  const [aiManagementUrl, setAiManagementUrl] = useState("");

  // Sync AI settings into the form whenever the AI modal opens in edit mode.
  React.useEffect(() => {
    if (activeModal !== "ai") return;
    if (mode === "edit" && editData) {
      const s = (editData as any).aiSettings || {};
      setAiType(((editData as any).aiType as "server" | "browser") || "server");
      setAiCaptureContent(!!s.captureContent);
      setAiSampleRate(String(s.sampleRate ?? 1));
      setAiMaskingRules(Array.isArray(s.maskingRules) ? s.maskingRules.join(", ") : "");
      setAiManagementUrl((editData as any).managementUrl || "");
    } else if (mode === "register") {
      setAiType("server");
      setAiCaptureContent(false);
      setAiSampleRate("1");
      setAiMaskingRules("");
      setAiManagementUrl("");
    }
  }, [activeModal, mode, editData]);

  // Sync queue-specific fields whenever the queue modal opens.
  useEffect(() => {
    if (activeModal !== "queue") return;
    setCollectorResult(null);
    if (mode === "edit" && editData) {
      setQueueSystem(editData.system || "bullmq");
      setQueueMode((editData.mode as any) || "agentless");
      const meta: Record<string, any> = { ...(editData.connectionMeta || {}) };
      if (Array.isArray(meta.brokers)) meta.brokers = meta.brokers.join("\n");
      setQc(meta);
      setQueueFilter(editData.queueFilter || "");
      setQueueMgmtUrl(editData.managementUrl || "");
    } else {
      setQueueSystem("bullmq");
      setQueueMode("agentless");
      setQc({ prefix: "bull", vhost: "/", ssl: false });
      setQueueFilter("");
      setQueueMgmtUrl("");
      setInterval("1");
    }
  }, [activeModal, mode, editData, setInterval]);

  const scrollApmTabs = (direction: "left" | "right") => {
    if (!apmTabsRef.current) return;
    const amount = 160;
    apmTabsRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  // =======================================================================
  // Shared error helper — detects 402 quota limits and sets both states
  // =======================================================================

  const handleApiError = (e: any, fallback: string) => {
    const status = e?.response?.status;
    const code = e?.response?.data?.code;
    const isQuota = status === 402 && (code === "SERVICE_LIMIT_EXCEEDED" || code === "ORG_LIMIT_EXCEEDED" || code === "PLAN_INTERVAL_RESTRICTED");
    setIsQuotaError(isQuota);
    setError(isQuota
      ? (e.response.data.details || e.response.data.error || fallback)
      : extractErrorMessage(e, fallback)
    );
  };

  // =======================================================================
  // Handlers
  // =======================================================================

  const handleServerSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        await api.put(`/vps/${editData.id}`, { name: name.trim() });
        await editData.onSuccess?.();
        closeModal();
        toast.success("Server updated");
      } else {
        const res = await api.post("/vps/register", { name: name.trim() });
        setCreds(res.data);
        setName("");
        mutateFns.server?.();
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update server" : "Failed to register server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWebSubmit = async () => {
    if (isEdit) {
      if (!name.trim() && !domain.trim()) return;
    } else {
      if (!name.trim() || !domain.trim()) return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = {};
        if (name.trim()) body.name = name.trim();
        if (domain.trim()) body.domain = domain.trim();
        await api.put(`/web/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Website updated");
      } else {
        const res = await api.post("/web/register", {
          name: name.trim(),
          domain: domain.trim(),
        });
        setCreds(res.data);
        setName("");
        setDomain("");
        mutateFns.web?.();
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update website" : "Failed to register website. Check domain format.");
    } finally {
      setLoading(false);
    }
  };

  const handleRumSubmit = async () => {
    if (isEdit) {
      if (!name.trim() && !domains.trim()) return;
    } else {
      if (!name.trim() || !domains.trim()) return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = {};
        if (name.trim()) body.name = name.trim();
        if (domains.trim()) body.domains = domains.trim();
        await api.put(`/rum/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("RUM service updated");
      } else {
        const res = await api.post("/rum/register", {
          name: name.trim(),
          domains: domains.trim(),
        });
        setCreds(res.data);
        setName("");
        setDomains("");
        mutateFns.rum?.();
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update RUM service" : "Failed to register RUM. Check domain format.");
    } finally {
      setLoading(false);
    }
  };

  const parseMonitorHeaders = (): Record<string, string> => {
    if (!monitorHeaders.trim()) return {};
    try {
      const parsed = JSON.parse(monitorHeaders);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
    return {};
  };

  const handleMonitorSubmit = async () => {
    if (isEdit) {
      if (!name.trim() && !url.trim() && !interval) return;
    } else {
      if (!name.trim() || !url.trim()) return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = parseMonitorHeaders();
      const expectedStatus = monitorExpectedStatus ? parseInt(monitorExpectedStatus, 10) : 0;

      if (isEdit && editData?.id) {
        const payload: any = {};
        if (name.trim()) payload.name = name.trim();
        if (url.trim()) payload.url = url.trim();
        if (interval) payload.interval = interval;
        if (monitorMethod) payload.method = monitorMethod;
        if (monitorHeaders.trim()) payload.headers = headers;
        if (monitorBody.trim()) payload.body = monitorBody.trim();
        if (expectedStatus) payload.expectedStatus = expectedStatus;
        await api.put(`/uptime/${editData.id}`, payload);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Monitor updated");
      } else {
        await api.post("/uptime/register", {
          name: name.trim(),
          url: url.trim(),
          interval,
          method: monitorMethod,
          headers,
          body: monitorBody.trim(),
          expectedStatus,
        });
        setName("");
        setUrl("");
        closeModal();
        mutateFns.monitor?.();
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update monitor" : "Failed to create monitor. Ensure URL is valid.");
    } finally {
      setLoading(false);
    }
  };

  const handleApmSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = { name: name.trim() };
        if (selectedFramework) body.framework = selectedFramework;
        await api.put(`/apm/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("APM service updated");
      } else {
        const res = await api.post("/apm/register", { name: name.trim() });
        setCreds(res.data);
        setName("");
        mutateFns.apm?.();
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update APM service" : "Failed to register APM service.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        await api.put(`/task/${editData.id}`, { name: name.trim() });
        await editData.onSuccess?.();
        closeModal();
        toast.success("Task service updated");
      } else {
        const res = await api.post("/task/register", { name: name.trim() });
        setCreds(res.data);
        setName("");
        mutateFns.task?.();
        toast.success("Task Environment Registered!");
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update task service" : "Failed to create task environment.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        await api.put(`/ai/observability/${editData.id}`, {
          name: name.trim(),
          managementUrl: aiManagementUrl,
          settings: {
            captureContent: (editData as any).aiType === "browser" ? false : aiCaptureContent,
            sampleRate: Math.max(0, Math.min(1, parseFloat(aiSampleRate) || 1)),
            maskingRules: aiMaskingRules.split(",").map((s) => s.trim()).filter(Boolean),
          },
        });
        await editData.onSuccess?.();
        closeModal();
        toast.success("AI source updated");
      } else {
        const res = await api.post("/ai/observability/register", {
          name: name.trim(),
          type: aiType,
        });
        setCreds(res.data);
        setName("");
        mutateFns.ai?.();
        toast.success("AI source registered!");
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update AI source" : "Failed to register AI source.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseSubmit = async () => {
    if (isEdit) {
      if (!name.trim() && !interval) return;
    } else {
      if (!name.trim() || !url.trim()) return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = {};
        if (name.trim()) body.name = name.trim();
        if (url.trim()) body.serviceAccount = url.trim();
        if (interval) body.interval = Number(interval);
        await api.put(`/firebase/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Firebase project updated");
      } else {
        await api.post("/firebase/register", {
          name: name.trim(),
          serviceAccount: url.trim(),
          interval: Number(interval),
        });
        setName("");
        setUrl("");
        closeModal();
        mutateFns.firebase?.();
        toast.success("Firebase Project Connected!");
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update Firebase project" : "Failed to connect Firebase project.");
    } finally {
      setLoading(false);
    }
  };

  const handleDbSubmit = async () => {
    if (isEdit) {
      // In edit mode, at least one field needed (uri can be blank = keep current)
      if (!name.trim() && !dbType && !interval) return;
    } else {
      if (!name.trim() || !url.trim()) return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = {};
        if (name.trim()) body.name = name.trim();
        if (dbType) body.type = dbType;
        if (url.trim()) body.uri = url.trim();
        if (interval) body.interval = Number(interval);
        await api.put(`/database/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Database updated");
      } else {
        await api.post("/database/register", {
          name: name.trim(),
          type: dbType,
          uri: url.trim(),
          interval: Number(interval),
        });
        setName("");
        setUrl("");
        closeModal();
        mutateFns.database?.();
        toast.success("Database Connected & Monitored!");
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update database" : "Failed to connect database.");
    } finally {
      setLoading(false);
    }
  };

  // Build a broker-specific connection object from the local form state.
  // In edit mode, empty values are dropped so unchanged secrets (never sent
  // back to the client) are preserved server-side via a merge.
  const buildQueueConnection = (): Record<string, any> => {
    const t = (v: any) => (typeof v === "string" ? v.trim() : v);
    switch (queueSystem) {
      case "bullmq":
        return { uri: t(qc.uri), prefix: t(qc.prefix) || "bull" };
      case "rabbitmq":
        return { apiUrl: t(qc.apiUrl), username: t(qc.username), password: t(qc.password), vhost: t(qc.vhost) || "/" };
      case "kafka":
        return {
          brokers: String(qc.brokers || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
          ssl: Boolean(qc.ssl),
          saslMechanism: qc.saslMechanism || undefined,
          username: t(qc.username) || undefined,
          password: t(qc.password) || undefined,
        };
      case "sqs":
        return { region: t(qc.region), accessKeyId: t(qc.accessKeyId), secretAccessKey: t(qc.secretAccessKey) };
      default:
        return {};
    }
  };

  const handleQueueSubmit = async () => {
    if (!isEdit && !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const filterArr = queueFilter
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      // Collector (push) mode — no server-side connection; issue/keep an API key.
      if (queueMode === "collector") {
        if (isEdit && editData?.id) {
          const body: any = { queueFilter: filterArr, managementUrl: queueMgmtUrl.trim() };
          if (name.trim()) body.name = name.trim();
          if (interval) body.interval = Number(interval);
          await api.put(`/queue/${editData.id}`, body);
          await editData.onSuccess?.();
          closeModal();
          toast.success("Queue collector updated");
        } else {
          const res = await api.post("/queue/register", {
            name: name.trim(),
            system: queueSystem,
            mode: "collector",
            managementUrl: queueMgmtUrl.trim() || undefined,
            queueFilter: filterArr,
            interval: Number(interval),
          });
          mutateFns.queue?.();
          setCollectorResult({ apiKey: res.data.apiKey });
          toast.success("Collector registered — copy your key");
        }
        return;
      }

      let connection = buildQueueConnection();
      // In edit mode, strip empty values so we don't clobber stored secrets.
      if (isEdit) {
        connection = Object.fromEntries(
          Object.entries(connection).filter(([, v]) =>
            Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined && v !== null
          )
        );
      }

      if (isEdit && editData?.id) {
        const body: any = { queueFilter: filterArr, managementUrl: queueMgmtUrl.trim() };
        if (name.trim()) body.name = name.trim();
        if (interval) body.interval = Number(interval);
        if (Object.keys(connection).length > 0) body.connection = connection;
        await api.put(`/queue/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Queue source updated");
      } else {
        await api.post("/queue/register", {
          name: name.trim(),
          system: queueSystem,
          connection,
          managementUrl: queueMgmtUrl.trim() || undefined,
          queueFilter: filterArr,
          interval: Number(interval),
        });
        closeModal();
        mutateFns.queue?.();
        toast.success("Queue Source Connected & Monitored!");
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update queue source" : "Failed to connect queue source.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        const body: any = { name: name.trim() };
        if (description.trim()) body.description = description.trim();
        else body.description = "";
        await api.put(`/views/${editData.id}`, body);
        await editData.onSuccess?.();
        closeModal();
        toast.success("Dashboard updated");
      } else {
        const res = await api.post("/views", {
          name: name.trim(),
          description: description.trim(),
        });
        setName("");
        setDescription("");
        closeModal();
        mutateFns.view?.();
        toast.success("Dashboard created!");
        router.push(`/dashboard/views/${res.data.view._id}`);
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update dashboard" : "Failed to create dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleBoardSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && editData?.id) {
        await api.put(`/monitor-board/${editData.id}`, {
          name: name.trim(),
          description: description.trim(),
        });
        await editData.onSuccess?.();
        closeModal();
        toast.success("Board updated");
      } else {
        const res = await api.post("/monitor-board", {
          name: name.trim(),
          description: description.trim(),
        });
        setName("");
        setDescription("");
        closeModal();
        mutateFns.board?.();
        toast.success("Status board created!");
        router.push(`/dashboard/monitor/board/${res.data.board._id}`);
      }
    } catch (e: any) {
      handleApiError(e, isEdit ? "Failed to update board" : "Failed to create board.");
    } finally {
      setLoading(false);
    }
  };

  // =======================================================================
  // Shared UI fragments
  // =======================================================================

  const ErrorBanner = () => {
    if (!error) return null;

    if (isQuotaError) {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm leading-relaxed shadow-sm">
          <strong className="block text-amber-600 dark:text-amber-500 font-bold mb-1">Plan Limit Reached</strong>
          <p className="text-amber-700/80 dark:text-amber-400/70">{error}</p>
          <Link href="/pricing">
            <Button variant="outline" size="sm" className="mt-3 font-semibold text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> View Plans & Upgrade
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  };

  const CopyButton = ({ text }: { text: string }) => (
    <Button
      size="icon"
      variant="ghost"
      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("Copied!");
      }}
    >
      <Copy className="h-3 w-3" />
    </Button>
  );

  // =======================================================================
  // Render
  // =======================================================================

  return (
    <>
      {/* ================================================================= */}
      {/* SAVED VIEW MODAL                                                  */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "view"}
        onClose={closeModal}
        title={isEdit ? "Edit Dashboard" : "Create Custom Dashboard"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          <div className="space-y-2">
            <label className="text-sm font-medium">Dashboard Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all"
              placeholder="e.g. Master Production Overview"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all"
              placeholder="Describe the purpose of this view..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleViewSubmit}
              disabled={loading || !name.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />{" "}
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Create Canvas"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================= */}
      {/* STATUS BOARD MODAL                                                */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "board"}
        onClose={closeModal}
        title={isEdit ? "Edit Status Board" : "Create Status Board"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          <p className="text-sm text-muted-foreground">
            A status board groups your uptime monitors into one shareable dashboard.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Board Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. Production Status"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="What does this board track?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleBoardSubmit}
              disabled={loading || !name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Create Board"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================= */}
      {/* SERVER MODAL                                                      */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "server"}
        onClose={closeModal}
        title={isEdit ? "Edit Server" : "Connect New Server"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Production DB 01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleServerSubmit}
                disabled={loading || !name.trim()}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Generating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Generate Credentials"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Server className="h-3 w-3" /> Server ID
                </label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                  {creds.vpsId}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" /> API Key
                </label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                  {creds.apiKey}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="flex items-center border-b border-border/50 overflow-x-auto no-scrollbar">
                {["Interactive", "Quick Install", "Docker Compose"].map(
                  (method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedServerMethod(method)}
                      className={cn(
                        "px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                        selectedServerMethod === method
                          ? "border-emerald-500 text-emerald-500"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-emerald-400 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getServerSnippet(
                    selectedServerMethod,
                    creds.vpsId,
                    creds.apiKey,
                  )}
                </pre>
                <CopyButton
                  text={getServerSnippet(
                    selectedServerMethod,
                    creds.vpsId,
                    creds.apiKey,
                  )}
                />
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-3 rounded-md">
              <span className="font-bold">Important:</span> This API Key will
              only be shown once. Please keep this window open until installation
              is complete.
            </div>
            <Button className="w-full" onClick={closeModal}>
              I have completed installation
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* WEB MODAL                                                         */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "web"}
        onClose={closeModal}
        title={isEdit ? "Edit Website" : "Track New Website"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Website Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. My Portfolio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. senzor.dev"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleWebSubmit}
                disabled={
                  loading ||
                  (isEdit
                    ? !name.trim() && !domain.trim()
                    : !name.trim() || !domain.trim())
                }
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Creating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Get Snippet"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Web ID
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                {creds.webId}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="flex items-center border-b border-border/50">
                {["CDN Script", "NPM Package"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedWebMethod(method)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                      selectedWebMethod === method
                        ? "border-blue-500 text-blue-500"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-blue-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getWebSnippet(selectedWebMethod, creds.webId)}
                </pre>
                <CopyButton
                  text={getWebSnippet(selectedWebMethod, creds.webId)}
                />
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* RUM MODAL                                                         */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "rum"}
        onClose={closeModal}
        title={isEdit ? "Edit Web APM (RUM)" : "Connect Web APM (RUM)"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Application Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                placeholder="e.g. Frontend - Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                Allowed Domains{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  Comma separated
                </span>
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                placeholder="e.g. senzor.dev, senzor.com"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                We strictly reject telemetry from unknown domains. Subdomains
                are automatically included.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleRumSubmit}
                disabled={
                  loading ||
                  (isEdit
                    ? !name.trim() && !domains.trim()
                    : !name.trim() || !domains.trim())
                }
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Creating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Generate SDK Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> RUM API Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-pink-500">
                {creds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="flex items-center border-b border-border/50">
                {["CDN Script", "NPM Package"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedRumMethod(method)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                      selectedRumMethod === method
                        ? "border-pink-500 text-pink-500"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-pink-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getRumSnippet(selectedRumMethod, creds.apiKey)}
                </pre>
                <CopyButton
                  text={getRumSnippet(selectedRumMethod, creds.apiKey)}
                />
              </div>
            </div>
            <div className="bg-pink-500/10 border border-pink-500/20 text-pink-500 text-xs p-3 rounded-md">
              Tip: Ensure allowedOrigins matches your backend API to enable full
              Distributed Tracing.
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* APM MODAL                                                         */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "apm"}
        onClose={closeModal}
        title={isEdit ? "Edit API Service" : "Connect API Service"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Auth Microservice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={loading}
                maxLength={50}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleApmSubmit}
                disabled={loading || !name.trim()}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Generating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> Service Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-orange-500">
                {creds.apiKey}
              </div>
            </div>
            {/* FRAMEWORK SELECTOR */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="relative flex items-center">
                <button
                  onClick={() => scrollApmTabs("left")}
                  className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-card via-card/80 to-transparent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div
                  ref={apmTabsRef}
                  className="flex items-center border-b border-border/50 overflow-x-auto no-scrollbar px-6"
                >
                  {[
                    "Express",
                    "Next.js (App)",
                    "Next.js (Pages)",
                    "Fastify",
                    "NestJS",
                    "Nuxt / Nitro",
                    "Nitro + CloudFlare worker",
                    "Lambda (Layer)",
                    "Lambda (CDK)",
                    "Lambda (Code)",
                  ].map((fw) => (
                    <button
                      key={fw}
                      onClick={() => setSelectedFramework(fw)}
                      className={cn(
                        "px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                        selectedFramework === fw
                          ? "border-orange-500 text-orange-500"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => scrollApmTabs("right")}
                  className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-card via-card/80 to-transparent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-orange-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getApmSnippet(selectedFramework, creds.apiKey)}
                </pre>
                <CopyButton
                  text={getApmSnippet(selectedFramework, creds.apiKey)}
                />
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* TASK MODAL                                                        */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "task"}
        onClose={closeModal}
        title={isEdit ? "Edit Background Tasks" : "Connect Background Tasks"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Production Background Workers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={loading}
                maxLength={50}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleTaskSubmit}
                disabled={loading || !name.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Generating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> Service Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-indigo-500">
                {creds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-indigo-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getTaskSnippet(creds.apiKey)}
                </pre>
                <CopyButton text={getTaskSnippet(creds.apiKey)} />
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* AI MONITORING MODAL                                               */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "ai"}
        onClose={closeModal}
        title={isEdit ? "Edit AI Source" : "Connect AI Monitoring"}
      >
        {!creds || isEdit ? (
          <div className="space-y-4">
            <ErrorBanner />
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                placeholder="e.g. Production LLM App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={loading}
                maxLength={50}
              />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "server", label: "Server / Backend" },
                    { v: "browser", label: "Browser (WebLLM)" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setAiType(opt.v)}
                      className={`rounded-md border px-3 py-2 text-sm transition-all ${
                        aiType === opt.v
                          ? "border-violet-500 bg-violet-500/10 text-violet-500"
                          : "border-input text-muted-foreground hover:border-violet-500/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Browser sources never store prompt/output content for privacy.
                </p>
              </div>
            )}
            {isEdit && (
              <>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-input p-3">
                  <div>
                    <p className="text-sm font-medium">Capture prompts &amp; outputs</p>
                    <p className="text-xs text-muted-foreground">
                      {editData?.aiType === "browser"
                        ? "Disabled for browser sources for privacy."
                        : "Stores masked prompts, outputs and tool arguments for debugging. Off by default. Also requires the SDK to send content: set ai.captureContent: true in Senzor.init()."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={editData?.aiType === "browser"}
                    onClick={() => setAiCaptureContent((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aiCaptureContent && editData?.aiType !== "browser" ? "bg-violet-500" : "bg-muted"} ${editData?.aiType === "browser" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${aiCaptureContent && editData?.aiType !== "browser" ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sample rate (0–1)</label>
                  <input
                    type="number" min="0" max="1" step="0.05"
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
                    value={aiSampleRate}
                    onChange={(e) => setAiSampleRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Masking rules</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
                    placeholder="email, ssn, address"
                    value={aiMaskingRules}
                    onChange={(e) => setAiMaskingRules(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated field names to redact from captured content.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Management URL (optional)</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
                    placeholder="https://platform.openai.com/usage"
                    value={aiManagementUrl}
                    onChange={(e) => setAiManagementUrl(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleAiSubmit}
                disabled={loading || !name.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />{" "}
                    {isEdit ? "Updating..." : "Generating..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> Source Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-violet-500">
                {creds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Install &amp; Configure</label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-violet-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getAiSnippet(creds.apiKey, aiType)}
                </pre>
                <CopyButton text={getAiSnippet(creds.apiKey, aiType)} />
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* ================================================================= */}
      {/* MONITOR MODAL                                                     */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "monitor"}
        onClose={closeModal}
        title={isEdit ? "Edit Uptime Monitor" : "Add Uptime Monitor"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          <div className="space-y-2">
            <label className="text-sm font-medium">Monitor Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. API Health Check"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target URL</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="https://api.mysite.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">HTTP Method</label>
              <Select value={monitorMethod} onValueChange={(v) => setMonitorMethod(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="HEAD">HEAD</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Check Interval</label>
              <Select value={interval} onValueChange={(v) => setInterval(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>High Frequency</SelectLabel>
                    <SelectItem value="1">Every 1 Minute <span className="text-[10px] ml-1 text-muted-foreground">(Business+)</span></SelectItem>
                    <SelectItem value="2">Every 2 Minutes <span className="text-[10px] ml-1 text-muted-foreground">(Business+)</span></SelectItem>
                    <SelectItem value="3">Every 3 Minutes <span className="text-[10px] ml-1 text-muted-foreground">(Business+)</span></SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Standard</SelectLabel>
                    <SelectItem value="5">Every 5 Minutes</SelectItem>
                    <SelectItem value="10">Every 10 Minutes</SelectItem>
                    <SelectItem value="15">Every 15 Minutes</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Low Frequency</SelectLabel>
                    <SelectItem value="30">Every 30 Minutes</SelectItem>
                    <SelectItem value="60">Every 1 Hour</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <details className="group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none flex items-center gap-1">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              Advanced Settings
            </summary>
            <div className="mt-3 space-y-3 pl-1 border-l-2 border-border/40 ml-1.5">
              <div className="space-y-2 pl-3">
                <label className="text-sm font-medium">Expected Status Code</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
                  placeholder="Auto (200-299)"
                  type="number"
                  min={100}
                  max={599}
                  value={monitorExpectedStatus}
                  onChange={(e) => setMonitorExpectedStatus(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Leave empty to accept any 2xx status. Set a specific code if your endpoint returns e.g. 204 or 301.</p>
              </div>
              <div className="space-y-2 pl-3">
                <label className="text-sm font-medium">Custom Headers</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none"
                  placeholder={'{\n  "Authorization": "Bearer token"\n}'}
                  value={monitorHeaders}
                  onChange={(e) => setMonitorHeaders(e.target.value)}
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">JSON object with custom request headers. Max 10 headers.</p>
              </div>
              {(monitorMethod === 'POST' || monitorMethod === 'PUT' || monitorMethod === 'PATCH') && (
                <div className="space-y-2 pl-3">
                  <label className="text-sm font-medium">Request Body</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none"
                    placeholder='{"key": "value"}'
                    value={monitorBody}
                    onChange={(e) => setMonitorBody(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </details>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleMonitorSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />{" "}
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Start Monitoring"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================= */}
      {/* FIREBASE MODAL                                                    */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "firebase"}
        onClose={closeModal}
        title={isEdit ? "Edit Firebase Project" : "Connect Firebase Project"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              placeholder="e.g. Production Firebase"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={loading}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Service Account JSON
              {isEdit && (
                <span className="text-muted-foreground font-normal text-xs ml-2">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                placeholder={isEdit ? "Leave blank to keep current credentials" : '{"type": "service_account", "project_id": "...", ...}'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                rows={5}
              />
            </div>
            {!isEdit && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Paste the full JSON from Firebase Console &gt; Project Settings &gt; Service Accounts &gt; Generate New Private Key. Credentials are AES-256 encrypted.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monitoring Interval</label>
            <Select value={interval} onValueChange={(v) => setInterval(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes (Recommended)</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every 1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleFirebaseSubmit}
              disabled={loading}
              className="min-w-[140px] bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />{" "}
                  {isEdit ? "Updating..." : "Connecting..."}
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Connect & Monitor"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================= */}
      {/* QUEUE MODAL (multi-broker: BullMQ / RabbitMQ / Kafka / SQS)        */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "queue"}
        onClose={closeModal}
        title={isEdit ? "Edit Queue Source" : "Connect Queue Source"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          {collectorResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                Collector registered. Run the Senzor Queue Collector in your own infrastructure with the environment below — data appears here once it starts pushing.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Collector API Key</label>
                <div className="flex gap-2">
                  <input readOnly value={collectorResult.apiKey} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(collectorResult.apiKey); toast.success("Key copied"); }}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Store it securely — it authenticates metric ingestion for this source.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <pre className="rounded-md border border-border bg-muted/40 p-3 text-xs font-mono overflow-x-auto whitespace-pre">{getCollectorEnv(queueSystem, collectorResult.apiKey)}</pre>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(getCollectorEnv(queueSystem, collectorResult.apiKey)); toast.success("Copied"); }}>Copy environment</Button>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => closeModal()}>Done</Button>
              </div>
            </div>
          ) : (<>
          {/* Connection method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Connection Method</label>
            <Select value={queueMode} onValueChange={(v) => setQueueMode(v as any)} disabled={loading || isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agentless">Agentless — Senzor polls your broker</SelectItem>
                <SelectItem value="collector">Collector — you run it, pushes to us</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {queueMode === "collector" ? "For locked-down / VPC environments — your broker is never exposed to Senzor." : "Senzor connects out to your broker on an interval."}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Queue System</label>
            <Select value={queueSystem} onValueChange={(v) => { setQueueSystem(v); setQc(v === "bullmq" ? { prefix: "bull" } : v === "rabbitmq" ? { vhost: "/" } : v === "kafka" ? { ssl: false } : {}); }} disabled={loading || isEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullmq">BullMQ (Redis)</SelectItem>
                <SelectItem value="rabbitmq">RabbitMQ</SelectItem>
                <SelectItem value="kafka">Apache Kafka</SelectItem>
                <SelectItem value="sqs">AWS SQS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. Production Workers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              maxLength={50}
            />
          </div>

          {/* --- BullMQ --- */}
          {queueMode === "agentless" && queueSystem === "bullmq" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Redis Connection URI
                  {isEdit && <span className="text-muted-foreground font-normal text-xs ml-2">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono pr-10"
                    placeholder={isEdit ? "Leave blank to keep current URI" : "redis://:password@host:6379/0  (rediss:// for TLS)"}
                    value={qc.uri || ""}
                    onChange={(e) => setQcField("uri", e.target.value)}
                    disabled={loading}
                    type={showUri ? "text" : "password"}
                  />
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowUri(!showUri)}>
                    {showUri ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Prefix</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  placeholder="bull"
                  value={qc.prefix ?? "bull"}
                  onChange={(e) => setQcField("prefix", e.target.value)}
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            </>
          )}

          {/* --- RabbitMQ --- */}
          {queueMode === "agentless" && queueSystem === "rabbitmq" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Management API URL</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  placeholder="http://host:15672"
                  value={qc.apiUrl || ""}
                  onChange={(e) => setQcField("apiUrl", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="guest"
                    value={qc.username || ""}
                    onChange={(e) => setQcField("username", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Virtual Host</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                    placeholder="/"
                    value={qc.vhost ?? "/"}
                    onChange={(e) => setQcField("vhost", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Password
                  {isEdit && <span className="text-muted-foreground font-normal text-xs ml-2">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none pr-10"
                    placeholder={isEdit ? "••••••••" : "Password"}
                    value={qc.password || ""}
                    onChange={(e) => setQcField("password", e.target.value)}
                    disabled={loading}
                    type={showUri ? "text" : "password"}
                  />
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowUri(!showUri)}>
                    {showUri ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* --- Kafka --- */}
          {queueMode === "agentless" && queueSystem === "kafka" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bootstrap Brokers</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  placeholder={"broker1:9092\nbroker2:9092"}
                  value={qc.brokers || ""}
                  onChange={(e) => setQcField("brokers", e.target.value)}
                  disabled={loading}
                />
                <p className="text-[10px] text-muted-foreground">One host:port per line (or comma-separated).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SASL Mechanism</label>
                  <Select value={qc.saslMechanism || "none"} onValueChange={(v) => setQcField("saslMechanism", v === "none" ? undefined : v)} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (PLAINTEXT)</SelectItem>
                      <SelectItem value="plain">PLAIN</SelectItem>
                      <SelectItem value="scram-sha-256">SCRAM-SHA-256</SelectItem>
                      <SelectItem value="scram-sha-512">SCRAM-SHA-512</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">TLS / SSL</label>
                  <Select value={qc.ssl ? "true" : "false"} onValueChange={(v) => setQcField("ssl", v === "true")} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Disabled</SelectItem>
                      <SelectItem value="true">Enabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {qc.saslMechanism && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      value={qc.username || ""}
                      onChange={(e) => setQcField("username", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Password
                      {isEdit && <span className="text-muted-foreground font-normal text-[10px] ml-1">(blank=keep)</span>}
                    </label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder={isEdit ? "••••••••" : ""}
                      value={qc.password || ""}
                      onChange={(e) => setQcField("password", e.target.value)}
                      disabled={loading}
                      type="password"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* --- AWS SQS --- */}
          {queueMode === "agentless" && queueSystem === "sqs" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">AWS Region</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  placeholder="us-east-1"
                  value={qc.region || ""}
                  onChange={(e) => setQcField("region", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Access Key ID</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                  placeholder="AKIA..."
                  value={qc.accessKeyId || ""}
                  onChange={(e) => setQcField("accessKeyId", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Secret Access Key
                  {isEdit && <span className="text-muted-foreground font-normal text-xs ml-2">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono pr-10"
                    placeholder={isEdit ? "••••••••" : ""}
                    value={qc.secretAccessKey || ""}
                    onChange={(e) => setQcField("secretAccessKey", e.target.value)}
                    disabled={loading}
                    type={showUri ? "text" : "password"}
                  />
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowUri(!showUri)}>
                    {showUri ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Use an IAM user scoped to <span className="font-mono">sqs:ListQueues</span> and <span className="font-mono">sqs:GetQueueAttributes</span> only.</p>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Poll Interval</label>
            <Select value={interval} onValueChange={(v) => setInterval(v)} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 minute (High Detail)</SelectItem>
                <SelectItem value="5">Every 5 minutes (Standard)</SelectItem>
                <SelectItem value="15">Every 15 minutes (Low Footprint)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {queueSystem === "kafka" ? "Consumer Group Allowlist" : "Queue Allowlist"}
              <span className="text-muted-foreground font-normal text-xs ml-2">(optional — blank = auto-discover all)</span>
            </label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
              placeholder={queueSystem === "kafka" ? "orders-consumer\npayments-consumer" : "emails\npayments\nimage-processing"}
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              One name per line (or comma-separated). {!isEdit && "Credentials are AES-256 encrypted in our secure vault."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Management / Runbook URL
              <span className="text-muted-foreground font-normal text-xs ml-2">(optional)</span>
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
              placeholder="https://console.aws.amazon.com/sqs/  ·  Bull Board  ·  RabbitMQ UI"
              value={queueMgmtUrl}
              onChange={(e) => setQueueMgmtUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              Where operators go to act on dead letters. Senzor links out here — it never writes to your broker.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>Cancel</Button>
            <Button onClick={handleQueueSubmit} disabled={loading} className="min-w-[140px]">
              {loading ? (
                <><Spinner className="mr-2 h-4 w-4" /> {isEdit ? "Updating..." : "Connecting..."}</>
              ) : isEdit ? "Update" : "Connect & Save"}
            </Button>
          </div>
          </>)}
        </div>
      </Dialog>

      {/* ================================================================= */}
      {/* DATABASE MODAL                                                    */}
      {/* ================================================================= */}
      <Dialog
        open={activeModal === "database"}
        onClose={closeModal}
        title={isEdit ? "Edit Database" : "Connect Database"}
      >
        <div className="space-y-4">
          <ErrorBanner />
          <div className="space-y-2">
            <label className="text-sm font-medium">Database Engine</label>
            <Select value={dbType} onValueChange={(v) => setDbType(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mongodb">MongoDB</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder={
                dbType === "redis"
                  ? "e.g. Production Cache"
                  : dbType === "postgresql"
                    ? "e.g. Production PostgreSQL"
                    : dbType === "mysql"
                      ? "e.g. Production MySQL"
                      : "e.g. Production Cluster"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Connection URI
              {isEdit && (
                <span className="text-muted-foreground font-normal text-xs ml-2">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono pr-10"
                placeholder={
                  isEdit
                    ? "Leave blank to keep current URI"
                    : dbType === "redis"
                      ? "redis://:password@host:6379/0"
                      : dbType === "postgresql"
                        ? "postgresql://user:pass@host:5432/dbname"
                        : dbType === "mysql"
                          ? "mysql://user:pass@host:3306/dbname"
                          : "mongodb+srv://user:pass@cluster.net"
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                type={showUri ? "text" : "password"}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowUri(!showUri)}
              >
                {showUri ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {!isEdit && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Credentials are AES-256 encrypted safely in our secure vault.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monitoring Interval</label>
            <Select value={interval} onValueChange={(v) => setInterval(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 minute (High Detail)</SelectItem>
                <SelectItem value="5">Every 5 minutes (Standard)</SelectItem>
                <SelectItem value="15">Every 15 minutes (Low Footprint)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleDbSubmit}
              disabled={loading}
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />{" "}
                  {isEdit ? "Updating..." : "Connecting..."}
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Connect & Save"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
