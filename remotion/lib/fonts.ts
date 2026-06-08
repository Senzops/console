/**
 * Remotion Font Loading
 * =====================
 * Loads the same Google Fonts used in the main Senzor app.
 * Uses @remotion/google-fonts for deterministic font loading during rendering.
 *
 * Mirrors: src/lib/fonts.ts (Next.js font loading)
 */

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadDMSerifDisplay } from "@remotion/google-fonts/DMSerifDisplay";

const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const dmSerif = loadDMSerifDisplay("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

/** Inter — body text, UI elements, metrics */
export const FONT_INTER = inter.fontFamily;

/** DM Serif Display — headlines, branding, display text */
export const FONT_DISPLAY = dmSerif.fontFamily;

/**
 * Combined font stack matching the Tailwind config.
 * Use FONT_SANS for body text and FONT_DISPLAY for headings.
 */
export const FONT_SANS = `${FONT_INTER}, "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
export const FONT_SERIF = `${FONT_DISPLAY}, "DM Serif Display", serif`;
