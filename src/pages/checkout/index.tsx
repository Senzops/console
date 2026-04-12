import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
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
import { useAuth } from "../../lib/auth";
import { ShieldCheck, Lock, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { NetworkBackground } from "../../components/NetworkBackground";
import { useTheme } from "@/lib/theme";

// Types matching the backend response
interface BackendPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxServicesPerType: number;
  maxIngestionBytes: number;
  paddlePriceIdMonthly: string | null;
  paddlePriceIdAnnual: string | null;
}

const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(
    email.trim().toLowerCase(),
  )}?d=identicon`;

export default function PaymentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paddleReady, setPaddleReady] = useState(false);

  // --- Inline Checkout State ---
  const [checkoutStep, setCheckoutStep] = useState<"summary" | "payment">(
    "summary",
  );
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const frameContainerRef = useRef<HTMLDivElement>(null);

  // --- Native Iframe DOM Trapping ---
  // Cross-origin iframes ignore parent CSS scrollbar rules. We must trap the iframe
  // the millisecond Paddle injects it into the DOM and apply the native HTML attribute.
  useEffect(() => {
    if (checkoutStep !== "payment" || !frameContainerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const iframe =
              node.tagName === "IFRAME" ? node : node.querySelector("iframe");
            if (iframe) {
              iframe.setAttribute("scrolling", "no");
            }
          }
        });
      });
    });

    observer.observe(frameContainerRef.current, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [checkoutStep]);

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

  // --- Decoupled Paddle Event Listener ---
  useEffect(() => {
    const handlePaddleLoaded = () => setIsCheckoutLoading(false);
    window.addEventListener("paddle-checkout-loaded", handlePaddleLoaded);
    return () =>
      window.removeEventListener("paddle-checkout-loaded", handlePaddleLoaded);
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/billing/plans`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          // Filter out Starter/Enterprise from the checkout flow
          setPlans(
            data.plans.filter(
              (p: BackendPlan) => p.id === "pro" || p.id === "business",
            ),
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch plans:", err);
        toast.error("Failed to load pricing data.");
        setLoading(false);
      });
  }, []);

  const initializePaddle = () => {
    if (typeof window !== "undefined" && (window as any).Paddle) {
      // Use custom initialization flag to avoid strict getter assignment error
      if (!(window as any).__senzorPaddleInitialized) {
        (window as any).Paddle.Environment.set(
          process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox",
        );
        (window as any).Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
          eventCallback: function (data: any) {
            // Decouple event from React closures
            if (
              data.name === "checkout.loaded" ||
              data.name === "checkout.completed" ||
              data.name === "checkout.error"
            ) {
              window.dispatchEvent(new CustomEvent("paddle-checkout-loaded"));
            }
          },
        });
        (window as any).__senzorPaddleInitialized = true;
      }
      setPaddleReady(true);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return;

    const priceId =
      billingCycle === "annual"
        ? selectedPlan.paddlePriceIdAnnual
        : selectedPlan.paddlePriceIdMonthly;

    if (!priceId) {
      toast.error("Configuration error: Price ID missing.");
      return;
    }

    if (!paddleReady || !(window as any).Paddle) {
      toast.error("Payment gateway is initializing. Please wait a second.");
      return;
    }

    // Move to inline payment step
    setCheckoutStep("payment");
    setIsCheckoutLoading(true);

    // Context-bound fail-safe timer guarantees it's not interrupted by React renders
    setTimeout(() => {
      setIsCheckoutLoading(false);
    }, 3500);

    // Ensure DOM has painted the container before Paddle looks for it
    requestAnimationFrame(() => {
      setTimeout(() => {
        (window as any).Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: user.email },
          customData: { ownerId: user.uid },
          settings: {
            displayMode: "inline", // Inline mode
            frameTarget: "paddle-checkout-frame", // Paddle uses this string to target a CSS Class Name
            frameInitialHeight: 450,
            frameStyle:
              "width: 100%; background-color: transparent; border: none; overflow: hidden !important;",
            theme: theme === "light" || theme === "latte" ? "light" : "dark",
            showAddDiscounts: true,
            successUrl: `${window.location.origin}/checkout/success`,
          },
        });
      }, 100);
    });
  };

  const handleBackToSummary = () => {
    if ((window as any).Paddle && (window as any).Paddle.Checkout) {
      (window as any).Paddle.Checkout.close();
    }
    setCheckoutStep("summary");
  };

  // Auth Protection Check
  if (authLoading || loading) {
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

      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onReady={initializePaddle}
      />

      <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-6">
            {/* STEP 1: SUMMARY (Your exact untouched code) */}
            {checkoutStep === "summary" && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {/* Header & User Context */}
                <div className="mb-6 pb-6 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Review & Checkout
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Secure
                      encrypted payment processing
                    </div>
                  </div>

                  {/* User Account Indicator */}
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px]">
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
                      <span className="text-xs font-medium text-muted-foreground leading-tight truncate">
                        {user.email}
                      </span>
                    </div>
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
                                  GB pooled ingestion.
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
                            <strong>Paddle.com</strong>. We do not store your
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
                          and authorize Paddle.com to charge your chosen payment
                          method.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: INLINE PAYMENT FRAME */}
            {checkoutStep === "payment" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Header Context for Payment Step */}
                <div className="mb-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <button
                      onClick={handleBackToSummary}
                      className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Order Summary
                    </button>
                  </div>
                </div>

                {/* Secure Inline Frame Container */}
                <div className="relative w-full mx-auto rounded-xl overflow-hidden bg-background/50 border border-border/60">
                  {/* Custom Enterprise Loading Mask */}
                  {isCheckoutLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10">
                      <Spinner className="w-8 h-8 text-primary mb-4 text-emerald-500" />
                      <p className="text-sm font-bold text-foreground">
                        Securing Checkout...
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        Establishing encrypted tunnel to Paddle.com
                      </p>
                    </div>
                  )}

                  {/* Synchronized DOM Transitions 
                      Paddle injects a hidden wrapper <div> around the <iframe>. If we only transition the iframe,
                      the wrapper snaps instantly, causing the Flexbox centering to violently jump. 
                      This CSS forces all injected Paddle elements to animate perfectly in sync. 
                  */}
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                    .paddle-checkout-frame,
                    .paddle-checkout-frame > div,
                    .paddle-checkout-frame iframe {
                      transition: height 0.4s ease-in-out, min-height 0.4s ease-in-out !important;
                      overflow: hidden !important;
                    }
                  `,
                    }}
                  />

                  {/* Paddle injects the iframe into this div by matching className! */}
                  <div
                    ref={frameContainerRef}
                    className="paddle-checkout-frame w-full min-h-[450px] flex flex-col items-center justify-center transition-opacity duration-700 ease-out p-4"
                    style={{ opacity: isCheckoutLoading ? 0 : 1 }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
