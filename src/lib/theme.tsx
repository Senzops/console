import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";

type Theme = "dark" | "light" | "nord" | "latte";
type Appearance = "colorful" | "monochromatic";
type SidebarMode = "restricted" | "all";
type ViewMode = "grid" | "list";

// ============================================================================
// Theme switching with a position-aware ripple.
// ----------------------------------------------------------------------------
// The incoming theme is revealed by a circle expanding from wherever the user
// pressed, rather than the whole surface flipping at once. Where the View
// Transitions API is available the reveal is a real cross-document-state
// animation: the outgoing theme stays painted underneath while the incoming one
// is clipped in over it, so what you see wiping across is the actual new UI.
// Elsewhere an overlay painted in the incoming background does the same sweep
// and the swap happens underneath it at full cover.
//
// Both paths are skipped entirely under prefers-reduced-motion, which falls
// back to the plain instant switch.
// ============================================================================

/** Anything a caller can hand us to locate the ripple. */
export type RippleOrigin =
  | { x: number; y: number }
  | React.MouseEvent<HTMLElement>
  | HTMLElement
  | null;

const RIPPLE_DURATION_MS = 520;
const RIPPLE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Marks the transition window so the blanket colour transition stands down. */
const TRANSITION_ATTR = "data-theme-transition";

const isDarkTheme = (t: Theme) => t !== "light" && t !== "latte";

const applyThemeToDom = (t: Theme) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", t);
  if (isDarkTheme(t)) root.classList.add("dark");
  else root.classList.remove("dark");
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const centerOf = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/**
 * Resolves a ripple centre. Keyboard activation reports clientX/clientY as 0,
 * which would fire the ripple from the top-left corner — detected via
 * `detail === 0` and redirected to the middle of the control that was
 * activated, so Space/Enter looks identical to a click.
 */
const resolveOrigin = (origin?: RippleOrigin): { x: number; y: number } => {
  const viewportCentre = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  if (!origin) return viewportCentre();

  if (typeof HTMLElement !== "undefined" && origin instanceof HTMLElement) {
    return centerOf(origin);
  }

  if ("clientX" in origin && "clientY" in origin) {
    const evt = origin as React.MouseEvent<HTMLElement>;
    const keyboardActivated = evt.detail === 0 && evt.clientX === 0 && evt.clientY === 0;
    if (keyboardActivated) {
      const target = (evt.currentTarget || evt.target) as HTMLElement | null;
      return target ? centerOf(target) : viewportCentre();
    }
    return { x: evt.clientX, y: evt.clientY };
  }

  if ("x" in origin && "y" in origin) return { x: origin.x, y: origin.y };

  return viewportCentre();
};

/** Distance to the furthest viewport corner — how far the circle must grow. */
const coverRadius = (p: { x: number; y: number }) =>
  Math.hypot(
    Math.max(p.x, window.innerWidth - p.x),
    Math.max(p.y, window.innerHeight - p.y)
  );

/**
 * Reads a theme's background without applying it, by probing a detached node
 * carrying that `data-theme`. The palettes are declared on plain attribute
 * selectors, so the custom properties resolve inside the subtree — no hex
 * values duplicated out of the stylesheet.
 */
const backgroundOfTheme = (t: Theme): string => {
  try {
    const probe = document.createElement("div");
    probe.setAttribute("data-theme", t);
    probe.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
    document.body.appendChild(probe);
    const raw = getComputedStyle(probe).getPropertyValue("--background").trim();
    probe.remove();
    return raw ? `hsl(${raw})` : "";
  } catch {
    return "";
  }
};

const FALLBACK_OVERLAY_ID = "senzor-theme-ripple";

/**
 * No-View-Transitions path. Sweeps a disc of the incoming background across the
 * viewport, swaps the theme once it covers everything, then fades the disc out
 * to reveal the re-themed UI already in place.
 */
const rippleWithOverlay = (
  next: Theme,
  point: { x: number; y: number },
  commit: () => void
) => {
  const background = backgroundOfTheme(next);
  if (!background) {
    commit();
    return;
  }

  // A rapid second switch must not leave the first disc stranded on screen.
  document.getElementById(FALLBACK_OVERLAY_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = FALLBACK_OVERLAY_ID;
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none",
    `background:${background}`,
    `clip-path:circle(0px at ${point.x}px ${point.y}px)`,
  ].join(";");
  document.body.appendChild(overlay);

  const radius = coverRadius(point);
  const sweep = overlay.animate(
    {
      clipPath: [
        `circle(0px at ${point.x}px ${point.y}px)`,
        `circle(${radius}px at ${point.x}px ${point.y}px)`,
      ],
    },
    { duration: RIPPLE_DURATION_MS, easing: RIPPLE_EASING, fill: "forwards" }
  );

  const cleanUp = () => overlay.remove();

  sweep.finished
    .then(() => {
      commit();
      return overlay.animate({ opacity: [1, 0] }, { duration: 180, fill: "forwards" })
        .finished;
    })
    .then(cleanUp)
    .catch(() => {
      // Animation interrupted (tab hidden, element removed). Make sure the
      // theme still lands and the overlay never outlives the interaction.
      commit();
      cleanUp();
    });
};

