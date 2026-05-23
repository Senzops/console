import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import md5 from "md5";
import { useAuth } from "../../lib/auth";
import { Card, CardContent, Button, cn, Avatar } from "../../components/Core";
import { NetworkBackground } from "../../components/NetworkBackground";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Server,
  Lock,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";

const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

export default function CheckoutOutcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    setIsMounted(true);
    if (router.isReady) {
      const statusParam = router.query.status as string;
      if (statusParam) {
        setStatus(statusParam);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStatus = urlParams.get("status");
        setStatus(urlStatus || "unknown");
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!isMounted) return;
    if (status === "failed" || status === "pending" || status === "unknown") return;

    if (countdown <= 0) {
      router.push("/dashboard/profile");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router, isMounted, status]);

  useEffect(() => {
    if (!isMounted || status !== "unknown") return;
    router.replace("/dashboard/profile");
  }, [isMounted, status, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <NetworkBackground />
        <div className="w-full max-w-3xl relative z-10 flex flex-col items-center justify-center p-10 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl animate-pulse">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4 text-emerald-500" />
          <p className="text-foreground font-bold text-lg">
            Verifying Transaction Status
          </p>
          <p className="text-muted-foreground text-xs mt-1 font-medium text-center max-w-[280px]">
            Please wait while we resolve your secure checkout session.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Payment Failed | Senzor</title>
        </Head>

        {/* Consistent background with the checkout flow */}
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* --- Header & User Context --- */}
              <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  {/* Animated Error Node */}
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div
                      className="absolute inset-0 bg-destructive/20 rounded-full animate-ping opacity-50"
                      style={{ animationDuration: "2.5s" }}
                    />
                    <div className="relative bg-destructive/10 border border-destructive/20 p-2.5 rounded-full">
                      <XCircle
                        className="w-6 h-6 text-destructive"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                      Payment Failed
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-destructive" />{" "}
                      Transaction verification incomplete
                    </div>
                  </div>
                </div>

                {/* User Account Context (Matches Success/Checkout) */}
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                    <Avatar
                      src={getGravatar(user.email || "")}
                      fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
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
                )}
              </div>

              {/* --- Troubleshooting Information --- */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">
                  Troubleshooting Steps
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Common Causes Block */}
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-destructive/30">
                    <div className="mt-0.5 bg-destructive/10 border border-destructive/20 p-2 rounded-lg shrink-0">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Common Causes
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Insufficient funds, temporary bank hold, expired card, or incorrect security code (CVC).
                      </p>
                    </div>
                  </div>

                  {/* Assistance Block */}
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-blue-500/30">
                    <div className="mt-0.5 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg shrink-0">
                      <Server className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Need Assistance?
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        If funds were deducted or you believe this was an error, please reach out to our support channel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Footer: Actions --- */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <div className="text-xs text-muted-foreground max-w-sm">
                  You can retry checkout now or choose to return to your dashboard settings. No subscriptions were charged.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-11 text-sm font-bold border-border/60 hover:bg-secondary/40 shrink-0"
                    onClick={() => router.push("/dashboard/profile")}
                  >
                    Return to Dashboard
                  </Button>
                  <Button
                    className="w-full sm:w-auto h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform group shrink-0"
                    onClick={() => router.push("/checkout")}
                  >
                    Try Payment Again
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Payment Pending | Senzor</title>
        </Head>

        {/* Consistent background with the checkout flow */}
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* --- Header & User Context --- */}
              <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  {/* Animated Pending Node */}
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div
                      className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping opacity-50"
                      style={{ animationDuration: "2.5s" }}
                    />
                    <div className="relative bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-full">
                      <Clock
                        className="w-6 h-6 text-yellow-500"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                      Payment Pending
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-yellow-500" />{" "}
                      Transaction processing securely
                    </div>
                  </div>
                </div>

                {/* User Account Context */}
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                    <Avatar
                      src={getGravatar(user.email || "")}
                      fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
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
                )}
              </div>

              {/* --- Troubleshooting/Pending Information --- */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">
                  Transaction Status Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Processing Status Block */}
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-yellow-500/30">
                    <div className="mt-0.5 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg shrink-0">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Why is it pending?
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Some payment methods (bank transfers, local payment rails) require extra processing time. Your workspace capacity will upgrade automatically once cleared.
                      </p>
                    </div>
                  </div>

                  {/* Provisioning Status Block */}
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-blue-500/30">
                    <div className="mt-0.5 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg shrink-0">
                      <Server className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Automatic Provisioning
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        You may safely close this page. We'll send an email confirmation and apply plan upgrades immediately upon transaction completion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Footer: Actions --- */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <div className="text-xs text-muted-foreground max-w-sm">
                  We are waiting for confirmation from the payment gateway. You can refresh to check again or go to your dashboard.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-11 text-sm font-bold border-border/60 hover:bg-secondary/40 shrink-0"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Status
                  </Button>
                  <Button
                    className="w-full sm:w-auto h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform group shrink-0"
                    onClick={() => router.push("/dashboard/profile")}
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default: Success Screen (status !== "failed" && status !== "pending")
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <Head>
        <title>Payment Successful | Senzor</title>
      </Head>

      {/* Consistent background with the checkout flow */}
      <NetworkBackground />

      <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-6 md:p-10">
            {/* --- Header & User Context --- */}
            <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Animated Success Node */}
                <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                  <div
                    className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-50"
                    style={{ animationDuration: "2.5s" }}
                  />
                  <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-full">
                    <CheckCircle2
                      className="w-6 h-6 text-emerald-500"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                    Payment Successful
                  </h1>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    Transaction verified and secured
                  </div>
                </div>
              </div>

              {/* User Account Context (Matches Checkout) */}
              {user && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                  <Avatar
                    src={getGravatar(user.email || "")}
                    fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
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
              )}
            </div>

            {/* --- Provisioning Status Grid --- */}
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">
                Workspace Provisioning Status
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upgraded Block */}
                <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-emerald-500/30">
                  <div className="mt-0.5 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Capacity Upgraded
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Your new capacity limits are active across all
                      registered services.
                    </p>
                  </div>
                </div>

                {/* Invoice Block */}
                <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-blue-500/30">
                  <div className="mt-0.5 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg shrink-0">
                    <Receipt className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Invoice Generating
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Your official receipt from Dodo Payments is processing and
                      will appear in your billing history.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Footer: Countdown & Actions --- */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
              {/* Progress Bar */}
              <div className="flex flex-col gap-2 w-full sm:w-1/2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Redirecting to workspace in{" "}
                  <span className="text-foreground">{countdown}s</span>
                </p>
                <div className="w-full h-1.5 bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 text-sm font-bold shadow-md transition-transform group shrink-0"
                onClick={() => router.push("/dashboard/profile")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
