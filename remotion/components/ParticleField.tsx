/**
 * ParticleField
 * =============
 * Deterministic particle field background for cinematic scenes.
 * Uses seeded positions and frame-based animation (no randomness between frames).
 * Renders as SVG for Remotion compatibility.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, withAlpha } from "../lib/theme";

interface ParticleFieldProps {
  /** Number of particles */
  count?: number;
  /** Base opacity for particles */
  opacity?: number;
  /** Particle color */
  color?: string;
  /** Movement speed multiplier */
  speed?: number;
}

/** Deterministic pseudo-random number generator (mulberry32) */
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

interface Particle {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  speedX: number;
  speedY: number;
  phase: number;
}

function generateParticles(count: number, width: number, height: number): Particle[] {
  const rng = seededRandom(42);
  return Array.from({ length: count }, () => ({
    x: rng() * width,
    y: rng() * height,
    size: 1 + rng() * 2.5,
    baseOpacity: 0.15 + rng() * 0.4,
    speedX: (rng() - 0.5) * 0.3,
    speedY: (rng() - 0.5) * 0.2,
    phase: rng() * Math.PI * 2,
  }));
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 60,
  opacity = 1,
  color = COLORS.foreground,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const particles = React.useMemo(() => generateParticles(count, width, height), [count, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}
    >
      {particles.map((p, i) => {
        // Frame-deterministic position with gentle floating motion
        const time = frame * speed * 0.02;
        const x = (p.x + p.speedX * frame * speed + Math.sin(time + p.phase) * 15) % width;
        const y = (p.y + p.speedY * frame * speed + Math.cos(time + p.phase * 1.3) * 10) % height;
        const currentOpacity = p.baseOpacity * (0.7 + 0.3 * Math.sin(time * 2 + p.phase));

        return (
          <circle
            key={i}
            cx={x < 0 ? x + width : x}
            cy={y < 0 ? y + height : y}
            r={p.size}
            fill={withAlpha(color, currentOpacity)}
          />
        );
      })}
    </svg>
  );
};
