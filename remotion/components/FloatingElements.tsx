/**
 * FloatingElements
 * ================
 * Animated 3D isometric tech-infrastructure objects for cinematic backgrounds.
 *
 * Renders floating isometric elements that represent an observability platform:
 *   - Server cubes (infrastructure monitoring)
 *   - Database cylinders (data storage)
 *   - Monitor screens (dashboards)
 *   - Shield icons (security/uptime)
 *   - Network hubs (connected services)
 *
 * Each element slowly floats, rotates, and pulses — adding professional depth
 * without distracting from foreground content.
 *
 * All animations are deterministic (seeded PRNG) for Remotion frame-consistency.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, withAlpha } from "../lib/theme";

/* ── Props ─────────────────────────────────────────────────────────── */

interface FloatingElementsProps {
  /** Number of floating 3D objects (default 10) */
  count?: number;
  /** Master opacity for the layer (default 1) */
  opacity?: number;
  /** Animation speed multiplier (default 1) */
  speed?: number;
  /** Seed for deterministic placement */
  seed?: number;
}

/* ── Deterministic PRNG (mulberry32) ───────────────────────────────── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Element types ─────────────────────────────────────────────────── */

type ElementType = "server" | "database" | "monitor" | "shield" | "hub";

interface FloatingItem {
  x: number;
  y: number;
  scale: number;
  type: ElementType;
  baseOpacity: number;
  speedX: number;
  speedY: number;
  rotPhase: number;
  floatPhase: number;
  colorIdx: number;
}

/* ── Accent palette ────────────────────────────────────────────────── */

const ACCENT = [
  COLORS.emerald,
  COLORS.blue,
  COLORS.cyan,
  COLORS.teal,
  COLORS.indigo,
  COLORS.purple,
];

/* ── Item generation ───────────────────────────────────────────────── */

function generateItems(
  count: number,
  width: number,
  height: number,
  seed: number,
): FloatingItem[] {
  const rng = seededRandom(seed);
  const types: ElementType[] = ["server", "database", "monitor", "shield", "hub"];

  return Array.from({ length: count }, () => ({
    x: rng() * width,
    y: rng() * height,
    scale: 0.8 + rng() * 0.7,
    type: types[Math.floor(rng() * types.length)],
    baseOpacity: 0.35 + rng() * 0.25,
    speedX: (rng() - 0.5) * 0.1,
    speedY: (rng() - 0.5) * 0.07,
    rotPhase: rng() * Math.PI * 2,
    floatPhase: rng() * Math.PI * 2,
    colorIdx: Math.floor(rng() * ACCENT.length),
  }));
}

/* ── Isometric SVG shape renderers ─────────────────────────────────── */

/** Isometric server cube — 3 visible faces */
const ServerCube: React.FC<{ color: string; o: number }> = ({ color, o }) => (
  <g>
    {/* Top face */}
    <polygon
      points="0,-12 18,-3 0,6 -18,-3"
      fill={withAlpha(color, o * 0.5)}
      stroke={withAlpha(color, o * 0.85)}
      strokeWidth={1}
    />
    {/* Left face */}
    <polygon
      points="-18,-3 0,6 0,22 -18,13"
      fill={withAlpha(color, o * 0.35)}
      stroke={withAlpha(color, o * 0.75)}
      strokeWidth={1}
    />
    {/* Right face */}
    <polygon
      points="18,-3 0,6 0,22 18,13"
      fill={withAlpha(color, o * 0.25)}
      stroke={withAlpha(color, o * 0.75)}
      strokeWidth={1}
    />
    {/* Server status LEDs on right face */}
    <circle cx={8} cy={10} r={1.5} fill={withAlpha(COLORS.emerald, o * 0.9)} />
    <circle cx={12} cy={8.5} r={1.5} fill={withAlpha(COLORS.emerald, o * 0.7)} />
  </g>
);

/** Isometric database cylinder */
const DatabaseCylinder: React.FC<{ color: string; o: number }> = ({ color, o }) => (
  <g>
    {/* Cylinder body */}
    <path
      d="M -14,0 L -14,16 Q -14,22 0,22 Q 14,22 14,16 L 14,0"
      fill={withAlpha(color, o * 0.3)}
      stroke={withAlpha(color, o * 0.75)}
      strokeWidth={1}
    />
    {/* Bottom ellipse */}
    <ellipse cx={0} cy={16} rx={14} ry={6} fill="none" stroke={withAlpha(color, o * 0.5)} strokeWidth={0.7} />
    {/* Data row stripes */}
    <line x1={-13} y1={6} x2={13} y2={6} stroke={withAlpha(color, o * 0.4)} strokeWidth={0.7} />
    <line x1={-13} y1={11} x2={13} y2={11} stroke={withAlpha(color, o * 0.4)} strokeWidth={0.7} />
    {/* Top ellipse (cap) */}
    <ellipse cx={0} cy={0} rx={14} ry={6} fill={withAlpha(color, o * 0.45)} stroke={withAlpha(color, o * 0.85)} strokeWidth={1} />
  </g>
);

