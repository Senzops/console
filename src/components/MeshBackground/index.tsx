import React, { useRef, useEffect } from "react";
import { useTheme } from "../../lib/theme";

// ============================================================================
// Configuration
// ============================================================================

const LINE_COUNT = 15; // Elegant, not overly cluttered
const SEGMENTS = 100; // High resolution for smooth bezier-like curves

// The previous implementation advanced an internal clock by 0.01 per frame,
// which tied animation speed to the display refresh rate (2x faster on 120Hz).
// Motion is now driven by real elapsed seconds; this factor preserves the
// original visual pace as it appeared at 60fps.
const WAVE_TIME_SCALE = 0.6;

// Clamp the per-frame delta so returning from a background tab or surviving a
// long main-thread stall advances the animation smoothly instead of teleporting.
const MAX_FRAME_DELTA_SEC = 0.064;

// --- Packet flights ---
const MAX_ACTIVE_PACKETS = 4; // Concurrent flights; keeps the mesh calm
const TRAVERSAL_SEC = { min: 30, max: 40 }; // Random-but-constant speed per flight
const SPAWN_DELAY_SEC = { min: 0.8, max: 2.6 }; // Pacing between launches
const RESPAWN_DWELL_SEC = { min: 0.6, max: 2.8 }; // Pause before a consumed line returns
const LINE_FADE_IN_SEC = 0.9; // Eased line rebirth instead of a single-frame pop
const SEED_PACKETS = 2; // Flights already mid-air on first paint

// --- Packet visuals ---
const TIP_DECAY_PX = 32; // Brightened line tip settles back to base alpha over this run
const TIP_ALPHA_BOOST = 0.25; // Extra alpha at the cut so the line plugs into the lead dot
const TAIL_GAP_PX = 9; // Distance between the lead dot and the taillight
const DOT_EDGE_FADE_PX = 70; // Dots ease in/out near the canvas edges
const HEAD_RADIUS = 1.75;
const TAIL_RADIUS = 1.4;

// --- Taillight strobe: aircraft anti-collision pattern (two quick flashes,
// then a pause). A sine envelope keeps each flash crisp but alias-free. ---
const STROBE_PERIOD_SEC = 1.4;
const STROBE_FLASH_SEC = 0.11;
const STROBE_SECOND_FLASH_AT_SEC = 0.22;

// ============================================================================
// Theme palette
// ============================================================================

// getComputedStyle creates a race condition with React's DOM rendering cycle,
// causing the canvas to grab the default dark theme variables before the HTML
// tag receives the data-theme attribute. Hardcoding the system variables here
// guarantees zero-latency, 100% accurate color resolution. Values mirror
// src/styles/globals.css exactly.
interface MeshPalette {
  primary: string;
  muted: string;
  foreground: string;
  destructive: string;
  /** Glows only on dark surfaces; shadows in light mode often look like dirt. */
  glow: boolean;
}

const THEME_PALETTES: Record<string, MeshPalette> = {
  dark: {
    primary: "0, 0%, 98%",
    muted: "240, 5%, 64.9%",
    foreground: "0, 0%, 98%",
    destructive: "0, 62.8%, 30.6%",
    glow: true,
  },
  light: {
    primary: "240, 5.9%, 10%",
    muted: "240, 3.8%, 46.1%",
    foreground: "240, 10%, 3.9%",
    destructive: "0, 84.2%, 60.2%",
    glow: false,
  },
  nord: {
    primary: "193, 43%, 67%",
    muted: "218, 27%, 92%",
    foreground: "218, 27%, 92%",
    destructive: "354, 42%, 56%",
    glow: true,
  },
  latte: {
    primary: "24, 25%, 45%",
    muted: "24, 5%, 50%",
    foreground: "24, 10%, 25%",
    destructive: "0, 60%, 55%",
    glow: false,
  },
};

const hsla = (color: string, alpha: number) => `hsla(${color}, ${alpha})`;

// Horizontal edge fade of the stream lines (identical stops to the original).
const BASE_STOPS: ReadonlyArray<{
  u: number;
  color: "primary" | "muted";
  alpha: number;
}> = [
  { u: 0, color: "primary", alpha: 0 },
  { u: 0.15, color: "primary", alpha: 0.15 },
  { u: 0.5, color: "primary", alpha: 0.25 },
  { u: 0.85, color: "muted", alpha: 0.15 },
  { u: 1, color: "muted", alpha: 0 },
];

// ============================================================================
// Pure helpers
// ============================================================================

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

