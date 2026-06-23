// ============================================================================
// SENZOR DOCS: HEADLESS CONFIGURATION SCHEMA
// ============================================================================

export interface InstallationSnippet {
  framework: string;
  language: string; // e.g., 'typescript', 'javascript', 'bash', 'html', 'json', 'yaml'
  code: string;
  notes?: string;
}

export interface TroubleshootingCase {
  issue: string;
  solution: string;
}

export interface RegistrationStep {
  title: string;
  description: string;
}

export interface DocServiceConfig {
  id: string; // The URL slug (e.g., 'apm')
  title: string;
  iconName: string; // Maps to lucide-react icons in the UI
  shortDescription: string;
  overview: string;
  prerequisites: string[];
  registrationSteps: RegistrationStep[];
  installation?: InstallationSnippet[]; // Optional for agentless/UI-only services
  troubleshooting?: TroubleshootingCase[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  category: string;
  questions: FaqItem[];
}

export interface DocsConfig {
  introduction: {
    title: string;
    description: string;
    coreConcepts: { title: string; description: string }[];
  };
  faqs: FaqCategory[];
  services: DocServiceConfig[];
}

// ============================================================================
// THE DATA (Synced with FEATURES_DATA)
// ============================================================================

export const DOCS_DATA: DocsConfig = {
  introduction: {
    title: "Senzor Documentation",
    description: "Welcome to Senzor. We provide a unified, privacy-first observability platform designed for modern engineering teams. Whether you are tracking distributed microservices, monitoring bare-metal infrastructure, or analyzing real user web vitals, our lightweight agents connect your telemetry in minutes.",
    coreConcepts: [
      {
        title: "Unified Telemetry",
        description: "Logs, metrics, and traces are automatically correlated. When an APM trace fails, you can instantly pivot to the exact server logs and RUM session that generated it."
      },
      {
        title: "Zero-Overhead Agents",
        description: "Our SDKs and bash agents are engineered to consume minimal CPU/Memory overhead, utilizing background workers and exponential backoff strategies to ensure your app performance remains untouched."
      },
      {
        title: "Pooled Ingestion",
        description: "No more arbitrary limits per service. Your data tier is pooled globally across your workspace, giving you absolute flexibility in how you allocate your observability budget."
      }
    ]
  },

  faqs: [
    {
      category: "Security & Compliance",
      questions: [
        {
          q: "Is Senzor GDPR and HIPAA compliant?",
          a: "Yes. Senzor acts as a Data Processor under GDPR. Our platform encrypts all data at rest (AES-256) and in transit (TLS 1.3). However, you are strictly prohibited from transmitting clear-text PII or PHI within custom log messages or traces."
        },
        {
          q: "How long is my telemetry data retained?",
          a: "Retention is tied to your active billing plan and applied uniformly across every telemetry type. Starter retains data for 3 days, Pro for 15 days, Business for 30 days, and Enterprise for 90 days. Each record carries its own expiry, so when your plan changes the retention window for your stored data is adjusted automatically. Once the window lapses, data is permanently expunged by MongoDB."
        }
      ]
    },
    {
      category: "Integration & Architecture",
      questions: [
        {
          q: "Can I host Senzor on my own infrastructure?",
          a: "Yes, Senzor offers a comprehensive self-hosted enterprise edition. Please contact our sales team or review our Self-Hosting GitHub repository for Docker Swarm and Kubernetes manifests."
        },
        {
          q: "What happens if my application loses internet connection?",
          a: "Our SDKs utilize an in-memory ring buffer. If outbound requests to Senzor APIs fail, the agent will queue the telemetry and retry using exponential backoff to prevent data loss without causing memory leaks in your application."
        }
      ]
    }
  ],

  services: [
    {
      id: "views",
      title: "Saved Views",
      iconName: "LayoutTemplate",
      shortDescription: "Construct bespoke control panels by aggregating cross-service metrics.",
      overview: "Saved Views allow you to construct bespoke control panels by aggregating metrics, logs, and traces across your entire stack. Drag, drop, and resize visualizations in a unified canvas with strict tenant data isolation.",
      prerequisites: [
        "At least one active telemetry stream (APM, RUM, or Logs) to visualize.",
        "Appropriate RBAC permissions to create global views."
      ],
      registrationSteps: [
        { title: "Navigate to Saved Views", description: "Click the '+' icon next to 'Saved Views' in your dashboard sidebar." },
        { title: "Define Metadata", description: "Provide a descriptive name and optional description for your team (e.g., 'Master Production Overview')." },
        { title: "Add Widgets", description: "Use the 'Add Widget' button on the canvas to drag in specific charts from your various services." }
      ]
    },
    {
      id: "server",
      title: "Infrastructure Monitoring",
      iconName: "Server",
      shortDescription: "Lightweight bash agent for Linux CPU, Memory, Disk, and Network IO.",
      overview: "Track the health of your servers, containers, and virtual machines. Monitor CPU, memory, disk I/O, and network throughput with a high-fidelity, low-footprint bash agent that securely streams outbound-only telemetry.",
      prerequisites: [
        "A Linux-based operating system (Ubuntu, Debian, CentOS, RHEL, Alpine).",
        "Root or sudo access to the server.",
        "Outbound TCP access to port 443."
      ],
      registrationSteps: [
        { title: "Create Server Profile", description: "In the Senzor dashboard, go to 'Servers' and register a new machine." },
        { title: "Copy Installation String", description: "The dashboard will generate a one-line cURL command containing your unique Server ID and API Key." },
        { title: "Execute on Host", description: "SSH into your server and paste the command. The script will automatically install itself as a background systemd service." }
      ],
      installation: [
        {
          framework: "Interactive (Recommended)",
          language: "bash",
          code: `curl -fsSLO https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh\nchmod +x install_agent.sh\nsudo bash install_agent.sh`,
          notes: "The interactive installer guides you through configuration, validates inputs, and starts the agent as a Docker container with automatic restarts."
        },
        {
          framework: "Non-Interactive (CI)",
          language: "bash",
          code: `export SERVER_ID="<YOUR_SERVER_ID>"\nexport API_KEY="<YOUR_API_KEY>"\nexport API_ENDPOINT="https://api.senzor.dev/api/ingest/stats"\n\ncurl -fsSL https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh | sudo -E bash -s -- --non-interactive`,
          notes: "Ideal for automated deployments and CI/CD pipelines. All configuration is passed via environment variables."
        },
        {
          framework: "Docker Compose",
          language: "yaml",
          code: `services:\n  senzor:\n    image: ghcr.io/senzops/server-agent:latest\n    container_name: senzor\n    restart: unless-stopped\n    network_mode: "host"\n    pid: "host"\n    volumes:\n      - /:/host/root:ro\n      - /sys:/host/sys:ro\n      - /proc:/host/proc:ro\n      - /etc/os-release:/etc/os-release:ro\n      - /etc/hostname:/etc/hostname:ro\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n    environment:\n      # Required\n      - SERVER_ID=<YOUR_SERVER_ID>\n      - API_KEY=<YOUR_API_KEY>\n      - API_ENDPOINT=https://api.senzor.dev/api/ingest/stats\n      - INTERVAL=60\n      - LOG_LEVEL=info\n      # Nginx (set ENABLE_NGINX=true to activate)\n      - ENABLE_NGINX=false\n      - NGINX_STATUS_URL=http://127.0.0.1/nginx_status\n      # Traefik (set ENABLE_TRAEFIK=true to activate)\n      - ENABLE_TRAEFIK=false\n      - TRAEFIK_API_URL=http://127.0.0.1:8080\n      - TRAEFIK_USER=\n      - TRAEFIK_PASSWORD=\n      - TRAEFIK_INSECURE_SKIP_VERIFY=false\n      # Web Terminal (set ENABLE_TERMINAL=true to activate)\n      - ENABLE_TERMINAL=false\n      - ALLOW_HOST_ACCESS=false\n    deploy:\n      resources:\n        limits:\n          memory: 256M\n          cpus: "0.20"`,
          notes: "Save as docker-compose.yml, replace the placeholder values, then run: docker compose up -d. Set any integration to 'true' to enable it."
        }
      ],
      troubleshooting: [
        {
          issue: "Agent installs but shows 'Offline' in dashboard.",
          solution: "Check the container logs by running `docker logs -f senzor`. Verify your SERVER_ID and API_KEY are correct and the API_ENDPOINT is reachable."
        },
        {
          issue: "Install script fails with a syntax error.",
          solution: "The script requires Unix (LF) line endings. If you downloaded it on Windows, run: sed -i 's/\\r$//' install_agent.sh"
        }
      ]
    },
    {
      id: "database",
      title: "Database Observability",
      iconName: "Database",
      shortDescription: "Agentless query latency and connection pool profiling.",
      overview: "Uncover slow queries, monitor connection pools, and track operations per second. Senzor connects directly to your database cluster in a read-only, agentless capacity to aggregate deep storage layer insights.",
      prerequisites: [
        "A supported database engine (MongoDB or Redis).",
        "A connection URI with a read-only user provisioned."
      ],
      registrationSteps: [
        { title: "Select Engine", description: "Click '+' next to Databases and select your engine." },
        { title: "Provide Credentials", description: "Enter a read-only connection URI. Senzor AES-256 encrypts these credentials at rest inside our secure vault." },
        { title: "Set Interval", description: "Choose the polling frequency (1m, 5m, or 15m) based on your ingestion budget." }
      ],
      troubleshooting: [
        {
          issue: "Connection Timeout / Refused",
          solution: "Ensure you have whitelisted Senzor's static IP addresses in your Database Firewall or AWS Security Group."
        }
      ]
    },
    {
      id: "queue",
      title: "Queue Monitoring",
      iconName: "Layers",
      shortDescription: "Agentless backlog, throughput, consumer & dead-letter monitoring for BullMQ, RabbitMQ, Kafka & SQS.",
      overview: "Get full visibility into your message queues and streams. Senzor connects to your broker read-only (or runs a lightweight collector inside your network) and tracks backlog depth, throughput, consumer count, oldest-message age, drain ETA, and dead-letter accumulation — across BullMQ (Redis), RabbitMQ, Apache Kafka, and AWS SQS. When you also run @senzops/apm-node, queue backlog is correlated to the exact consumer executions draining it.",
      prerequisites: [
        "A supported broker: BullMQ (Redis), RabbitMQ, Apache Kafka, or AWS SQS.",
        "Read-only access — a Redis ACL, RabbitMQ management user, Kafka consumer-group read, or an IAM user scoped to sqs:ListQueues and sqs:GetQueueAttributes."
      ],
      registrationSteps: [
        { title: "Add a Queue Source", description: "Click '+' next to Queues and choose your broker system (BullMQ, RabbitMQ, Kafka, or SQS)." },
        { title: "Choose Connection Method", description: "Agentless — Senzor polls your broker on an interval. Or Collector — run the Senzor queue collector inside your own network (for locked-down / VPC environments) and it pushes metrics to us." },
        { title: "Provide Credentials", description: "Enter the broker connection details. Secrets are AES-256 encrypted at rest; for BullMQ the key prefix (including the Redis-Cluster '{bull}' hash-tag) is auto-detected." },
        { title: "Set Interval & Runbook", description: "Choose the polling frequency (1m, 5m, or 15m). Optionally add a management/runbook URL for one-click hand-off when dead letters accumulate." }
      ],
      troubleshooting: [
        {
          issue: "Metrics show 0 / no queues discovered",
          solution: "For BullMQ, confirm the key prefix matches your broker — Senzor auto-detects the common 'bull' and Redis-Cluster '{bull}' prefixes. Ensure the connection points at the same Redis database your workers use."
        },
        {
          issue: "Throughput is 0 right after adding a source",
          solution: "Throughput is derived across consecutive samples, so it appears after the second poll cycle. A backlog of 0 is normal for a healthy, drained queue."
        }
      ]
    },
    {
      id: "firebase",
      title: "Firebase Monitoring",
      iconName: "Flame",
      shortDescription: "Agentless Firebase Auth user metrics and sign-in analytics.",
      overview: "Monitor your Firebase Authentication infrastructure without deploying agents. Senzor connects via the Firebase Admin SDK to poll user growth, sign-in activity, MFA adoption, auth provider distribution, and recent signup details — all with AES-256 encrypted credential storage.",
      prerequisites: [
        "A Firebase project with Authentication enabled.",
        "A service account JSON key file (Firebase Console > Project Settings > Service Accounts > Generate New Private Key).",
        "The service account must have the 'Firebase Authentication Admin' role or equivalent permissions."
      ],
      registrationSteps: [
        { title: "Navigate to Firebase", description: "Click '+' next to Firebase in your dashboard sidebar." },
        { title: "Name Your Project", description: "Enter a recognizable name for this Firebase project (e.g., 'Production Auth')." },
        { title: "Paste Service Account JSON", description: "Paste the full JSON contents of your Firebase service account key file. Senzor validates and AES-256 encrypts these credentials at rest." },
        { title: "Set Polling Interval", description: "Choose how often Senzor polls your Firebase project (5, 15, 30, or 60 minutes). Default is 15 minutes." }
      ],
      troubleshooting: [
        {
          issue: "Connection Failed / Authentication Error",
          solution: "Verify that the service account JSON is complete and unmodified. Ensure the service account has Firebase Authentication Admin permissions and the project has Firebase Auth enabled."
        },
        {
          issue: "Metrics show 0 users despite having users",
          solution: "Confirm the service account belongs to the correct Firebase project. Check that Firebase Authentication (not just Firestore) is enabled in the Firebase Console."
        }
      ]
    },
    {
      id: "web-analytics",
      title: "Web Analytics",
      iconName: "Globe",
      shortDescription: "Privacy-first, cookie-less traffic insights.",
      overview: "Understand your audience without compromising their privacy. Track page views, unique visitors, referrers, and geographic distribution using a lightweight, zero-cookie script.",
      prerequisites: [
        "Access to your website's HTML `<head>` tag or a tag manager."
      ],
      registrationSteps: [
        { title: "Register Domain", description: "Enter your exact domain name in the Web Analytics modal." },
        { title: "Install Script", description: "Copy the provided script and inject it into your website." }
      ],
      installation: [
        {
          framework: "CDN Script",
          language: "html",
          code: `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>window.Senzor.init({ webId: "<YOUR_WEB_ID>" })</script>`,
          notes: "Place this script in your <head> tag to accurately track pageviews before the user navigates away."
        },
        {
          framework: "NPM Package",
          language: "typescript",
          code: `npm install @senzops/web\n\nimport { Senzor } from "@senzops/web";\n\nSenzor.init({\n  webId: "<YOUR_WEB_ID>",\n});`,
          notes: "Recommended for React, Vue, Svelte, and other SPA frameworks. Import and call init() as early as possible in your app entry point."
        }
      ]
    },
    {
      id: "rum",
      title: "Real User Monitoring (RUM)",
      iconName: "MonitorSmartphone",
      shortDescription: "Core Web Vitals and client-side error capture.",
      overview: "Capture client-side performance bottlenecks. Monitor Core Web Vitals (LCP, FID, CLS), network call latency, and frontend JavaScript exceptions directly from the browser.",
      prerequisites: [
        "Your frontend domain must be explicitly whitelisted in the Senzor dashboard to prevent CORS rejection."
      ],
      registrationSteps: [
        { title: "Navigate to Web APM", description: "Click the '+' icon next to Web APM (RUM)." },
        { title: "Define Allowed Domains", description: "You must explicitly define comma-separated domains (e.g., 'senzor.dev, app.senzor.dev'). Telemetry from unauthorized origins is dropped." }
      ],
      installation: [
        {
          framework: "CDN Script",
          language: "html",
          code: `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>\n  window.Senzor.initRum({\n    apiKey: "<YOUR_RUM_KEY>",\n    sampleRate: 1.0,\n    allowedOrigins: ["https://api.yourbackend.com"]\n  });\n</script>`,
          notes: "Configuring allowedOrigins injects W3C Trace Context headers into outgoing fetch/XHR requests, bridging frontend RUM with backend APM traces."
        },
        {
          framework: "NPM Package",
          language: "typescript",
          code: `npm install @senzops/web\n\nimport { Senzor } from "@senzops/web";\n\nSenzor.initRum({\n  apiKey: "<YOUR_RUM_KEY>",\n  sampleRate: 1.0,\n  allowedOrigins: ["https://api.yourbackend.com"],\n});`,
          notes: "Recommended for React, Vue, Svelte, and other SPA frameworks. Call initRum() in your app entry point alongside or instead of the CDN script."
        }
      ],
      troubleshooting: [
        {
          issue: "Metrics are rejected (403 Forbidden).",
          solution: "This occurs if the website's hostname does not exactly match the 'Allowed Domains' configured in the dashboard."
        }
      ]
    },
    {
      id: "ai-monitoring",
      title: "AI Monitoring (LLM Observability)",
      iconName: "Bot",
      shortDescription: "Cost, tokens, latency and traces for every LLM call.",
      overview: "A first-class observability pillar for AI. Track spend, token usage, latency and errors across every model and provider — with full multi-step traces (agents, RAG, tool calls), per-user and per-session cost attribution, and opt-in prompt/completion capture. Major providers are auto-instrumented; anything else (custom, self-hosted, in-browser WebLLM) is one wrap call away. Cost is computed server-side from a maintained pricing table.",
      prerequisites: [
        "A Node.js / edge runtime using @senzops/apm-node (v1.4+), or any runtime that can POST to the AI ingest endpoint.",
        "Prompt/completion content is opt-in and OFF by default; enable it per-source in Settings if you need it for debugging."
      ],
      registrationSteps: [
        { title: "Create an AI Source", description: "Click '+' next to AI Monitoring in the sidebar, name it, and choose Server or Browser (WebLLM)." },
        { title: "Copy the Source Key", description: "The dashboard issues a one-time sz_ai_ key — copy it now; it is shown only once." },
        { title: "Initialize the SDK", description: "Call Senzor.init({ ai: { apiKey } }) as early as possible — AI Monitoring sources carry their own key. If you already run Senzor APM/Task, keep your existing top-level apiKey and just add the ai key. Supported providers (OpenAI, Anthropic, Gemini/Vertex, Azure OpenAI, Cohere, Mistral, Groq, Ollama, the Vercel AI SDK and LangChain) are then auto-instrumented." }
      ],
      installation: [
        {
          framework: "Auto-instrumentation",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// Already using Senzor APM/Task? Keep your existing apiKey and just add \`ai\`.\nSenzor.init({\n  ai: { apiKey: "<YOUR_AI_KEY>", captureContent: false } // captureContent: store masked prompts/outputs\n});\n\n// OpenAI, Anthropic, Gemini, Cohere, Mistral, Groq, Ollama,\n// the Vercel AI SDK and LangChain are now captured automatically.`,
          notes: "AI sources use a dedicated key under ai.apiKey, separate from APM/Task. Cost is recomputed server-side — the SDK never sends a cost field. Set ai.sampleRate (0–1) for high-volume head sampling."
        },
        {
          framework: "Manual wrap (any model)",
          language: "typescript",
          code: `import Senzor from '@senzops/apm-node';\n\n// Group a multi-step workflow (agent / RAG) into one trace:\nawait Senzor.ai.trace({ name: 'support-agent', sessionId, userId }, async () => {\n  // Record any LLM call — unsupported providers, self-hosted, etc.\n  await Senzor.ai.wrapGeneration(\n    {\n      provider: 'openai', model: 'gpt-4o', operation: 'chat',\n      extract: (r) => ({ tokensIn: r.usage.prompt_tokens, tokensOut: r.usage.completion_tokens })\n    },\n    () => openai.chat.completions.create({ model: 'gpt-4o', messages })\n  );\n});`,
          notes: "Use Senzor.ai.generation() to record a finished call directly. sessionId/userId power the per-user and per-session cost breakdowns. Attach quality/eval scores with Senzor.ai.score({ name: 'relevance', value: 0.9 })."
        },
        {
          framework: "Browser (WebLLM)",
          language: "typescript",
          code: `import Senzor from '@senzops/apm-node';\n\nSenzor.init({ ai: { apiKey: "<YOUR_AI_KEY>" } });\n\n// In-browser models make no network call, so wrap them manually.\nawait Senzor.ai.wrapGeneration(\n  { provider: 'webllm', model: 'Llama-3-8B', operation: 'chat' },\n  () => engine.chat.completions.create({ messages })\n);`,
          notes: "Browser sources never store prompt/output content, regardless of settings, for privacy."
        }
      ],
      troubleshooting: [
        {
          issue: "Cost shows as $0 for some models.",
          solution: "The model isn't in the built-in pricing table (e.g. a new snapshot or a self-hosted model). Add a price under the source's Settings → pricing overrides (USD per 1M input/output tokens)."
        },
        {
          issue: "Streaming calls show 0 output tokens (OpenAI).",
          solution: "OpenAI only returns usage on streamed responses when you pass stream_options: { include_usage: true }. Anthropic and Gemini report streaming usage natively. Time-to-first-token is always captured."
        },
        {
          issue: "Prompts/outputs aren't appearing in traces.",
          solution: "Content capture is opt-in. Enable it on the source (Settings → Capture prompt & output) AND set ai.captureContent: true in the SDK. It is masked on ingest and stored under your plan's retention."
        }
      ]
    },
    {
      id: "apm",
      title: "Application Performance Monitoring",
      iconName: "Box",
      shortDescription: "Trace HTTP requests across distributed backend architectures.",
      overview: "Follow every request as it traverses your microservices. Identify latency bottlenecks, analyze upstream dependencies, and optimize your backend logic with zero-configuration distributed tracing.",
      prerequisites: [
        "A supported Node.js backend environment."
      ],
      registrationSteps: [
        { title: "Register APM Service", description: "Generate an API key for your specific microservice in the dashboard." }
      ],
      installation: [
        {
          framework: "Express",
          language: "javascript",
          code: `npm install @senzops/apm-node\n\nconst senzor = require('@senzops/apm-node');\nsenzor.init({ apiKey: "<YOUR_APM_KEY>" });\n\n// 1. Request Handler (First)\napp.use(senzor.requestHandler());\n\n// ... your routes ...\n\n// 2. Error Handler (Last)\napp.use(senzor.errorHandler());`,
          notes: "The request handler MUST be the very first middleware to accurately track total request duration."
        },
        {
          framework: "Next.js (App Router)",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// app/api/route.ts\nimport { Senzor } from '@senzops/apm-node';\nSenzor.init({ apiKey: "<YOUR_APM_KEY>" });\n\nexport const GET = Senzor.wrapNextRoute(async (req) => {\n  return Response.json({ ok: true });\n});`
        },
        {
          framework: "Next.js (Pages)",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// pages/api/hello.ts\nimport { Senzor } from '@senzops/apm-node';\nSenzor.init({ apiKey: "<YOUR_APM_KEY>" });\n\nconst handler = (req, res) => res.json({ ok: true });\nexport default Senzor.wrapNextPages(handler);`
        },
        {
          framework: "Fastify",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\nimport { Senzor } from '@senzops/apm-node';\n\nfastify.register(Senzor.fastifyPlugin, {\n  apiKey: "<YOUR_APM_KEY>"\n});`
        },
        {
          framework: "NestJS",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// main.ts\nimport { Senzor } from '@senzops/apm-node';\n\nasync function bootstrap() {\n  Senzor.init({ apiKey: "<YOUR_APM_KEY>" });\n  const app = await NestFactory.create(AppModule);\n  app.use(Senzor.requestHandler());\n  await app.listen(3000);\n}`
        },
        {
          framework: "Nuxt / Nitro",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// server/middleware/senzor.ts\nimport { Senzor } from '@senzops/apm-node';\nSenzor.init({ apiKey: "<YOUR_APM_KEY>" });\n\nexport default Senzor.wrapH3(defineEventHandler((event) => {\n  // Your logic\n}));`
        },
        {
          framework: "Cloudflare Workers (Nitro)",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// server/plugins/senzor.ts\nimport { Senzor } from "@senzops/apm-node";\n\nexport default defineNitroPlugin((nitroApp) => {\n  Senzor.init({\n    apiKey: "<YOUR_APM_KEY>",\n  });\n\n  Senzor.nitroPlugin(nitroApp);\n});`
        },
        {
          framework: "AWS Lambda (Extension Layer)",
          language: "bash",
          code: `# -------------------------------------------------------\n# Zero Code Changes — Lambda Extension Layer\n# -------------------------------------------------------\n# 1. Create the Lambda Layer\nmkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs\nnpm init -y && npm install @senzops/apm-node\ncd .. && zip -r senzor-apm-layer.zip nodejs/\n\n# 2. Publish the Layer\naws lambda publish-layer-version \\\\\n  --layer-name senzor-apm-node \\\\\n  --zip-file fileb://senzor-apm-layer.zip \\\\\n  --compatible-runtimes nodejs18.x nodejs20.x nodejs22.x\n\n# 3. Attach to your function + set env vars\naws lambda update-function-configuration \\\\\n  --function-name <YOUR_FUNCTION> \\\\\n  --layers <LAYER_ARN> \\\\\n  --environment Variables="{\\\\\n    SENZOR_API_KEY=<YOUR_APM_KEY>,\\\\\n    SENZOR_LAMBDA_HANDLER=index.handler,\\\\\n    NODE_OPTIONS=--require @senzops/apm-node/register\\\\\n  }"\n\n# 4. Update the function handler to point to Senzor's auto-wrapper\naws lambda update-function-configuration \\\\\n  --function-name <YOUR_FUNCTION> \\\\\n  --handler @senzops/apm-node/dist/lambda-handler.handler`,
          notes: "The Extension Layer requires ZERO code changes to your Lambda function. Set SENZOR_LAMBDA_HANDLER to your original handler (e.g., 'index.handler'), and point the Lambda function's handler to '@senzops/apm-node/dist/lambda-handler.handler'. The layer auto-wraps your handler with full APM: cold start detection, trigger-type detection (API Gateway v1/v2, ALB, SQS, SNS, DynamoDB Streams, EventBridge, S3), Lambda context attributes, and forced telemetry flush. Works with all deployment tools: AWS Console, CDK, SAM, Serverless Framework, and Terraform."
        },
        {
          framework: "AWS Lambda (CDK)",
          language: "typescript",
          code: `import * as lambda from 'aws-cdk-lib/aws-lambda';\nimport * as path from 'path';\n\n// Create the Senzor APM Layer\nconst senzorLayer = new lambda.LayerVersion(this, 'SenzorApmLayer', {\n  code: lambda.Code.fromAsset(path.join(__dirname, 'senzor-layer')),\n  compatibleRuntimes: [\n    lambda.Runtime.NODEJS_18_X,\n    lambda.Runtime.NODEJS_20_X,\n    lambda.Runtime.NODEJS_22_X,\n  ],\n  description: 'Senzor APM Node.js Lambda Extension Layer',\n});\n\n// Attach to your Lambda function\nconst fn = new lambda.Function(this, 'MyFunction', {\n  runtime: lambda.Runtime.NODEJS_20_X,\n  handler: '@senzops/apm-node/dist/lambda-handler.handler',\n  code: lambda.Code.fromAsset('lambda'),\n  layers: [senzorLayer],\n  environment: {\n    SENZOR_API_KEY: '<YOUR_APM_KEY>',\n    SENZOR_LAMBDA_HANDLER: 'index.handler',\n    NODE_OPTIONS: '--require @senzops/apm-node/register',\n  },\n});`,
          notes: "Create the layer directory first: mkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs && npm init -y && npm install @senzops/apm-node. The CDK LayerVersion points to the senzor-layer directory. Set handler to '@senzops/apm-node/dist/lambda-handler.handler' and SENZOR_LAMBDA_HANDLER to your original handler path."
        },
        {
          framework: "AWS Lambda (SAM)",
          language: "yaml",
          code: `# template.yaml\nAWSTemplateFormatVersion: '2010-09-09'\nTransform: AWS::Serverless-2016-10-31\n\nGlobals:\n  Function:\n    Layers:\n      - !Ref SenzorApmLayer\n    Environment:\n      Variables:\n        SENZOR_API_KEY: !Ref SenzorApiKey\n        NODE_OPTIONS: '--require @senzops/apm-node/register'\n\nResources:\n  SenzorApmLayer:\n    Type: AWS::Serverless::LayerVersion\n    Properties:\n      LayerName: senzor-apm-node\n      ContentUri: senzor-layer/\n      CompatibleRuntimes:\n        - nodejs18.x\n        - nodejs20.x\n        - nodejs22.x\n\n  MyFunction:\n    Type: AWS::Serverless::Function\n    Properties:\n      Handler: '@senzops/apm-node/dist/lambda-handler.handler'\n      Runtime: nodejs20.x\n      CodeUri: src/\n      Environment:\n        Variables:\n          SENZOR_LAMBDA_HANDLER: index.handler`,
          notes: "The SAM template defines the layer as a resource and attaches it globally. Set each function's Handler to the Senzor auto-wrapper and SENZOR_LAMBDA_HANDLER to the original handler. Build the layer: mkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs && npm init -y && npm install @senzops/apm-node."
        },
        {
          framework: "AWS Lambda (Serverless Framework)",
          language: "yaml",
          code: `# serverless.yml\nservice: my-service\n\nprovider:\n  name: aws\n  runtime: nodejs20.x\n  environment:\n    SENZOR_API_KEY: \${ssm:/senzor/api-key}\n    NODE_OPTIONS: '--require @senzops/apm-node/register'\n\nlayers:\n  senzorApm:\n    path: senzor-layer\n    compatibleRuntimes:\n      - nodejs18.x\n      - nodejs20.x\n      - nodejs22.x\n\nfunctions:\n  api:\n    handler: '@senzops/apm-node/dist/lambda-handler.handler'\n    layers:\n      - !Ref SenzorApmLambdaLayer\n    environment:\n      SENZOR_LAMBDA_HANDLER: src/handlers/api.handler`,
          notes: "Create the layer directory: mkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs && npm init -y && npm install @senzops/apm-node. The Serverless Framework auto-generates the layer ARN reference as {LayerName}LambdaLayer. Set each function's handler to the Senzor auto-wrapper."
        },
        {
          framework: "AWS Lambda (Console)",
          language: "bash",
          code: `# Step 1: Build the layer zip locally\nmkdir -p senzor-layer/nodejs && cd senzor-layer/nodejs\nnpm init -y && npm install @senzops/apm-node\ncd .. && zip -r senzor-apm-layer.zip nodejs/\n\n# Step 2: In AWS Console\n# Go to Lambda > Layers > Create layer\n# Upload senzor-apm-layer.zip\n# Compatible runtimes: nodejs18.x, nodejs20.x, nodejs22.x\n\n# Step 3: Attach layer to your function\n# Go to your Lambda function > Layers > Add a layer\n# Choose "Custom layers" and select senzor-apm-node\n\n# Step 4: Update function configuration\n# Handler: @senzops/apm-node/dist/lambda-handler.handler\n# Environment variables:\n#   SENZOR_API_KEY         = <YOUR_APM_KEY>\n#   SENZOR_LAMBDA_HANDLER  = index.handler\n#   NODE_OPTIONS           = --require @senzops/apm-node/register`,
          notes: "This guide walks through setting up the Senzor Lambda Extension Layer via the AWS Console. No code changes to your Lambda function are needed. The original handler is preserved in SENZOR_LAMBDA_HANDLER and Senzor's auto-wrapper handles instrumentation."
        },
        {
          framework: "AWS Lambda (Code-Level)",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\n// handler.ts\nimport { Senzor } from '@senzops/apm-node';\n\nSenzor.init({ apiKey: "<YOUR_APM_KEY>" });\n\nexport const handler = Senzor.wrapLambda(async (event, context) => {\n  // Your Lambda logic\n  return { statusCode: 200, body: JSON.stringify({ ok: true }) };\n});`,
          notes: "Use this approach when you prefer code-level control or cannot use Lambda Layers. wrapLambda() provides the same features: cold start detection, trigger-type detection, Lambda context extraction, and forced flush. Install @senzops/apm-node as a dependency in your function's package.json."
        }
      ],
      troubleshooting: [
        {
          issue: "Durations are incorrect or 0ms in Express.",
          solution: "You must attach `senzor.requestHandler()` as the absolute first middleware, before body-parsers or cors configurations."
        }
      ]
    },
    {
      id: "tasks",
      title: "Background Task Monitoring",
      iconName: "Workflow",
      shortDescription: "Secure and monitor your asynchronous workloads and cron jobs.",
      overview: "Ensure your queues, cron jobs, and background workers are operating reliably. Track execution times, monitor failure rates, queue depth latency, and analyze retry behaviors automatically.",
      prerequisites: [
        "A Node.js environment utilizing BullMQ, Node-Cron, or custom workers."
      ],
      registrationSteps: [
        { title: "Generate Task Key", description: "Register a Task environment in the dashboard to receive a dedicated API key." }
      ],
      installation: [
        {
          framework: "Node.js (BullMQ / Node-Cron)",
          language: "typescript",
          code: `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// Initialize as early as possible in your worker entry file\nSenzor.init({\n  apiKey: "<YOUR_TASK_KEY>"\n});\n\n// Supported libraries like BullMQ and Node-Cron are automatically instrumented!`
        }
      ]
    },
    {
      id: "errors",
      title: "Global Error Tracking",
      iconName: "AlertOctagon",
      shortDescription: "Catch and fingerprint exceptions before your users do.",
      overview: "Automatically capture, fingerprint, and group unhandled exceptions across your entire stack. View full stack traces and contextual environment data in a centralized dashboard.",
      prerequisites: [
        "An active APM or RUM service integration."
      ],
      registrationSteps: [
        { title: "Automatic Detection", description: "Global Error Tracking requires no additional registration. It is automatically enabled when you install the APM or RUM agents." }
      ]
    },
    {
      id: "logs",
      title: "Centralized Log Management",
      iconName: "Terminal",
      shortDescription: "Search millions of logs in milliseconds using MQL.",
      overview: "Aggregate logs from every service and server into a single, searchable stream. Logs are automatically captured by Senzor APM and RUM agents, or you can push custom logs manually via our secure HTTPS ingestion endpoint.",
      prerequisites: [
        "A Global Log Ingestion API Key generated from the Senzor Dashboard."
      ],
      registrationSteps: [
        { title: "Auto-Collection", description: "If you have Senzor APM or RUM installed, application and console logs are captured and correlated automatically." },
        { title: "Generate Manual Key", description: "Navigate to 'Log Explorer' -> 'Settings' and generate a global Log Ingestion API Key to push logs from unsupported environments." }
      ],
      installation: [
        {
          framework: "HTTPS (cURL)",
          language: "bash",
          code: `curl -X POST https://api.senzor.dev/api/ingest/logs \\\n-H "x-log-api-key: <YOUR_LOG_API_KEY>" \\\n-H "Content-Type: application/json" \\\n-d '{"level":"error", "message":"Payment failed", "userId": 123}'`,
          notes: "You can append any arbitrary JSON attributes into the payload. They will be automatically indexed and searchable via MQL."
        }
      ]
    },
    {
      id: "uptime",
      title: "Uptime Monitoring",
      iconName: "Activity",
      shortDescription: "High-frequency synthetic health checks.",
      overview: "Continuously verify that your APIs and web properties are accessible from the outside world. Track response times globally and record downtime incidents.",
      prerequisites: [
        "A publicly accessible HTTP/HTTPS endpoint."
      ],
      registrationSteps: [
        { title: "Add Monitor", description: "Click '+' next to Uptime in the dashboard sidebar." },
        { title: "Configure Check", description: "Provide the Target URL and set the check frequency (e.g., Every 15 Minutes)." }
      ]
    },
    {
      id: "status-boards",
      title: "Status Boards",
      iconName: "LayoutTemplate",
      shortDescription: "Centralized, shareable uptime dashboards and public status pages.",
      overview: "Compose your existing uptime monitors into a centralized, drag-and-drop board with resizable cards and range-aware availability stripes — then publish it as a public, view-only status page. Status Boards reuse the monitors you already run, so there are no new agents or checks to deploy. When a board is shared publicly, each monitor's internal target URL is stripped from the response, so a customer-facing status page never reveals your private endpoints.",
      prerequisites: [
        "At least one configured Uptime monitor to add to the board.",
        "Appropriate workspace permissions to create boards and generate public share links."
      ],
      registrationSteps: [
        { title: "Create a Board", description: "Navigate to Status Boards in the dashboard and click 'New Board'. Give it a name (e.g., 'Production Status') and an optional description." },
        { title: "Add & Arrange Monitors", description: "Drag your existing uptime monitors onto the canvas, then drag-to-reposition and resize each card to build your layout. A board holds up to 60 monitors, and each workspace can keep up to 50 boards." },
        { title: "Save the Layout", description: "Your arrangement is persisted to the board. Stats and availability stripes follow the dashboard's selected time range." },
        { title: "Publish (Optional)", description: "Generate a public, view-only share link with an expiry to expose the board as a status page. Links can be revoked at any time, and deleting a board automatically tears down its share links." }
      ],
      troubleshooting: [
        {
          issue: "The public status page does not show monitor URLs.",
          solution: "This is intentional. Target URLs are stripped from public share payloads so a customer-facing status page never leaks your internal endpoints. The owner-facing board still shows full URLs."
        },
        {
          issue: "The availability stripe looks different across time ranges.",
          solution: "The stripe follows the selected range, which is divided into 60 equal segments. Each segment rolls up to its worst observed status, so a wider range aggregates more checks per segment — the stripe stays consistent with the range-scoped uptime and latency stats shown above it."
        },
        {
          issue: "Cannot create a new board ('Board limit reached').",
          solution: "Each workspace is limited to 50 status boards. Delete an unused board to free up a slot before creating another."
        }
      ]
    },
    {
      id: "ai-assistant",
      title: "AI Assistant",
      iconName: "Brain",
      shortDescription: "Investigate incidents in plain English with an agentic, bring-your-own-model assistant.",
      overview: "Ask questions about your telemetry in natural language and let the built-in agent investigate for you. It reasons step by step and calls read-only tools across your APM traces, RUM sessions, logs, errors, uptime checks, infrastructure, databases, alerts, and saved views — then returns a grounded answer with every reasoning step and tool call kept visible and auditable. Choose your execution engine: run a model fully in your browser via WebGPU for total privacy, bring your own cloud API key, or point at any self-hosted OpenAI-compatible endpoint. Conversation history is optional — you can keep chats entirely off the server.",
      prerequisites: [
        "An active Senzor workspace with telemetry to investigate.",
        "For local inference: a WebGPU-capable browser (Chrome 113+ or Edge 113+) with a compatible GPU.",
        "For cloud providers: your own API key for the chosen provider. Keys are stored locally in your browser and calls go directly to the provider — they are never sent to or stored on Senzor servers.",
        "For a custom endpoint: a reachable OpenAI-compatible API URL (e.g., Ollama, vLLM, or LM Studio)."
      ],
      registrationSteps: [
        { title: "Open the Assistant", description: "Navigate to AI Assistant in the dashboard sidebar." },
        { title: "Choose an Execution Engine", description: "Select Local (WebLLM) to run in-browser via WebGPU, a cloud provider (OpenAI, Anthropic, Google AI, Groq, Mistral, or OpenRouter) with your own key, or a Custom Endpoint for any OpenAI-compatible API." },
        { title: "Configure Access", description: "For local inference, pick a model sized to your GPU's available VRAM and load it. For a cloud provider, paste your API key. For a custom endpoint, enter the endpoint URL and model name." },
        { title: "Start Investigating", description: "Ask a question in plain English (e.g., 'Why did checkout latency spike at 14:30?') and watch the agent reason and query your telemetry to a grounded answer." }
      ],
      troubleshooting: [
        {
          issue: "WebGPU is not available in this browser.",
          solution: "Local (WebLLM) inference requires WebGPU. Use Chrome 113+ or Edge 113+ with a compatible GPU, or switch to a cloud provider or custom endpoint, neither of which needs WebGPU."
        },
        {
          issue: "The local model fails to load or runs very slowly.",
          solution: "The selected model likely needs more VRAM than your GPU reports. Choose a smaller model — for example Llama 3.2 3B or Qwen 2.5 1.5B — that fits within your hardware's available allocation."
        },
        {
          issue: "Are my API keys or conversations sent to Senzor?",
          solution: "API keys are stored locally in your browser and cloud calls are made directly to the provider — keys never reach Senzor servers. Conversation history is optional; disable it to keep chats entirely off the server."
        }
      ]
    },
    {
      id: "mcp",
      title: "MCP Server (AI Integration)",
      iconName: "Bot",
      shortDescription: "Natural language operational intelligence.",
      overview: "Seamlessly integrate your telemetry data with advanced Large Language Models like Claude or Cursor IDE. The Model Context Protocol (MCP) server exposes 50+ read-only tools spanning every pillar — APM, RUM, Logs, Uptime, Infrastructure, Databases, Queues, Errors, Alerts & Incidents, AI Monitoring and Billing — plus built-in investigation prompts (root-cause, incident triage, AI cost review) and addressable resources, so an agent can query, correlate and summarize your observability data in natural language. Connections use the modern Streamable HTTP transport.",
      prerequisites: [
        "An active Senzor workspace with existing telemetry.",
        "An MCP-compatible client (Cursor IDE, Claude Desktop, or any Streamable HTTP client)."
      ],
      registrationSteps: [
        { title: "Generate MCP Key", description: "Navigate to AI Integrations in the dashboard and generate a dedicated MCP API Key. Keys are hashed at rest, shown once, and revocable at any time." },
        { title: "Connect & Explore", description: "Add the server to your client using the configuration below. Your agent can then list every tool, read resources, and run the built-in investigation prompts as slash-commands." }
      ],
      installation: [
        {
          framework: "Cursor IDE",
          language: "json",
          code: `{\n  "mcpServers": {\n    "senzor": {\n      "url": "https://api.senzor.dev/api/mcp",\n      "headers": {\n        "Authorization": "Bearer <YOUR_MCP_KEY>"\n      }\n    }\n  }\n}`,
          notes: "Add this configuration to your Cursor settings under Features > MCP. Cursor auto-detects the Streamable HTTP transport."
        },
        {
          framework: "Claude Desktop",
          language: "bash",
          code: `claude mcp add --transport http senzor-api https://api.senzor.dev/api/mcp --header "Authorization: Bearer <YOUR_MCP_KEY>"`,
          notes: "Run this command in your terminal if you have the Claude CLI installed. Request throughput is rate-limited per plan (see Pricing)."
        }
      ]
    },
    {
      id: "alerts",
      title: "Alerts & Incident Routing",
      iconName: "BellRing",
      shortDescription: "Multi-condition threshold evaluation and routing.",
      overview: "Define complex alert policies across all your telemetry streams using Senzor's Safe MQL. Route critical incidents to your team via Webhooks or Slack before customers notice.",
      prerequisites: [
        "An incoming Webhook URL from Slack, Discord, or OpsGenie."
      ],
      registrationSteps: [
        { title: "Create Policy", description: "Navigate to Alerts & Incidents and click 'Create Policy'." },
        { title: "Define MQL Trigger", description: "Write your evaluation condition using MQL." },
        { title: "Attach Destination", description: "Provide your Slack or Custom Webhook URL to route the notification payload." }
      ],
      installation: [
        {
          framework: "MQL Examples",
          language: "sql",
          code: `// Alert if more than 50 errors occur in 5 minutes\nCOUNT(status == 500) > 50 in 5m\n\n// Alert if Average APM latency exceeds 2 seconds\nAVG(duration) > 2000 in 15m\n\n// Alert if specific critical route fails\nCOUNT(route == "/api/checkout" AND status >= 400) > 5 in 1m`,
          notes: "Alerts are evaluated continuously on a rolling window."
        }
      ]
    },
    {
      id: "opentelemetry",
      title: "Native OpenTelemetry Support",
      iconName: "Layers",
      shortDescription: "Vendor-neutral OTLP telemetry ingestion.",
      overview: "Stream traces and metrics directly from your Go, Java, Python, or Rust applications without proprietary agents. Senzor natively translates standard OTLP HTTP payloads into specialized dashboard schemas.",
      prerequisites: [
        "An application instrumented with standard OpenTelemetry SDKs."
      ],
      registrationSteps: [
        { title: "Use Existing Key", description: "You do not need a special OTLP key. Senzor OTLP ingestion accepts your standard APM or Task service API keys." },
        { title: "Configure Endpoint", description: "Point your OTLP exporter to Senzor's ingestion endpoint and pass your key via the Authorization header." }
      ],
      installation: [
        {
          framework: "OTel Collector Config",
          language: "yaml",
          code: `exporters:\n  otlphttp/senzor:\n    endpoint: "https://api.senzor.dev/v1/traces"\n    headers:\n      Authorization: "Bearer <YOUR_APM_API_KEY>"\n\nservice:\n  pipelines:\n    traces:\n      receivers: [otlp]\n      exporters: [otlphttp/senzor]`,
          notes: "Senzor specifically requires the `otlphttp` exporter protocol. gRPC is not currently supported for external ingestion."
        },
        {
          framework: "Node.js (Express / Fastify)",
          language: "typescript",
          code: `npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-logs-otlp-http @opentelemetry/sdk-logs\n\n// tracing.ts\nimport { NodeSDK } from "@opentelemetry/sdk-node";\nimport { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";\nimport { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";\nimport { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";\nimport { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";\n\nconst sdk = new NodeSDK({\n  traceExporter: new OTLPTraceExporter({\n    url: "https://api.senzor.dev/api/otlp/v1/traces",\n    headers: { Authorization: "Bearer <YOUR_APM_API_KEY>" },\n  }),\n  logRecordProcessors: [\n    new SimpleLogRecordProcessor(\n      new OTLPLogExporter({\n        url: "https://api.senzor.dev/api/otlp/v1/logs",\n        headers: { Authorization: "Bearer <YOUR_APM_API_KEY>" },\n      })\n    ),\n  ],\n  instrumentations: [getNodeAutoInstrumentations()],\n});\n\nsdk.start();`,
          notes: "Run your application by importing this configuration file before your main entry point: `node --import ./dist/tracing.js dist/server/index.js`. This provides zero-touch auto-instrumentation for your Node.js backend."
        }
      ],
      troubleshooting: [
        {
          issue: "Authentication Failure (401/403).",
          solution: "Ensure you are passing the header exactly as `Authorization: Bearer <API_KEY>`. The backend automatically resolves if the key belongs to an APM or Task service to ensure strict tenant isolation."
        }
      ]
    }
  ]
};