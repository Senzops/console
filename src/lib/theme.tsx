import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'nord' | 'latte';
type Appearance = 'colorful' | 'monochromatic';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  isMono: boolean;
}

const ThemeContext = createContext<ThemeContextType>({} as any);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with 'dark' to match previous default
  const [theme, setThemeState] = useState<Theme>('dark');
  const [appearance, setAppearance] = useState<Appearance>('colorful');

  useEffect(() => {
    // Load from local storage on mount
    const savedTheme = localStorage.getItem('senzor-theme') as Theme;
    const savedApp = localStorage.getItem('senzor-appearance') as Appearance;
    if (savedTheme) setThemeState(savedTheme);
    if (savedApp) setAppearance(savedApp);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('senzor-theme', t);
    // Apply to document
    const root = window.document.documentElement;
    root.setAttribute('data-theme', t);
    // Handle 'dark' class for Tailwind dark mode utilities
    if (t === 'light' || t === 'latte') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  };

  useEffect(() => {
    // Initial application of theme class
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleAppearance = (a: Appearance) => {
    setAppearance(a);
    localStorage.setItem('senzor-appearance', a);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      appearance,
      setAppearance: toggleAppearance,
      isMono: appearance === 'monochromatic'
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);