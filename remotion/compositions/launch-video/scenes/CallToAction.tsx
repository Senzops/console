/**
 * CallToAction Scene
 * ==================
 * Duration: 6 seconds (180 frames at 30fps)
 *
 * Final scene with clear CTA, website URL, and QR code.
 *
 *   0-15:    Fade in
 *   15-40:   Headline: "Ready to gain full visibility?"
 *   40-60:   Subtext: "Start monitoring in 60 seconds."
 *   60-80:   URL and CTA button appear
 *   80-100:  QR code fades in
 *   100-160: Hold (all elements visible)
 *   160-180: Gentle fade, logo watermark persists
 */

import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { VideoContainer } from "../../../components/VideoContainer";
import { ParticleField } from "../../../components/ParticleField";
import { COLORS, withAlpha } from "../../../lib/theme";
import { FONT_SERIF, FONT_SANS } from "../../../lib/fonts";
import { easeOutCubic } from "../../../lib/easing";
import { QRCodeSVG } from "qrcode.react";
import { COPY } from "../constants";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene transitions
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [165, 180], [1, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  // Headline
  const headlineOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [15, 35], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // Subtext
  const subtextOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtextY = interpolate(frame, [40, 60], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // CTA button
  const ctaOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaScale = interpolate(frame, [60, 80], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // QR code
  const qrOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const qrScale = interpolate(frame, [80, 105], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });

  // Logo watermark
  const logoOpacity = interpolate(frame, [100, 120], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <VideoContainer>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        <ParticleField count={35} opacity={0.25} speed={0.2} />

        {/* Main CTA content */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* Headline */}
          <div
            style={{
              opacity: headlineOpacity,
              transform: `translateY(${headlineY}px)`,
              fontSize: 52,
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              color: COLORS.foreground,
              textAlign: "center",
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {COPY.ctaHeadline}
          </div>

          {/* Subtext */}
          <div
            style={{
              opacity: subtextOpacity,
              transform: `translateY(${subtextY}px)`,
              fontSize: 22,
              fontFamily: FONT_SANS,
              fontWeight: 400,
              color: COLORS.mutedForeground,
              textAlign: "center",
            }}
          >
            {COPY.ctaSubtext}
          </div>

          {/* CTA Button */}
          <div
            style={{
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
              marginTop: 8,
            }}
          >
            <div
              style={{
                padding: "16px 48px",
                borderRadius: 50,
                backgroundColor: COLORS.primary,
                color: COLORS.primaryForeground,
                fontSize: 18,
                fontWeight: 700,
                fontFamily: FONT_SANS,
                boxShadow: `0 8px 32px ${withAlpha(COLORS.primary, 0.35)}`,
              }}
            >
              Get Started Free
            </div>
          </div>

          {/* QR Code — prominent, centered, blended with frame */}
          <div
            style={{
              opacity: qrOpacity,
              transform: `scale(${qrScale})`,
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 20,
                borderRadius: 20,
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: `0 8px 40px ${withAlpha(COLORS.primary, 0.08)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <QRCodeSVG
                value="https://senzor.dev"
                size={150}
                level="M"
                bgColor="transparent"
                fgColor={COLORS.foreground}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: COLORS.mutedForeground,
                  fontFamily: FONT_SANS,
                  letterSpacing: "0.02em",
                }}
              >
                <span>Scan to get started</span>
                <span style={{ color: COLORS.border }}>·</span>
                <span style={{ fontWeight: 700, color: COLORS.foreground, letterSpacing: "0.04em" }}>
                  {COPY.ctaUrl}
                </span>
              </div>
            </div>
          </div>
        </AbsoluteFill>

        {/* Logo watermark — bottom center */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: logoOpacity,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg
              viewBox="0 0 744 744"
              width={28}
              height={28}
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="translate(0,744) scale(0.1,-0.1)" fill={COLORS.mutedForeground} stroke="none">
                <path d="M3110 6639 c-127 -8 -278 -40 -462 -98 -301 -96 -481 -182 -728 -350 -276 -187 -436 -323 -667 -566 -228 -240 -317 -358 -441 -580 -143 -258 -204 -442 -268 -810 -28 -155 -25 -497 4 -675 32 -189 108 -555 121 -578 6 -11 47 24 162 139 135 135 159 164 192 231 56 116 64 183 44 369 -24 220 -20 399 14 554 45 208 156 464 279 643 283 412 803 855 1224 1040 290 127 516 170 850 159 261 -9 434 -52 681 -171 229 -110 441 -256 666 -458 117 -105 178 -141 266 -157 68 -13 161 1 223 35 55 30 220 178 220 198 0 21 -172 179 -350 321 -21 17 -86 72 -144 122 -111 97 -314 238 -475 329 -51 30 -95 54 -96 54 -2 0 -50 22 -107 49 -210 100 -489 175 -750 201 -116 11 -276 11 -458 -1z" />
                <path d="M6855 6443 c-22 -5 -292 -65 -425 -93 -47 -11 -146 -33 -220 -50 -419 -96 -395 -87 -366 -146 9 -20 71 -89 137 -152 65 -63 119 -120 119 -125 0 -18 -1110 -1128 -1175 -1176 -22 -16 -69 -44 -104 -62 -60 -32 -71 -34 -160 -34 -88 0 -101 3 -161 32 -36 18 -105 58 -155 89 -172 108 -311 168 -480 206 -108 24 -357 35 -460 20 -144 -22 -201 -33 -220 -42 -11 -5 -47 -16 -79 -25 -73 -20 -272 -122 -341 -174 -95 -72 -200 -175 -1273 -1243 -822 -818 -1068 -1069 -1083 -1103 -39 -87 -24 -203 37 -282 76 -100 248 -128 352 -58 20 14 348 336 729 715 527 525 693 685 693 668 0 -42 50 -232 85 -323 137 -357 454 -663 810 -784 165 -55 283 -75 455 -75 310 0 528 64 775 228 132 89 214 166 326 308 141 179 234 385 264 588 27 173 17 256 -37 337 -49 73 -113 106 -203 104 -56 -2 -143 -38 -189 -80 -33 -30 -86 -135 -86 -171 -1 -109 -85 -330 -164 -430 -38 -48 -154 -170 -162 -170 -1 0 -33 -21 -71 -46 -128 -86 -245 -124 -408 -131 -196 -9 -318 23 -475 126 -248 161 -389 420 -390 712 0 123 10 174 59 298 50 126 96 196 186 284 200 195 436 274 707 238 109 -15 195 -49 319 -128 167 -107 321 -178 438 -203 89 -20 123 -22 240 -17 161 6 253 31 396 106 203 108 252 152 884 791 l514 519 116 -107 c64 -59 135 -122 159 -141 39 -30 44 -32 64 -19 17 11 26 35 39 104 10 49 41 199 69 334 75 361 117 578 122 637 6 60 -8 88 -62 128 -33 24 -88 31 -145 18z" />
                <path d="M6049 4719 c-219 -220 -257 -291 -246 -457 3 -48 13 -112 22 -142 33 -118 76 -341 91 -475 50 -438 -87 -908 -376 -1293 -119 -159 -373 -406 -615 -598 -55 -43 -102 -81 -105 -84 -3 -3 -14 -10 -25 -17 -11 -6 -72 -44 -135 -84 -184 -116 -339 -186 -570 -258 -115 -35 -362 -71 -495 -71 -110 0 -320 25 -395 46 -30 9 -68 18 -84 21 -42 7 -238 84 -324 127 -105 53 -194 112 -307 204 -98 79 -427 398 -597 579 -92 98 -149 135 -239 154 -68 15 -153 -9 -226 -62 -64 -48 -183 -158 -183 -170 0 -10 190 -223 259 -289 25 -25 94 -97 153 -160 201 -217 502 -484 667 -595 106 -70 344 -187 486 -239 301 -110 638 -158 951 -137 409 28 795 156 1170 387 219 135 386 263 629 484 466 424 730 850 846 1367 61 274 72 460 44 748 -23 239 -47 354 -190 895 -24 90 -36 157 -36 202 0 38 -5 68 -10 68 -6 0 -78 -68 -160 -151z" />
                <path d="M3460 4033 c-25 -9 -62 -27 -82 -40 -21 -12 -41 -23 -44 -23 -14 0 -101 -87 -132 -133 -65 -94 -84 -203 -58 -325 27 -130 95 -230 200 -297 84 -53 144 -68 256 -63 88 3 104 7 172 40 85 42 167 119 203 189 29 56 55 154 55 206 0 58 -36 189 -66 242 -41 70 -120 140 -204 180 -67 32 -85 36 -165 38 -63 2 -104 -3 -135 -14z" />
              </g>
            </svg>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.mutedForeground,
                fontFamily: FONT_SANS,
                letterSpacing: "-0.01em",
              }}
            >
              Senzor
            </span>
          </div>
        </div>

        {/* Vignette */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 75% 65% at 50% 50%, transparent 40%, ${COLORS.background} 100%)`,
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    </VideoContainer>
  );
};

