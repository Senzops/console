/**
 * BrandIntro Scene
 * ================
 * Duration: 4 seconds (120 frames at 30fps)
 *
 * Sequence:
 *   0-20:   Black screen (dramatic pause)
 *   20-60:  Logo reveal with radial mask + scale settle
 *   60-90:  Logo settles, glow ring pulses
 *   70-110: Tagline text fades in with slide-up
 *   110-120: Hold (all elements visible)
 */

import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { AnimatedLogo } from "../../../components/AnimatedLogo";
import { ParticleField } from "../../../components/ParticleField";
import { TypewriterText } from "../../../components/TypewriterText";
import { COLORS } from "../../../lib/theme";
import { FONT_SERIF } from "../../../lib/fonts";
import { COPY } from "../constants";

export const BrandIntro: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene-level fade out at the very end
  const sceneOpacity = interpolate(frame, [105, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <VideoContainer>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        {/* Particle field background */}
        <ParticleField count={40} opacity={0.4} speed={0.3} />

        {/* Centered content */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
          }}
        >
          {/* Logo */}
          <AnimatedLogo revealStart={20} revealDuration={40} size={180} />

          {/* Tagline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {COPY.tagline.split("\n").map((line, i) => (
              <TypewriterText
                key={i}
                text={line}
                startFrame={70 + i * 10}
                duration={25}
                mode="fade"
                fontSize={42}
                fontFamily={FONT_SERIF}
                fontWeight={400}
                letterSpacing="-0.02em"
                color={COLORS.foreground}
              />
            ))}
          </div>
        </AbsoluteFill>

        {/* Vignette */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, ${COLORS.background} 100%)`,
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    </VideoContainer>
  );
};
