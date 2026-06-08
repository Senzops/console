/**
 * MetricCounter
 * =============
 * Animates a numeric value counting up from 0 to target.
 * Mirrors the EaseOutQuart animation from src/components/Tween/index.tsx.
 * Works with integers, decimals, and percentage strings.
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { easeOutQuart } from "../lib/easing";
import { COLORS } from "../lib/theme";

interface MetricCounterProps {
  /** Target numeric value */
  value: number;
  /** Frame at which counting begins */
  startFrame: number;
  /** Duration of the count animation in frames */
  duration?: number;
  /** Number of decimal places to display */
  decimals?: number;
  /** Prefix string (e.g., "$", "<") */
  prefix?: string;
  /** Suffix string (e.g., "%", "ms", "s", "+") */
  suffix?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Text color */
  color?: string;
  /** Font weight */
  fontWeight?: number;
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  startFrame,
  duration = 45,
  decimals = 0,
  prefix = "",
  suffix = "",
  fontSize = 72,
  color = COLORS.foreground,
  fontWeight = 800,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutQuart }
  );

  const currentValue = progress * value;
  const displayValue = currentValue.toFixed(decimals);

  // Entrance opacity
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
      }}
    >
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