/** View Transitions path: clip the live incoming snapshot in over the old one. */
const rippleWithViewTransition = (
  point: { x: number; y: number },
  commit: () => void
) => {
  const root = document.documentElement;
  root.setAttribute(TRANSITION_ATTR, "active");

  const transition = (document as any).startViewTransition(() => {
    // The snapshot is taken the moment this callback returns, so React's
    // theme-dependent output has to be on screen by then, not a tick later.
    flushSync(commit);
  });

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${point.x}px ${point.y}px)`,
            `circle(${coverRadius(point)}px at ${point.x}px ${point.y}px)`,
          ],
        },
        {
          duration: RIPPLE_DURATION_MS,
          easing: RIPPLE_EASING,
          pseudoElement: "::view-transition-new(root)",
        }
      );
    })
    .catch(() => {
      // A superseded transition rejects here; the theme is already committed.
    });

  transition.finished
    .catch(() => {})
    .finally(() => root.removeAttribute(TRANSITION_ATTR));
};

interface SettingsContextType {
  theme: Theme;
  /**
   * Switches the theme. Pass the click event (or an element / point) as
   * `origin` and the new theme is revealed with a ripple from there; omit it
   * and the ripple runs from the middle of the viewport.
   */
  setTheme: (t: Theme, origin?: RippleOrigin) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  isMono: boolean;

  // New Settings
  sidebarMode: SidebarMode;
  setSidebarMode: (m: SidebarMode) => void;
  defaultViewMode: ViewMode;
  setDefaultViewMode: (m: ViewMode) => void;

  // Collapsible Sidebar Settings
  isSidebarMinimized: boolean;
  setIsSidebarMinimized: (m: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType>({} as any);

const readLocal = (key: string) => {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (readLocal("sys-theme") as Theme) || "dark"
  );
  const [appearance, setAppearance] = useState<Appearance>(
    () => (readLocal("sys-appearance") as Appearance) || "colorful"
  );
  const [sidebarMode, setSidebarModeState] = useState<SidebarMode>(
    () => (readLocal("sys-sidebar") as SidebarMode) || "restricted"
  );
  const [defaultViewMode, setDefaultViewModeState] = useState<ViewMode>(
    () => (readLocal("sys-viewmode") as ViewMode) || "list"
  );
  const [isSidebarMinimized, setIsSidebarMinimizedState] = useState<boolean>(
    () => readLocal("sys-sidebar-minimized") === "true"
  );

  // Read inside setTheme without making the callback depend on the state.
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  const setTheme = useCallback((t: Theme, origin?: RippleOrigin) => {
    try { localStorage.setItem("sys-theme", t); } catch {}

    const commit = () => {
      setThemeState(t);
      applyThemeToDom(t);
    };

    // Nothing to reveal if the theme is unchanged, and there is nothing to
    // animate against during SSR.
    if (typeof window === "undefined" || t === themeRef.current) {
      commit();
      return;
    }

    if (prefersReducedMotion()) {
      commit();
      return;
    }

    const point = resolveOrigin(origin);

    if (typeof (document as any).startViewTransition === "function") {
      rippleWithViewTransition(point, commit);
    } else {
      rippleWithOverlay(t, point, commit);
    }
  }, []);

  const toggleAppearance = (a: Appearance) => {
    setAppearance(a);
    localStorage.setItem("sys-appearance", a);
  };

  const setSidebarMode = (m: SidebarMode) => {
    setSidebarModeState(m);
    localStorage.setItem("sys-sidebar", m);
  };

  const setDefaultViewMode = (m: ViewMode) => {
    setDefaultViewModeState(m);
    localStorage.setItem("sys-viewmode", m);
  };

  const setIsSidebarMinimized = (m: boolean) => {
    setIsSidebarMinimizedState(m);
    localStorage.setItem("sys-sidebar-minimized", m ? "true" : "false");
  };

  // Mount / external-change sync. Never ripples: this reconciles the DOM with
  // stored state, it is not a user-initiated switch.
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        appearance,
        setAppearance: toggleAppearance,
        isMono: appearance === "monochromatic",
        sidebarMode,
        setSidebarMode,
        defaultViewMode,
        setDefaultViewMode,
        isSidebarMinimized,
        setIsSidebarMinimized,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useTheme = () => useContext(SettingsContext);
