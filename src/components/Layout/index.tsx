/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useAuth, api } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { useRouter } from "next/router";
import { Button, Dialog, Avatar, Spinner, Badge } from "../Core";
import {
  Plus,
  Copy,
  LogOut,
  Key,
  Server,
  Settings,
  Palette,
  Monitor,
  Globe,
  Activity,
  AlertCircle,
  ArrowRight,
  Mail,
  Book,
  Layout,
  Github,
  Linkedin,
  FileText,
  Play,
  Box,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import md5 from "md5";
import { extractErrorMessage } from "@/utils/axiosError";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Helper for Gravatar
const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(
    email.trim().toLowerCase(),
  )}?d=identicon`;

// --- Public Navbar ---
export const Navbar = () => {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="relative h-8 w-8 rounded-lg overflow-hidden">
            <img
              src="/logo.svg"
              alt="Logo"
              className="object-cover h-full w-full logo"
            />
          </div>
          <span className="font-bold text-xl tracking-tight leading-none">
            Senzor
          </span>
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {loading ? (
            // Loading State for Auth Check
            <Button variant="ghost" disabled className="opacity-70">
              <Spinner className="mr-2 h-4 w-4" /> Initializing...
            </Button>
          ) : user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button onClick={logout} variant="outline">
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- Footer  ---
export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/40 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-border/50">
                <img
                  src="/logo.svg"
                  alt="Logo"
                  className="object-cover h-full w-full logo"
                />
              </div>
              <span>Senzor</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The complete observability platform for modern engineering teams.
              Open source, privacy-first, and lightweight.
            </p>
          </div>

          {/* Platform & Legal */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/demo"
                  target="_blank"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Play className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Live Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <FileText className="h-3.5 w-3.5" /> Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Documentation */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Documentation
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/Senzops"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <Book className="h-3.5 w-3.5" /> Overview
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Senzops/server-agent"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <Server className="h-3.5 w-3.5" /> Server Agent
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Senzops/web-agent"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <Globe className="h-3.5 w-3.5" /> Web Agent
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Senzops/.github/blob/dev/SELF_HOSTING.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <Layout className="h-3.5 w-3.5" /> Self Hosting
                </a>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Connect
            </h4>
            <div className="flex gap-2">
              <a
                href="https://github.com/Senzops"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-foreground hover:text-background text-muted-foreground transition-all"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/company/senzor-platforms"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-blue-600 hover:text-white text-muted-foreground transition-all"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:ops@senzor.dev"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-emerald-500 hover:text-white text-muted-foreground transition-all"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
            <div className="text-xs text-muted-foreground">
              Status:{" "}
              <span className="text-emerald-500 font-medium">
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/60">
          <p>
            &copy; {new Date().getFullYear()} Senzor Platforms Inc. All rights
            reserved.
          </p>
          <p>Made with 🤍 for Developers</p>
        </div>
      </div>
    </footer>
  );
};

// --- Dashboard Layout ---
export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, loading, logout, token, resendVerification } = useAuth();
  const { theme, setTheme, appearance, setAppearance } = useTheme();
  const router = useRouter();

  // Fetch Lists
  const { data: serverList, mutate: mutateServers } = useSWR(
    token ? "/vps/list" : null,
    fetcher,
  );
  const { data: webList, mutate: mutateWeb } = useSWR(
    token ? "/web/list" : null,
    fetcher,
  );
  const { data: monitorList, mutate: mutateMonitors } = useSWR(
    token ? "/uptime/list" : null,
    fetcher,
  );
  const { data: apmList, mutate: mutateApm } = useSWR(
    token ? "/apm/list" : null,
    fetcher,
  );

  // Modal States
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
  const [isApmModalOpen, setIsApmModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isResending, setIsResending] = useState(false); // For email resend

  // Loading States for Actions
  const [isRegisteringServer, setIsRegisteringServer] = useState(false);
  const [isRegisteringWeb, setIsRegisteringWeb] = useState(false);
  const [isRegisteringMonitor, setIsRegisteringMonitor] = useState(false);
  const [isRegisteringApm, setIsRegisteringApm] = useState(false);

  // Error States
  const [serverError, setServerError] = useState<string | null>(null);
  const [webError, setWebError] = useState<string | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [apmError, setApmError] = useState<string | null>(null);

  // Form State
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newInterval, setNewInterval] = useState("15");
  const [newCreds, setNewCreds] = useState<{
    vpsId?: string;
    webId?: string;
    apiKey?: string;
  } | null>(null);

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Spinner className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Authenticating...
        </p>
      </div>
    );
  if (!user) {
    router.push("/");
    return null;
  }

  // Handlers
  const handleRegisterServer = async () => {
    if (!newName) return;
    setIsRegisteringServer(true);
    setServerError(null);
    try {
      const res = await api.post("/vps/register", { name: newName });
      setNewCreds(res.data);
      setNewName("");
      mutateServers();
    } catch (e: any) {
      console.error(e);
      setServerError(
        extractErrorMessage(e, "Failed to register server. Please try again."),
      );
    } finally {
      setIsRegisteringServer(false);
    }
  };

  const handleRegisterWeb = async () => {
    if (!newName || !newDomain) return;
    setIsRegisteringWeb(true);
    setWebError(null);
    try {
      const res = await api.post("/web/register", {
        name: newName,
        domain: newDomain,
      });
      setNewCreds(res.data);
      setNewName("");
      setNewDomain("");
      mutateWeb();
    } catch (e: any) {
      console.error(e);
      setWebError(
        extractErrorMessage(
          e,
          "Failed to register website. Check domain format.",
        ),
      );
    } finally {
      setIsRegisteringWeb(false);
    }
  };

  const handleRegisterMonitor = async () => {
    if (!newName || !newUrl) return;
    setIsRegisteringMonitor(true);
    setMonitorError(null);
    try {
      await api.post("/uptime/register", {
        name: newName,
        url: newUrl,
        interval: newInterval,
      });
      setNewName("");
      setNewUrl("");
      setIsMonitorModalOpen(false);
      mutateMonitors();
    } catch (e: any) {
      console.error(e);
      setMonitorError(
        extractErrorMessage(
          e,
          "Failed to create monitor. Ensure URL is valid.",
        ),
      );
    } finally {
      setIsRegisteringMonitor(false);
    }
  };

  const handleRegisterApm = async () => {
    if (!newName) return;
    setIsRegisteringApm(true);
    setApmError(null);
    try {
      const res = await api.post("/apm/register", { name: newName });
      setNewCreds(res.data);
      setNewName("");
      mutateApm();
    } catch (e: any) {
      setApmError(e.response?.data?.error || "Failed");
    } finally {
      setIsRegisteringApm(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      await resendVerification();
      toast.success("Verification email sent!");
    } catch (e) {
      toast.error("Failed to send email");
    } finally {
      setIsResending(false);
    }
  };

  const closeModal = () => {
    setIsServerModalOpen(false);
    setIsWebModalOpen(false);
    setIsMonitorModalOpen(false);
    setIsApmModalOpen(false);
    setNewCreds(null);
    setNewName("");
    setNewDomain("");
    setNewUrl("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0 z-40">
        {/* Brand */}
        <div className="p-6 border-b shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-xl mb-0 tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
              <img
                src="/logo.svg"
                alt="Logo"
                className="object-cover h-full w-full logo"
              />
            </div>
            <span>Senzor</span>
          </Link>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* SERVERS */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Servers
              </div>
              {!user.isDemo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setIsServerModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            {!serverList && (
              <div className="flex justify-center py-4">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {serverList?.map((server: any) => {
              const isActive = router.asPath.includes(`/server/${server._id}`);
              return (
                <Link href={`/dashboard/server/${server._id}`} key={server._id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2 mb-1 h-9",
                      isActive &&
                        "bg-secondary/80 font-semibold border border-border/50",
                    )}
                  >
                    <div
                      className={`h-2 w-2 rounded-full shadow-[0_0_8px] shrink-0 ${
                        server.status === "online"
                          ? "bg-emerald-500 shadow-emerald-500/50"
                          : "bg-destructive shadow-destructive/50"
                      }`}
                    />
                    <span className="truncate">{server.name}</span>
                  </Button>
                </Link>
              );
            })}
            {serverList?.length === 0 && (
              <div className="px-2 text-[10px] text-muted-foreground">
                No servers connected.
              </div>
            )}
          </div>

          {/* WEBSITES */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Websites
              </div>
              {!user.isDemo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setIsWebModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {!webList && (
              <div className="flex justify-center py-4">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {webList?.map((site: any) => {
              const isActive = router.asPath.includes(`/web/${site._id}`);
              return (
                <Link href={`/dashboard/web/${site._id}`} key={site._id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2 mb-1 h-9",
                      isActive &&
                        "bg-secondary/80 font-semibold border border-border/50",
                    )}
                  >
                    <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="truncate">{site.name}</span>
                  </Button>
                </Link>
              );
            })}
            {webList?.length === 0 && (
              <div className="px-2 text-[10px] text-muted-foreground">
                No websites tracked.
              </div>
            )}
          </div>

          {/* APM SERVICES */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Services
              </div>
              {!user.isDemo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setIsApmModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            {apmList?.map((a: any) => (
              <Link href={`/dashboard/apm/${a._id}`} key={a._id}>
                <Button
                  variant={
                    router.asPath.includes(`/apm/${a._id}`)
                      ? "secondary"
                      : "ghost"
                  }
                  className={cn(
                    "w-full justify-start gap-2 mb-1 h-9",
                    router.asPath.includes(`/apm/${a._id}`) &&
                      "bg-secondary/80 font-semibold border border-border/50",
                  )}
                >
                  <Box className="h-3 w-3 text-orange-500" />{" "}
                  <span className="truncate">{a.name}</span>
                </Button>
              </Link>
            ))}
          </div>

          {/* MONITORS */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Uptime
              </div>
              {!user.isDemo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setIsMonitorModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {!monitorList && (
              <div className="flex justify-center py-4">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {monitorList?.map((m: any) => (
              <Link href={`/dashboard/monitor/${m._id}`} key={m._id}>
                <Button
                  variant={
                    router.asPath.includes(`/monitor/${m._id}`)
                      ? "secondary"
                      : "ghost"
                  }
                  className={cn(
                    "w-full justify-start gap-2 mb-1 h-9",
                    router.asPath.includes(`/monitor/${m._id}`) &&
                      "bg-secondary/80 font-semibold border border-border/50",
                  )}
                >
                  <Activity
                    className={`h-3 w-3 shrink-0 ${
                      m.status === "up"
                        ? "text-emerald-500"
                        : "text-destructive"
                    }`}
                  />
                  <span className="truncate">{m.name}</span>
                </Button>
              </Link>
            ))}
            {monitorList?.length === 0 && (
              <div className="px-2 text-[10px] text-muted-foreground">
                No uptimes monitored.
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="pt-4 border-t border-border/40">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-9"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" /> Global Settings
            </Button>
          </div>
        </div>

        {/* Profile */}
        <div className="p-4 border-t bg-card/50 shrink-0">
          {!user.isDemo && !user.emailVerified && (
            <div
              onClick={() => setIsVerifyModalOpen(true)}
              className="mb-4 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center gap-3 group"
            >
              <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-3 w-3 text-amber-500" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide leading-none mb-0.5 group-hover:underline">
                  Verify Account
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Action required
                </span>
              </div>
              <ArrowRight className="h-3 w-3 text-amber-500 ml-auto opacity-50 group-hover:opacity-100" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-secondary/20">
            <Avatar
              src={getGravatar(user.email || "")}
              fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
            />
            <div className="flex flex-col overflow-hidden justify-center">
              <span className="text-sm font-medium truncate leading-tight flex items-center gap-2">
                {user.displayName || "User"}
                {user.isDemo && (
                  <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">
                    DEMO
                  </Badge>
                )}
              </span>
              <span
                className="text-xs text-muted-foreground truncate leading-tight"
                title={user.email || ""}
              >
                {user.email}
              </span>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors items-center"
          >
            <LogOut className="h-3 w-3" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background">
        {children}
      </main>

      {/* --- VERIFY EMAIL MODAL --- */}
      <Dialog
        open={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Your Email"
      >
        <div className="space-y-4 text-center py-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-semibold">Check your inbox</h4>
            <p className="text-sm text-muted-foreground">
              We've sent a verification link to <br />
              <span className="font-mono text-foreground font-bold">
                {user.email}
              </span>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Please click the link to unlock full account features.
            </p>
          </div>
          <div className="pt-4 flex gap-2 justify-center">
            <Button variant="ghost" onClick={() => setIsVerifyModalOpen(false)}>
              I'll do it later
            </Button>
            <Button onClick={handleResendEmail} disabled={isResending}>
              {isResending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Sending...
                </>
              ) : (
                "Resend Email"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* --- SETTINGS MODAL --- */}
      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Global Settings"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" /> Interface Theme
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="justify-start"
              >
                Dark (Default)
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="justify-start"
              >
                Light
              </Button>
              <Button
                variant={theme === "nord" ? "default" : "outline"}
                onClick={() => setTheme("nord")}
                className="justify-start"
              >
                Nord
              </Button>
              <Button
                variant={theme === "latte" ? "default" : "outline"}
                onClick={() => setTheme("latte")}
                className="justify-start"
              >
                Latte
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" /> Data Visualization
            </h4>
            <div className="flex gap-2">
              <Button
                variant={appearance === "colorful" ? "default" : "outline"}
                onClick={() => setAppearance("colorful")}
                className="flex-1"
              >
                Colorful
              </Button>
              <Button
                variant={appearance === "monochromatic" ? "default" : "outline"}
                onClick={() => setAppearance("monochromatic")}
                className="flex-1"
              >
                Monochromatic
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Monochromatic mode forces all charts to use the theme's primary
              accent color for a cleaner look.
            </p>
          </div>
        </div>
      </Dialog>

      {/* --- SERVER MODAL --- */}
      <Dialog
        open={isServerModalOpen}
        onClose={closeModal}
        title="Connect New Server"
      >
        {!newCreds ? (
          <div className="space-y-4">
            {serverError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Production DB 01"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleRegisterServer}
                disabled={isRegisteringServer}
              >
                {isRegisteringServer ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Generating...
                  </>
                ) : (
                  "Generate Credentials"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ... Creds Display ... */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Server className="h-3 w-3" /> Server ID
                </label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                  {newCreds.vpsId}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" /> API Key
                </label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                  {newCreds.apiKey}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Installation Command
              </label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-emerald-400 break-all pr-8 leading-relaxed">
                  export SERVER_ID="{newCreds.vpsId}" && export API_KEY="
                  {newCreds.apiKey}" && curl -sL
                  https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh
                  | sudo -E bash -
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `export SERVER_ID="${newCreds.vpsId}" && export API_KEY="${newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh | sudo -E bash -`,
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-3 rounded-md">
              <span className="font-bold">⚠ Important:</span> This API Key will
              only be shown once. Please keep this window open until
              installation is complete.
            </div>
            <Button className="w-full" onClick={closeModal}>
              I have completed installation
            </Button>
          </div>
        )}
      </Dialog>

      {/* --- WEB MODAL (Same as before) --- */}
      <Dialog
        open={isWebModalOpen}
        onClose={closeModal}
        title="Track New Website"
      >
        {!newCreds ? (
          <div className="space-y-4">
            {webError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{webError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Website Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. My Portfolio"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. senzor.dev"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleRegisterWeb} disabled={isRegisteringWeb}>
                {isRegisteringWeb ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Creating...
                  </>
                ) : (
                  "Get Snippet"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Web ID
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">
                {newCreds.webId}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Add to your &lt;head&gt;
              </label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-blue-300 break-all pr-8 leading-relaxed">
                  &lt;script
                  src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"&gt;&lt;/script&gt;
                  <br />
                  &lt;script&gt;window.Senzor.init(&#123; webId: "
                  {newCreds.webId}" &#125;)&lt;/script&gt;
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script><script>window.Senzor.init({ webId: "${newCreds.webId}" })</script>`,
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs p-3 rounded-md">
              Tip: You can also use our NPM package <code>@senzops/web</code>{" "}
              for React/Vue apps.
            </div>
            <Button className="w-full" onClick={closeModal}>
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* APM MODAL */}
      <Dialog
        open={isApmModalOpen}
        onClose={closeModal}
        title="Connect API Service"
      >
        {!newCreds ? (
          <div className="space-y-4">
            {apmError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{apmError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Auth Microservice"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                disabled={isRegisteringApm}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={closeModal}
                disabled={isRegisteringApm}
              >
                Cancel
              </Button>
              <Button onClick={handleRegisterApm} disabled={isRegisteringApm}>
                {isRegisteringApm ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Generating...
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> Service Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-orange-500">
                {newCreds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Install Node.js Middleware
              </label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-orange-300 break-all pr-8 leading-relaxed">
                  npm install @senzops/node
                  <br />
                  <br />
                  const senzor = require('@senzops/node');
                  <br />
                  senzor.init(&#123; apiKey: "{newCreds.apiKey}" &#125;);
                  <br />
                  app.use(senzor.requestHandler());
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `npm install @senzops/node\n\nconst senzor = require('@senzops/node');\nsenzor.init({ apiKey: "${newCreds.apiKey}" });\napp.use(senzor.requestHandler());`,
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              Done
            </Button>
          </div>
        )}
      </Dialog>

      {/* --- MONITOR MODAL (New) --- */}
      <Dialog
        open={isMonitorModalOpen}
        onClose={closeModal}
        title="Add Uptime Monitor"
      >
        <div className="space-y-4">
          {monitorError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{monitorError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Monitor Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="e.g. API Health Check"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target URL</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="https://api.mysite.com/health"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Check Interval</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
            >
              <option value="15">Every 15 Minutes</option>
              <option value="30">Every 30 Minutes</option>
              <option value="60">Every 1 Hour</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleRegisterMonitor}
              disabled={isRegisteringMonitor}
            >
              {isRegisteringMonitor ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Creating...
                </>
              ) : (
                "Start Monitoring"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

// Helper for 'cn'
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
