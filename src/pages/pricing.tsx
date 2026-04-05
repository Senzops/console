import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Script from "next/script";
import { Navbar, Footer } from "../components/Layout";
import { Button, cn } from "../components/Core";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { useAuth } from "../lib/auth";
import {
  Check,
  Minus,
  HelpCircle,
  Building2,
  Zap,
  Loader2,
} from "lucide-react";

// Types matching the backend response
interface BackendPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxServicesPerType: number;
  maxIngestionBytes: number;
  retentionDays: number;
  paddlePriceIdMonthly: string | null;
  paddlePriceIdAnnual: string | null;
}

// UI configuration mapping
const PLAN_UI_META: Record<string, any> = {
  starter: {
    description: "Perfect for side projects and MVPs.",
    features: [
      "2 GB pooled ingestion/month",
      "3-day data retention",
      "1 service per type (APM, RUM, etc.)",
      "Community support",
    ],
    ctaText: "Start for free",
    popular: false,
  },
  pro: {
    description: "For production applications and small teams.",
    features: [
      "15 GB pooled ingestion/month",
      "15-day data retention",
      "5 services per type",
      "Email support",
      "Basic alerting",
    ],
    ctaText: "Upgrade to Pro",
    popular: true,
  },
  business: {
    description: "For scaling engineering organizations.",
    features: [
      "100 GB pooled ingestion/month",
      "30-day data retention",
      "Unlimited services",
      "Priority support SLA",
      "Advanced incident routing",
    ],
    ctaText: "Upgrade to Business",
    popular: false,
  },
};

