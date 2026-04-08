import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import md5 from "md5";
import { DashboardLayout } from "../../components/Layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Spinner,
  Input,
  Badge,
  cn,
} from "../../components/Core";
import { useAuth, api } from "../../lib/auth";
import { toast } from "sonner";
import {
  User as UserIcon,
  CreditCard,
  Database,
  Receipt,
  AlertTriangle,
  Trash2,
  Download,
  ShieldAlert,
  HardDrive,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { extractErrorMessage } from "@/utils/axiosError";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Utility to format bytes beautifully
const formatBytes = (bytes: number = 0, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // --- SWR Data Fetching ---
  const { data: billingData, mutate: mutateBilling } = useSWR(
    "/billing/subscription",
    fetcher,
  );
  const { data: storageData } = useSWR("/billing/storage-stats", fetcher);
  const { data: txData } = useSWR("/billing/transactions", fetcher);

  // --- Modal States ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // --- Loading States ---
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const sub = billingData?.subscription;
  const plan = billingData?.plan;

  const isPaid = sub?.planId !== "starter";
  const isCanceled = sub?.status === "canceled";

  // Quota Calculations
  const maxBytes = plan?.maxIngestionBytes || 1; // Prevent division by zero
  const currentBytes = sub?.currentMonthBytes || 0;
  const quotaPercent = Math.min((currentBytes / maxBytes) * 100, 100);
  const isNearLimit = quotaPercent > 85;

  const getGravatar = (email: string) =>
    `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

  // --- Handlers ---
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await api.post("/billing/cancel");
      toast.success("Subscription canceled successfully.");
      setIsCancelModalOpen(false);
      mutateBilling();
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to cancel subscription."));
    } finally {
      setIsCanceling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user.email) {
      toast.error("Email does not match.");
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete("/user/account", { data: { confirmEmail } });
      toast.success("Account permanently deleted.");
      setIsDeleteModalOpen(false);
      logout(); // This will automatically redirect to home
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to delete account."));
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Account Settings | Senzor</title>
      </Head>

      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your identity, view quotas, and download invoices.
          </p>
        </div>

        {/* 1. Identity Section (Clean, Professional) */}
        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={getGravatar(user.email || "")}
                alt="Avatar"
                className="h-20 w-20 rounded-full border border-border/50 shadow-sm bg-secondary object-cover"
              />
              {!user.isDemo && !user.emailVerified && (
                <span
                  className="absolute bottom-0 right-0 flex h-4 w-4 rounded-full bg-amber-500 border-2 border-card items-center justify-center shadow-sm"
                  title="Email Unverified"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                </span>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {user.displayName || "Senzor Administrator"}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <UserIcon className="w-4 h-4 text-muted-foreground/70" />{" "}
                  {user.email}
                </span>
                <span className="hidden md:inline text-border/60">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="w-4 h-4 text-muted-foreground/70" />
                  {user.isDemo ? "Demo Viewer" : "Organization Owner"}
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto mt-4 md:mt-0">
              {!user.isDemo && !user.emailVerified ? (
                <Badge
                  variant="outline"
                  className="w-full md:w-auto justify-center bg-amber-500/10 text-amber-500 border-amber-500/20 py-1.5 px-4 font-semibold uppercase tracking-wider text-xs"
                >
                  Email Verification Required
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="w-full md:w-auto justify-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1.5 px-4 font-semibold uppercase tracking-wider text-xs"
                >
                  Account Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Subscription & Quota (Full Width) */}
        <Card className="border-border/60 shadow-sm w-full">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <CreditCard className="w-5 h-5 text-primary" /> Active Plan
              </div>
              {plan ? (
                <div className="flex items-center gap-2">
                  {isCanceled && (
                    <Badge
                      variant="destructive"
                      className="uppercase text-[10px] tracking-wider bg-destructive/10 text-destructive border border-destructive/20"
                    >
                      Canceling Soon
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "uppercase tracking-wider text-xs font-bold px-3 py-1 border",
                      isPaid
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background text-muted-foreground border-border/60",
                    )}
                  >
                    {plan.name} Tier
                  </Badge>
                </div>
              ) : (
                <Spinner className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    Combined Ingestion (This Month)
                  </span>
                  <span className="font-mono text-muted-foreground text-sm">
                    <strong className="text-foreground font-semibold">
                      {formatBytes(currentBytes)}
                    </strong>{" "}
                    / {formatBytes(maxBytes)}
                  </span>
                </div>
                {/* Sleek Progress Bar */}
                <div className="h-2 w-full bg-secondary/60 rounded-full overflow-hidden border border-border/40 relative">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isNearLimit ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  {isNearLimit ? (
                    <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Approaching
                      monthly limit.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" /> Pooled across all
                      services.
                    </p>
                  )}
                  {sub?.billingCycleReset && (
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Resets{" "}
                      {new Date(sub.billingCycleReset).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/40">
                <Link href="/pricing" className="w-full sm:w-auto">
                  <Button
                    variant={isPaid ? "outline" : "default"}
                    className="w-full sm:w-auto shadow-sm"
                  >
                    {isPaid ? "View Available Plans" : "Upgrade to Pro"}
                  </Button>
                </Link>
                {isPaid && !isCanceled && (
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
                {isCanceled && (
                  <div className="flex items-center px-4 bg-muted/40 rounded-md border border-border/40 w-full sm:w-auto">
                    <p className="text-xs font-medium text-muted-foreground">
                      Subscription active until end of billing cycle.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Database Footprint Estimator (Full Width) */}
        <Card className="border-border/60 shadow-sm w-full">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/40 flex items-center gap-2 font-bold text-lg text-foreground bg-muted/20">
              <Database className="w-5 h-5 text-blue-500" /> Database Footprint
            </div>

            {!storageData ? (
              <div className="flex justify-center items-center h-[200px]">
                <Spinner className="w-6 h-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-foreground font-medium">
                      Estimated Disk Usage
                    </span>
                    <span className="font-mono text-foreground font-bold text-sm">
                      {formatBytes(storageData.totalCalculatedBytes)}
                    </span>
                  </div>
                  {/* Enterprise Stacked Progress Bar */}
                  <div className="flex h-2 w-full bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                    {storageData.totalCalculatedBytes === 0 ? (
                      <div className="w-full h-full bg-secondary/50" />
                    ) : (
                      storageData.stats.map((stat: any) => (
                        <div
                          key={stat.service}
                          style={{
                            width: `${(stat.bytes / storageData.totalCalculatedBytes) * 100}%`,
                            backgroundColor: stat.color,
                          }}
                          className="h-full transition-all duration-1000 ease-out"
                          title={`${stat.service}: ${formatBytes(stat.bytes)}`}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  {storageData.stats.map((stat: any) => (
                    <div
                      key={stat.service}
                      className="flex flex-col p-3 rounded-lg border border-border/40 bg-card shadow-sm group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {stat.service}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                        <span className="text-muted-foreground font-mono text-xs">
                          {stat.count.toLocaleString()} rows
                        </span>
                        <span className="font-mono text-foreground font-bold text-sm">
                          {formatBytes(stat.bytes, 1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/30 border border-border/40 rounded-lg p-3 mt-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Footprint represents actively stored data size on disk.
                    Expired data is automatically purged by background TTL
                    policies and will not reflect here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Billing History Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center h-16 shrink-0 bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Receipt className="w-5 h-5 text-emerald-500" /> Billing History
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 overflow-auto bg-card">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Amount</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody>
                {!txData ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <Spinner className="w-6 h-6 mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : txData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16">
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Receipt className="w-10 h-10 opacity-20 mb-4" />
                        <p className="font-medium text-foreground">
                          No transactions found
                        </p>
                        <p className="text-xs mt-1">
                          Invoices will appear here once you upgrade to a paid
                          tier.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  txData.transactions.map((tx: any) => (
                    <tr
                      key={tx.paddleTransactionId}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-foreground font-medium whitespace-nowrap">
                        {new Date(tx.billedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-foreground whitespace-nowrap">
                        ${tx.amount.toFixed(2)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {tx.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-0",
                            tx.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : tx.status === "refunded"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {tx.receiptUrl ? (
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-semibold uppercase tracking-wide"
                          >
                            Download <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 5. Danger Zone */}
        <div className="border border-destructive/30 rounded-xl overflow-hidden mt-12 bg-destructive/5 shadow-sm">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h3>
              <p className="text-sm text-destructive/80 mt-2 max-w-2xl leading-relaxed">
                Permanently delete your account, configuration planes, API keys,
                and trigger a cascade deletion of all operational telemetry.{" "}
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0 transition-all font-semibold"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Cancel Subscription Modal */}
      <Dialog
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed shadow-sm">
            <strong className="block text-amber-600 dark:text-amber-500 mb-1 font-bold">
              Downgrade Confirmation
            </strong>
            Canceling your subscription will downgrade you to the Free Starter
            plan at the end of your current billing cycle. You will lose access
            to advanced features, extended retention, and increased ingestion
            limits.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCanceling}
            >
              Keep Plan
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" /> Processing...
                </>
              ) : (
                "Yes, Cancel Plan"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-5">
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm text-destructive leading-relaxed shadow-sm">
            <strong className="block mb-1 font-bold">
              Catastrophic Action Warning
            </strong>
            This will permanently purge your user identity, billing data, API
            keys, and active configurations. Ingestion will halt immediately.
            All associated telemetry will be orphaned and purged automatically.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              To confirm, type your email:{" "}
              <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 select-all">
                {user.email}
              </span>
            </label>
            <Input
              placeholder={user.email || ""}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white shadow-sm"
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail !== user.email}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" /> Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
