/**
 * ProblemStatement Scene
 * ======================
 * Duration: 8 seconds (240 frames at 30fps)
 *
 * Narrative sequence:
 *   0-15:   Fade in from black
 *   15-60:  "Your infrastructure is talking." (dramatic serif text)
 *   60-100: "Are you listening?" (appears below, emphasis)
 *   100-130: Pain point 1: "Logs scattered across a dozen tools."
 *   130-160: Pain point 2: "Metrics here. Traces there. Alerts somewhere else."
 *   160-210: "There's a better way." (centered, bright, hopeful transition)
 *   210-240: Fade out
 */

import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { ParticleField } from "../../../components/ParticleField";
import { COLORS, withAlpha } from "../../../lib/theme";
import { FONT_SERIF, FONT_SANS } from "../../../lib/fonts";
import { easeOutCubic, easeInQuart } from "../../../lib/easing";
import { COPY } from "../constants";

export const ProblemStatement: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene fade in/out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  // --- Text animations ---
  const lines = COPY.problemLines;

  // Line 0: "Your infrastructure is talking."
  const line0Opacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line0Y = interpolate(frame, [15, 35], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const line0Exit = interpolate(frame, [90, 100], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Line 1: "Are you listening?"
  const line1Opacity = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(frame, [50, 70], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const line1Exit = interpolate(frame, [90, 100], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pain points (lines 2-3)
  const pain1Opacity = interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pain1Y = interpolate(frame, [100, 120], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const pain1Exit = interpolate(frame, [150, 160], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pain2Opacity = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pain2Y = interpolate(frame, [120, 140], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const pain2Exit = interpolate(frame, [150, 160], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "There's a better way." — hopeful CTA
  const ctaOpacity = interpolate(frame, [165, 185], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [165, 190], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const ctaScale = interpolate(frame, [165, 195], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // Accent line under "better way"
  const lineWidth = interpolate(frame, [185, 210], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutCubic,
  });

  return (
    <VideoContainer>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        {/* Subtle particle field */}
        <ParticleField count={25} opacity={0.2} speed={0.2} />

        {/* Phase 1: Hook text */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {/* Line 0 */}
          <div
            style={{
              opacity: line0Opacity * line0Exit,
              transform: `translateY(${line0Y}px)`,
              fontSize: 52,
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              color: COLORS.foreground,
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            {lines[0]}
          </div>

          {/* Line 1 */}
          <div
            style={{
              opacity: line1Opacity * line1Exit,
              transform: `translateY(${line1Y}px)`,
              fontSize: 44,
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              color: COLORS.mutedForeground,
              textAlign: "center",
              letterSpacing: "-0.01em",
              fontStyle: "italic",
            }}
          >
            {lines[1]}
          </div>
        </AbsoluteFill>

        {/* Phase 2: Pain points */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              opacity: pain1Opacity * pain1Exit,
              transform: `translateY(${pain1Y}px)`,
              fontSize: 28,
              fontFamily: FONT_SANS,
              fontWeight: 500,
              color: COLORS.mutedForeground,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {lines[2]}
          </div>
          <div
            style={{
              opacity: pain2Opacity * pain2Exit,
              transform: `translateY(${pain2Y}px)`,
              fontSize: 28,
              fontFamily: FONT_SANS,
              fontWeight: 500,
              color: COLORS.mutedForeground,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {lines[3]}
          </div>
        </AbsoluteFill>

        {/* Phase 3: "There's a better way." */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              opacity: ctaOpacity,
              transform: `translateY(${ctaY}px) scale(${ctaScale})`,
              fontSize: 56,
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              color: COLORS.foreground,
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            {lines[4]}
          </div>
          {/* Accent underline */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              backgroundColor: COLORS.emerald,
              borderRadius: 2,
              marginTop: 16,
              opacity: ctaOpacity,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </VideoContainer>
  );
};
