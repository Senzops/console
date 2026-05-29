import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import md5 from "md5";
import { useAuth, api } from "../lib/auth";
import { useOrg } from "../lib/org";
import { NetworkBackground } from "../components/NetworkBackground";
import {
  Button,
  Card,
  CardContent,
  Spinner,
  Avatar,
  Badge,
  cn,
} from "../components/Core";
import {
  Building2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  ArrowRight,
  Users,
  ShieldCheck,
  Crown,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getGravatar = (identifier: string) =>
  `https://www.gravatar.com/avatar/${md5(identifier.trim().toLowerCase())}?d=identicon`;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-4 w-4" />,
  admin: <ShieldCheck className="h-4 w-4" />,
  member: <Users className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

type InviteState =
  | "loading"
  | "details"
  | "needs_auth"
  | "accepting"
  | "accepted"
  | "error";

export default function InvitePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshOrgs, setActiveOrg } = useOrg();

  const [state, setState] = useState<InviteState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    expiresAt: string;
  } | null>(null);
  const [organization, setOrganization] = useState<{
    name: string;
    slug: string;
    _id?: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(8);

  const token = router.query.token as string | undefined;

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setError("No invitation token provided.");
      setState("error");
      return;
    }
    fetchDetails(token);
  }, [router.isReady, token]);

  useEffect(() => {
    if (authLoading) return;
    if (state === "needs_auth" && user) {
      setState("details");
    }
  }, [user, authLoading, state]);

  // Auto-redirect countdown after acceptance
  useEffect(() => {
    if (state !== "accepted") return;
    if (countdown <= 0) {
      router.push("/dashboard/organization");
      return;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [state, countdown, router]);

  const fetchDetails = async (t: string) => {
    try {
      const res = await axios.get(`${API_BASE}/org/invitations/details`, {
        params: { token: t },
      });
      setInvitation(res.data.invitation);
      setOrganization(res.data.organization);
      if (!user && !authLoading) {
        setState("needs_auth");
      } else {
        setState("details");
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setError("This invitation is invalid or has already been used.");
      } else if (status === 410) {
        setError("This invitation has expired.");
      } else {
        setError("Failed to load invitation details.");
      }
      setState("error");
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setState("accepting");
    try {
      const res = await api.post("/org/invitations/accept", { token });
      setState("accepted");
      toast.success("You've joined the organization!");
      await refreshOrgs();
      if (res.data.organization) {
        setActiveOrg(res.data.organization);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to accept invitation.";
      if (err.response?.status === 403) {
        setError(
          `This invitation was sent to ${invitation?.email}. You are signed in with a different email address.`
        );
      } else if (err.response?.status === 409) {
        setError("You are already a member of this organization.");
      } else {
        setError(msg);
      }
      setState("error");
    }
  };

  const handleLoginRedirect = () => {
    router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
  };

  // ========================================================================
  // LOADING STATE
  // ========================================================================
  if ((authLoading && state === "loading") || state === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <NetworkBackground />
        <div className="w-full max-w-3xl relative z-10 flex flex-col items-center justify-center p-10 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-foreground font-bold text-lg">Loading Invitation</p>
          <p className="text-muted-foreground text-xs mt-1 font-medium text-center max-w-[280px]">
            Verifying your invitation details securely.
          </p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================
  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Invitation Error | Senzor</title>
        </Head>
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* Header */}
              <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping opacity-50" style={{ animationDuration: "2.5s" }} />
                    <div className="relative bg-destructive/10 border border-destructive/20 p-2.5 rounded-full">
                      <XCircle className="w-6 h-6 text-destructive" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                      Invitation Error
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-destructive" /> Unable to process invitation
                    </div>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                    <Avatar src={getGravatar(user.email || "")} fallback={user.email?.substring(0, 2).toUpperCase() || "US"} />
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-sm font-bold text-foreground leading-tight truncate">{user.displayName || "Senzor Account"}</span>
                      <span className="text-xs font-medium text-muted-foreground leading-tight truncate">{user.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Detail */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">Error Details</h3>
                <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4">
                  <div className="mt-0.5 bg-destructive/10 border border-destructive/20 p-2 rounded-lg shrink-0">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">What went wrong</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <div className="text-xs text-muted-foreground max-w-sm">
                  If you believe this is an error, contact the organization administrator to resend the invitation.
                </div>
                <Button
                  className="w-full sm:w-auto h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform group shrink-0"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ACCEPTING STATE
  // ========================================================================
  if (state === "accepting") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <NetworkBackground />
        <div className="w-full max-w-3xl relative z-10 flex flex-col items-center justify-center p-10 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
          <p className="text-foreground font-bold text-lg">Joining Organization</p>
          <p className="text-muted-foreground text-xs mt-1 font-medium text-center max-w-[280px]">
            Setting up your access and provisioning workspace permissions.
          </p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ACCEPTED STATE (mirrors checkout/success pattern)
  // ========================================================================
  if (state === "accepted" && organization) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Welcome to {organization.name} | Senzor</title>
        </Head>
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* Header */}
              <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-50" style={{ animationDuration: "2.5s" }} />
                    <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-full">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                      Welcome to {organization.name}
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Invitation accepted successfully
                    </div>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                    <Avatar src={getGravatar(user.email || "")} fallback={user.email?.substring(0, 2).toUpperCase() || "US"} />
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-sm font-bold text-foreground leading-tight truncate">{user.displayName || "Senzor Account"}</span>
                      <span className="text-xs font-medium text-muted-foreground leading-tight truncate">{user.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Provisioning Status */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">
                  Workspace Provisioning Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-emerald-500/30">
                    <div className="mt-0.5 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Access Granted</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Your permissions have been configured. You can now access shared resources under this organization.
                      </p>
                    </div>
                  </div>
                  <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-blue-500/30">
                    <div className="mt-0.5 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg shrink-0">
                      <Building2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Workspace Active</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        The organization workspace is ready. Switch to it using the sidebar to view shared services and dashboards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Countdown & Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <div className="flex flex-col gap-2 w-full sm:w-1/2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Redirecting to workspace in{" "}
                    <span className="text-foreground">{countdown}s</span>
                  </p>
                  <div className="w-full h-1.5 bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 8) * 100}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 text-sm font-bold shadow-md transition-transform group shrink-0"
                  onClick={() => router.push("/dashboard/organization")}
                >
                  Go to Organization
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========================================================================
  // NEEDS AUTH STATE (must sign in first)
  // ========================================================================
  if (state === "needs_auth" && organization && invitation) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Join {organization.name} | Senzor</title>
        </Head>
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* Header */}
              <div className="mb-8 pb-8 border-b border-border/40 flex items-center gap-5">
                <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping opacity-50" style={{ animationDuration: "2.5s" }} />
                  <div className="relative bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-500" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                    Authentication Required
                  </h1>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Sign in to accept this invitation
                  </div>
                </div>
              </div>

              {/* Org & Invitation Info */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">Invitation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <OrgInfoBlock organization={organization} />
                  <InviteInfoBlock invitation={invitation} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <div className="text-xs text-muted-foreground max-w-sm">
                  Sign in with <strong className="text-foreground">{invitation.email}</strong> to accept this invitation and join the organization.
                </div>
                <Button
                  className="w-full sm:w-auto h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform group shrink-0"
                  onClick={handleLoginRedirect}
                >
                  Sign In to Accept
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========================================================================
  // DETAILS STATE (signed in, ready to accept)
  // ========================================================================
  if (state === "details" && organization && invitation) {
    const emailMismatch = user && user.email !== invitation.email;

    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <Head>
          <title>Join {organization.name} | Senzor</title>
        </Head>
        <NetworkBackground />

        <div className="w-full max-w-3xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              {/* Header */}
              <div className="mb-8 pb-8 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-50" style={{ animationDuration: "2.5s" }} />
                    <div className="relative bg-primary/10 border border-primary/20 p-2.5 rounded-full">
                      <Building2 className="w-6 h-6 text-primary" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                      Join {organization.name}
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Secure invitation verification
                    </div>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/40 min-w-[220px] shrink-0">
                    <Avatar src={getGravatar(user.email || "")} fallback={user.email?.substring(0, 2).toUpperCase() || "US"} />
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-sm font-bold text-foreground leading-tight truncate">{user.displayName || "Senzor Account"}</span>
                      <span className="text-xs font-medium text-muted-foreground leading-tight truncate">{user.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Mismatch Warning */}
              {emailMismatch && (
                <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Email Mismatch</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1 leading-relaxed">
                      You&apos;re signed in as <strong>{user?.email}</strong>. This invitation was sent to <strong>{invitation.email}</strong>. You may not be able to accept it with this account.
                    </p>
                  </div>
                </div>
              )}

              {/* Org & Invitation Info */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-80">Invitation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <OrgInfoBlock organization={organization} />
                  <InviteInfoBlock invitation={invitation} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border/40">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-11 text-sm font-bold border-border/60 hover:bg-secondary/40 shrink-0"
                  onClick={() => router.push("/dashboard")}
                >
                  Decline
                </Button>
                <Button
                  className="w-full sm:w-auto h-11 text-sm font-bold shadow-md hover:scale-[1.01] transition-transform group shrink-0"
                  onClick={handleAccept}
                >
                  Accept Invitation
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// SHARED DETAIL BLOCKS
// ============================================================================

function OrgInfoBlock({ organization }: { organization: { name: string; slug: string; _id?: string } }) {
  return (
    <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-primary/30">
      <Avatar
        src={getGravatar(organization._id || organization.slug)}
        fallback={organization.name.substring(0, 2).toUpperCase()}
        className="h-10 w-10 shrink-0 mt-0.5"
      />
      <div>
        <p className="text-sm font-bold text-foreground">{organization.name}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-mono">
          {organization.slug}
        </p>
      </div>
    </div>
  );
}

function InviteInfoBlock({ invitation }: { invitation: { email: string; role: string; expiresAt: string } }) {
  const expiresAt = new Date(invitation.expiresAt);
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <div className="bg-background border border-border/60 rounded-xl p-5 shadow-sm flex items-start gap-4 transition-colors hover:border-blue-500/30">
      <div className="mt-0.5 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg shrink-0">
        {ROLE_ICONS[invitation.role] || <Shield className="w-5 h-5 text-blue-500" />}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">
          {ROLE_LABELS[invitation.role] || invitation.role} Access
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {hoursLeft > 0 ? `Expires in ${hoursLeft}h` : "Expiring soon"} &bull; Sent to {invitation.email}
        </p>
      </div>
    </div>
  );
}

InvitePage.getLayout = (page: React.ReactNode) => page;
