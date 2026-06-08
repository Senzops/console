/**
 * VideoContainer
 * ==============
 * Root wrapper for all Remotion compositions.
 * Sets up the visual environment: background color, fonts, and full-bleed layout.
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT_SANS } from "../lib/fonts";
import { COLORS } from "../lib/theme";

interface VideoContainerProps {
  children: React.ReactNode;
  /** Override background color (defaults to theme background) */
  background?: string;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({
  children,
  background = COLORS.background,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        fontFamily: FONT_SANS,
        color: COLORS.foreground,
        overflow: "hidden",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
