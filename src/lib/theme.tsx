import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "nord" | "latte";
type Appearance = "colorful" | "monochromatic";
type SidebarMode = "restricted" | "all";
type ViewMode = "grid" | "list";

interface SettingsContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
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

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("sys-theme", t);
    const root = window.document.documentElement;
    root.setAttribute("data-theme", t);
    if (t === "light" || t === "latte") root.classList.remove("dark");
    else root.classList.add("dark");
  };

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

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "light" || theme === "latte") root.classList.remove("dark");
    else root.classList.add("dark");
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
