/**
 * Remotion Theme Constants
 * ========================
 * Two-tier color system for the Senzor marketing video:
 *
 * COLORS — Video-level palette (warm cream/parchment for cinematic scenes)
 * DASH   — Dashboard UI palette (latte theme for the product showcase)
 *
 * Derived from the latte theme in src/styles/globals.css.
 * Accent colors are shared between both tiers.
 */

export const COLORS = {
  // Video backdrop (warm cream/parchment)
  background: "#ddd3c3",
  foreground: "#3a3230",
  card: "#ebe4d8",
  cardForeground: "#3a3230",
  primary: "#8f6d52",
  primaryForeground: "#f9f6f1",
  secondary: "#cec4b4",
  secondaryForeground: "#3a3230",
  muted: "#cec4b4",
  mutedForeground: "#5c5348",
  border: "#c5baa9",
  ring: "#8f6d52",

  // Feature accent colors (same for video + dashboard)
  emerald: "#10b981",
  blue: "#3b82f6",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#a855f7",
  cyan: "#06b6d4",
  pink: "#ec4899",
  amber: "#f59e0b",
  indigo: "#6366f1",
  teal: "#14b8a6",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  rose: "#f43f5e",
  green: "#22c55e",
  slate: "#64748b",
} as const;

/** Dashboard UI palette (bright latte) — used exclusively in ProductDashboard */
export const DASH = {
  background: "#f9f6f1",
  foreground: "#443b36",
  card: "#f2ebe0",
  cardForeground: "#443b36",
  border: "#d2cbc4",
  secondary: "#e5ddd0",
  secondaryForeground: "#443b36",
  muted: "#e5ddd0",
  mutedForeground: "#6b635a",
  primary: "#8f6d52",
  primaryForeground: "#f9f6f1",
} as const;

/** Accent color palette ordered for visual progression in feature grids */
export const FEATURE_COLORS = [
  COLORS.teal,
  COLORS.emerald,
  COLORS.indigo,
  COLORS.amber,
  COLORS.cyan,
  COLORS.pink,
  COLORS.orange,
  COLORS.violet,
  COLORS.red,
  COLORS.slate,
  COLORS.green,
  COLORS.fuchsia,
  COLORS.rose,
  COLORS.blue,
] as const;

/** Returns an rgba string with the given alpha for any hex color */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
