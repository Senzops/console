/**
 * Launch Video Configuration
 * ==========================
 * Central configuration for the Senzor marketing launch video.
 * All timing, resolution, and scene configuration in one place.
 */

export const VIDEO_CONFIG = {
  /** Output width in pixels */
  width: 1920,
  /** Output height in pixels */
  height: 1080,
  /** Frames per second */
  fps: 30,
} as const;

/**
 * Scene timing in frames.
 * At 30fps: 30 frames = 1 second.
 */
export const SCENE_TIMING = {
  brandIntro: { start: 0, duration: 120 },          // 0–4s
  problemStatement: { start: 120, duration: 240 },   // 4–12s
  productShowcase: { start: 360, duration: 660 },    // 12–34s
  featureHighlight: { start: 1020, duration: 210 },  // 34–41s  (trimmed: cards enter by ~110f, 2.7s hold, then fade)
  socialProof: { start: 1230, duration: 240 },       // 41–49s
  callToAction: { start: 1470, duration: 180 },      // 49–55s
} as const;

/** Total video duration in frames */
export const TOTAL_FRAMES =
  SCENE_TIMING.callToAction.start + SCENE_TIMING.callToAction.duration; // 1650 = 55s

/** Standard transition durations */
export const TRANSITIONS = {
  /** Frames for a standard fade in */
  fadeIn: 15,
  /** Frames for a standard fade out */
  fadeOut: 15,
  /** Frames for a text reveal */
  textReveal: 20,
  /** Frames for element entrance stagger */
  stagger: 6,
} as const;

/**
 * Senzor feature catalog — used in FeatureHighlight scene.
 * Maps to the features in src/static/featuresData.tsx
 */
export const FEATURES = [
  { title: "Saved Views", icon: "LayoutTemplate", color: "teal" },
  { title: "Infrastructure Monitoring", icon: "Server", color: "emerald" },
  { title: "Database Observability", icon: "Database", color: "indigo" },
  { title: "Firebase Monitoring", icon: "Flame", color: "amber" },
  { title: "Web Analytics", icon: "Globe", color: "cyan" },
  { title: "Real User Monitoring", icon: "MousePointerClick", color: "pink" },
  { title: "APM", icon: "Activity", color: "orange" },
  { title: "Background Tasks", icon: "Workflow", color: "violet" },
  { title: "Error Tracking", icon: "AlertOctagon", color: "red" },
  { title: "Log Management", icon: "Terminal", color: "slate" },
  { title: "Uptime Monitoring", icon: "CheckCircle2", color: "green" },
  { title: "MCP AI Server", icon: "Bot", color: "fuchsia" },
  { title: "Alerts & Incidents", icon: "BellRing", color: "rose" },
  { title: "OpenTelemetry Native", icon: "Layers", color: "blue" },
] as const;

/**
 * Copy content for the video.
 * Centralized so marketing can review/edit without touching component code.
 */
export const COPY = {
  tagline: "Unified Visibility.\nUncompromised Control.",
  problemLines: [
    "Your infrastructure is talking.",
    "Are you listening?",
    "Logs scattered across a dozen tools.",
    "Metrics here. Traces there. Alerts somewhere else.",
    "There’s a better way.",
  ],
  showcaseTitle: "One platform. Complete observability.",
  statsHeadline: "Built for Engineering Teams",
  stats: [
    { value: "14+", label: "Monitoring Capabilities" },
    { value: "100%", label: "OpenTelemetry Native" },
    { value: "<1s", label: "Real-time Processing" },
    { value: "Zero", label: "Cookie Tracking" },
  ],
  ctaHeadline: "Ready to gain full visibility?",
  ctaSubtext: "Start monitoring in 60 seconds.",
  ctaUrl: "senzor.dev",
} as const;
