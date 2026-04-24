import { DocsLayout } from "../../components/DocsLayout";
import { DocHeader, DocSection } from "../../components/DocsUI";
import { Activity, Database, Terminal, Workflow } from "lucide-react";

export default function DocsIntroduction() {
  return (
    <DocsLayout>
      <DocHeader
        title="Introduction to Senzor"
        description="The complete observability platform for modern, high-throughput engineering teams."
      />

      <DocSection title="Platform Overview">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-w-4xl">
          <p>
            Senzor is an enterprise-grade observability and telemetry platform
            designed to provide total visibility into your distributed
            infrastructure, applications, and background processes. Built
            specifically for high-throughput environments, Senzor eliminates the
            need for fragmented monitoring tools by consolidating logs, metrics,
            traces, and uptime monitoring into a single, unified data pane.
          </p>
          <p>
            Whether you are tracking frontend Web Vitals (RUM), backend APM
            latency, Linux VPS resource utilization, or database query
            performance, Senzor's architecture ensures zero-config ingestion
            with sub-millisecond overhead on your production systems.
          </p>
        </div>
      </DocSection>

      <DocSection title="Core Architecture Concepts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
          {/* Card 1: Agents */}
          <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Terminal className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Universal Telemetry Agents
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Lightweight, open-source agents deployable across Node.js, Python,
              Go, and bare-metal Linux. They automatically instrument HTTP
              requests, database queries, and system resources with near-zero
              configuration and minimal CPU footprint.
            </p>
          </div>

          {/* Card 2: Storage */}
          <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Time-Series Data Engine
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              All ingested telemetry is structured and routed into a
              high-performance BSON storage vault. Data is strictly isolated by
              tenant and optimized for deep, historical time-series aggregations
              and instant retrieval.
            </p>
          </div>

          {/* Card 3: MQL */}
          <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Workflow className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                MQL Aggregation Pipeline
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Query your data natively using the MongoDB Aggregation Pipeline
              (MQL). This allows for infinite flexibility in shaping, grouping,
              and transforming your metrics directly from the UI without relying
              on rigid dashboard templates.
            </p>
          </div>

          {/* Card 4: Alerts */}
          <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Stateful Alert Watchdog
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              A distributed, stateful evaluation engine that continuously
              monitors your MQL rules against live incoming data streams. It
              intelligently tracks incident lifecycles to prevent alert fatigue
              and routes notifications via Webhooks.
            </p>
          </div>
        </div>
      </DocSection>
    </DocsLayout>
  );
}
