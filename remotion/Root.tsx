/**
 * Remotion Root
 * =============
 * Registers all video compositions available in the Remotion studio.
 * Each <Composition> defines a renderable video with its dimensions, FPS, and duration.
 *
 * Usage:
 *   npx remotion studio src/remotion/index.ts          # Open studio
 *   npx remotion render src/remotion/index.ts LaunchVideo out/senzor-launch.mp4
 */

import React from "react";
import { Composition, Still } from "remotion";
import { LaunchVideo } from "./compositions/launch-video/LaunchVideo";
import { BrandIntro } from "./compositions/launch-video/scenes/BrandIntro";
import { ProblemStatement } from "./compositions/launch-video/scenes/ProblemStatement";
import { ProductShowcase } from "./compositions/launch-video/scenes/ProductShowcase";
import { FeatureHighlight } from "./compositions/launch-video/scenes/FeatureHighlight";
import { SocialProof } from "./compositions/launch-video/scenes/SocialProof";
import { CallToAction } from "./compositions/launch-video/scenes/CallToAction";
import { VIDEO_CONFIG, TOTAL_FRAMES, SCENE_TIMING } from "./compositions/launch-video/constants";

import "./styles.css";

export const Root: React.FC = () => {
  const { width, height, fps } = VIDEO_CONFIG;

  return (
    <>
      {/* ── Full Launch Video ──────────────────────────────────────── */}
      <Composition
        id="LaunchVideo"
        component={LaunchVideo}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={TOTAL_FRAMES}
      />

      {/* ── Individual Scenes (for preview/iteration) ─────────────── */}
      <Composition
        id="BrandIntro"
        component={BrandIntro}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.brandIntro.duration}
      />

      <Composition
        id="ProblemStatement"
        component={ProblemStatement}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.problemStatement.duration}
      />

      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.productShowcase.duration}
      />

      <Composition
        id="FeatureHighlight"
        component={FeatureHighlight}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.featureHighlight.duration}
      />

      <Composition
        id="SocialProof"
        component={SocialProof}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.socialProof.duration}
      />

      <Composition
        id="CallToAction"
        component={CallToAction}
        width={width}
        height={height}
        fps={fps}
        durationInFrames={SCENE_TIMING.callToAction.duration}
      />

      {/* ── Thumbnail Still ────────────────────────────────────────── */}
      <Still
        id="Thumbnail"
        component={BrandIntro}
        width={width}
        height={height}
      />
    </>
  );
};