/** Isometric monitor/screen */
const Monitor: React.FC<{ color: string; o: number }> = ({ color, o }) => (
  <g>
    {/* Screen body */}
    <rect x={-16} y={-12} width={32} height={22} rx={2} fill={withAlpha(color, o * 0.2)} stroke={withAlpha(color, o * 0.75)} strokeWidth={1} />
    {/* Screen content lines */}
    <line x1={-12} y1={-6} x2={4} y2={-6} stroke={withAlpha(color, o * 0.55)} strokeWidth={1.2} />
    <line x1={-12} y1={-1} x2={10} y2={-1} stroke={withAlpha(color, o * 0.45)} strokeWidth={1.2} />
    <line x1={-12} y1={4} x2={-2} y2={4} stroke={withAlpha(color, o * 0.35)} strokeWidth={1.2} />
    {/* Stand */}
    <line x1={0} y1={10} x2={0} y2={16} stroke={withAlpha(color, o * 0.6)} strokeWidth={1.2} />
    <line x1={-8} y1={16} x2={8} y2={16} stroke={withAlpha(color, o * 0.6)} strokeWidth={1.2} />
    {/* Status dot on screen */}
    <circle cx={12} cy={-7} r={1.8} fill={withAlpha(COLORS.emerald, o * 0.85)} />
  </g>
);

/** Shield icon (uptime/security) */
const Shield: React.FC<{ color: string; o: number }> = ({ color, o }) => (
  <g>
    {/* Shield outline */}
    <path
      d="M 0,-16 L 14,-10 L 14,2 Q 14,14 0,18 Q -14,14 -14,2 L -14,-10 Z"
      fill={withAlpha(color, o * 0.25)}
      stroke={withAlpha(color, o * 0.75)}
      strokeWidth={1}
    />
    {/* Checkmark */}
    <path
      d="M -5,2 L -1,7 L 7,-4"
      fill="none"
      stroke={withAlpha(COLORS.emerald, o * 0.85)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </g>
);

/** Network hub — central node with radiating connections */
const NetworkHub: React.FC<{ color: string; o: number }> = ({ color, o }) => {
  const spokes = 5;
  return (
    <g>
      {/* Radiating connection lines */}
      {Array.from({ length: spokes }, (_, i) => {
        const angle = (Math.PI * 2 * i) / spokes - Math.PI / 2;
        const r = 16;
        const endX = Math.cos(angle) * r;
        const endY = Math.sin(angle) * r;
        return (
          <React.Fragment key={i}>
            <line x1={0} y1={0} x2={endX} y2={endY} stroke={withAlpha(color, o * 0.5)} strokeWidth={0.8} />
            <circle cx={endX} cy={endY} r={3} fill={withAlpha(color, o * 0.4)} stroke={withAlpha(color, o * 0.75)} strokeWidth={0.8} />
          </React.Fragment>
        );
      })}
      {/* Central hub */}
      <circle cx={0} cy={0} r={5.5} fill={withAlpha(color, o * 0.4)} stroke={withAlpha(color, o * 0.8)} strokeWidth={1} />
      <circle cx={0} cy={0} r={2.5} fill={withAlpha(color, o * 0.65)} />
    </g>
  );
};

/* ── Shape map ─────────────────────────────────────────────────────── */

const SHAPE_COMPONENTS: Record<ElementType, React.FC<{ color: string; o: number }>> = {
  server: ServerCube,
  database: DatabaseCylinder,
  monitor: Monitor,
  shield: Shield,
  hub: NetworkHub,
};

/* ── Component ─────────────────────────────────────────────────────── */

export const FloatingElements: React.FC<FloatingElementsProps> = ({
  count = 10,
  opacity = 1,
  speed = 1,
  seed = 7,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const items = React.useMemo(
    () => generateItems(count, width, height, seed),
    [count, width, height, seed],
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        pointerEvents: "none",
      }}
    >
      {items.map((item, i) => {
        const time = frame * speed * 0.01;

        /* Position: slow drift + gentle oscillation */
        const rawX = item.x + item.speedX * frame * speed + Math.sin(time + item.floatPhase) * 25;
        const rawY = item.y + item.speedY * frame * speed + Math.cos(time * 0.8 + item.floatPhase) * 18;
        const x = ((rawX % width) + width) % width;
        const y = ((rawY % height) + height) % height;

        /* Float bob: gentle vertical sine */
        const floatY = Math.sin(time * 1.2 + item.floatPhase) * 6;

        /* Subtle isometric tilt oscillation */
        const tilt = Math.sin(time * 0.6 + item.rotPhase) * 4;

        /* Opacity pulse — floor at 0.75 so elements stay visible */
        const pulseOp = item.baseOpacity * (0.75 + 0.25 * Math.sin(time * 1.3 + item.floatPhase));

        const ShapeComponent = SHAPE_COMPONENTS[item.type];
        const color = ACCENT[item.colorIdx];

        return (
          <g
            key={i}
            transform={`translate(${x.toFixed(1)}, ${(y + floatY).toFixed(1)}) scale(${item.scale.toFixed(2)}) rotate(${tilt.toFixed(1)})`}
          >
            <ShapeComponent color={color} o={pulseOp} />
          </g>
        );
      })}
    </svg>
  );
};
