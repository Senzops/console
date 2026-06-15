import React, { useState } from "react";
import { GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Navbar, Footer } from "../components/Layout";
import { Button, cn } from "../components/Core";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { useAuth } from "../lib/auth";
import { Check, Minus, HelpCircle, Building2, Loader2 } from "lucide-react";

// --- UI CONFIGURATION & MAPPING ---
const PLAN_UI_META: Record<string, any> = {
  starter: {
    description: "Perfect for side projects and MVPs.",
    features: [
      "2 GB pooled ingestion/month",
      "3-day data retention",
      "1 service per type (APM, RUM, etc.)",
      "1 organization",
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
      "3 organizations",
      "Email support",
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
      "10 organizations",
      "Priority support SLA",
    ],
    ctaText: "Upgrade to Business",
    popular: false,
  },
};

const COMPARE_FEATURES = [
  {
    category: "Ingestion & Capacity",
    items: [
      {
        name: "Pooled Data Ingestion",
        tooltip:
          "Data limits are shared across all your observability services.",
        starter: "2 GB / mo",
        pro: "15 GB / mo",
        business: "100 GB / mo",
        enterprise: "Custom Volume",
      },
      {
        name: "Data Retention",
        tooltip:
          "How long your telemetry stays queryable before automatic deletion. Applied uniformly across every telemetry type (APM, logs, RUM, metrics, and more).",
        starter: "3 days",
        pro: "15 days",
        business: "30 days",
        enterprise: "90 days",
      },
      {
        name: "Services Limit",
        tooltip: "Maximum number of registered APIs, websites, or servers.",
        starter: "1 per type",
        pro: "5 per type",
        business: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Organizations",
        tooltip: "Team workspaces with shared resources, billing, and access control.",
        starter: "1",
        pro: "3",
        business: "10",
        enterprise: "Unlimited",
      },
      {
        name: "Overage Flexibility",
        tooltip:
          "Ability to ingest past the limit with transparent per-GB pricing.",
        starter: "-",
        pro: "$0.50 / GB",
        business: "$0.40 / GB",
        enterprise: "Volume Discounts",
      },
    ],
  },
  {
    category: "Observability Pillars",
    items: [
      {
        name: "Distributed Tracing (APM)",
        tooltip: "End-to-end request tracking across microservices.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Log Management",
        tooltip: "Centralized logging with full-text search.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Real User Monitoring (RUM)",
        tooltip: "Frontend performance and Web Vitals tracking.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Infrastructure & VPS",
        tooltip: "Host-level CPU, Memory, and Disk metrics.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Background Task Tracking",
        tooltip: "Monitor cron jobs and queue workers.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Firebase Monitoring",
        tooltip: "Firebase Auth user metrics, signups, and provider analytics.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Analytics & Alerting",
    items: [
      {
        name: "Custom Canvas Dashboards",
        tooltip: "Build bespoke views using a drag-and-drop widget engine.",
        starter: "1 Canvas",
        pro: "10 Canvases",
        business: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Alert Policies",
        tooltip: "Trigger conditions based on metric thresholds.",
        starter: "3 Policies",
        pro: "25 Policies",
        business: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Incident Routing",
        tooltip: "Where alerts can be sent.",
        starter: "Email Only",
        pro: "Email, Webhooks",
        business: "Email, Webhooks, Slack",
        enterprise: "PagerDuty, OpsGenie",
      },
      {
        name: "Anomaly Detection",
        tooltip: "AI-driven detection of unusual metric deviations.",
        starter: false,
        pro: false,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "AI & Intelligence",
    items: [
      {
        name: "AI Incident Analysis",
        tooltip:
          "Automated root cause investigation powered by AI when alerts fire. Analyzes traces, logs, errors, and infrastructure to identify the cause.",
        starter: false,
        pro: false,
        business: "500 / month",
        enterprise: "Unlimited",
      },
      {
        name: "AI-Enriched Notifications",
        tooltip:
          "Alert notifications include an AI-generated summary with root cause, affected services, and recommended actions.",
        starter: false,
        pro: false,
        business: true,
        enterprise: true,
      },
      {
        name: "Anomaly Detection",
        tooltip: "AI-driven detection of unusual metric deviations without manual threshold configuration.",
        starter: false,
        pro: false,
        business: true,
        enterprise: true,
      },
      {
        name: "AI Assistant",
        tooltip:
          "Natural language interface to query your observability data, explore metrics, and get insights.",
        starter: false,
        pro: true,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Security & Compliance",
    items: [
      {
        name: "Encryption At Rest (AES-256)",
        tooltip: "All stored telemetry and credentials are encrypted.",
        starter: true,
        pro: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Role-Based Access Control (RBAC)",
        tooltip: "Granular permissions for team members.",
        starter: false,
        pro: false,
        business: true,
        enterprise: true,
      },
      {
        name: "SAML / Single Sign-On (SSO)",
        tooltip: "Integrate with Okta, Azure AD, or Google Workspace.",
        starter: false,
        pro: false,
        business: false,
        enterprise: true,
      },
      {
        name: "Custom BAA & DPA",
        tooltip: "Signed agreements for HIPAA and advanced GDPR compliance.",
        starter: false,
        pro: false,
        business: false,
        enterprise: true,
      },
    ],
  },
];

// --- TOOLTIP COMPONENT ---
const Tooltip = ({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) => (
  <div className="relative flex items-center group cursor-help">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] md:max-w-xs bg-popover border border-border text-popover-foreground text-xs rounded-md shadow-xl p-2 z-50 text-center leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-border" />
    </div>
  </div>
);

interface PlanConfig {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
}

interface PricingPageProps {
  initialPlans: PlanConfig[];
}

export default function PricingPage({ initialPlans }: PricingPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [plans] = useState<PlanConfig[]>(initialPlans || []);

  const handleRoute = (planId: string) => {
    if (!user) {
      // Redirect to login, but save their intent so we can route them to payment after login
      return router.push(
        `/login?redirect=/checkout?plan=${planId}&billing=${annual ? "annual" : "monthly"}`,
      );
    }
    if (planId === "starter") {
      return router.push("/dashboard");
    }
    // Route to the dedicated payment checkout page
    router.push(
      `/checkout?plan=${planId}&billing=${annual ? "annual" : "monthly"}`,
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-24 pb-32">
        {/* --- HERO SECTION --- */}
        <section className="relative px-4 pt-16 pb-16 max-w-7xl mx-auto text-center">
          <AnimatedBackground />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tighter text-foreground mb-6 leading-[1.1] text-balance relative z-10">
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
          {plans.length === 0 ? (
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
                        <h3 className="text-2xl font-bold font-display text-foreground mb-2">
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
                          onClick={() => handleRoute(plan.id)}
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
                <h3 className="text-2xl font-bold font-display text-foreground mb-2">
                  Enterprise
                </h3>
                <p className="text-muted-foreground">
                  Custom ingestion volumes, dedicated support, SAML SSO, and
                  custom BAAs/SLAs for large organizations.
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
            <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground mb-4">
              Compare all features
            </h2>
            <p className="text-muted-foreground text-lg">
              A detailed breakdown of platform capabilities.
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
                    Pro
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
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="p-4 border-b border-border/40 text-foreground font-medium bg-background sticky left-0 z-10">
                          <Tooltip text={item.tooltip}>
                            <span className="flex items-center gap-2">
                              {item.name}{" "}
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                            </span>
                          </Tooltip>
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

export const getStaticProps: GetStaticProps = async () => {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const res = await fetch(`${apiUrl}/billing/plans`);
    const data = await res.json();

    return {
      props: {
        initialPlans: data.plans || [],
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error("Failed to fetch plans in getStaticProps:", error);
    return {
      props: {
        initialPlans: [],
      },
      revalidate: 60, // Try again sooner if it fails
    };
  }
};
