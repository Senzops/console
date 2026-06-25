import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import md5 from "md5";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  cn,
  Spinner,
} from "../../components/Core";
import { useAuth, api } from "../../lib/auth";
import { useOrg } from "../../lib/org";
import { ShieldCheck, Lock, Loader2, ArrowLeft, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { NetworkBackground } from "../../components/NetworkBackground";
import { useTheme } from "@/lib/theme";
import { trackEvent, AnalyticsEvent } from "@/lib/analytics";

// Types matching the backend response
interface BackendPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxServicesPerType: number;
  maxIngestionBytes: number;
  retentionDays: number;
  dodoProductIdMonthly: string | null;
  dodoProductIdAnnual: string | null;
}

const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(
    email.trim().toLowerCase(),
  )}?d=identicon`;



export default function PaymentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeOrg } = useOrg();
  const { theme } = useTheme();

  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [subChecked, setSubChecked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);

  // Redirect target depends on whether we're billing for an org or personal account
  const dashboardPath = activeOrg ? "/dashboard/organization" : "/dashboard/profile";

  // Synchronous initialization to avoid React set-state-in-effect cascading render warnings
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("plan") || "pro";
    }
    return "pro";
  });

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const cycle = urlParams.get("billing");
      return cycle === "monthly" ? "monthly" : "annual";
    }
    return "annual";
  });

  // Plans: public endpoint, fetch once on mount (no auth dependency)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/billing/plans`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          setPlans(
            data.plans.filter(
              (p: BackendPlan) => p.id === "pro" || p.id === "business",
            ),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to fetch plans:", err);
        toast.error("Failed to load pricing data.");
      })
      .finally(() => setPlansLoaded(true));
  }, []);

  // Subscription guard: only runs once auth resolves and user is available.
  // Kept separate so the readiness gate is derived at render time, not
  // dependent on effect execution order (which caused the flicker).
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    api.get("/billing/subscription")
      .then((res) => {
        const sub = res.data?.subscription;
        if (sub && sub.planId !== "starter" && sub.provider === "dodo" &&
            sub.status === "active") {
          setHasActiveSub(true);
        }
      })
      .catch(() => {})
      .finally(() => setSubChecked(true));
  }, [user, authLoading]);

  // Derived readiness: all async prerequisites must be satisfied.
  // For logged-out visitors (!user after auth), sub check is unnecessary — they'll be redirected to login.
  const isReady = !authLoading && plansLoaded && (subChecked || !user);

  const handleCheckout = () => {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return;

    const productId =
      billingCycle === "annual"
        ? selectedPlan.dodoProductIdAnnual
        : selectedPlan.dodoProductIdMonthly;

    if (!productId) {
      toast.error("Configuration error: Product ID missing.");
      return;
    }

    setIsRedirecting(true);

    const themeMode = theme === "dark" || theme === "nord" ? "dark" : "light";
    api.post("/billing/checkout-session", { productId, themeMode })
      .then((res) => {
        const checkoutUrl = res.data.checkoutUrl;
        if (!checkoutUrl) {
          throw new Error("No checkout URL returned from session creation.");
        }
        trackEvent(AnalyticsEvent.CheckoutStarted, { plan: selectedPlanId, cycle: billingCycle });
        window.location.href = checkoutUrl;
      })
      .catch((err) => {
        console.error("Failed to create checkout session:", err);
        toast.error("Failed to generate checkout session. Please try again.");
        setIsRedirecting(false);
      });
  };

  // Auth Protection Check
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
        <NetworkBackground />
        <div className="relative z-10 flex flex-col items-center p-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium">
            Securing checkout environment...
          </p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
        <NetworkBackground />
        <div className="relative z-10 flex flex-col items-center p-8 bg-card/85 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4 text-emerald-500" />
          <p className="text-foreground font-bold text-lg">
            Redirecting to Secure Payment Portal
          </p>
          <p className="text-muted-foreground text-xs mt-1 font-medium text-center max-w-[280px]">
            Please wait while we establish a secure connection to Dodo Payments.
          </p>
        </div>
      </div>
    );
  }

  if (hasActiveSub) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
        <NetworkBackground />
        <div className="relative z-10 flex flex-col items-center p-8 bg-card/85 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-w-md text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-500 mb-4" />
          <p className="text-foreground font-bold text-lg">
            {activeOrg ? `${activeOrg.name} Already Has an Active Plan` : "You Already Have an Active Plan"}
          </p>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            To switch plans or change your billing interval, use the plan management option in your {activeOrg ? "organization" : "profile"} settings.
          </p>
          <Button
            className="mt-6 font-bold"
            onClick={() => router.push(dashboardPath)}
          >
            Go to {activeOrg ? "Organization" : "Profile"} Settings
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") router.push("/login?redirect=/checkout");
    return null;
  }

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  if (!activePlan) return null;

  const isAnnual = billingCycle === "annual";
  const monthlyBase = activePlan.priceMonthly;

  const basePrice = isAnnual ? monthlyBase * 12 : monthlyBase;
  const finalPrice = isAnnual ? activePlan.priceAnnual : monthlyBase;
  const savings = basePrice - finalPrice;

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary relative justify-center items-center p-4">
      <NetworkBackground />

      <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {/* Header & User Context */}
                <div className="mb-6 pb-6 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                      Review & Checkout
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Secure
                      encrypted payment processing
                    </div>
                  </div>

                  {/* Workspace Billing Indicator */}
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px]">
                    {activeOrg ? (
                      <>
                        <Avatar
                          src={getGravatar(activeOrg._id)}
                          fallback={activeOrg.name.substring(0, 2).toUpperCase()}
                        />
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-sm font-bold text-foreground leading-tight truncate">
                            {activeOrg.name}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground leading-tight truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0" /> Organization
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar
                          src={getGravatar(user.email || "")}
                          fallback={
                            user.email?.substring(0, 2).toUpperCase() || "US"
                          }
                        />
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-sm font-bold text-foreground leading-tight truncate">
                            {user.displayName || "Senzor Account"}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground leading-tight truncate flex items-center gap-1">
                            <User className="w-3 h-3 shrink-0" /> Personal Account
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* LEFT PANE: Configuration */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div className="space-y-6">
                      {/* Billing Toggle */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                          1. Billing Cycle
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setBillingCycle("monthly")}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              !isAnnual
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                : "border-border/60 hover:border-foreground/30 bg-background/50",
                            )}
                          >
                            <div className="font-bold text-sm text-foreground">
                              Monthly
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                              Pay as you go.
                            </div>
                          </button>
                          <button
                            onClick={() => setBillingCycle("annual")}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all relative overflow-hidden",
                              isAnnual
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                : "border-border/60 hover:border-foreground/30 bg-background/50",
                            )}
                          >
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                              Save 20%
                            </div>
                            <div className="font-bold text-sm text-foreground">
                              Annually
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                              Billed once per year.
                            </div>
                          </button>
                        </div>
                      </section>

                      {/* Plan Selection */}
                      <section className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                          2. Plan Tier
                        </h3>
                        <div className="space-y-3">
                          {plans.map((plan) => (
                            <button
                              key={plan.id}
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={cn(
                                "w-full p-4 rounded-xl border flex items-center justify-between transition-all",
                                selectedPlanId === plan.id
                                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                  : "border-border/60 hover:border-foreground/30 bg-background/50",
                              )}
                            >
                              <div className="text-left flex-1">
                                <div className="font-bold text-sm text-foreground">
                                  {plan.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                  Up to{" "}
                                  {plan.maxIngestionBytes /
                                    (1024 * 1024 * 1024)}
                                  GB pooled ingestion · {plan.retentionDays}-day
                                  retention.
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-base text-foreground">
                                  $
                                  {isAnnual
                                    ? Math.floor(plan.priceAnnual / 12)
                                    : plan.priceMonthly}
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    /mo
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>

                    <section className="pt-4 border-t border-border/40 mt-8">
                      <h3 className="text-sm font-bold text-foreground">
                        Need more details?
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Not sure which tier fits your engineering requirements?
                        Review our detailed feature matrix and capacity limits
                        on the{" "}
                        <Link
                          href="/pricing"
                          className="text-primary hover:underline font-medium"
                        >
                          Pricing Page
                        </Link>
                        .
                      </p>
                    </section>
                  </div>

                  {/* RIGHT PANE: Order Summary */}
                  <div className="lg:col-span-5">
                    <div className="bg-background border border-border/60 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-base font-bold text-foreground mb-4 uppercase tracking-wide">
                        Order Summary
                      </h3>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium">
                            Base Price ({billingCycle})
                          </span>
                          <span className="text-foreground font-semibold">
                            ${basePrice.toFixed(2)}
                          </span>
                        </div>

                        {isAnnual && savings > 0 && (
                          <div className="flex justify-between items-center text-sm text-emerald-500">
                            <span className="font-semibold">
                              Annual Discount (20%)
                            </span>
                            <span className="font-bold">
                              -${savings.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-border/60 pt-4 mb-6">
                        <div className="flex justify-between items-end">
                          <span className="text-foreground font-bold">
                            Total Due
                          </span>
                          <div className="text-right">
                            <span className="text-2xl font-extrabold tracking-tighter text-foreground">
                              ${finalPrice.toFixed(2)}
                            </span>
                            <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                              + Applicable Taxes
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform"
                        onClick={handleCheckout}
                      >
                        Proceed to Payment
                      </Button>

                      <div className="mt-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground bg-secondary/20 p-2.5 rounded-lg border border-border/30">
                          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                          <p>
                            Transactions are securely processed by{" "}
                            <strong>Dodo Payments</strong>. We do not store your
                            payment information.
                          </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 text-center font-medium leading-relaxed px-2">
                          By confirming this purchase, you agree to our{" "}
                          <Link
                            href="/terms"
                            className="underline hover:text-foreground"
                          >
                            Terms of Service
                          </Link>{" "}
                          and authorize Dodo Payments to charge your chosen payment
                          method.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
