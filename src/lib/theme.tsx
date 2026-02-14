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
}

const SettingsContext = createContext<SettingsContextType>({} as any);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Existing State
  const [theme, setThemeState] = useState<Theme>("dark");
  const [appearance, setAppearance] = useState<Appearance>("colorful");

  // New State
  const [sidebarMode, setSidebarModeState] =
    useState<SidebarMode>("restricted");
  const [defaultViewMode, setDefaultViewModeState] = useState<ViewMode>("list");

  useEffect(() => {
    // Load all settings from localStorage on mount
    const savedTheme = localStorage.getItem("sys-theme") as Theme;
    const savedApp = localStorage.getItem("sys-appearance") as Appearance;
    const savedSidebar = localStorage.getItem("sys-sidebar") as SidebarMode;
    const savedView = localStorage.getItem("sys-viewmode") as ViewMode;

    if (savedTheme) setThemeState(savedTheme);
    if (savedApp) setAppearance(savedApp);
    if (savedSidebar) setSidebarModeState(savedSidebar);
    if (savedView) setDefaultViewModeState(savedView);
  }, []);

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

  // Initial Theme Apply
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useTheme = () => useContext(SettingsContext);
