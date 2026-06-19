/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { useAuth, api } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { useRouter } from "next/router";
import { Button, Dialog, Avatar, Spinner, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../Core";
import { SkeletonSidebarItems, RevealProvider } from "../Skeletons";
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
  ChevronLeft,
  LayoutGrid,
  List,
  Database,
  Layers,
  Flame,
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
  Menu,
  X,
  Download,
  Building2,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import md5 from "md5";
import { toast } from "sonner";
import { FEATURES_DATA } from "@/static/featuresData";
import { ServiceModalProvider, useServiceModal } from "../ServiceModals/context";
import { ServiceModals } from "../ServiceModals";
import { useOrg, Organization } from "../../lib/org";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Helper for Gravatar
const getGravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${md5(
    email.trim().toLowerCase(),
  )}?d=identicon`;

// --- Public Navbar ---
export const Navbar = ({
  transparentOnTop = false,
}: {
  transparentOnTop?: boolean;
}) => {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Smooth scroll detection for dynamic glassmorphic effect
  useEffect(() => {
    if (!transparentOnTop) return;

    const handleScroll = () => {
      // 20px threshold to trigger the background transition
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check on mount

    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparentOnTop]);

  // Determine if we should show the transparent, borderless state
  const isTransparent = transparentOnTop && !isScrolled;

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 ease-in-out",
        isTransparent
          ? "bg-transparent border-transparent shadow-none"
          : "border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
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

        {/* Auth */}
        <div className="flex items-center">
          <Link href={loading ? "#" : user ? "/dashboard" : "/login"}>
            <Button
              className={cn(
                "min-w-[108px] justify-center",
                loading ? "pointer-events-none" : ""
              )}
            >
              {loading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                user ? "Dashboard" : "Sign In"
              )}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

// --- Footer  ---
export const Footer = () => {
  // Dynamically split the features array in half to balance the vertical columns perfectly
  const halfFeatures = Math.ceil(FEATURES_DATA.length / 2);
  const featuresCol1 = FEATURES_DATA.slice(0, halfFeatures);
  const featuresCol2 = FEATURES_DATA.slice(halfFeatures);

  return (
    <footer className="border-t border-border bg-card/40 pt-16 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* 12-Column Enterprise Grid System (Re-arranged to eliminate empty space) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-6 gap-y-12 lg:gap-8 mb-16">
          {/* Brand & Connect Column (Spans 4 of 12) */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 flex flex-col justify-between space-y-8 lg:pr-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-card shadow-sm">
                  <img
                    src="/logo.svg"
                    alt="Senzor Logo"
                    className="object-cover h-full w-full logo"
                  />
                </div>
                <span>Senzor</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The complete observability platform for modern engineering
                teams. Open source, privacy-first, and lightweight.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
                Connect
              </h4>
              <div className="flex gap-2.5">
                <a
                  href="https://github.com/Senzops"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-foreground hover:text-background hover:border-foreground text-muted-foreground transition-all shadow-sm"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com/company/senzor-platforms"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] text-muted-foreground transition-all shadow-sm"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="mailto:ops@senzor.dev"
                  className="p-2.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-muted-foreground transition-all shadow-sm"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Status:{" "}
                <span className="text-emerald-500 font-medium">
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>

          {/* Features Column Part 1 (Spans 2 of 12) */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-5 min-w-0">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Features
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {featuresCol1.map((feature) => (
                <li key={feature.id} className="min-w-0">
                  <Link
                    href={feature.href}
                    className="hover:text-emerald-500 transition-colors block truncate"
                    title={feature.title}
                  >
                    {feature.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features Column Part 2 (Spans 2 of 12) */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-5 min-w-0">
            {/* Visual alignment header for large screens, hidden title to keep spacing */}
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-0 hidden sm:block select-none pointer-events-none">
              Features Cont.
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {featuresCol2.map((feature) => (
                <li key={feature.id} className="min-w-0">
                  <Link
                    href={feature.href}
                    className="hover:text-emerald-500 transition-colors block truncate"
                    title={feature.title}
                  >
                    {feature.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Column (Spans 2 of 12) */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-5 min-w-0">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Platform
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="min-w-0">
                <Link
                  href="/demo"
                  target="_blank"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Live Demo"
                >
                  <Play className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Live Demo</span>
                </Link>
              </li>
              <li className="min-w-0">
                <Link
                  href="/pricing"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Pricing"
                >
                  <BadgeDollarSign className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Pricing</span>
                </Link>
              </li>
              <li className="min-w-0">
                <Link
                  href="/docs"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Documentation"
                >
                  <Book className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Documentation</span>
                </Link>
              </li>
              <li className="min-w-0">
                <a
                  href="https://github.com/Senzops/.github/blob/dev/SELF_HOSTING.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Self Hosting"
                >
                  <Layout className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Self Hosting</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column (Spans 2 of 12) */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-5 min-w-0">
            <h4 className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
              Legal
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="min-w-0">
                <Link
                  href="/terms"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Terms of Service"
                >
                  <Scale className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Terms of Service</span>
                </Link>
              </li>
              <li className="min-w-0">
                <Link
                  href="/privacy"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Privacy Policy"
                >
                  <Shield className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Privacy Policy</span>
                </Link>
              </li>
              <li className="min-w-0">
                <Link
                  href="/cookie"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="Cookie Policy"
                >
                  <Cookie className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">Cookie Policy</span>
                </Link>
              </li>
              <li className="min-w-0">
                <Link
                  href="/gdpr"
                  className="hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                  title="GDPR compliance"
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 group-hover:text-emerald-500 transition-colors" />{" "}
                  <span className="truncate">GDPR compliance</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/60">
          <p>
            &copy; {new Date().getFullYear()} Senzor Platforms Inc. All rights
            reserved.
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.25" /><path d="M8 4v4l2.5 1.5" /></svg>
              99.9% Uptime
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l5.5 2.5v4c0 3.5-2.5 5.5-5.5 7-3-1.5-5.5-3.5-5.5-7V4z" /><path d="M6 8l1.5 1.5L10 6" /></svg>
              GDPR Compliant
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0z" /><circle cx="5.5" cy="7" r="0.5" fill="currentColor" stroke="none" /><circle cx="8" cy="7" r="0.5" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7" r="0.5" fill="currentColor" stroke="none" /><path d="M5.5 7h5" /><path d="M4.5 9.5h7" /></svg>
              EU Hosted
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7.5" width="10" height="6" rx="1.5" /><path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5" /></svg>
              Encrypted
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Helper for item icons
export const getSidebarItemIcon = (hrefPrefix: string, item: any, DefaultIcon: any = null) => {
  let Icon = DefaultIcon;
  if (!Icon) {
    let statusColor = "bg-secondary";
    if (item.status === "online" || item.status === "up")
      statusColor = "bg-emerald-500";
    else if (item.status === "offline" || item.status === "down")
      statusColor = "bg-destructive";

    if (hrefPrefix.includes("firebase"))
      Icon = <Flame className="h-3 w-3 text-amber-500 shrink-0" />;
    else if (hrefPrefix.includes("web"))
      Icon = <Globe className="h-3 w-3 text-blue-500 shrink-0" />;
    else if (hrefPrefix.includes("rum"))
      Icon = <MonitorSmartphone className="h-3 w-3 text-pink-500 shrink-0" />;
    else if (hrefPrefix.includes("apm"))
      Icon = <Box className="h-3 w-3 text-orange-500 shrink-0" />;
    else if (hrefPrefix.includes("monitor"))
      Icon = (
        <Activity
          className={cn(
            "h-3 w-3 shrink-0",
            item.status === "up" ? "text-emerald-500" : "text-destructive"
          )}
        />
      );
    else if (hrefPrefix.includes("task"))
      Icon = <Workflow className="h-3 w-3 text-indigo-500 shrink-0" />;
    else
      Icon = <div className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />;
  }
  return Icon;
};

// Helper for Sidebar Sections
export const SidebarSection = ({
  title,
  items,
  hrefPrefix,
  linkPrefix,
  onAdd,
  icon: DefaultIcon,
  isMinimized = false,
  onMouseEnter,
  onMouseLeave,
}: any) => {
  const router = useRouter();
  const { sidebarMode } = useTheme();

  // ENTERPRISE FIX: Bind accordion state synchronously to session storage to persist across unmounts
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`sidebar-section-${title}`);
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  // Auto-collapse when items finish loading and the list is empty (only if user hasn't explicitly toggled)
  useEffect(() => {
    if (Array.isArray(items) && items.length === 0) {
      const saved = typeof window !== "undefined"
        ? sessionStorage.getItem(`sidebar-section-${title}`)
        : null;
      if (saved === null) {
        setIsExpanded(false);
      }
    }
  }, [items, title]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`sidebar-section-${title}`, String(nextState));
    }
  };

  const showAll = sidebarMode === "all";
  const visibleItems = showAll ? items : items?.slice(0, 2) || [];
  const remaining = (items?.length || 0) - visibleItems?.length;

  // 2. Track if any child within this section is currently active
  const isAnyChildActive = items?.some((item: any) =>
    router.asPath.includes(`${hrefPrefix}/${item._id}`),
  );

  if (isMinimized) {
    let HeaderIconComponent: React.ComponentType<any> = LayoutTemplate;
    let iconColorClass = "text-teal-500";

    if (title === "Servers") {
      HeaderIconComponent = Server;
      iconColorClass = "text-emerald-500";
    } else if (title === "Databases") {
      HeaderIconComponent = Database;
      iconColorClass = "text-blue-500";
    } else if (title === "Firebase") {
      HeaderIconComponent = Flame;
      iconColorClass = "text-amber-500";
    } else if (title === "Web Analytics") {
      HeaderIconComponent = Globe;
      iconColorClass = "text-sky-500";
    } else if (title === "Web APM (RUM)") {
      HeaderIconComponent = MonitorSmartphone;
      iconColorClass = "text-pink-500";
    } else if (title === "APM Services") {
      HeaderIconComponent = Box;
      iconColorClass = "text-orange-500";
    } else if (title === "Background Tasks") {
      HeaderIconComponent = Workflow;
      iconColorClass = "text-indigo-500";
    } else if (title === "Uptime") {
      HeaderIconComponent = Activity;
      iconColorClass = "text-emerald-500";
    } else if (title === "Status Boards") {
      HeaderIconComponent = LayoutGrid;
      iconColorClass = "text-emerald-500";
    }

    return (
      <div
        className="flex justify-center py-0.5 px-1 relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link href={linkPrefix} className="outline-none">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl transition-all duration-200 border border-transparent hover:border-border/40 hover:bg-secondary/40",
              isAnyChildActive
                ? "bg-secondary/60 border-border/50 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HeaderIconComponent className={cn("h-3.5 w-3.5 shrink-0", iconColorClass)} />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 mb-2">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-1 group">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Accordion Toggle (Separated from the Link) */}
          <button
            onClick={handleToggle}
            className="p-0.5 rounded-md text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Toggle section"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isExpanded ? "rotate-90" : "rotate-0",
              )}
            />
          </button>

          {/* Main Title Link */}
          <Link
            href={linkPrefix}
            className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors truncate flex-1 py-1"
          >
            {title}
          </Link>
        </div>

        {/* Optional Add Action */}
        {onAdd && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* --- ACCORDION BODY (Animated via CSS Grid) --- */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {/* The Branch Line Container 
            ml-3 indents it perfectly under the Chevron. 
            border-l-2 creates the subtle tracking line.
          */}
          <div
            className={cn(
              "ml-3 pl-2.5 border-l-2 flex flex-col gap-0.5 py-0.5 transition-colors duration-500",
              isAnyChildActive ? "border-primary/50" : "border-border/30",
            )}
          >
            {!items && <SkeletonSidebarItems count={2} />}

            {visibleItems?.map((item: any) => {
              const isActive = router.asPath.includes(
                `${hrefPrefix}/${item._id}`,
              );
              const Icon = getSidebarItemIcon(hrefPrefix, item, DefaultIcon);

              return (
                <Link href={`${hrefPrefix}/${item._id}`} key={item._id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2.5 h-8 px-2 text-xs transition-colors",
                      isActive
                        ? "bg-secondary/80 font-semibold border border-border/50 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    {Icon}
                    <span className="truncate">{item.name}</span>
                  </Button>
                </Link>
              );
            })}

            {/* "Show More" Truncation */}
            {!showAll && remaining > 0 && (
              <Link href={linkPrefix}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2.5 h-7 px-2 text-[11px] text-muted-foreground/70 hover:text-primary mt-0.5"
                >
                  <div className="w-3 h-3 flex items-center justify-center shrink-0">
                    <div className="h-1 w-1 rounded-full bg-current opacity-40" />
                  </div>
                  Show {remaining} more
                </Button>
              </Link>
            )}

            {/* Empty State */}
            {items?.length === 0 && (
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                No service items
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Static Sidebar Group (For AI, Logs, Alerts, etc.) ---
export const SidebarGroup = ({
  title,
  links,
  isMinimized = false,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string;
  links: any[];
  isMinimized?: boolean;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}) => {
  const router = useRouter();

  // ENTERPRISE FIX: Bind accordion state synchronously to session storage to persist across unmounts
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`sidebar-group-${title}`);
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`sidebar-group-${title}`, String(nextState));
    }
  };

  // Auto-detect active children for the branch line highlight
  const isAnyChildActive = links?.some((link: any) =>
    router.asPath.includes(link.href),
  );

  if (isMinimized) {
    const firstLink = links[0];
    const GroupIcon = firstLink?.icon || Bot;

    return (
      <div
        className="flex justify-center py-0.5 px-1 relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link href={firstLink?.href || "#"} className="outline-none">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl transition-all duration-200 border border-transparent hover:border-border/40 hover:bg-secondary/40",
              isAnyChildActive
                ? "bg-secondary/60 border-border/50 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GroupIcon className={cn("h-3.5 w-3.5 shrink-0", firstLink?.iconColor)} />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 mb-2 mt-4">
      {/* --- HEADER --- */}
      <div
        className="flex items-center justify-between px-1 group cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            className="p-0.5 rounded-md text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Toggle section"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isExpanded ? "rotate-90" : "rotate-0",
              )}
            />
          </button>

          {/* Main Title (No Link, acts entirely as the accordion toggle) */}
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors truncate flex-1 py-1 select-none">
            {title}
          </span>
        </div>
      </div>

      {/* --- ACCORDION BODY (Animated via CSS Grid) --- */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {/* The Branch Line Container */}
          <div
            className={cn(
              "ml-3 pl-2.5 border-l-2 flex flex-col gap-0.5 py-0.5 transition-colors duration-500",
              isAnyChildActive ? "border-primary/50" : "border-border/30",
            )}
          >
            {links?.map((link: any, idx: number) => {
              const isActive = router.asPath.includes(link.href);
              const Icon = link.icon;

              return (
                <Link href={link.href} key={idx}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2.5 h-8 px-2 text-xs transition-colors",
                      isActive
                        ? "bg-secondary/80 font-semibold border border-border/50 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn("h-3.5 w-3.5 shrink-0", link.iconColor)}
                      />
                    )}
                    <span className="truncate">{link.label}</span>
                  </Button>
                </Link>
              );
            })}

            {links?.length === 0 && (
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                No items
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard Layout (public export wraps inner with ServiceModalProvider) ---
export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { token } = useAuth();

  // SWR list hooks must live at provider level so mutate fns can be passed down
  const { mutate: mutateServers } = useSWR(token ? "/vps/list" : null, fetcher);
  const { mutate: mutateWeb } = useSWR(token ? "/web/list" : null, fetcher);
  const { mutate: mutateMonitors } = useSWR(token ? "/uptime/list" : null, fetcher);
  const { mutate: mutateApm } = useSWR(token ? "/apm/list" : null, fetcher);
  const { mutate: mutateDb } = useSWR(token ? "/database/list" : null, fetcher);
  const { mutate: mutateQueue } = useSWR(token ? "/queue/list" : null, fetcher);
  const { mutate: mutateFirebase } = useSWR(token ? "/firebase/list" : null, fetcher);
  const { mutate: mutateTask } = useSWR(token ? "/task/list" : null, fetcher);
  const { mutate: mutateRum } = useSWR(token ? "/rum/list" : null, fetcher);
  const { mutate: mutateViews } = useSWR(token ? "/views" : null, fetcher);
  const { mutate: mutateBoards } = useSWR(token ? "/monitor-board" : null, fetcher);

  const mutateFns = React.useMemo(
    () => ({
      server: mutateServers,
      web: mutateWeb,
      monitor: mutateMonitors,
      apm: mutateApm,
      database: mutateDb,
      queue: mutateQueue,
      firebase: mutateFirebase,
      task: mutateTask,
      rum: mutateRum,
      view: mutateViews,
      board: mutateBoards,
    }),
    [mutateServers, mutateWeb, mutateMonitors, mutateApm, mutateDb, mutateFirebase, mutateTask, mutateRum, mutateViews, mutateBoards],
  );

  return (
    <ServiceModalProvider mutateFns={mutateFns}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ServiceModalProvider>
  );
};

// --- Dashboard Layout Inner (uses ServiceModalContext) ---
const DashboardLayoutInner = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, loading, logout, token, resendVerification, otpVerified } = useAuth();
  const {
    theme,
    setTheme,
    appearance,
    setAppearance,
    sidebarMode,
    setSidebarMode,
    defaultViewMode,
    setDefaultViewMode,
    isSidebarMinimized,
    setIsSidebarMinimized,
  } = useTheme();
  const router = useRouter();

  // Reference for the scrollable container
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sidebar Minimization State & Persistence
  const isMinimized = isSidebarMinimized;
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    // Delay layout transitions until after the initial client-side hydration/mount
    const timer = setTimeout(() => setEnableTransition(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleMinimized = () => {
    setIsSidebarMinimized(!isSidebarMinimized);
  };

  // Hover Popover (Dynamic Island) State & References
  const [hoveredSection, setHoveredSection] = useState<{
    id: string;
    title: string;
    items?: any[];
    hrefPrefix?: string;
    linkPrefix?: string;
    links?: any[];
    rect: DOMRect;
    type: "section" | "group";
    onAdd?: () => void;
    icon?: any;
  } | null>(null);

  const [cardTop, setCardTop] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hoveredSection) {
      setCardTop(null);
      return;
    }
    const updatePosition = () => {
      if (cardRef.current) {
        const rect = hoveredSection.rect;
        const height = cardRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const padding = 12;

        let top = rect.top;
        if (top + height > viewportHeight - padding) {
          top = viewportHeight - height - padding;
        }
        if (top < padding) {
          top = padding;
        }
        setCardTop(top);
      }
    };

    // Run layout position check
    updatePosition();
    // Run again in next microtask to capture final DOM dimensions
    const timer = setTimeout(updatePosition, 0);
    return () => clearTimeout(timer);
  }, [hoveredSection, hoveredSection?.items, hoveredSection?.rect?.top]);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSectionMouseEnter = (sectionData: any, element: HTMLElement) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = element.getBoundingClientRect();
    setHoveredSection({ ...sectionData, rect });
  };

  const handleSectionMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 150);
  };

  const handleCardMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleCardMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 150);
  };


  // PWA LOGIC
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone
      ) {
        setIsInstalled(true);
      }

      // Hydrate PWA prompt from global window object if it was caught before a route change
      if ((window as any).__pwaInstallPrompt) {
        setIsInstallable(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event globally so it survives Next.js page remounts
      (window as any).__pwaInstallPrompt = e;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      (window as any).__pwaInstallPrompt = null;
      toast.success("App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).__pwaInstallPrompt;
    if (!promptEvent) return;

    // Show the native install prompt
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      (window as any).__pwaInstallPrompt = null;
    }
  };

  // Dynamic PWA Theme Color Synchronization
  useEffect(() => {
    if (typeof window !== "undefined") {
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }

      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();

      metaTheme.setAttribute("content", `hsl(${bg})`);
    }
  }, [theme]);

  // Close the mobile sidebar whenever the route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [router.asPath]);

  // Fetch Lists (SWR deduplicates — same keys as outer DashboardLayout wrapper)
  const { data: serverList } = useSWR(token ? "/vps/list" : null, fetcher);
  const { data: webList } = useSWR(token ? "/web/list" : null, fetcher);
  const { data: monitorList } = useSWR(token ? "/uptime/list" : null, fetcher);
  const { data: apmList } = useSWR(token ? "/apm/list" : null, fetcher);
  const { data: dbList } = useSWR(token ? "/database/list" : null, fetcher);
  const { data: queueList } = useSWR(token ? "/queue/list" : null, fetcher);
  const { data: firebaseList } = useSWR(token ? "/firebase/list" : null, fetcher);
  const { data: taskList } = useSWR(token ? "/task/list" : null, fetcher);
  const { data: rumList } = useSWR(token ? "/rum/list" : null, fetcher);
  const { data: viewsList } = useSWR(token ? "/views" : null, fetcher);
  const { data: boardsData } = useSWR(token ? "/monitor-board" : null, fetcher);

  // ENTERPRISE FIX: Hydrate scroll position instantly on mount and intercept scroll events
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem("senzor-sidebar-scroll");
      if (savedScroll) {
        sidebar.scrollTop = Number(savedScroll);
      }
    };

    // Restore immediately
    restoreScroll();

    // Listen and save
    const handleScroll = () => {
      sessionStorage.setItem(
        "senzor-sidebar-scroll",
        String(sidebar.scrollTop),
      );
    };

    sidebar.addEventListener("scroll", handleScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, [isMobileSidebarOpen]); // Add isMobileSidebarOpen so it binds when mounted on mobile

  // Guarantee scroll restore even if data fetches take a split second to paint the DOM height
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("senzor-sidebar-scroll");
    if (savedScroll && sidebarRef.current) {
      sidebarRef.current.scrollTop = Number(savedScroll);
    }
  }, [
    serverList,
    webList,
    monitorList,
    apmList,
    dbList,
    firebaseList,
    taskList,
    rumList,
    viewsList,
  ]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Service modals are now managed via ServiceModalContext
  const { openModal } = useServiceModal();

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

  if (!user.isDemo && !user.emailVerified) {
    router.push("/verify-email");
    return null;
  }

  if (!user.isDemo && !otpVerified) {
    router.push("/verify-otp");
    return null;
  }

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

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* --- MOBILE BACKDROP --- */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* --- UNIFIED ENTERPRISE SIDEBAR (Desktop + Mobile Drawer) --- */}
      {/* --- UNIFIED ENTERPRISE SIDEBAR (Desktop + Mobile Drawer) --- */}
      {(() => {
        const isActuallyMinimized = isMinimized && !isMobileSidebarOpen;
        return (
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 bg-card border-r flex flex-col md:relative md:translate-x-0 shadow-2xl md:shadow-none",
              enableTransition ? "transition-all duration-300 ease-in-out" : "",
              isActuallyMinimized ? "w-64 md:w-16" : "w-64 md:w-64",
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            )}
          >
            {/* Floating Toggle Button for desktop */}
            <button
              onClick={handleToggleMinimized}
              className="hidden md:flex absolute top-6 -right-3 z-50 items-center justify-center h-6 w-6 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-all focus:outline-none outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
              title={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isMinimized ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Brand Header */}
            <div className={cn(
              "p-4 md:p-6 border-b shrink-0 flex items-center h-14 md:h-auto",
              isActuallyMinimized ? "justify-center md:px-2" : "justify-between"
            )}>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity",
                  isActuallyMinimized ? "justify-center" : ""
                )}
              >
                <div className="relative h-8 w-8 rounded-lg overflow-hidden shrink-0">
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="object-cover h-full w-full logo"
                  />
                </div>
                {!isActuallyMinimized && <span>Senzor</span>}
              </Link>
              {/* Close button solely for Mobile UX */}
              {!isActuallyMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-muted-foreground hover:text-foreground -mr-2"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Scrollable Nav Area */}
            <div
              ref={sidebarRef}
              className={cn(
                "flex-1 overflow-y-auto py-4 px-2 space-y-6",
                isActuallyMinimized ? "space-y-1 px-1 no-scrollbar" : "space-y-6"
              )}
            >
              <SidebarSection
                title="Saved Views"
                items={viewsList?.views}
                hrefPrefix="/dashboard/views"
                linkPrefix="/dashboard/views"
                onAdd={!user.isDemo ? () => openModal('view') : undefined}
                icon={<LayoutTemplate className="h-3 w-3 text-teal-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "views",
                  title: "Saved Views",
                  items: viewsList?.views,
                  hrefPrefix: "/dashboard/views",
                  linkPrefix: "/dashboard/views",
                  onAdd: !user.isDemo ? () => openModal('view') : undefined,
                  icon: <LayoutTemplate className="h-3.5 w-3.5 text-teal-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />
              <SidebarSection
                title="Servers"
                items={serverList}
                hrefPrefix="/dashboard/server"
                linkPrefix="/dashboard/server"
                onAdd={!user.isDemo ? () => openModal('server') : undefined}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "servers",
                  title: "Servers",
                  items: serverList,
                  hrefPrefix: "/dashboard/server",
                  linkPrefix: "/dashboard/server",
                  onAdd: !user.isDemo ? () => openModal('server') : undefined,
                  icon: <Server className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />
              <SidebarSection
                title="Databases"
                items={dbList}
                hrefPrefix="/dashboard/db"
                linkPrefix="/dashboard/db"
                onAdd={!user.isDemo ? () => openModal('database') : undefined}
                icon={<Database className="h-3 w-3 text-blue-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "databases",
                  title: "Databases",
                  items: dbList,
                  hrefPrefix: "/dashboard/db",
                  linkPrefix: "/dashboard/db",
                  onAdd: !user.isDemo ? () => openModal('database') : undefined,
                  icon: <Database className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="Queues"
                items={queueList}
                hrefPrefix="/dashboard/queue"
                linkPrefix="/dashboard/queue"
                onAdd={!user.isDemo ? () => openModal('queue') : undefined}
                icon={<Layers className="h-3 w-3 text-cyan-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "queues",
                  title: "Queues",
                  items: queueList,
                  hrefPrefix: "/dashboard/queue",
                  linkPrefix: "/dashboard/queue",
                  onAdd: !user.isDemo ? () => openModal('queue') : undefined,
                  icon: <Layers className="h-3.5 w-3.5 text-cyan-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="Firebase"
                items={firebaseList}
                hrefPrefix="/dashboard/firebase"
                linkPrefix="/dashboard/firebase"
                onAdd={!user.isDemo ? () => openModal('firebase') : undefined}
                icon={<Flame className="h-3 w-3 text-amber-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "firebase",
                  title: "Firebase",
                  items: firebaseList,
                  hrefPrefix: "/dashboard/firebase",
                  linkPrefix: "/dashboard/firebase",
                  onAdd: !user.isDemo ? () => openModal('firebase') : undefined,
                  icon: <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="Web Analytics"
                items={webList}
                hrefPrefix="/dashboard/web"
                linkPrefix="/dashboard/web"
                onAdd={!user.isDemo ? () => openModal('web') : undefined}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "web",
                  title: "Web Analytics",
                  items: webList,
                  hrefPrefix: "/dashboard/web",
                  linkPrefix: "/dashboard/web",
                  onAdd: !user.isDemo ? () => openModal('web') : undefined,
                  icon: <Globe className="h-3.5 w-3.5 text-sky-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- RUM SECTION --- */}
              <SidebarSection
                title="Web APM (RUM)"
                items={rumList}
                hrefPrefix="/dashboard/rum"
                linkPrefix="/dashboard/rum"
                onAdd={!user.isDemo ? () => openModal('rum') : undefined}
                icon={
                  <MonitorSmartphone className="h-3 w-3 text-pink-500 shrink-0" />
                }
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "rum",
                  title: "Web APM (RUM)",
                  items: rumList,
                  hrefPrefix: "/dashboard/rum",
                  linkPrefix: "/dashboard/rum",
                  onAdd: !user.isDemo ? () => openModal('rum') : undefined,
                  icon: <MonitorSmartphone className="h-3.5 w-3.5 text-pink-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="APM Services"
                items={apmList}
                hrefPrefix="/dashboard/apm"
                linkPrefix="/dashboard/apm"
                onAdd={!user.isDemo ? () => openModal('apm') : undefined}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "apm",
                  title: "APM Services",
                  items: apmList,
                  hrefPrefix: "/dashboard/apm",
                  linkPrefix: "/dashboard/apm",
                  onAdd: !user.isDemo ? () => openModal('apm') : undefined,
                  icon: <Box className="h-3.5 w-3.5 text-orange-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="Background Tasks"
                items={taskList}
                hrefPrefix="/dashboard/task"
                linkPrefix="/dashboard/task"
                onAdd={!user.isDemo ? () => openModal('task') : undefined}
                icon={<Workflow className="h-3 w-3 text-indigo-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "task",
                  title: "Background Tasks",
                  items: taskList,
                  hrefPrefix: "/dashboard/task",
                  linkPrefix: "/dashboard/task",
                  onAdd: !user.isDemo ? () => openModal('task') : undefined,
                  icon: <Workflow className="h-3.5 w-3.5 text-indigo-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- Error Tracking --- */}
              <SidebarGroup
                title="Error Tracking"
                links={[
                  {
                    href: "/dashboard/errors",
                    label: "Error Explorer",
                    icon: AlertOctagon,
                    iconColor: "text-destructive",
                  },
                ]}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "errors",
                  title: "Error Tracking",
                  links: [
                    {
                      href: "/dashboard/errors",
                      label: "Error Explorer",
                      icon: AlertOctagon,
                      iconColor: "text-destructive",
                    },
                  ],
                  type: "group"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- Log Management --- */}
              <SidebarGroup
                title="Log Management"
                links={[
                  {
                    href: "/dashboard/logs",
                    label: "Log Explorer",
                    icon: Terminal,
                    iconColor: "text-blue-500",
                  },
                ]}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "logs",
                  title: "Log Management",
                  links: [
                    {
                      href: "/dashboard/logs",
                      label: "Log Explorer",
                      icon: Terminal,
                      iconColor: "text-blue-500",
                    },
                  ],
                  type: "group"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- AI Integrations (MCP) --- */}
              <SidebarGroup
                title="AI Integrations"
                links={[
                  {
                    href: "/dashboard/ai/assistant",
                    label: "Assistant",
                    icon: Bot,
                    iconColor: "text-blue-500",
                  },
                  {
                    href: "/dashboard/ai/mcp",
                    label: "MCP Server",
                    icon: Bot,
                    iconColor: "text-blue-500",
                  },
                ]}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "ai",
                  title: "AI Integrations",
                  links: [
                    {
                      href: "/dashboard/ai/assistant",
                      label: "Assistant",
                      icon: Bot,
                      iconColor: "text-blue-500",
                    },
                    {
                      href: "/dashboard/ai/mcp",
                      label: "MCP Server",
                      icon: Bot,
                      iconColor: "text-blue-500",
                    },
                  ],
                  type: "group"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- Alerts & Incidents --- */}
              <SidebarGroup
                title="Alerts & Incidents"
                links={[
                  {
                    href: "/dashboard/alerts",
                    label: "Alert Policies",
                    icon: BellRing,
                    iconColor: "text-destructive",
                  },
                  {
                    href: "/dashboard/incidents",
                    label: "Incidents",
                    icon: AlertOctagon,
                    iconColor: "text-orange-500",
                  },
                ]}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "alerts",
                  title: "Alerts & Incidents",
                  links: [
                    {
                      href: "/dashboard/alerts",
                      label: "Alert Policies",
                      icon: BellRing,
                      iconColor: "text-destructive",
                    },
                    {
                      href: "/dashboard/incidents",
                      label: "Incidents",
                      icon: AlertOctagon,
                      iconColor: "text-orange-500",
                    },
                  ],
                  type: "group"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              <SidebarSection
                title="Uptime"
                items={monitorList}
                hrefPrefix="/dashboard/monitor"
                linkPrefix="/dashboard/monitor"
                onAdd={!user.isDemo ? () => openModal('monitor') : undefined}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "uptime",
                  title: "Uptime",
                  items: monitorList,
                  hrefPrefix: "/dashboard/monitor",
                  linkPrefix: "/dashboard/monitor",
                  onAdd: !user.isDemo ? () => openModal('monitor') : undefined,
                  icon: <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* --- Status Boards (centralized, shareable uptime dashboards) --- */}
              <SidebarSection
                title="Status Boards"
                items={boardsData?.boards}
                hrefPrefix="/dashboard/monitor/board"
                linkPrefix="/dashboard/monitor/board"
                onAdd={!user.isDemo ? () => openModal('board') : undefined}
                icon={<LayoutGrid className="h-3 w-3 text-emerald-500 shrink-0" />}
                isMinimized={isActuallyMinimized}
                onMouseEnter={(e: any) => handleSectionMouseEnter({
                  id: "status-boards",
                  title: "Status Boards",
                  items: boardsData?.boards,
                  hrefPrefix: "/dashboard/monitor/board",
                  linkPrefix: "/dashboard/monitor/board",
                  onAdd: !user.isDemo ? () => openModal('board') : undefined,
                  icon: <LayoutGrid className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
                  type: "section"
                }, e.currentTarget)}
                onMouseLeave={handleSectionMouseLeave}
              />

              {/* Settings & PWA */}
              <div className={cn(
                "pt-4 border-t border-border/40 flex flex-col gap-2 items-center",
                isActuallyMinimized ? "px-1" : "items-stretch"
              )}>
                {isActuallyMinimized ? (
                  <>
                    <Link href="/dashboard/organization" title="Organization">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground",
                          router.pathname.startsWith("/dashboard/organization") && "bg-secondary text-foreground"
                        )}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                      onClick={() => setIsSettingsOpen(true)}
                      title="Global Settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>

                    {isInstallable && !isInstalled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-colors"
                        onClick={handleInstallClick}
                        title="Install App"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/dashboard/organization">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-9",
                          router.pathname.startsWith("/dashboard/organization") && "bg-secondary text-foreground"
                        )}
                      >
                        <Building2 className="h-4 w-4" /> Organization
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-9"
                      onClick={() => setIsSettingsOpen(true)}
                    >
                      <Settings className="h-4 w-4" /> Global Settings
                    </Button>

                    {isInstallable && !isInstalled && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10 h-9 font-medium transition-colors"
                        onClick={handleInstallClick}
                      >
                        <Download className="h-4 w-4 shrink-0" /> Install App
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Org Switcher */}
            {(() => {
              const { organizations, activeOrg, setActiveOrg } = useOrg();
              if (organizations.length === 0) return null;
              const items = [
                { _id: null, name: 'Personal Account', slug: '' },
                ...organizations,
              ];
              return (
                <div className={cn(
                  "border-t shrink-0 transition-all duration-300",
                  isActuallyMinimized ? "px-1 py-2" : "px-3 py-2"
                )}>
                  {isActuallyMinimized ? (
                    <button
                      onClick={() => {
                        const currentIdx = items.findIndex((i: any) => (activeOrg ? i._id === activeOrg._id : i._id === null));
                        const nextIdx = (currentIdx + 1) % items.length;
                        const next = items[nextIdx];
                        setActiveOrg(next._id ? (next as Organization) : null);
                      }}
                      className="h-8 w-8 mx-auto rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-secondary/50 transition-colors"
                      title={activeOrg ? activeOrg.name : 'Personal Account'}
                    >
                      {activeOrg ? activeOrg.name.substring(0, 2).toUpperCase() : 'P'}
                    </button>
                  ) : (
                    <Select
                      value={activeOrg?._id || '__personal__'}
                      onValueChange={(val) => {
                        if (val === '__personal__') {
                          setActiveOrg(null);
                        } else {
                          const org = organizations.find((o) => o._id === val);
                          setActiveOrg(org || null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-9 rounded-lg border border-border/60 bg-secondary/20 text-sm font-medium hover:bg-secondary/40 transition-colors">
                        <SelectValue placeholder="Personal Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__personal__">Personal Account</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org._id} value={org._id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })()}

            {/* Profile */}
            <div className={cn(
              "p-4 border-t bg-card/50 shrink-0 flex flex-col transition-all duration-300",
              isActuallyMinimized ? "px-2 py-3 items-center gap-2" : "p-4"
            )}>
              {isActuallyMinimized ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  {!user.isDemo && !user.emailVerified && (
                    <button
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-colors"
                      title="Verify Account (Action Required)"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <Link
                    href="/dashboard/profile"
                    className="relative block"
                    title="Manage Profile"
                  >
                    <div className="relative group">
                      <Avatar
                        src={getGravatar(user.email || "")}
                        fallback={user.email?.substring(0, 2).toUpperCase() || "US"}
                        className="h-8 w-8 border border-border group-hover:border-primary/50 transition-colors"
                      />
                      {user.isDemo && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-[8px] text-white px-1 rounded-sm scale-90 origin-bottom-right font-bold">
                          DEMO
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              ) : (
                <>
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

                  <Link
                    href="/dashboard/profile"
                    className="block"
                    title="Manage Profile"
                  >
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
                </>
              )}
            </div>
          </aside>
        );
      })()}

      {/* Dynamic Island Hovering Card */}
      {hoveredSection && (
        <div
          ref={cardRef}
          className="fixed z-[100] w-60 bg-card/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-2xl animate-slide-in flex flex-col gap-2 transition-[opacity] duration-150"
          style={{
            top: cardTop !== null ? cardTop : hoveredSection.rect.top,
            left: hoveredSection.rect.right + 3,
            opacity: cardTop === null ? 0 : 1,
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          {hoveredSection.type === "section" ? (
            <>
              {/* Title & Add Button */}
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-border/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {hoveredSection.title}
                </span>
                {hoveredSection.onAdd && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      hoveredSection.onAdd?.();
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Items */}
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {!hoveredSection.items && (
                  <div className="flex justify-center py-2">
                    <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                {(() => {
                  const showAll = sidebarMode === "all";
                  const visibleItems = (showAll ? hoveredSection.items : hoveredSection.items?.slice(0, 2)) || [];
                  const remaining = (hoveredSection.items?.length || 0) - visibleItems.length;

                  return (
                    <>
                      {visibleItems.map((item: any) => {
                        const isActive = router.asPath.includes(
                          `${hoveredSection.hrefPrefix}/${item._id}`
                        );
                        const Icon = getSidebarItemIcon(hoveredSection.hrefPrefix || "", item, hoveredSection.icon);

                        return (
                          <Link href={`${hoveredSection.hrefPrefix}/${item._id}`} key={item._id} className="w-full">
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-2.5 h-8 px-2 text-xs transition-colors",
                                isActive
                                  ? "bg-secondary/80 font-semibold border border-border/50 text-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                              )}
                            >
                              {Icon}
                              <span className="truncate">{item.name}</span>
                            </Button>
                          </Link>
                        );
                      })}

                      {/* "Show More" Truncation */}
                      {!showAll && remaining > 0 && (
                        <Link href={hoveredSection.linkPrefix || "#"} className="w-full">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2.5 h-7 px-2 text-[11px] text-muted-foreground/70 hover:text-primary mt-0.5"
                          >
                            <div className="w-3 h-3 flex items-center justify-center shrink-0">
                              <div className="h-1 w-1 rounded-full bg-current opacity-40" />
                            </div>
                            Show {remaining} more
                          </Button>
                        </Link>
                      )}

                      {hoveredSection.items?.length === 0 && (
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">
                          No service items
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <>
              {/* Title */}
              <div className="mb-1 pb-1.5 border-b border-border/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {hoveredSection.title}
                </span>
              </div>

              {/* Links */}
              <div className="flex flex-col gap-0.5">
                {hoveredSection.links?.map((link: any, idx: number) => {
                  const isActive = router.asPath.includes(link.href);
                  const Icon = link.icon;

                  return (
                    <Link href={link.href} key={idx} className="w-full">
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2.5 h-8 px-2 text-xs transition-colors",
                          isActive
                            ? "bg-secondary/80 font-semibold border border-border/50 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        )}
                      >
                        {Icon && (
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", link.iconColor)} />
                        )}
                        <span className="truncate">{link.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative">
        {/* --- FLOATING MOBILE MENU BUTTON --- */}
        {!isMobileSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg bg-background/80 backdrop-blur-md border border-border/50 text-foreground hover:bg-accent transition-all"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* --- CONTENT INJECTION --- */}
        {/* RevealProvider renders skeleton→content cross-fade overlays over this
            region (see components/Skeletons/reveal.tsx + globals.css
            .content-transition-out) so the hand-off dissolves instead of popping. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <RevealProvider>{children}</RevealProvider>
        </main>
      </div>

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

      {/* --- SERVICE MODALS (register + edit) --- */}
      <ServiceModals />
    </div>
  );
};

// Helper for 'cn'
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
