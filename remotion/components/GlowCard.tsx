/**
 * GlowCard
 * ========
 * A branded card component with accent glow effect.
 * Used in feature highlight and product showcase scenes.
 * Mirrors the card styling from the main app's design system.
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, withAlpha } from "../lib/theme";
import { easeOutBack } from "../lib/easing";

interface GlowCardProps {
  children: React.ReactNode;
  /** Accent color for the glow effect */
  accentColor?: string;
  /** Frame at which the entrance animation starts */
  enterFrame?: number;
  /** Duration of the entrance animation in frames */
  enterDuration?: number;
  /** Card width */
  width?: number | string;
  /** Card height */
  height?: number | string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  accentColor = COLORS.foreground,
  enterFrame = 0,
  enterDuration = 25,
  width = "100%",
  height = "auto",
  style,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + enterDuration * 0.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(
    frame,
    [enterFrame, enterFrame + enterDuration],
    [0.92, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutBack }
  );

  const translateY = interpolate(
    frame,
    [enterFrame, enterFrame + enterDuration],
    [16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutBack }
  );

  // Glow intensity peaks during entrance then settles
  const glowIntensity = interpolate(
    frame,
    [enterFrame + enterDuration * 0.3, enterFrame + enterDuration, enterFrame + enterDuration + 20],
    [0, 0.35, 0.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width,
        height,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        position: "relative",
        ...style,
      }}
    >
      {/* Glow effect */}
      <div
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: 16,
          background: `radial-gradient(ellipse at 50% 0%, ${withAlpha(accentColor, glowIntensity)}, transparent 70%)`,
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />

      {/* Card body */}
      <div
        style={{
          position: "relative",
          backgroundColor: COLORS.card,
          border: `1px solid ${withAlpha(accentColor, 0.2)}`,
          borderRadius: 12,
          overflow: "hidden",
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};
