import React from "react";
import Link from "next/link";
import { Navbar, Footer } from "../components/Layout";
import { Button, cn } from "../components/Core";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { FEATURES_DATA, renderDiagram } from "../utils/featuresData";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/auth";

// ============================================================================
// LAYERED ARCHITECTURE MAPPING DIAGRAM (Redesigned Enterprise Flow)
// ============================================================================
const ArchitectureFlowDiagram = () => (
  <div className="w-full max-w-6xl mx-auto my-16 border border-border/40 rounded-2xl bg-card overflow-hidden relative flex flex-col shadow-sm">
    {/* Subtle Grid Background */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]"></div>

    <div className="relative z-10 p-8 md:p-12">
      <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-between">
        {/* Phase 1: Edge & Client */}
        <div className="flex-1 w-full bg-blue-500/5 border border-blue-500/20 p-6 rounded-xl relative group">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Edge &
            Client
          </div>
          <div className="space-y-3">
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Web Analytics
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Real User Monitoring (RUM)
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Synthetic Uptime Checks
            </div>
          </div>
          {/* Connecting line to middle */}
          <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-px bg-border">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 border-t border-r border-border"></div>
          </div>
        </div>

        {/* Phase 2: Application Core */}
        <div className="flex-1 w-full bg-orange-500/5 border border-orange-500/20 p-6 rounded-xl relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>{" "}
            Application Core
          </div>
          <div className="space-y-3">
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm flex justify-between">
              APM Traces{" "}
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 rounded flex items-center">
                OTLP
              </span>
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Global Error Tracking
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm flex justify-between">
              Background Tasks{" "}
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 rounded flex items-center">
                OTLP
              </span>
            </div>
          </div>
          {/* Connecting line to right */}
          <div className="hidden md:block absolute top-1/2 -right-12 w-12 h-px bg-border">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 border-t border-r border-border"></div>
          </div>
        </div>

        {/* Phase 3: Infrastructure */}
        <div className="flex-1 w-full bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-xl relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
            Infrastructure
          </div>
          <div className="space-y-3">
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Server / VPS Monitoring
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm">
              Database Telemetry
            </div>
            <div className="bg-card border border-border p-3 rounded-lg text-sm font-medium shadow-sm text-muted-foreground border-dashed">
              3rd Party Integrations
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Platform Foundation (Cross-cutting) */}
    <div className="relative z-10 bg-muted/20 border-t border-border/40 p-6 px-8 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Senzor Platform Foundation
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
        <span className="text-foreground">Log Management</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground">Dashboards</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground">Alerts</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground">MCP AI Server</span>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-grow">
        {/* --- HERO SECTION --- */}
        <section className="relative px-4 pt-32 pb-24 w-full flex flex-col items-center justify-center min-h-[75vh] border-b border-border/30">
          <AnimatedBackground />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8 mt-12">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Unified Visibility.
              <br />
              Uncompromised Control.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Gain complete observability into your microservices,
              infrastructure, and user experience. One cohesive control plane to
              monitor, troubleshoot, and scale your engineering operations
              securely.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Link href={user ? "/dashboard" : "/login"}>
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
                >
                  {user ? "Go to Dashboard" : "Start for free"}
                </Button>
              </Link>
              <Link href="/demo" target="_blank">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full border-border bg-card/50 backdrop-blur hover:bg-muted/50 hover:text-foreground"
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* --- LIFECYCLE ARCHITECTURE MAPPING --- */}
        <section className="px-4 py-24 border-b border-border/30 bg-muted/5 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto mb-8 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Full-Stack Observability Across the Development Lifecycle
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              From the client's browser to the deepest database query, Senzor
              provides native instrumentation and seamless data correlation.
            </p>
          </div>
          <ArchitectureFlowDiagram />
        </section>

        {/* --- FEATURES & SERVICES (JSON DRIVEN) --- */}
        <section className="py-32 bg-background relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-40 relative z-10">
            {FEATURES_DATA.map((feature, index) => {
              const isReversed = index % 2 !== 0;
              // Extract text color from feature config to colorize text areas semantically
              const textColor =
                feature.colorClasses
                  ?.split(" ")
                  .find((c) => c.startsWith("text-")) || "text-primary";

              return (
                <div
                  key={feature.id}
                  className={cn(
                    "flex flex-col lg:flex-row items-center gap-12 lg:gap-24",
                    isReversed ? "lg:flex-row-reverse" : "",
                  )}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-lg font-medium text-foreground/80 mb-4">
                        {feature.subtitle}
                      </p>
                      <p className="text-muted-foreground leading-relaxed mb-8">
                        {feature.description}
                      </p>
                    </div>

                    <ul className="space-y-4">
                      {feature.points.map((point, ptIdx) => (
                        <li
                          key={ptIdx}
                          className="flex items-start gap-3 text-sm font-medium text-muted-foreground"
                        >
                          <Check
                            className={cn("w-5 h-5 shrink-0", textColor)}
                          />
                          <span className="mt-0.5">{point}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-6">
                      <Link
                        href={feature.href}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-bold transition-colors group hover:opacity-80",
                          textColor,
                        )}
                      >
                        Explore {feature.title}{" "}
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* Abstract Diagram UI Payload */}
                  <div className="flex-1 w-full lg:w-auto h-[360px] relative">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full transform translate-y-8 pointer-events-none z-0"></div>
                    <div className="relative z-10 w-full h-full">
                      {renderDiagram(feature.diagramId)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- PROFESSIONAL OUTRO SECTION --- */}
        <section className="relative px-4 py-32 w-full flex flex-col items-center justify-center border-t border-border/30 overflow-hidden">
          <AnimatedBackground />
          <div className="absolute inset-0 bg-background/80 z-0"></div>

          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Ready to gain full visibility?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join engineering teams who trust Senzor to monitor their
              production environments. Integration takes minutes with native
              OpenTelemetry support.
            </p>
            <div className="pt-6">
              <Link href={user ? "/dashboard" : "/login"}>
                <Button
                  size="lg"
                  className="h-14 px-10 font-bold text-base shadow-sm hover:scale-105 transition-transform duration-300"
                >
                  {user ? "Go to Dashboard" : "Start Monitoring Now"}{" "}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <p className="pt-4 text-xs text-muted-foreground font-mono uppercase tracking-widest opacity-70">
              Secure Cloud Infrastructure
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
