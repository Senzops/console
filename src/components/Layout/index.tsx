/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useAuth, api } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { useRouter } from "next/router";
import { Button, Dialog, Avatar, Spinner, Badge, Select } from "../Core";
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
  Play,
  Box,
  ChevronRight,
  LayoutGrid,
  List,
  Database,
  EyeOff,
  Eye,
  AlertOctagon,
  Workflow,
  MonitorSmartphone,
  Terminal,
  Bot,
  BellRing,
  LayoutTemplate,
  ShieldCheck,
  Cookie,
  Shield,
  Scale,
  BadgeDollarSign,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import md5 from "md5";
import { extractErrorMessage } from "@/utils/axiosError";
import { toast } from "sonner";
import { FEATURES_DATA } from "@/static/featuresData";

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

          {/* Features (Dynamically Generated) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Features
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FEATURES_DATA.map((feature) => (
                <li key={feature.id}>
                  <Link
                    href={feature.href}
                    className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  >
                    {feature.title}
                  </Link>
                </li>
              ))}
            </ul>
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
                  href="/pricing"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <BadgeDollarSign className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Book className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Senzops/.github/blob/dev/SELF_HOSTING.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Layout className="h-3.5 w-3.5" /> Self Hosting
                </a>
              </li>
            </ul>
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Legal
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Scale className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Shield className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <Cookie className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/gdpr"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                >
                  <ShieldCheck className="h-3.5 w-3.5 group-hover:fill-emerald-500/20" />{" "}
                  GDPR compliance
                </Link>
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

// Helper for Sidebar Sections
const SidebarSection = ({
  title,
  items,
  hrefPrefix,
  linkPrefix,
  onAdd,
  icon: DefaultIcon,
}: any) => {
  const router = useRouter();
  const { sidebarMode } = useTheme();

  const showAll = sidebarMode === "all";
  const visibleItems = showAll ? items : items?.slice(0, 2) || [];
  const remaining = (items?.length || 0) - visibleItems?.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 mb-2 group">
        <Link
          href={linkPrefix}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {title}{" "}
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        {onAdd && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!items && (
        <div className="flex justify-center py-4">
          <Spinner className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {visibleItems?.map((item: any) => {
        const isActive = router.asPath.includes(`${hrefPrefix}/${item._id}`);
        let statusColor = "bg-secondary";
        if (item.status === "online" || item.status === "up")
          statusColor = "bg-emerald-500";
        else if (item.status === "offline" || item.status === "down")
          statusColor = "bg-destructive";

        let Icon = DefaultIcon;
        if (!Icon) {
          if (hrefPrefix.includes("web"))
            Icon = <Globe className="h-3 w-3 text-blue-500 shrink-0" />;
          else if (hrefPrefix.includes("rum"))
            Icon = (
              <MonitorSmartphone className="h-3 w-3 text-pink-500 shrink-0" />
            );
          else if (hrefPrefix.includes("apm"))
            Icon = <Box className="h-3 w-3 text-orange-500 shrink-0" />;
          else if (hrefPrefix.includes("monitor"))
            Icon = (
              <Activity
                className={`h-3 w-3 shrink-0 ${item.status === "up" ? "text-emerald-500" : "text-destructive"}`}
              />
            );
          else if (hrefPrefix.includes("task"))
            Icon = <Workflow className="h-3 w-3 text-indigo-500 shrink-0" />;
          else
            Icon = (
              <div className={`h-2 w-2 rounded-full shrink-0 ${statusColor}`} />
            );
        }

        return (
          <Link href={`${hrefPrefix}/${item._id}`} key={item._id}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 mb-1 h-9",
                isActive &&
                  "bg-secondary/80 font-semibold border border-border/50",
              )}
            >
              {Icon}
              <span className="truncate">{item.name}</span>
            </Button>
          </Link>
        );
      })}

      {!showAll && remaining > 0 && (
        <Link href={linkPrefix}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-7 text-xs text-muted-foreground/70 hover:text-primary pl-8"
          >
            Show {remaining} more
          </Button>
        </Link>
      )}

      {items?.length === 0 && (
        <div className="px-2 text-[10px] text-muted-foreground">
          No service items
        </div>
      )}
    </div>
  );
};

// --- Dashboard Layout ---
export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, loading, logout, token, resendVerification } = useAuth();
  const {
    theme,
    setTheme,
    appearance,
    setAppearance,
    sidebarMode,
    setSidebarMode,
    defaultViewMode,
    setDefaultViewMode,
  } = useTheme();
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
  const { data: dbList, mutate: mutateDb } = useSWR(
    token ? "/database/list" : null,
    fetcher,
  );
  const { data: taskList, mutate: mutateTask } = useSWR(
    token ? "/task/list" : null,
    fetcher,
  );
  const { data: rumList, mutate: mutateRum } = useSWR(
    token ? "/rum/list" : null,
    fetcher,
  );
  const { data: viewsList, mutate: mutateViews } = useSWR(
    token ? "/views" : null,
    fetcher,
  ); // SAVED VIEWS

  // Modal States
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
  const [isApmModalOpen, setIsApmModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isRumModalOpen, setIsRumModalOpen] = useState(false); // NEW
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // SAVED VIEWS
  const [showUri, setShowUri] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Loading States for Actions
  const [isRegisteringServer, setIsRegisteringServer] = useState(false);
  const [isRegisteringWeb, setIsRegisteringWeb] = useState(false);
  const [isRegisteringMonitor, setIsRegisteringMonitor] = useState(false);
  const [isRegisteringApm, setIsRegisteringApm] = useState(false);
  const [isRegisteringTask, setIsRegisteringTask] = useState(false);
  const [isRegisteringDb, setIsRegisteringDb] = useState(false);
  const [isRegisteringRum, setIsRegisteringRum] = useState(false); // NEW
  const [isRegisteringView, setIsRegisteringView] = useState(false); // SAVED VIEWS

  // Error States
  const [serverError, setServerError] = useState<string | null>(null);
  const [webError, setWebError] = useState<string | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [apmError, setApmError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [rumError, setRumError] = useState<string | null>(null); // NEW
  const [viewError, setViewError] = useState<string | null>(null); // SAVED VIEWS

  // Form State
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState(""); // Used for views
  const [newDomain, setNewDomain] = useState("");
  const [newDomains, setNewDomains] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newInterval, setNewInterval] = useState("15");
  const [newDbType, setNewDbType] = useState("mongodb");
  const [newCreds, setNewCreds] = useState<any>(null);

  // APM Snippet State
  const [selectedFramework, setSelectedFramework] = useState("Express");

  const getApmSnippet = (framework: string, apiKey?: string) => {
    switch (framework) {
      case "Express":
        return `npm install @senzops/apm-node\n\nconst senzor = require('@senzops/apm-node');\nsenzor.init({ apiKey: "${apiKey}" });\n\n// 1. Request Handler (First)\napp.use(senzor.requestHandler());\n\n// ... your routes ...\n\n// 2. Error Handler (Last)\napp.use(senzor.errorHandler());`;
      case "Next.js (App)":
        return `npm install @senzops/apm-node\n\n// app/api/route.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nexport const GET = Senzor.wrapNextRoute(async (req) => {\n  return Response.json({ ok: true });\n});`;
      case "Next.js (Pages)":
        return `npm install @senzops/apm-node\n\n// pages/api/hello.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nconst handler = (req, res) => res.json({ ok: true });\nexport default Senzor.wrapNextPages(handler);`;
      case "Fastify":
        return `npm install @senzops/apm-node\n\nimport {Senzor} from '@senzops/apm-node';\n\nfastify.register(Senzor.fastifyPlugin, {\n  apiKey: "${apiKey}"\n});`;
      case "NestJS":
        return `npm install @senzops/apm-node\n\n// main.ts\nimport {Senzor} from '@senzops/apm-node';\n\nasync function bootstrap() {\n  Senzor.init({ apiKey: "${apiKey}" });\n  const app = await NestFactory.create(AppModule);\n  app.use(Senzor.requestHandler());\n  await app.listen(3000);\n}`;
      case "Nuxt / Nitro":
        return `npm install @senzops/apm-node\n\n// server/middleware/senzor.ts\nimport {Senzor} from '@senzops/apm-node';\nSenzor.init({ apiKey: "${apiKey}" });\n\nexport default Senzor.wrapH3(defineEventHandler((event) => {\n  // Your logic\n}));`;
      case "Nitro + CloudFlare worker":
        return `npm install @senzops/apm-worker\n\n// server/plugins/senzor.ts\nimport { Senzor } from "@senzops/apm-worker";\n\nexport default defineNitroPlugin((nitroApp) => {\n  Senzor.init({\n    apiKey: "${apiKey}",\n  });\n\n  Senzor.nitroPlugin(nitroApp);\n});`;
      default:
        return "";
    }
  };

  // Task Snippet
  const getTaskSnippet = (apiKey?: string) => {
    return `npm install @senzops/apm-node\n\nimport Senzor from '@senzops/apm-node';\n\n// Initialize as early as possible in your worker entry file\nSenzor.init({\n  apiKey: "${apiKey}"\n});\n\n// BullMQ and Node-Cron are now automatically instrumented!`;
  };

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

  const handleRegisterRum = async () => {
    if (!newName || !newDomains) return;
    setIsRegisteringRum(true);
    setRumError(null);
    try {
      // Pass the comma-separated domains string directly to the backend
      const res = await api.post("/rum/register", {
        name: newName,
        domains: newDomains,
      });
      setNewCreds(res.data);
      setNewName("");
      setNewDomains("");
      mutateRum();
    } catch (e: any) {
      setRumError(
        extractErrorMessage(e, "Failed to register RUM. Check domain format."),
      );
    } finally {
      setIsRegisteringRum(false);
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

  const handleRegisterTask = async () => {
    if (!newName) return;
    setIsRegisteringTask(true);
    setTaskError(null);
    try {
      const res = await api.post("/task/register", { name: newName });
      setNewCreds(res.data);
      setNewName("");
      mutateTask();
      toast.success("Task Environment Registered!");
    } catch (e: any) {
      setTaskError(
        e.response?.data?.error || "Failed to create task environment",
      );
    } finally {
      setIsRegisteringTask(false);
    }
  };

  const handleRegisterDb = async () => {
    if (!newName || !newUrl) return;
    setIsRegisteringDb(true);
    setDbError(null);
    try {
      await api.post("/database/register", {
        name: newName,
        type: newDbType,
        uri: newUrl,
        interval: Number(newInterval),
      });
      setNewName("");
      setNewUrl("");
      setIsDbModalOpen(false);
      mutateDb();
      toast.success("Database Connected & Monitored!");
    } catch (e: any) {
      setDbError(e.response?.data?.error || "Connection Failed");
    } finally {
      setIsRegisteringDb(false);
    }
  };

  // --- Saved View Handler ---
  const handleRegisterView = async () => {
    if (!newName) return;
    setIsRegisteringView(true);
    setViewError(null);
    try {
      const res = await api.post("/views", {
        name: newName,
        description: newDescription,
      });
      setNewName("");
      setNewDescription("");
      setIsViewModalOpen(false);
      mutateViews();
      toast.success("Dashboard created!");
      router.push(`/dashboard/views/${res.data.view._id}`);
    } catch (e: any) {
      setViewError(e.response?.data?.error || "Failed to create view");
    } finally {
      setIsRegisteringView(false);
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
    setIsTaskModalOpen(false);
    setIsDbModalOpen(false);
    setIsRumModalOpen(false); // NEW
    setIsViewModalOpen(false);
    setNewCreds(null);
    setNewName("");
    setNewDescription("");
    setNewDomain("");
    setNewDomains("");
    setNewUrl("");
    setSelectedFramework("Express");
    setNewDbType("mongodb");
    setNewInterval("15");
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
          <SidebarSection
            title="Saved Views"
            items={viewsList?.views}
            hrefPrefix="/dashboard/views"
            linkPrefix="/dashboard/views"
            onAdd={!user.isDemo ? () => setIsViewModalOpen(true) : undefined}
            icon={<LayoutTemplate className="h-3 w-3 text-teal-500 shrink-0" />}
          />
          <SidebarSection
            title="Servers"
            items={serverList}
            hrefPrefix="/dashboard/server"
            linkPrefix="/dashboard/server"
            onAdd={!user.isDemo ? () => setIsServerModalOpen(true) : undefined}
          />
          <SidebarSection
            title="Databases"
            items={dbList}
            hrefPrefix="/dashboard/db"
            linkPrefix="/dashboard/db"
            onAdd={!user.isDemo ? () => setIsDbModalOpen(true) : undefined}
            icon={<Database className="h-3 w-3 text-blue-500 shrink-0" />}
          />

          <SidebarSection
            title="Web Analytics"
            items={webList}
            hrefPrefix="/dashboard/web"
            linkPrefix="/dashboard/web"
            onAdd={!user.isDemo ? () => setIsWebModalOpen(true) : undefined}
          />

          {/* --- NEW RUM SECTION --- */}
          <SidebarSection
            title="Web APM (RUM)"
            items={rumList}
            hrefPrefix="/dashboard/rum"
            linkPrefix="/dashboard/rum"
            onAdd={!user.isDemo ? () => setIsRumModalOpen(true) : undefined}
            icon={
              <MonitorSmartphone className="h-3 w-3 text-pink-500 shrink-0" />
            }
          />

          <SidebarSection
            title="APM Services"
            items={apmList}
            hrefPrefix="/dashboard/apm"
            linkPrefix="/dashboard/apm"
            onAdd={!user.isDemo ? () => setIsApmModalOpen(true) : undefined}
          />

          <SidebarSection
            title="Background Tasks"
            items={taskList}
            hrefPrefix="/dashboard/task"
            linkPrefix="/dashboard/task"
            onAdd={!user.isDemo ? () => setIsTaskModalOpen(true) : undefined}
            icon={<Workflow className="h-3 w-3 text-indigo-500 shrink-0" />}
          />

          {/* --- Error Tracking --- */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2 group">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 transition-colors">
                Error Tracking
              </span>
            </div>
            <Link href="/dashboard/errors">
              <Button
                variant={
                  router.asPath.includes("/dashboard/errors")
                    ? "secondary"
                    : "ghost"
                }
                className={cn(
                  "w-full justify-start gap-2 mb-1 h-9",
                  router.asPath.includes("/dashboard/errors") &&
                    "bg-secondary/80 font-semibold border border-border/50",
                )}
              >
                <AlertOctagon className="h-3 w-3 shrink-0 text-destructive" />
                <span className="truncate">Error Explorer</span>
              </Button>
            </Link>
          </div>

          {/* --- Log Management --- */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2 group">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 transition-colors">
                Log Management
              </span>
            </div>
            <Link href="/dashboard/logs">
              <Button
                variant={
                  router.asPath.includes("/dashboard/logs")
                    ? "secondary"
                    : "ghost"
                }
                className={cn(
                  "w-full justify-start gap-2 mb-1 h-9",
                  router.asPath.includes("/dashboard/logs") &&
                    "bg-secondary/80 font-semibold border border-border/50",
                )}
              >
                <Terminal className="h-3 w-3 shrink-0 text-blue-500" />
                <span className="truncate">Log Explorer</span>
              </Button>
            </Link>
          </div>

          {/* --- AI Integrations (MCP) --- */}
          <div className="space-y-1 mt-4">
            <div className="flex items-center justify-between px-2 mb-2 group">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 transition-colors">
                AI Integrations
              </span>
            </div>
            <Link href="/dashboard/ai/mcp">
              <Button
                variant={
                  router.asPath.includes("/dashboard/ai/mcp")
                    ? "secondary"
                    : "ghost"
                }
                className={cn(
                  "w-full justify-start gap-2 mb-1 h-9",
                  router.asPath.includes("/dashboard/ai/mcp") &&
                    "bg-secondary/80 font-semibold border border-border/50",
                )}
              >
                <Bot className="h-3 w-3 shrink-0 text-blue-500" />
                <span className="truncate">MCP Server</span>
              </Button>
            </Link>
          </div>

          {/* --- Alerts & Incidents --- */}
          <div className="space-y-1 mt-4">
            <div className="flex items-center justify-between px-2 mb-2 group">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 transition-colors">
                Alerts & Incidents
              </span>
            </div>
            <Link href="/dashboard/alerts">
              <Button
                variant={
                  router.asPath.includes("/dashboard/alerts")
                    ? "secondary"
                    : "ghost"
                }
                className={cn(
                  "w-full justify-start gap-2 mb-1 h-9",
                  router.asPath.includes("/dashboard/alerts") &&
                    "bg-secondary/80 font-semibold border border-border/50",
                )}
              >
                <BellRing className="h-3 w-3 shrink-0 text-destructive" />
                <span className="truncate">Alert Policies</span>
              </Button>
            </Link>
          </div>

          <SidebarSection
            title="Uptime"
            items={monitorList}
            hrefPrefix="/dashboard/monitor"
            linkPrefix="/dashboard/monitor"
            onAdd={!user.isDemo ? () => setIsMonitorModalOpen(true) : undefined}
          />

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

          <Link href="/profile" className="block mb-4" title="Manage Profile">
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border border-transparent hover:border-border/40 group cursor-pointer">
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar
                  src={getGravatar(user.email || "")}
                  fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
                />
                <div className="flex flex-col overflow-hidden justify-center">
                  <span className="text-sm font-medium truncate leading-tight flex items-center gap-2">
                    {user.displayName || "User"}
                    {user.isDemo && (
                      <Badge
                        variant="warning"
                        className="text-[9px] px-1 py-0 h-4"
                      >
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
            </div>
          </Link>

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

      {/* --- SAVED VIEW MODAL --- */}
      <Dialog
        open={isViewModalOpen}
        onClose={closeModal}
        title="Create Custom Dashboard"
      >
        <div className="space-y-4">
          {viewError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{viewError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dashboard Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all"
              placeholder="e.g. Master Production Overview"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all"
              placeholder="Describe the purpose of this view..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={isRegisteringView}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegisterView}
              disabled={isRegisteringView}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isRegisteringView ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Creating...
                </>
              ) : (
                "Create Canvas"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

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
          {/* 1. Theme */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Palette className="h-4 w-4" /> Interface Theme
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {["dark", "light", "nord", "latte"].map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "default" : "outline"}
                  onClick={() => setTheme(t as any)}
                  className="justify-start capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* 2. Visuals */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
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
            {/* <p className="text-xs text-muted-foreground">
              Monochromatic mode forces all charts to use the theme's primary
              accent color for a cleaner look.
            </p> */}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <LayoutGrid className="h-4 w-4" /> Navigation Layout
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={sidebarMode === "restricted" ? "default" : "outline"}
                onClick={() => setSidebarMode("restricted")}
                className="justify-start"
              >
                Compact
              </Button>
              <Button
                variant={sidebarMode === "all" ? "default" : "outline"}
                onClick={() => setSidebarMode("all")}
                className="justify-start"
              >
                Expanded
              </Button>
            </div>
          </div>

          {/* 4. Dashboard Defaults */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <List className="h-4 w-4" /> Default Dashboard View
            </h4>
            <div className="flex gap-2">
              <Button
                variant={defaultViewMode === "list" ? "default" : "outline"}
                onClick={() => setDefaultViewMode("list")}
                className="flex-1"
              >
                <List className="mr-2 h-4 w-4" /> List
              </Button>
              <Button
                variant={defaultViewMode === "grid" ? "default" : "outline"}
                onClick={() => setDefaultViewMode("grid")}
                className="flex-1"
              >
                <LayoutGrid className="mr-2 h-4 w-4" /> Grid
              </Button>
            </div>
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

      {/* --- WEB MODAL --- */}
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

      {/* --- RUM MODAL (NEW) --- */}
      <Dialog
        open={isRumModalOpen}
        onClose={closeModal}
        title="Connect Web APM (RUM)"
      >
        {!newCreds ? (
          <div className="space-y-4">
            {rumError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{rumError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Application Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                placeholder="e.g. Frontend - Production"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                Allowed Domains{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  Comma separated
                </span>
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                placeholder="e.g. senzor.dev, senzor.com"
                value={newDomains}
                onChange={(e) => setNewDomains(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                We strictly reject telemetry from unknown domains. Subdomains
                are automatically included.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleRegisterRum}
                disabled={isRegisteringRum}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isRegisteringRum ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Creating...
                  </>
                ) : (
                  "Generate SDK Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> RUM API Key
              </label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-pink-500">
                {newCreds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Add to your frontend application
              </label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-pink-300 break-all pr-8 leading-relaxed">
                  &lt;script
                  src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"&gt;&lt;/script&gt;
                  <br />
                  &lt;script&gt;
                  <br />
                  &nbsp;&nbsp;window.Senzor.initRum(&#123;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;apiKey: "{newCreds.apiKey}",
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;sampleRate: 1.0,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;allowedOrigins:
                  ["https://api.yourbackend.com"]
                  <br />
                  &nbsp;&nbsp;&#125;);
                  <br />
                  &lt;/script&gt;
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script>\n<script>\n  window.Senzor.initRum({\n    apiKey: "${newCreds.apiKey}",\n    sampleRate: 1.0,\n    allowedOrigins: ["https://api.yourbackend.com"]\n  });\n</script>`,
                    );
                    toast.success("Copied to clipboard!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="bg-pink-500/10 border border-pink-500/20 text-pink-500 text-xs p-3 rounded-md">
              Tip: Ensure `allowedOrigins` matches your backend API to enable
              full Distributed Tracing!
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
            {/* FRAMEWORK SELECTOR */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                {[
                  "Express",
                  "Next.js (App)",
                  "Next.js (Pages)",
                  "Fastify",
                  "NestJS",
                  "Nuxt / Nitro",
                  "Nitro + CloudFlare worker",
                ].map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all",
                      selectedFramework === fw
                        ? "bg-orange-500 text-white border-orange-600"
                        : "bg-muted border-border hover:bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {fw}
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-orange-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getApmSnippet(selectedFramework, newCreds.apiKey)}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      getApmSnippet(selectedFramework, newCreds.apiKey),
                    );
                    toast.success("Copied!");
                  }}
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

      {/* --- TASK MODAL --- */}
      <Dialog
        open={isTaskModalOpen}
        onClose={closeModal}
        title="Connect Background Tasks"
      >
        {!newCreds ? (
          <div className="space-y-4">
            {taskError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{taskError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Production Background Workers"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                disabled={isRegisteringTask}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={closeModal}
                disabled={isRegisteringTask}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegisterTask}
                disabled={isRegisteringTask}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isRegisteringTask ? (
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
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all text-indigo-500">
                {newCreds.apiKey}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Install & Configure</label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <pre className="text-xs font-mono text-indigo-300 break-all pr-8 leading-relaxed whitespace-pre-wrap">
                  {getTaskSnippet(newCreds.apiKey)}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      getTaskSnippet(newCreds.apiKey),
                    );
                    toast.success("Copied!");
                  }}
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

      {/* --- MONITOR MODAL --- */}
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

      {/* DATABASE MODAL */}
      <Dialog
        open={isDbModalOpen}
        onClose={closeModal}
        title="Connect Database"
      >
        <div className="space-y-4">
          {dbError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{dbError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Database Engine</label>
            <Select
              value={newDbType}
              onChange={(e) => setNewDbType(e.target.value)}
              disabled={isRegisteringDb}
            >
              <option value="mongodb">MongoDB</option>
              <option value="redis">Redis</option>
              <option value="postgresql" disabled>
                PostgreSQL (Coming Soon)
              </option>
              <option value="mysql" disabled>
                MySQL (Coming Soon)
              </option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder={
                newDbType === "redis"
                  ? "e.g. Production Cache"
                  : "e.g. Production Cluster"
              }
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isRegisteringDb}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Connection URI</label>
            <div className="relative">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono pr-10"
                placeholder={
                  newDbType === "redis"
                    ? "redis://:password@host:6379/0"
                    : "mongodb+srv://user:pass@cluster.net"
                }
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                disabled={isRegisteringDb}
                type={showUri ? "text" : "password"}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowUri(!showUri)}
              >
                {showUri ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Credentials are AES-256 encrypted safely in our secure vault.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monitoring Interval</label>
            <Select
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
              disabled={isRegisteringDb}
            >
              <option value="1">Every 1 minute (High Detail)</option>
              <option value="5">Every 5 minutes (Standard)</option>
              <option value="15">Every 15 minutes (Low Footprint)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={isRegisteringDb}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegisterDb}
              disabled={isRegisteringDb}
              className="min-w-[140px]"
            >
              {isRegisteringDb ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Connecting...
                </>
              ) : (
                "Connect & Save"
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
