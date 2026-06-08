/**
 * SocialProof Scene
 * =================
 * Duration: 8 seconds (240 frames at 30fps)
 *
 * Big metric numbers counting up to emphasize platform capabilities.
 *
 *   0-15:    Fade in from black
 *   15-30:   Title: "Built for Engineering Teams"
 *   40-180:  Stats count up with staggered starts
 *   180-220: Hold (all visible)
 *   220-240: Fade out
 */

import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { ParticleField } from "../../../components/ParticleField";
import { TypewriterText } from "../../../components/TypewriterText";
import { COLORS, withAlpha } from "../../../lib/theme";
import { FONT_SERIF, FONT_SANS } from "../../../lib/fonts";
import { easeOutQuart, easeOutCubic } from "../../../lib/easing";
import { COPY } from "../constants";

export const SocialProof: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene transitions
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  return (
    <VideoContainer>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        <ParticleField count={30} opacity={0.2} speed={0.15} />

        {/* Content */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 64,
          }}
        >
          {/* Title */}
          <TypewriterText
            text={COPY.statsHeadline}
            startFrame={15}
            duration={25}
            mode="fade"
            fontSize={46}
            fontFamily={FONT_SERIF}
            fontWeight={400}
            letterSpacing="-0.02em"
            color={COLORS.foreground}
          />

          {/* Stats grid */}
          <div
            style={{
              display: "flex",
              gap: 60,
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {COPY.stats.map((stat, i) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
                index={i}
              />
            ))}
          </div>
        </AbsoluteFill>

        {/* Vignette */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, ${COLORS.background} 100%)`,
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    </VideoContainer>
  );
};

// ============================================================================
// STAT ITEM
// ============================================================================

const StatItem: React.FC<{ value: string; label: string; index: number }> = ({
  value,
  label,
  index,
}) => {
  const frame = useCurrentFrame();
  const startFrame = 40 + index * 20;

  // Entrance
  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [startFrame, startFrame + 25], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });

  const scale = interpolate(frame, [startFrame, startFrame + 25], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });

  // Accent line draw
  const lineWidth = interpolate(frame, [startFrame + 15, startFrame + 40], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });

  const accentColors = [COLORS.emerald, COLORS.blue, COLORS.orange, COLORS.purple];
  const accent = accentColors[index % accentColors.length];

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        minWidth: 200,
      }}
    >
      {/* Value */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.foreground,
          fontFamily: FONT_SANS,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: accent,
          borderRadius: 2,
        }}
      />

      {/* Label */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: COLORS.mutedForeground,
          fontFamily: FONT_SANS,
          textAlign: "center",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
    </div>
  );
};
