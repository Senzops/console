/**
 * FeatureHighlight Scene
 * ======================
 * Duration: 7 seconds (210 frames at 30fps)
 *
 * Displays Senzor's 14 monitoring capabilities in an animated grid.
 * Each feature card enters with a staggered animation.
 *
 *   0-15:    Fade in, title appears
 *   15-30:   Subtitle appears
 *   20-110:  Feature cards appear in staggered grid (14 cards × 5f gap)
 *   110-190: All cards visible, subtle ambient glow
 *   190-210: Fade out
 */

import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { GlowCard } from "../../../components/GlowCard";
import { FloatingElements } from "../../../components/FloatingElements";
import { COLORS, FEATURE_COLORS, withAlpha } from "../../../lib/theme";
import { FONT_SERIF, FONT_SANS } from "../../../lib/fonts";
import { easeOutCubic } from "../../../lib/easing";
import { FEATURES } from "../constants";

/** Simple icon rendering — maps feature icon names to SVG paths */
const FeatureIcon: React.FC<{ name: string; color: string; size?: number }> = ({
  name,
  color,
  size = 22,
}) => {
  const icons: Record<string, string> = {
    LayoutTemplate: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    Server: "M2 4h20v6H2zM2 14h20v6H2zM6 7h.01M6 17h.01",
    Database: "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z",
    Flame: "M12 22c-4.97 0-9-3.58-9-8 0-4 3.5-7.5 4-10.5.5 3 2.5 4 4 3 1.5-1 2-3 1.5-5 2 2 5 4 5 8.5 0 4.42-2.46 8-5.5 8z",
    Globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
    MousePointerClick: "M4 4l7.07 17 2.51-7.39L21 11.07z",
    Activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    Workflow: "M5 3v4M3 5h4M6 17v4M4 19h4M13 3l6 6M19 9l-6 6",
    AlertOctagon: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86zM12 8v4M12 16h.01",
    Terminal: "M4 17l6-6-6-6M12 19h8",
    CheckCircle2: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
    Bot: "M12 8V4H8M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM2 12h2M20 12h2",
    BellRing: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    Layers: "M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icons[name] || icons.Activity} />
    </svg>
  );
};

export const FeatureHighlight: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene transitions
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [190, 210], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  // Title
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // Subtitle
  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Grid layout: 5 columns × 3 rows (5+5+4)
  const COLS = 5;

  return (
    <VideoContainer>
      {/* Floating background elements */}
      <FloatingElements
        count={10}
        opacity={sceneOpacity * 0.85}
        speed={0.6}
        seed={19}
      />

      <AbsoluteFill
        style={{
          opacity: sceneOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 42,
            fontFamily: FONT_SERIF,
            fontWeight: 400,
            color: COLORS.foreground,
            textAlign: "center",
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          Everything You Need to Monitor
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 18,
            fontFamily: FONT_SANS,
            fontWeight: 400,
            color: COLORS.mutedForeground,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          14 integrated monitoring capabilities. One unified platform.
        </div>

        {/* Feature grid — 5 columns, larger cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "center",
            maxWidth: 1300,
            width: "100%",
          }}
        >
          {FEATURES.map((feature, i) => {
            const enterFrame = 20 + i * 5;
            const accentColor = FEATURE_COLORS[i];

            return (
              <GlowCard
                key={feature.title}
                accentColor={accentColor}
                enterFrame={enterFrame}
                enterDuration={25}
                width={235}
                height={150}
              >
                <div
                  style={{
                    padding: "20px 18px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    height: "100%",
                  }}
                >
                  {/* Icon with colored background */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: withAlpha(accentColor, 0.1),
                      border: `1px solid ${withAlpha(accentColor, 0.2)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FeatureIcon name={feature.icon} color={accentColor} size={24} />
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.foreground,
                      textAlign: "center",
                      lineHeight: 1.3,
                      fontFamily: FONT_SANS,
                    }}
                  >
                    {feature.title}
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>
      </AbsoluteFill>
    </VideoContainer>
  );
};