// Line alpha at a horizontal position (0..1), interpolated from BASE_STOPS.
// Used to rebuild a matching gradient for lines cut short by a packet.
const baseAlphaAt = (u: number) => {
  for (let k = 1; k < BASE_STOPS.length; k++) {
    const a = BASE_STOPS[k - 1];
    const b = BASE_STOPS[k];
    if (u <= b.u) {
      const span = b.u - a.u;
      const f = span > 0 ? (u - a.u) / span : 0;
      return a.alpha + (b.alpha - a.alpha) * f;
    }
  }
  return 0;
};

// Organic liquid math: slower, sweeping sine waves. The line index offsets
// phases to create geometric depth. Shared by the line renderer and the packet
// positioning so dots ride the curve at their exact position (no segment snapping).
const waveY = (
  x: number,
  lineIndex: number,
  waveT: number,
  width: number,
  height: number,
) => {
  const yBase =
    height / 2 + (lineIndex - LINE_COUNT / 2) * (height / LINE_COUNT);
  const wave1 = Math.sin(x * 0.0015 + waveT * 0.4 + lineIndex * 0.15) * 45;
  const wave2 = Math.cos(x * 0.0025 - waveT * 0.2 + lineIndex * 0.08) * 25;
  const wave3 = Math.sin(x * 0.0008 + waveT * 0.5) * 15;
  // Math "Pinch": tapers the waves to 0 amplitude at the far left/right edges,
  // creating an elegant, centralized "beam" rather than messy edge intersections.
  const pinch = Math.sin(clamp01(x / width) * Math.PI);
  return yBase + (wave1 + wave2 + wave3) * pinch;
};

// 0 → 1 → 0 envelope so dots materialize/dissolve near the canvas edges.
const dotEdgeFade = (x: number, width: number) =>
  clamp01(Math.min(x, width - x) / DOT_EDGE_FADE_PX);

const strobeEnvelope = (tInPeriod: number) => {
  const pulse = (start: number) => {
    const local = tInPeriod - start;
    return local >= 0 && local < STROBE_FLASH_SEC
      ? Math.sin((local / STROBE_FLASH_SEC) * Math.PI)
      : 0;
  };
  return Math.max(pulse(0), pulse(STROBE_SECOND_FLASH_AT_SEC));
};

// ============================================================================
// Per-line state machine:
//   idle → active (packet consumes the line as it flies) → gone (fully
//   consumed, brief dwell) → fading-in (eased rebirth) → idle
// ============================================================================

type LinePhase = "idle" | "active" | "gone" | "fading-in";

interface LineState {
  phase: LinePhase;
  /** 0..1 across the full flight path (canvas width + tail gap). */
  progress: number;
  /** Progress per second. Constant for the whole flight, random per flight. */
  speed: number;
  /** De-syncs taillight flashes between concurrent packets. */
  strobeOffset: number;
  /** animTime at which a consumed line begins fading back in. */
  fadeInAt: number;
  /** 0..1 during the fade-in phase. */
  fadeProgress: number;
}

// Safari < 14 exposes MediaQueryList listeners only via addListener/removeListener.
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (cb: () => void) => void;
  removeListener?: (cb: () => void) => void;
};

