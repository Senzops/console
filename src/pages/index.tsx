import React from "react";
import Link from "next/link";
import { Navbar, Footer } from "../components/Layout";
import { Button, cn } from "../components/Core";
import { MeshBackground } from "../components/MeshBackground";
import { FEATURES_DATA, renderDiagram } from "../static/featuresData";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/auth";

// ============================================================================
// PRODUCT LIFECYCLE BAND
// ============================================================================
const LIFECYCLE_STAGES = [
  {
    label: "Build",
    caption: "Develop & instrument",
    accent: "#3b82f6",
    services: ["OpenTelemetry", "APM", "Error Tracking", "Background Tasks"],
  },
  {
    label: "Deploy",
    caption: "Ship & validate",
    accent: "#8b5cf6",
    services: ["Uptime Monitoring", "Log Management"],
  },
  {
    label: "Operate",
    caption: "Run in production",
    accent: "#10b981",
    services: [
      "Infrastructure",
      "Database",
      "Firebase",
      "Web Analytics",
      "Real User Monitoring",
    ],
  },
  {
    label: "Respond",
    caption: "Investigate & resolve",
    accent: "#f97316",
    services: ["Alerts & Incidents", "MCP Server", "Saved Views"],
  },
] as const;

const ProductLifecycleBand = () => (
  <div className="max-w-6xl mx-auto px-4 relative z-10">
    <div className="relative">
      {/* Connecting timeline — spans the centers of the first and last stage
          markers (each column is equal width, so 12.5% from each edge). */}
      <div
        aria-hidden
        className="hidden lg:block absolute top-[7px] left-[12.5%] right-[12.5%] h-px bg-border"
      />
      {/* Directional markers between stages (25% / 50% / 75% of the band). */}
      {[25, 50, 75].map((left) => (
        <ChevronRight
          key={left}
          aria-hidden
          className="hidden lg:block absolute top-[7px] w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40"
          style={{ left: `${left}%` }}
        />
      ))}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14">
        {LIFECYCLE_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex flex-col items-center">
            {/* Stage marker — masks the timeline behind it. */}
            <span
              className="block w-3.5 h-3.5 rounded-full bg-background border-2 relative z-10"
              style={{ borderColor: stage.accent }}
            />
            {/* Stage header */}
            <div className="mt-5 text-center">
              <span className="block text-[11px] font-mono tracking-widest text-muted-foreground/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1.5 text-lg font-bold font-display tracking-tight text-foreground">
                {stage.label}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stage.caption}
              </p>
            </div>
            {/* Services available at this stage */}
            <div className="mt-6 w-full max-w-[210px] flex flex-col gap-2">
              {stage.services.map((service) => (
                <div
                  key={service}
                  className="text-sm text-center text-muted-foreground bg-card border border-border/60 rounded-lg px-3 py-2 transition-colors hover:border-border hover:text-foreground"
                >
                  {service}
                </div>
              ))}
            </div>
          </div>
        ))}
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
      <Navbar transparentOnTop />

      <main className="flex-grow  overflow-x-hidden">
        {/* --- HERO SECTION --- */}
        <section className="relative px-4 pt-32 pb-24 w-full flex flex-col items-center justify-center h-screen border-b border-border/30 overflow-hidden">
          <MeshBackground className="absolute inset-0 z-0 opacity-80" />

          {/* This creates a central focal point, blurring the mesh directly behind the text, and fading it out at the edges */}
          <div className="absolute inset-0 z-10 bg-background/30 backdrop-blur-[2px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_30%,black_100%)] pointer-events-none" />

          {/* Bottom fade out to transition smoothly into the next page section */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

          <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8 mt-12">
            <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground leading-[1.1]">
              Unified Visibility.
              <br />
              <span className="text-foreground-secondary">
                Uncompromised Control.
              </span>
            </h1>

            <p className="text-base md:text-lg text-foreground-tertiary max-w-2xl mx-auto leading-relaxed">
              Gain complete observability across your applications,
              infrastructure, and user experience — one cohesive control plane
              to monitor, troubleshoot, and scale with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Link href={user ? "/dashboard" : "/login"}>
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
                >
                  Get Started
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

        {/* --- PROBLEM / SOLUTION --- */}
        <section className="px-4 py-24 border-b border-border/30 relative overflow-hidden">
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
              <div className="space-y-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  The Problem
                </p>
                <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground leading-snug">
                  Single-point tools create hidden complexity
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Multiple monitoring accounts, scattered telemetry, and costs
                  that grow exponentially as you scale. Teams waste hours
                  context-switching between siloed dashboards while real signals
                  drown in alert noise.
                </p>
              </div>
              <div className="space-y-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  The Solution
                </p>
                <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground leading-snug">
                  One platform designed to work together from the start
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Senzor unifies infrastructure monitoring, application
                  performance, user experience analytics, and incident response.
                  No data stitching, no webhook logic — correlated telemetry by
                  default with native OpenTelemetry support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- PRODUCT LIFECYCLE COVERAGE --- */}
        <section className="px-4 py-24 border-b border-border/30 bg-muted/5 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground">
              Where Senzor Fits in Your Product Lifecycle
            </h2>
          </div>
          <ProductLifecycleBand />
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
                      <h3 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground mb-3">
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
          <MeshBackground className="absolute inset-0 z-0 opacity-80" />
          <div className="absolute inset-0 bg-background/80 z-0"></div>

          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-foreground">
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
                  Start Monitoring Now{" "}
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
