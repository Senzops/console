/**
 * TypewriterText
 * ==============
 * Animates text appearing character by character or fading in as a block.
 * Supports two modes:
 *   - "typewriter": Characters appear sequentially
 *   - "fade": Whole text fades in with vertical slide
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { easeOutCubic } from "../lib/easing";

interface TypewriterTextProps {
  /** The text content to reveal */
  text: string;
  /** Frame at which the animation starts */
  startFrame: number;
  /** Duration of the reveal in frames */
  duration?: number;
  /** Animation mode */
  mode?: "typewriter" | "fade";
  /** Font size in pixels */
  fontSize?: number;
  /** Font family override */
  fontFamily?: string;
  /** Text color */
  color?: string;
  /** Font weight */
  fontWeight?: number;
  /** Letter spacing */
  letterSpacing?: string;
  /** Text alignment */
  textAlign?: React.CSSProperties["textAlign"];
  /** Additional inline styles */
  style?: React.CSSProperties;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  duration = 30,
  mode = "fade",
  fontSize = 48,
  fontFamily,
  color = "#fafafa",
  fontWeight = 700,
  letterSpacing,
  textAlign = "center",
  style,
}) => {
  const frame = useCurrentFrame();

  if (mode === "typewriter") {
    const progress = interpolate(
      frame,
      [startFrame, startFrame + duration],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const charsToShow = Math.floor(progress * text.length);
    const visibleText = text.slice(0, charsToShow);
    const cursorOpacity = frame % 16 < 8 ? 1 : 0;

    return (
      <div
        style={{
          fontSize,
          fontFamily,
          fontWeight,
          color,
          letterSpacing,
          textAlign,
          whiteSpace: "pre-wrap",
          lineHeight: 1.2,
          ...style,
        }}
      >
        {visibleText}
        <span style={{ opacity: cursorOpacity, color }}>|</span>
      </div>
    );
  }

  // Fade mode
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + duration * 0.7],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic }
  );

  const translateY = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic }
  );

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        fontWeight,
        color,
        letterSpacing,
        textAlign,
        opacity,
        transform: `translateY(${translateY}px)`,
        whiteSpace: "pre-wrap",
        lineHeight: 1.2,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
