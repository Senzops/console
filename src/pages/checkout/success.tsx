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
} from "lucide-react";

const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // 1. Automatic Redirect Logic
    if (countdown <= 0) {
      router.push("/dashboard/profile");
      return;
    }

    // 2. Countdown Timer
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

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
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
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
                      Your official receipt from Paddle.com is processing and
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
