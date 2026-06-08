import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { ProductDashboard } from "../../../components/ProductDashboard";
import { FloatingElements } from "../../../components/FloatingElements";
import { COLORS, withAlpha } from "../../../lib/theme";
import { FONT_SERIF, FONT_SANS } from "../../../lib/fonts";
import { easeOutCubic, easeInQuart } from "../../../lib/easing";
import { COPY } from "../constants";

const SLIDE_DURATION = 24;

const SLIDE_TRANSITIONS = [
  { start: 195, end: 195 + SLIDE_DURATION },
  { start: 345, end: 345 + SLIDE_DURATION },
  { start: 495, end: 495 + SLIDE_DURATION },
];

const VIEW_ANIMATION_STARTS: [number, number, number, number] = [30, 219, 369, 519];

const VIEW_LABELS = [
  "Global Infrastructure",
  "Application Performance Monitoring",
  "Log Management",
  "Global Exception Tracker",
];

export const ProductShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [640, 660], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  const t1 = interpolate(frame, [SLIDE_TRANSITIONS[0].start, SLIDE_TRANSITIONS[0].end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const t2 = interpolate(frame, [SLIDE_TRANSITIONS[1].start, SLIDE_TRANSITIONS[1].end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const t3 = interpolate(frame, [SLIDE_TRANSITIONS[2].start, SLIDE_TRANSITIONS[2].end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const slideOffset = t1 + t2 + t3;

  const rotateX = interpolate(frame, [20, 55, 600], [14, 5, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotateY = interpolate(frame, [20, 55, 600], [-10, -3, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dashEntryY = interpolate(frame, [20, 55], [140, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
  const dashEntryOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dashScale = interpolate(frame, [620, 660], [1, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInQuart,
  });

  const shadowOpacity = interpolate(frame, [35, 60, 640, 660], [0, 0.5, 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const activeIdx = Math.round(Math.min(Math.max(slideOffset, 0), 3));
  const labelCrossfade = 1 - Math.min(Math.abs(slideOffset - activeIdx) * 3, 1);
  const labelEnter = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelExit = interpolate(frame, [625, 645], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const viewLabelOpacity = labelEnter * labelExit * labelCrossfade;

  return (
    <VideoContainer>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        {/* Floating background elements — observability network nodes */}
        <FloatingElements
          count={12}
          opacity={0.8}
          speed={0.5}
          seed={42}
        />

        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 40,
            width: "100%",
            textAlign: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              color: COLORS.foreground,
              letterSpacing: "-0.02em",
            }}
          >
            {COPY.showcaseTitle}
          </div>
        </div>

        {/* 3D perspective container */}
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 60,
            perspective: "1500px",
            perspectiveOrigin: "50% 45%",
          }}
        >
          {/* Dashboard with 3D transform */}
          <div
            style={{
              transform: `translateY(${dashEntryY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${dashScale})`,
              transformStyle: "preserve-3d",
              opacity: dashEntryOpacity,
              willChange: "transform",
            }}
          >
            <ProductDashboard
              slideOffset={slideOffset}
              viewAnimationStarts={VIEW_ANIMATION_STARTS}
              globalFrame={frame}
            />
          </div>

          {/* Ground shadow */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              width: 1100,
              height: 50,
              background: `radial-gradient(ellipse at center, ${withAlpha("#3a2e20", 0.18)} 0%, transparent 70%)`,
              filter: "blur(20px)",
              opacity: shadowOpacity,
              pointerEvents: "none",
            }}
          />
        </AbsoluteFill>

        {/* View label indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: viewLabelOpacity,
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "8px 24px",
              borderRadius: 20,
              backgroundColor: withAlpha(COLORS.card, 0.85),
              border: `1px solid ${COLORS.border}`,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONT_SANS,
              color: COLORS.foreground,
              backdropFilter: "blur(8px)",
              letterSpacing: "0.02em",
            }}
          >
            {VIEW_LABELS[activeIdx]}
          </div>
        </div>
      </AbsoluteFill>
    </VideoContainer>
  );
};
