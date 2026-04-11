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
          a: "Retention is tied to your active billing plan. Starter tier retains data for 3 days, Pro for 15 days, and Business for 30 days. After the TTL expires, data is cryptographically expunged by MongoDB."
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
          framework: "Linux (Bash / Systemd)",
          language: "bash",
          code: `export SERVER_ID="<YOUR_SERVER_ID>"\nexport API_KEY="<YOUR_API_KEY>"\ncurl -sL https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh | sudo -E bash -`,
          notes: "The installer automatically registers the agent with `systemctl` to ensure it restarts upon server reboot."
        }
      ],
      troubleshooting: [
        {
          issue: "Agent installs but shows 'Offline' in dashboard.",
          solution: "Check the systemd logs by running `sudo journalctl -u senzor-agent -f`. Ensure you do not have trailing spaces in your export variables."
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
          framework: "HTML (CDN)",
          language: "html",
          code: `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>window.Senzor.init({ webId: "<YOUR_WEB_ID>" })</script>`,
          notes: "Place this script in your `<head>` tag to accurately track pageviews before the user navigates away."
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
          framework: "React / Next.js / Vanilla JS",
          language: "html",
          code: `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>\n  window.Senzor.initRum({\n    apiKey: "<YOUR_RUM_KEY>",\n    sampleRate: 1.0,\n    allowedOrigins: ["https://api.yourbackend.com"]\n  });\n</script>`,
          notes: "Configuring `allowedOrigins` injects W3C Trace Context headers into outgoing fetch/XHR requests, bridging frontend RUM with backend APM traces."
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
          code: `npm install @senzops/apm-worker\n\n// server/plugins/senzor.ts\nimport { Senzor } from "@senzops/apm-worker";\n\nexport default defineNitroPlugin((nitroApp) => {\n  Senzor.init({\n    apiKey: "<YOUR_APM_KEY>",\n  });\n\n  Senzor.nitroPlugin(nitroApp);\n});`
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
      id: "mcp",
      title: "MCP Server (AI Integration)",
      iconName: "Bot",
      shortDescription: "Natural language operational intelligence.",
      overview: "Seamlessly integrate your telemetry data with advanced Large Language Models like Claude or Cursor IDE. Use the Model Context Protocol (MCP) to query, summarize, and analyze incidents using natural language.",
      prerequisites: [
        "An active Senzor workspace with existing telemetry.",
        "An MCP-compatible client (Cursor IDE, Claude Desktop)."
      ],
      registrationSteps: [
        { title: "Generate MCP Key", description: "Navigate to AI Integrations in the dashboard and generate a scoped MCP API Key." }
      ],
      installation: [
        {
          framework: "Cursor IDE",
          language: "json",
          code: `{\n  "mcpServers": {\n    "senzor": {\n      "url": "https://api.senzor.dev/api/mcp/sse",\n      "headers": {\n        "Authorization": "Bearer <YOUR_MCP_KEY>"\n      }\n    }\n  }\n}`,
          notes: "Add this configuration to your Cursor settings under Features > MCP."
        },
        {
          framework: "Claude Desktop",
          language: "bash",
          code: `claude mcp add --transport http senzor-api https://api.senzor.dev/api/mcp/sse --header "Authorization: Bearer <YOUR_MCP_KEY>"`,
          notes: "Run this command in your terminal if you have the Claude CLI installed."
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