const COMPARE_FEATURES = [
  {
    category: "Ingestion & Limits",
    items: [
      {
        name: "Pooled Data Ingestion",
        starter: "2 GB / mo",
        pro: "15 GB / mo",
        business: "100 GB / mo",
        enterprise: "Custom Volume",
      },
      {
        name: "Data Retention",
        starter: "3 Days",
        pro: "15 Days",
        business: "30 Days",
        enterprise: "90+ Days",
      },
      {
        name: "Services (APM, RUM, DB)",
        starter: "1 per type",
        pro: "5 per type",
        business: "Unlimited",
        enterprise: "Unlimited",
      },
    ],
  },
  {
    category: "Platform Capabilities",
    items: [
      {
        name: "Native OpenTelemetry (OTLP)",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Distributed Tracing (APM)",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Infrastructure & VPS",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paddleReady, setPaddleReady] = useState(false);

  // Fetch true backend limits and Paddle Price IDs
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/billing/plans`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch pricing configs:", err);
        setLoading(false);
      });
  }, []);

  // Initialize Paddle v2
  const initializePaddle = () => {
    if (typeof window !== "undefined" && (window as any).Paddle) {
      (window as any).Paddle.Environment.set(
        process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox",
      );
      (window as any).Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
      });
      setPaddleReady(true);
    }
  };

  // Centralized Checkout / CTA Handler
  const handleCheckout = (
    planId: string,
    paddlePriceIdMonthly: string | null,
    paddlePriceIdAnnual: string | null,
  ) => {
    // 1. Strict Auth Check
    if (!user) {
      return router.push("/login");
    }

    // 2. Route Free Tier
    if (planId === "starter") {
      return router.push("/dashboard");
    }

    // 3. Trigger Paddle Checkout
    const priceId = annual ? paddlePriceIdAnnual : paddlePriceIdMonthly;

    if (!priceId) {
      console.error("Missing Paddle Price ID for plan:", planId);
      return;
    }

    if (paddleReady && (window as any).Paddle) {
      (window as any).Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email }, // Pre-fill email
        customData: { ownerId: user.uid }, // CRITICAL: This is passed to the Webhook securely
      });
    } else {
      console.error("Paddle is not initialized yet.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navbar />

      {/* Paddle JS v2 Script Injection */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="lazyOnload"
        onLoad={initializePaddle}
      />

      <main className="flex-grow pt-24 pb-32">
        {/* --- HERO SECTION --- */}
        <section className="relative px-4 pt-16 pb-16 max-w-7xl mx-auto text-center">
          <AnimatedBackground />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground mb-6 leading-[1.1] text-balance relative z-10">
            Simple, predictable pricing.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed relative z-10">
            Start for free. Scale infinitely. We pool your data limits across
            APM, Logs, and Infrastructure so you never have to micromanage your
            telemetry.
          </p>

          <div className="flex items-center justify-center gap-3 relative z-10">
            <span
              className={cn(
                "text-sm font-medium",
                !annual ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-8 rounded-full bg-muted border border-border/60 transition-colors focus:outline-none"
            >
              <div
                className={cn(
                  "absolute top-1 left-1 bg-primary w-6 h-6 rounded-full transition-transform",
                  annual ? "translate-x-6" : "translate-x-0",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium flex items-center gap-1.5",
                annual ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Annually{" "}
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Save 20%
              </span>
            </span>
          </div>
        </section>

        {/* --- PRICING CARDS --- */}
        <section className="px-4 pb-24 relative z-10 max-w-7xl mx-auto">
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-[400px]">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {plans
                .filter((p) => p.id !== "enterprise")
                .map((plan) => {
                  const meta = PLAN_UI_META[plan.id] || PLAN_UI_META.starter;
                  const price = annual
                    ? Math.floor(plan.priceAnnual / 12)
                    : plan.priceMonthly;

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative flex flex-col bg-card border rounded-2xl p-8 shadow-sm transition-all duration-300",
                        meta.popular
                          ? "border-primary shadow-primary/10 scale-100 md:scale-105 z-10"
                          : "border-border/60",
                      )}
                    >
                      {meta.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                          Most Popular
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground h-10">
                          {meta.description}
                        </p>
                      </div>

                      <div className="mb-8 flex items-baseline gap-1">
                        {plan.priceMonthly === 0 ? (
                          <span className="text-5xl font-extrabold tracking-tighter">
                            Free
                          </span>
                        ) : (
                          <>
                            <span className="text-5xl font-extrabold tracking-tighter">
                              ${price}
                            </span>
                            <span className="text-muted-foreground font-medium">
                              /mo
                            </span>
                            {annual && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Billed annually)
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="mb-8">
                        <Button
                          onClick={() =>
                            handleCheckout(
                              plan.id,
                              plan.paddlePriceIdMonthly,
                              plan.paddlePriceIdAnnual,
                            )
                          }
                          className={cn(
                            "w-full h-12 font-semibold text-base",
                            meta.popular ? "shadow-md" : "",
                          )}
                          variant={meta.popular ? "default" : "outline"}
                        >
                          {!user
                            ? "Get Started"
                            : plan.id === "starter"
                              ? "Go to Dashboard"
                              : meta.ctaText}
                        </Button>
                      </div>

                      <div className="flex-1 space-y-4">
                        {meta.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {feat}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Enterprise Block */}
          <div className="mt-8 bg-gradient-to-r from-card to-card border border-border/60 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Enterprise
                </h3>
                <p className="text-muted-foreground">
                  Custom ingestion volumes, 90+ day retention, dedicated
                  support, and custom BAAs/SLAs for large organizations.
                </p>
              </div>
            </div>
            <a
              href="mailto:sales@senzor.dev"
              className="shrink-0 w-full md:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 px-8 font-semibold bg-background"
              >
                Contact Sales
              </Button>
            </a>
          </div>
        </section>

        {/* --- COMPARISON MATRIX --- */}
        <section className="px-4 py-24 max-w-6xl mx-auto border-t border-border/30">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Compare all features
            </h2>
            <p className="text-muted-foreground text-lg">
              Detailed breakdown of platform limits and capabilities.
            </p>
          </div>
          <div className="overflow-x-auto pb-8">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="w-1/3 p-4 bg-background sticky left-0 z-10 border-b border-border"></th>
                  <th className="p-4 border-b border-border text-foreground font-bold text-lg">
                    Starter
                  </th>
                  <th className="p-4 border-b border-border text-primary font-bold text-lg flex items-center gap-2">
                    Pro <Zap className="w-4 h-4" />
                  </th>
                  <th className="p-4 border-b border-border text-foreground font-bold text-lg">
                    Business
                  </th>
                  <th className="p-4 border-b border-border text-foreground font-bold text-lg">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {COMPARE_FEATURES.map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 pt-12 pb-4 font-bold text-xs uppercase tracking-widest text-muted-foreground border-b border-border/40 bg-background sticky left-0 z-10"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.items.map((item, iIdx) => (
                      <tr
                        key={iIdx}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4 border-b border-border/40 text-foreground font-medium bg-background sticky left-0 z-10 flex items-center gap-2">
                          {item.name}{" "}
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                        </td>
                        <td className="p-4 border-b border-border/40 text-muted-foreground">
                          {typeof item.starter === "boolean" ? (
                            item.starter ? (
                              <Check className="w-5 h-5 text-foreground" />
                            ) : (
                              <Minus className="w-5 h-5 text-muted-foreground/30" />
                            )
                          ) : (
                            item.starter
                          )}
                        </td>
                        <td className="p-4 border-b border-border/40 text-foreground font-medium">
                          {typeof item.pro === "boolean" ? (
                            item.pro ? (
                              <Check className="w-5 h-5 text-primary" />
                            ) : (
                              <Minus className="w-5 h-5 text-muted-foreground/30" />
                            )
                          ) : (
                            item.pro
                          )}
                        </td>
                        <td className="p-4 border-b border-border/40 text-muted-foreground">
                          {typeof item.business === "boolean" ? (
                            item.business ? (
                              <Check className="w-5 h-5 text-foreground" />
                            ) : (
                              <Minus className="w-5 h-5 text-muted-foreground/30" />
                            )
                          ) : (
                            item.business
                          )}
                        </td>
                        <td className="p-4 border-b border-border/40 text-muted-foreground">
                          {typeof item.enterprise === "boolean" ? (
                            item.enterprise ? (
                              <Check className="w-5 h-5 text-foreground" />
                            ) : (
                              <Minus className="w-5 h-5 text-muted-foreground/30" />
                            )
                          ) : (
                            item.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