export const MeshBackground = ({
  className = "",
}: {
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook into the global theme state so the animation can re-render if the user switches palettes
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const palette = THEME_PALETTES[theme] ?? THEME_PALETTES.dark;
    const reduceMotionQuery: LegacyMediaQueryList = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    // --- Animation state ---
    let rafId = 0;
    let running = false;
    let lastTs: number | null = null;
    let inView = false;
    let reducedMotion = reduceMotionQuery.matches;
    let animTime = 0; // Seconds of visible animation; freezes while paused
    let nextSpawnAt = randBetween(SPAWN_DELAY_SEC.min, SPAWN_DELAY_SEC.max);

    const lines: LineState[] = Array.from({ length: LINE_COUNT }, () => ({
      phase: "idle",
      progress: 0,
      speed: 0,
      strobeOffset: 0,
      fadeInAt: 0,
      fadeProgress: 0,
    }));

    const launchPacket = (line: LineState, startProgress: number) => {
      line.phase = "active";
      line.progress = startProgress;
      line.speed = 1 / randBetween(TRAVERSAL_SEC.min, TRAVERSAL_SEC.max);
      line.strobeOffset = Math.random() * STROBE_PERIOD_SEC;
    };

    // Seed a few mid-flight packets so the hero feels alive on first paint.
    if (!reducedMotion) {
      const pool = lines.map((_, i) => i);
      for (let n = 0; n < SEED_PACKETS && pool.length > 0; n++) {
        const pick = pool.splice(
          Math.floor(Math.random() * pool.length),
          1,
        )[0];
        launchPacket(lines[pick], randBetween(0.1, 0.6));
      }
    }

    const buildBaseGradient = (width: number) => {
      const g = ctx.createLinearGradient(0, 0, width, 0);
      for (const s of BASE_STOPS) {
        g.addColorStop(s.u, hsla(palette[s.color], s.alpha));
      }
      return g;
    };

    // Gradient for a line cut short by its packet. The line terminates INTO
    // the lead dot: full local alpha at the cut (the raw line end is hidden
    // under the dot) plus a slightly brightened tip that decays over
    // TIP_DECAY_PX, so the dot reads as actively consuming the line. The tip
    // boost is scaled by the dot's own edge fade so launches stay pop-free.
    const buildCutGradient = (packetX: number, width: number) => {
      const g = ctx.createLinearGradient(0, 0, width, 0);
      const colorAt = (u: number) =>
        u <= 0.5 ? palette.primary : palette.muted;
      const uCut = clamp01(packetX / width);
      const uTip = clamp01((packetX + TIP_DECAY_PX) / width);
      const tipAlpha = Math.min(
        baseAlphaAt(uCut) + TIP_ALPHA_BOOST * dotEdgeFade(packetX, width),
        1,
      );
      g.addColorStop(uCut, hsla(colorAt(uCut), tipAlpha));
      if (uTip > uCut) {
        g.addColorStop(uTip, hsla(colorAt(uTip), baseAlphaAt(uTip)));
      }
      for (const s of BASE_STOPS) {
        if (s.u > uTip) {
          g.addColorStop(s.u, hsla(palette[s.color], s.alpha));
        }
      }
      return g;
    };

    const renderFrame = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const waveT = animTime * WAVE_TIME_SCALE;
      const segmentWidth = width / SEGMENTS;
      const flightLength = width + TAIL_GAP_PX;

      ctx.clearRect(0, 0, width, height);
      // Standard alpha blending ensures it looks beautiful in both Light and Dark modes
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1;

      const baseGradient = buildBaseGradient(width);

      // --- Pass 1: stream lines ---
      for (let i = 0; i < LINE_COUNT; i++) {
        const line = lines[i];
        if (line.phase === "gone") continue;

        if (line.phase === "active") {
          const packetX = line.progress * flightLength;
          if (packetX >= width) continue; // Fully consumed; only the taillight remains
          ctx.strokeStyle = buildCutGradient(packetX, width);
          ctx.beginPath();
          ctx.moveTo(packetX, waveY(packetX, i, waveT, width, height));
          for (
            let j = Math.floor(packetX / segmentWidth) + 1;
            j <= SEGMENTS;
            j++
          ) {
            const x = j * segmentWidth;
            ctx.lineTo(x, waveY(x, i, waveT, width, height));
          }
          ctx.stroke();
          continue;
        }

        if (line.phase === "fading-in") {
          ctx.globalAlpha = easeInOutCubic(clamp01(line.fadeProgress));
        }
        ctx.strokeStyle = baseGradient;
        ctx.beginPath();
        for (let j = 0; j <= SEGMENTS; j++) {
          const x = j * segmentWidth;
          const y = waveY(x, i, waveT, width, height);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // --- Pass 2: packets (drawn above the lines) ---
      for (let i = 0; i < LINE_COUNT; i++) {
        const line = lines[i];
        if (line.phase !== "active") continue;
        const packetX = line.progress * flightLength;

        // Lead dot: rides the curve at its exact continuous position
        if (packetX <= width) {
          const headAlpha = 0.85 * dotEdgeFade(packetX, width);
          if (headAlpha > 0.01) {
            if (palette.glow) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = hsla(palette.primary, 0.8);
            }
            ctx.beginPath();
            ctx.arc(
              packetX,
              waveY(packetX, i, waveT, width, height),
              HEAD_RADIUS,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = hsla(palette.primary, headAlpha);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Taillight: trails behind the lead dot with an aircraft-style red
        // double strobe over an always-visible ember, so the two dots read
        // as one craft between flashes.
        const tailX = packetX - TAIL_GAP_PX;
        if (tailX >= 0 && tailX <= width) {
          const fade = dotEdgeFade(tailX, width);
          const strobe = strobeEnvelope(
            (animTime + line.strobeOffset) % STROBE_PERIOD_SEC,
          );
          const tailAlpha = (0.5 + 0.5 * strobe) * fade;
          if (tailAlpha > 0.01) {
            const y = waveY(tailX, i, waveT, width, height);
            if (palette.glow) {
              ctx.shadowBlur = 4 + 10 * strobe;
              ctx.shadowColor = hsla(palette.destructive, 0.85);
            }
            ctx.beginPath();
            ctx.arc(tailX, y, TAIL_RADIUS + 1.1 * strobe, 0, Math.PI * 2);
            ctx.fillStyle = hsla(palette.destructive, tailAlpha);
            ctx.fill();
            ctx.shadowBlur = 0;

            // White-hot core at the flash peak (dark surfaces only)
            if (palette.glow && strobe > 0.4) {
              ctx.beginPath();
              ctx.arc(tailX, y, 0.8, 0, Math.PI * 2);
              ctx.fillStyle = hsla(palette.foreground, strobe * fade);
              ctx.fill();
            }
          }
        }
      }
    };

    const update = (dt: number) => {
      animTime += dt;
      let activeCount = 0;

      for (const line of lines) {
        switch (line.phase) {
          case "active":
            line.progress += line.speed * dt;
            if (line.progress >= 1) {
              // Flight complete: the line has been fully consumed. Schedule a
              // gentle rebirth instead of the old single-frame full-line pop.
              line.phase = "gone";
              line.fadeInAt =
                animTime +
                randBetween(RESPAWN_DWELL_SEC.min, RESPAWN_DWELL_SEC.max);
            } else {
              activeCount++;
            }
            break;
          case "gone":
            if (animTime >= line.fadeInAt) {
              line.phase = "fading-in";
              line.fadeProgress = 0;
            }
            break;
          case "fading-in":
            line.fadeProgress += dt / LINE_FADE_IN_SEC;
            if (line.fadeProgress >= 1) {
              line.phase = "idle";
              line.fadeProgress = 0;
            }
            break;
          default:
            break;
        }
      }

      // Launch scheduler: a random idle line gets the next packet, so every
      // line participates over time. Spawns stay paced even when slots free up.
      if (animTime >= nextSpawnAt) {
        if (activeCount < MAX_ACTIVE_PACKETS) {
          const idleLines = lines.filter((l) => l.phase === "idle");
          if (idleLines.length > 0) {
            launchPacket(
              idleLines[Math.floor(Math.random() * idleLines.length)],
              0,
            );
          }
        }
        nextSpawnAt =
          animTime + randBetween(SPAWN_DELAY_SEC.min, SPAWN_DELAY_SEC.max);
      }
    };

    const tick = (ts: number) => {
      if (!running) return;
      const dt =
        lastTs === null
          ? 0
          : Math.min(Math.max((ts - lastTs) / 1000, 0), MAX_FRAME_DELTA_SEC);
      lastTs = ts;
      update(dt);
      renderFrame();
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running || reducedMotion || !inView) return;
      running = true;
      lastTs = null;
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    // --- Optimization: Retina Display Sharpness ---
    const resizeCanvas = () => {
      // Cap DPR at 2: visually indistinguishable on 3x mobile screens, but far
      // fewer pixels pushed per frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // setTransform (not scale) keeps this idempotent across resizes
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Keep paused/static canvases crisp after layout changes
      if (!running) renderFrame();
    };

    // --- Accessibility: prefers-reduced-motion renders one static frame ---
    const applyMotionPreference = () => {
      reducedMotion = reduceMotionQuery.matches;
      if (reducedMotion) {
        stopLoop();
        for (const line of lines) line.phase = "idle";
        renderFrame();
      } else {
        startLoop();
      }
    };

    // --- Optimization: Intersection Observer ---
    // Strictly pauses the rAF loop when the hero is out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    observer.observe(container);

    // Container-driven resize: catches layout shifts the window event misses
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", resizeCanvas);
    }

    if (typeof reduceMotionQuery.addEventListener === "function") {
      reduceMotionQuery.addEventListener("change", applyMotionPreference);
    } else if (reduceMotionQuery.addListener) {
      reduceMotionQuery.addListener(applyMotionPreference);
    }

    // First paint: draw immediately so the hero is never blank while the
    // observers warm up (resizeCanvas renders a frame while the loop is off).
    resizeCanvas();

    return () => {
      stopLoop();
      observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resizeCanvas);
      if (typeof reduceMotionQuery.removeEventListener === "function") {
        reduceMotionQuery.removeEventListener("change", applyMotionPreference);
      } else if (reduceMotionQuery.removeListener) {
        reduceMotionQuery.removeListener(applyMotionPreference);
      }
    };
  }, [theme]); // Re-initialize the canvas if the user hot-swaps the theme

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`w-full h-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
