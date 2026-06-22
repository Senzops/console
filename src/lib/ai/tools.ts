// ============================================================================
// AI Assistant — Tool Registry & Executor
// ============================================================================
// Synced with backend MCP tools (src/mcp/tools.ts) — 50 tools across 14
// categories. Each tool maps to a backend API endpoint accessed via the
// authenticated axios instance.

import { api } from '@/lib/auth';
import type { ToolSchema } from './types';

// ---------------------------------------------------------------------------
// Tool Definitions (50 tools)
// ---------------------------------------------------------------------------

export const AI_TOOLS: ToolSchema[] = [
  // --- APM (Backend) Tools ---
  {
    type: 'function',
    function: {
      name: 'apm_list_services',
      description: 'List all active APM (Backend) services and their IDs.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apm_get_stats',
      description:
        'Get performance aggregations (latency, RPS) for an APM service.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Service ID' },
          range: { type: 'string', description: 'Time range (default: 24h)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apm_get_invocations',
      description:
        'Get a list of recent HTTP trace invocations for a service.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apm_get_trace_detail',
      description:
        'Get the full execution waterfall (spans) for a specific traceId.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          traceId: { type: 'string' },
        },
        required: ['id', 'traceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apm_get_runtime_stats',
      description:
        'Get Node.js runtime health metrics: event loop lag/utilization, GC frequency/duration, heap memory usage, CPU usage, active handles.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string', description: 'Time range (default: 1h)' },
        },
        required: ['id'],
      },
    },
  },

  // --- RUM (Web APM) Tools ---
  {
    type: 'function',
    function: {
      name: 'rum_list_services',
      description: 'List all active RUM (Frontend Web APM) applications.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rum_get_dashboard',
      description:
        'Get Web Vitals (LCP, INP, CLS) and page views for a RUM app.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rum_get_trace_detail',
      description:
        'Get the frontend execution trace (XHR/Fetch spans) for a RUM traceId.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          traceId: { type: 'string' },
        },
        required: ['id', 'traceId'],
      },
    },
  },

  // --- Background Tasks Tools ---
  {
    type: 'function',
    function: {
      name: 'task_list_services',
      description: 'List all Background Task services.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'task_get_dashboard',
      description:
        'Get job execution metrics (failures, delays, durations).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'task_get_entity_detail',
      description:
        'Get specific historical performance for a single task queue/cron name.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskName: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id', 'taskName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'task_get_run_detail',
      description:
        'Get the detailed spans and metadata for a specific task runId.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          runId: { type: 'string' },
        },
        required: ['id', 'runId'],
      },
    },
  },

  // --- Logs Tools ---
  {
    type: 'function',
    function: {
      name: 'logs_query',
      description: 'Search system logs. Use filters like level:error.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search query' },
          range: { type: 'string' },
          limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'logs_get_by_id',
      description:
        'Get the full payload of a single log by its MongoDB _id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'logs_get_by_trace',
      description:
        'Get all logs explicitly attached to an APM/RUM traceId or Task runId.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          traceId: { type: 'string' },
        },
        required: ['id', 'traceId'],
      },
    },
  },

  // --- Error Tracking Tools ---
  {
    type: 'function',
    function: {
      name: 'error_get_global',
      description:
        'Get a list of unresolved exception groups across the platform.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'error_get_group_detail',
      description:
        'Get details and recent occurrences of a specific error fingerprint (groupId).',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['groupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'error_get_trace_errors',
      description:
        'Get raw error events that occurred during a specific APM traceId.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          traceId: { type: 'string' },
        },
        required: ['id', 'traceId'],
      },
    },
  },

  // --- Web Analytics Tools ---
  {
    type: 'function',
    function: {
      name: 'web_list_websites',
      description:
        'List all standard Web Analytics (Non-RUM) tracking properties.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_get_stats',
      description:
        'Get pageviews, visitors, and referrers for a standard Web Analytics property.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- Uptime Monitor Tools ---
  {
    type: 'function',
    function: {
      name: 'uptime_list_monitors',
      description: 'List all external uptime monitors (cron pingers).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uptime_get_stats',
      description:
        'Get uptime percentage, latency, and status history for a monitor.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- Infrastructure (VPS) Tools ---
  {
    type: 'function',
    function: {
      name: 'vps_list',
      description: 'List monitored Linux VPS servers.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'vps_get_stats',
      description:
        'Get CPU, RAM, Disk, Network, and Docker metrics for a VPS.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- Firebase Monitoring Tools ---
  {
    type: 'function',
    function: {
      name: 'firebase_list',
      description:
        'List all monitored Firebase projects and their connection status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'firebase_get_stats',
      description:
        'Get Firebase Auth metrics: total users, active users, new signups, provider breakdown (Google, Apple, Email, etc.), MFA enrollment, historical trends.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- Database Tools ---
  {
    type: 'function',
    function: {
      name: 'database_list',
      description:
        'List monitored database instances (MongoDB, Redis, PostgreSQL, MySQL).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'database_get_stats',
      description: 'Get database throughput and latency metrics.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- Queue Monitoring Tools (BullMQ, RabbitMQ, Kafka, AWS SQS) ---
  {
    type: 'function',
    function: {
      name: 'queue_list',
      description:
        'List monitored queue sources (BullMQ, RabbitMQ, Kafka, AWS SQS), their broker system, mode, and status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_get_stats',
      description:
        'Get a queue source overview: total backlog, in-flight, dead-letter depth, consumer count, the per-queue table, and overall throughput/backlog history across all queues.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, range: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_get_entity_detail',
      description:
        "Get one queue's detail within a source: backlog, dead letters, throughput, oldest-message age, consumers, drain ETA, and time-series history. queueName is the exact name from queue_get_stats.",
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, queueName: { type: 'string' }, range: { type: 'string' } },
        required: ['id', 'queueName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_get_executions',
      description:
        'Get instrumented consumer executions correlated to a queue (run count, failure rate, dead letters, avg processing time, recent runs). Explains WHY a queue is backing up or draining.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, queue: { type: 'string' }, range: { type: 'string' } },
        required: ['id', 'queue'],
      },
    },
  },

  // --- Alerts & Incident Tools ---
  {
    type: 'function',
    function: {
      name: 'alerts_list_destinations',
      description:
        'List all configured alert destinations (channels) like Webhooks or Slack.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alerts_list_policies',
      description:
        'List all alert policies and their summary statistics including open incident counts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alerts_get_policy_details',
      description:
        'Get detailed information about a specific alert policy, its evaluation conditions, and incident history.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alerts_list_incidents',
      description:
        'List alert incidents with filtering by status (open/acknowledged/resolved), severity (critical/high/medium/low), and policyId.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status: all, open, acknowledged, resolved',
            enum: ['all', 'open', 'acknowledged', 'resolved'],
          },
          severity: {
            type: 'string',
            description: 'Filter by severity: all, critical, high, medium, low',
            enum: ['all', 'critical', 'high', 'medium', 'low'],
          },
          policyId: { type: 'string', description: 'Filter by policy ID' },
          limit: { type: 'number', description: 'Max results (default: 50, max: 100)' },
          sort: { type: 'string', description: 'Sort field (default: -openedAt)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alerts_get_incident_detail',
      description:
        'Get full details of a specific incident: triggering condition, policy, severity, timeline of events, and associated metadata.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alerts_list_silences',
      description:
        'List all active and scheduled alert silences (maintenance windows) with their scope and duration.',
      parameters: { type: 'object', properties: {} },
    },
  },

  // --- Saved Views (Canvas Dashboards) Tools ---
  {
    type: 'function',
    function: {
      name: 'views_list_dashboards',
      description:
        'List all custom saved views (dashboards) and their layouts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'views_get_dashboard',
      description:
        'Get the layout and widget configurations for a specific custom dashboard.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'views_get_widget_data',
      description:
        'Execute the aggregation pipeline for a specific dashboard widget and return the computed data.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },

  // --- AI Monitoring (LLM Observability) Tools ---
  {
    type: 'function',
    function: {
      name: 'ai_list_sources',
      description:
        'List all AI Monitoring sources (LLM observability projects), their type (server/browser) and last-seen time.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ai_get_stats',
      description:
        'AI source overview for a range: total cost (USD), LLM calls, tokens, error rate, latency p50/p95/p99, cost/token/latency time series, and breakdowns by model, provider and operation.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'AI source ID' },
          range: { type: 'string', description: 'Time range (default: 24h)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ai_get_consumers',
      description:
        'Top users and top sessions for an AI source by cost (also calls, tokens, traces) — attributes LLM spend to end-users or conversations.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ai_get_traces',
      description:
        "List recent AI traces (workflows) with status, generation count, cost, tokens and latency. Filter by status ('ok'|'error') and sessionId.",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          range: { type: 'string' },
          status: { type: 'string' },
          sessionId: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ai_get_trace_detail',
      description:
        'One AI trace and its generation waterfall (each LLM/tool/retrieval/embedding call with provider, model, tokens, cost, latency, finish reason and status).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          traceId: { type: 'string' },
        },
        required: ['id', 'traceId'],
      },
    },
  },

  // --- Dynamic Schema Explorer Tool ---
  {
    type: 'function',
    function: {
      name: 'schema_get_dynamic',
      description:
        'Get the dynamically inferred schema map for all telemetry data types. Useful for generating precise aggregation queries.',
      parameters: { type: 'object', properties: {} },
    },
  },

  // --- Billing & Subscription Tools ---
  {
    type: 'function',
    function: {
      name: 'billing_get_storage_stats',
      description:
        'Get current platform storage limits and actual usage statistics for the user.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'billing_get_subscription',
      description:
        "Get the user's current active subscription details, tier, and status.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'billing_get_transactions',
      description:
        "Get the user's billing transaction and payment history.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'billing_get_transaction_receipt',
      description:
        'Get the downloadable receipt details or link for a specific billing transaction.',
      parameters: {
        type: 'object',
        properties: { transactionId: { type: 'string' } },
        required: ['transactionId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'billing_get_active_plans',
      description:
        'List all currently available public pricing tiers and platform plans.',
      parameters: { type: 'object', properties: {} },
    },
  },

  // --- Platform Capabilities Tool ---
  {
    type: 'function',
    function: {
      name: 'platform_get_capabilities',
      description:
        "Get the user's data retention limits per service type and all available time range options. Essential for constructing valid time range queries.",
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Executor — maps tool names to API calls
// ---------------------------------------------------------------------------

const RETRYABLE_STATUSES = new Set([502, 503, 504]);

export async function fetchToolData(
  toolName: string,
  args: any,
): Promise<any> {
  const params = { range: args?.range || '24h' };

  switch (toolName) {
    // APM
    case 'apm_list_services':
      return (await api.get('/apm/list')).data;
    case 'apm_get_stats':
      return (await api.get(`/apm/${args.id}/stats`, { params })).data;
    case 'apm_get_invocations':
      return (
        await api.get(`/apm/${args.id}/invocations`, {
          params: { limit: 10 },
        })
      ).data;
    case 'apm_get_trace_detail':
      return (await api.get(`/apm/${args.id}/trace/${args.traceId}`)).data;
    case 'apm_get_runtime_stats':
      return (
        await api.get(`/apm/${args.id}/runtime`, {
          params: { range: args?.range || '1h' },
        })
      ).data;

    // RUM
    case 'rum_list_services':
      return (await api.get('/rum/list')).data;
    case 'rum_get_dashboard':
      return (await api.get(`/rum/${args.id}/dashboard`, { params })).data;
    case 'rum_get_trace_detail':
      return (await api.get(`/rum/${args.id}/trace/${args.traceId}`)).data;

    // Tasks
    case 'task_list_services':
      return (await api.get('/task/list')).data;
    case 'task_get_dashboard':
      return (await api.get(`/task/${args.id}/dashboard`, { params })).data;
    case 'task_get_entity_detail':
      return (
        await api.get(
          `/task/${args.id}/entity/${encodeURIComponent(args.taskName)}`,
          { params },
        )
      ).data;
    case 'task_get_run_detail':
      return (await api.get(`/task/${args.id}/run/${args.runId}`)).data;

    // Infrastructure
    case 'vps_list':
      return (await api.get('/vps/list')).data;
    case 'vps_get_stats':
      return (await api.get(`/vps/${args.id}/stats`, { params })).data;
    case 'database_list':
      return (await api.get('/database/list')).data;
    case 'database_get_stats':
      return (await api.get(`/database/${args.id}/stats`, { params })).data;

    // Queue Monitoring
    case 'queue_list':
      return (await api.get('/queue/list')).data;
    case 'queue_get_stats':
      return (await api.get(`/queue/${args.id}/stats`, { params })).data;
    case 'queue_get_entity_detail':
      return (
        await api.get(
          `/queue/${args.id}/entity/${encodeURIComponent(args.queueName)}`,
          { params },
        )
      ).data;
    case 'queue_get_executions':
      return (
        await api.get(`/queue/${args.id}/executions`, {
          params: { ...params, queue: args.queue },
        })
      ).data;

    // AI Monitoring (LLM Observability)
    case 'ai_list_sources':
      return (await api.get('/ai/observability/list')).data;
    case 'ai_get_stats':
      return (await api.get(`/ai/observability/${args.id}/stats`, { params })).data;
    case 'ai_get_consumers':
      return (await api.get(`/ai/observability/${args.id}/consumers`, { params })).data;
    case 'ai_get_traces':
      return (
        await api.get(`/ai/observability/${args.id}/traces`, {
          params: { ...params, status: args.status, sessionId: args.sessionId, limit: args.limit },
        })
      ).data;
    case 'ai_get_trace_detail':
      return (
        await api.get(
          `/ai/observability/${args.id}/trace/${encodeURIComponent(args.traceId)}`,
        )
      ).data;

    // Firebase
    case 'firebase_list':
      return (await api.get('/firebase/list')).data;
    case 'firebase_get_stats':
      return (await api.get(`/firebase/${args.id}/stats`, { params })).data;

    // Logs & Errors
    case 'logs_query':
      return (
        await api.get('/logs', {
          params: {
            search: args?.search || '',
            limit: Math.min(args?.limit || 20, 50),
            range: args?.range || '24h',
          },
        })
      ).data;
    case 'logs_get_by_id':
      return (await api.get(`/logs/${args.id}`)).data;
    case 'logs_get_by_trace':
      return (
        await api.get(`/apm/${args.id}/trace/${args.traceId}/logs`)
      ).data;

    case 'error_get_global':
      return (
        await api.get('/errors', {
          params: { limit: 15, status: 'unresolved' },
        })
      ).data;
    case 'error_get_group_detail':
      return (await api.get(`/errors/${args.groupId}`, { params })).data;
    case 'error_get_trace_errors':
      return (
        await api.get(`/apm/${args.id}/trace/${args.traceId}/errors`)
      ).data;

    // Web Analytics & Monitors
    case 'web_list_websites':
      return (await api.get('/web/list')).data;
    case 'web_get_stats':
      return (await api.get(`/web/${args.id}/stats`, { params })).data;
    case 'uptime_list_monitors':
      return (await api.get('/uptime/list')).data;
    case 'uptime_get_stats':
      return (await api.get(`/uptime/${args.id}/stats`, { params })).data;

    // Alerts & Incidents
    case 'alerts_list_destinations':
      return (await api.get('/alerts/destinations')).data;
    case 'alerts_list_policies':
      return (await api.get('/alerts/policies')).data;
    case 'alerts_get_policy_details':
      return (await api.get(`/alerts/policies/${args.id}`)).data;
    case 'alerts_list_incidents':
      return (
        await api.get('/alerts/incidents', {
          params: {
            status: args?.status || 'all',
            severity: args?.severity || 'all',
            ...(args?.policyId ? { policyId: args.policyId } : {}),
            limit: Math.min(args?.limit || 50, 100),
            sort: args?.sort || '-openedAt',
          },
        })
      ).data;
    case 'alerts_get_incident_detail':
      return (await api.get(`/alerts/incidents/${args.id}`)).data;
    case 'alerts_list_silences':
      return (await api.get('/alerts/silences')).data;

    // Saved Views
    case 'views_list_dashboards':
      return (await api.get('/views')).data;
    case 'views_get_dashboard':
      return (await api.get(`/views/${args.id}`)).data;
    case 'views_get_widget_data':
      return (
        await api.get(`/views/widgets/${args.id}/data`, { params })
      ).data;

    // Schema & Billing
    case 'schema_get_dynamic':
      return (await api.get('/schema')).data;
    case 'billing_get_storage_stats':
      return (await api.get('/billing/storage-stats')).data;
    case 'billing_get_subscription':
      return (await api.get('/billing/subscription')).data;
    case 'billing_get_transactions':
      return (await api.get('/billing/transactions')).data;
    case 'billing_get_transaction_receipt':
      return (
        await api.get(
          `/billing/transactions/${args.transactionId}/receipt`,
        )
      ).data;
    case 'billing_get_active_plans':
      return (await api.get('/billing/plans')).data;

    // Platform Capabilities
    case 'platform_get_capabilities':
      return (await api.get('/dashboard/capabilities')).data;

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function fetchToolDataWithRetry(
  toolName: string,
  args: any,
): Promise<any> {
  try {
    return await fetchToolData(toolName, args);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && RETRYABLE_STATUSES.has(status)) {
      await new Promise((r) => setTimeout(r, 600));
      return await fetchToolData(toolName, args);
    }
    const apiMsg =
      err?.response?.data?.message || err?.response?.data?.error;
    if (apiMsg) throw new Error(apiMsg);
    throw err;
  }
}
