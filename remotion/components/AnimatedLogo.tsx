/**
 * AnimatedLogo
 * ============
 * Animated Senzor logo for the brand intro scene.
 * Uses the actual SVG path data from public/logo.svg with a reveal animation.
 *
 * Animation sequence:
 * 1. Radial mask expands from center, revealing the logo
 * 2. Logo scales from 1.05 to 1.0 (subtle zoom settle)
 * 3. Glow ring pulses behind the logo
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, withAlpha } from "../lib/theme";
import { easeOutExpo, easeOutCubic } from "../lib/easing";

interface AnimatedLogoProps {
  /** Frame at which the reveal begins */
  revealStart?: number;
  /** Duration of the reveal in frames */
  revealDuration?: number;
  /** Size of the logo in pixels */
  size?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  revealStart = 20,
  revealDuration = 40,
  size = 200,
}) => {
  const frame = useCurrentFrame();

  // --- Reveal mask progress ---
  const revealProgress = interpolate(
    frame,
    [revealStart, revealStart + revealDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo }
  );

  // --- Scale animation ---
  const scale = interpolate(
    frame,
    [revealStart, revealStart + revealDuration],
    [1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic }
  );

  // --- Glow animation ---
  const glowOpacity = interpolate(
    frame,
    [revealStart + revealDuration * 0.5, revealStart + revealDuration, revealStart + revealDuration + 30],
    [0, 0.6, 0.15],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const glowScale = interpolate(
    frame,
    [revealStart + revealDuration * 0.5, revealStart + revealDuration + 30],
    [0.8, 1.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic }
  );

  // Mask radius: from 0% to 75% (enough to reveal the full logo)
  const maskRadius = revealProgress * 75;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Glow ring behind logo */}
      <div
        style={{
          position: "absolute",
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(COLORS.foreground, 0.15)} 0%, transparent 70%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Logo SVG with radial mask reveal */}
      <div
        style={{
          width: size,
          height: size,
          transform: `scale(${scale})`,
          maskImage: `radial-gradient(circle at 50% 50%, black ${maskRadius}%, transparent ${maskRadius + 5}%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, black ${maskRadius}%, transparent ${maskRadius + 5}%)`,
        }}
      >
        <svg
          viewBox="0 0 744 744"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(0,744) scale(0.1,-0.1)" fill={COLORS.foreground} stroke="none">
            <path d="M3110 6639 c-127 -8 -278 -40 -462 -98 -301 -96 -481 -182 -728 -350 -276 -187 -436 -323 -667 -566 -228 -240 -317 -358 -441 -580 -143 -258 -204 -442 -268 -810 -28 -155 -25 -497 4 -675 32 -189 108 -555 121 -578 6 -11 47 24 162 139 135 135 159 164 192 231 56 116 64 183 44 369 -24 220 -20 399 14 554 45 208 156 464 279 643 283 412 803 855 1224 1040 290 127 516 170 850 159 261 -9 434 -52 681 -171 229 -110 441 -256 666 -458 117 -105 178 -141 266 -157 68 -13 161 1 223 35 55 30 220 178 220 198 0 21 -172 179 -350 321 -21 17 -86 72 -144 122 -111 97 -314 238 -475 329 -51 30 -95 54 -96 54 -2 0 -50 22 -107 49 -210 100 -489 175 -750 201 -116 11 -276 11 -458 -1z" />
            <path d="M6855 6443 c-22 -5 -292 -65 -425 -93 -47 -11 -146 -33 -220 -50 -419 -96 -395 -87 -366 -146 9 -20 71 -89 137 -152 65 -63 119 -120 119 -125 0 -18 -1110 -1128 -1175 -1176 -22 -16 -69 -44 -104 -62 -60 -32 -71 -34 -160 -34 -88 0 -101 3 -161 32 -36 18 -105 58 -155 89 -172 108 -311 168 -480 206 -108 24 -357 35 -460 20 -144 -22 -201 -33 -220 -42 -11 -5 -47 -16 -79 -25 -73 -20 -272 -122 -341 -174 -95 -72 -200 -175 -1273 -1243 -822 -818 -1068 -1069 -1083 -1103 -39 -87 -24 -203 37 -282 76 -100 248 -128 352 -58 20 14 348 336 729 715 527 525 693 685 693 668 0 -42 50 -232 85 -323 137 -357 454 -663 810 -784 165 -55 283 -75 455 -75 310 0 528 64 775 228 132 89 214 166 326 308 141 179 234 385 264 588 27 173 17 256 -37 337 -49 73 -113 106 -203 104 -56 -2 -143 -38 -189 -80 -33 -30 -86 -135 -86 -171 -1 -109 -85 -330 -164 -430 -38 -48 -154 -170 -162 -170 -1 0 -33 -21 -71 -46 -128 -86 -245 -124 -408 -131 -196 -9 -318 23 -475 126 -248 161 -389 420 -390 712 0 123 10 174 59 298 50 126 96 196 186 284 200 195 436 274 707 238 109 -15 195 -49 319 -128 167 -107 321 -178 438 -203 89 -20 123 -22 240 -17 161 6 253 31 396 106 203 108 252 152 884 791 l514 519 116 -107 c64 -59 135 -122 159 -141 39 -30 44 -32 64 -19 17 11 26 35 39 104 10 49 41 199 69 334 75 361 117 578 122 637 6 60 -8 88 -62 128 -33 24 -88 31 -145 18z" />
            <path d="M6049 4719 c-219 -220 -257 -291 -246 -457 3 -48 13 -112 22 -142 33 -118 76 -341 91 -475 50 -438 -87 -908 -376 -1293 -119 -159 -373 -406 -615 -598 -55 -43 -102 -81 -105 -84 -3 -3 -14 -10 -25 -17 -11 -6 -72 -44 -135 -84 -184 -116 -339 -186 -570 -258 -115 -35 -362 -71 -495 -71 -110 0 -320 25 -395 46 -30 9 -68 18 -84 21 -42 7 -238 84 -324 127 -105 53 -194 112 -307 204 -98 79 -427 398 -597 579 -92 98 -149 135 -239 154 -68 15 -153 -9 -226 -62 -64 -48 -183 -158 -183 -170 0 -10 190 -223 259 -289 25 -25 94 -97 153 -160 201 -217 502 -484 667 -595 106 -70 344 -187 486 -239 301 -110 638 -158 951 -137 409 28 795 156 1170 387 219 135 386 263 629 484 466 424 730 850 846 1367 61 274 72 460 44 748 -23 239 -47 354 -190 895 -24 90 -36 157 -36 202 0 38 -5 68 -10 68 -6 0 -78 -68 -160 -151z" />
            <path d="M3460 4033 c-25 -9 -62 -27 -82 -40 -21 -12 -41 -23 -44 -23 -14 0 -101 -87 -132 -133 -65 -94 -84 -203 -58 -325 27 -130 95 -230 200 -297 84 -53 144 -68 256 -63 88 3 104 7 172 40 85 42 167 119 203 189 29 56 55 154 55 206 0 58 -36 189 -66 242 -41 70 -120 140 -204 180 -67 32 -85 36 -165 38 -63 2 -104 -3 -135 -14z" />
          </g>
        </svg>
      </div>
    </div>
  );
};
