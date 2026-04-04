import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Navbar, Footer } from "../../components/Layout";
import { Button, cn } from "../../components/Core";
import { AnimatedBackground } from "../../components/AnimatedBackground";
import { FEATURES_DATA, renderDiagram } from "../../utils/featuresData";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Activity,
  ShieldCheck,
  Box,
} from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function FeaturePage() {
  const router = useRouter();
  const { feature: featureParam } = router.query;
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Wrapping in a timeout prevents the synchronous "cascading renders" warning from React
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Find the requested feature from our Single Source of Truth
  const feature = FEATURES_DATA.find((f) => f.id === featureParam);


  // 404 State if feature doesn't exist
  if (!feature) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 h-screen">
          <Box className="w-16 h-16 text-muted-foreground opacity-20 mb-6" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Feature Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The capability you are looking for does not exist or has been moved.
          </p>
          <Link href="/">
            <Button>Return to Platform Overview</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract semantic text color for accents
  const textColor =
    feature.colorClasses?.split(" ").find((c) => c.startsWith("text-")) ||
    "text-primary";
  const bgColor =
    feature.colorClasses?.split(" ").find((c) => c.startsWith("bg-")) ||
    "bg-primary/10";
  const borderColor =
    feature.colorClasses?.split(" ").find((c) => c.startsWith("border-")) ||
    "border-primary/20";

  // Get 3 related features to showcase at the bottom (excluding the current one)
  const relatedFeatures = FEATURES_DATA.filter(
    (f) => f.id !== feature.id,
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-grow pt-20">
        {/* --- HERO SECTION --- */}
        <section className="relative px-4 pt-20 pb-32 border-b border-border/30 overflow-hidden">
          <AnimatedBackground />
          <div
            className={cn(
              "absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none -z-10 opacity-30 translate-x-1/3 -translate-y-1/4",
              bgColor,
            )}
          />
          <div
            className={cn(
              "absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none -z-10 opacity-20 -translate-x-1/3 translate-y-1/4",
              bgColor,
            )}
          />

          <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10 mt-8">
            <div className="space-y-8 max-w-3xl">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {feature.title}
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                {feature.subtitle} {feature.description}
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

            {/* FULL WIDE DIAGRAM */}
            <div className="w-full h-[350px] md:h-[450px] lg:h-[450px] relative mt-20 max-w-5xl mx-auto">
              <div
                className={cn(
                  "absolute inset-0 blur-3xl rounded-full transform pointer-events-none z-0 opacity-20",
                  bgColor,
                )}
              ></div>
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {renderDiagram(feature.diagramId)}
              </div>
            </div>
          </div>
        </section>

        {/* --- DEEP DIVE / CAPABILITIES GRID --- */}
        <section className="py-32 bg-muted/5 border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="max-w-3xl mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Core Capabilities
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Everything you need to monitor, troubleshoot, and optimize this
                layer of your stack out of the box.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {feature.points.map((point, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-6 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow flex items-start gap-4",
                    borderColor,
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg flex items-center justify-center shrink-0",
                      bgColor,
                    )}
                  >
                    <CheckCircle2 className={cn("w-6 h-6", textColor)} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">
                      {point}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Gain immediate visibility and actionable insights without
                      complex configuration or maintenance overhead.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust/Enterprise Banner */}
            <div className="mt-12 bg-background border border-border/60 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Enterprise-Ready Architecture
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Strict tenant isolation, GDPR compliance, and highly
                    available infrastructure.
                  </p>
                </div>
              </div>
              <Link href={user ? "/dashboard" : "/register"}>
                <Button variant="outline" className="font-semibold text-sm">
                  {user ? "Open Dashboard" : "Start Free Trial"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* --- EXPLORE PLATFORM SECTION --- */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Explore more of Senzor
              </h2>
              <Link
                href="/"
                className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                View all capabilities <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedFeatures.map((relFeature) => {
                const relTextColor =
                  relFeature.colorClasses
                    ?.split(" ")
                    .find((c) => c.startsWith("text-")) || "text-primary";
                const relBgColor =
                  relFeature.colorClasses
                    ?.split(" ")
                    .find((c) => c.startsWith("bg-")) || "bg-primary/10";
                const relBorderColor =
                  relFeature.colorClasses
                    ?.split(" ")
                    .find((c) => c.startsWith("border-")) ||
                  "border-primary/20";

                return (
                  <Link
                    href={relFeature.href}
                    key={relFeature.id}
                    className="group block"
                  >
                    <div
                      className={cn(
                        "h-full bg-card border rounded-2xl p-6 transition-all duration-300 hover:shadow-lg flex flex-col",
                        relBorderColor,
                        "hover:border-opacity-100",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                          relBgColor,
                        )}
                      >
                        <Activity className={cn("w-5 h-5", relTextColor)} />
                      </div>
                      <h4 className="text-lg font-bold text-foreground mb-2">
                        {relFeature.title}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {relFeature.subtitle}
                      </p>
                      <div
                        className={cn(
                          "mt-6 flex items-center gap-1 text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity",
                          relTextColor,
                        )}
                      >
                        Learn more{" "}
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
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
