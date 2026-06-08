/**
 * LaunchVideo — Main Composition
 * ===============================
 * Orchestrates all scenes into the final 55-second marketing launch video.
 *
 * Scene Timeline (at 30fps):
 *   [0–120]     BrandIntro        — Logo reveal + tagline (4s)
 *   [120–360]   ProblemStatement   — Pain point narrative (8s)
 *   [360–1020]  ProductShowcase    — Dashboard walkthrough (22s)
 *   [1020–1230] FeatureHighlight   — 14 features grid (7s)
 *   [1230–1470] SocialProof        — Key metrics (8s)
 *   [1470–1650] CallToAction       — CTA + URL + QR (6s)
 *
 * Audio:
 *   Background music with volume envelope: fade-in over 2s, sustain at 35%,
 *   fade-out over the last 3s of the video.
 */

import React, { useCallback } from "react";
import { AbsoluteFill, Sequence, Audio, interpolate } from "remotion";
import backgroundMusic from "../../assets/audio/background.mp3";
import { BrandIntro } from "./scenes/BrandIntro";
import { ProblemStatement } from "./scenes/ProblemStatement";
import { ProductShowcase } from "./scenes/ProductShowcase";
import { FeatureHighlight } from "./scenes/FeatureHighlight";
import { SocialProof } from "./scenes/SocialProof";
import { CallToAction } from "./scenes/CallToAction";
import { SCENE_TIMING, TOTAL_FRAMES } from "./constants";
import { COLORS } from "../../lib/theme";

export const LaunchVideo: React.FC = () => {
  /**
   * Volume envelope for background music:
   *   0-60 frames (0-2s):        Fade in from 0 → 0.35
   *   60-1560 frames (2-52s):    Sustain at 0.35
   *   1560-1650 frames (52-55s): Fade out 0.35 → 0
   */
  const volumeEnvelope = useCallback((frame: number) => {
    return interpolate(
      frame,
      [0, 60, TOTAL_FRAMES - 90, TOTAL_FRAMES],
      [0, 0.35, 0.35, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* ── Audio Track ─────────────────────────────────────────────── */}
      <Audio
        src={backgroundMusic}
        volume={volumeEnvelope}
        startFrom={0}
      />

      {/* ── Scene 1: Brand Intro ────────────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.brandIntro.start}
        durationInFrames={SCENE_TIMING.brandIntro.duration}
        name="Brand Intro"
      >
        <BrandIntro />
      </Sequence>

      {/* ── Scene 2: Problem Statement ──────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.problemStatement.start}
        durationInFrames={SCENE_TIMING.problemStatement.duration}
        name="Problem Statement"
      >
        <ProblemStatement />
      </Sequence>

      {/* ── Scene 3: Product Showcase ───────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.productShowcase.start}
        durationInFrames={SCENE_TIMING.productShowcase.duration}
        name="Product Showcase"
      >
        <ProductShowcase />
      </Sequence>

      {/* ── Scene 4: Feature Highlight ──────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.featureHighlight.start}
        durationInFrames={SCENE_TIMING.featureHighlight.duration}
        name="Feature Highlight"
      >
        <FeatureHighlight />
      </Sequence>

      {/* ── Scene 5: Social Proof ───────────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.socialProof.start}
        durationInFrames={SCENE_TIMING.socialProof.duration}
        name="Social Proof"
      >
        <SocialProof />
      </Sequence>

      {/* ── Scene 6: Call to Action ─────────────────────────────────── */}
      <Sequence
        from={SCENE_TIMING.callToAction.start}
        durationInFrames={SCENE_TIMING.callToAction.duration}
        name="Call to Action"
      >
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};
