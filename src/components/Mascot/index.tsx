import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/Core';
import styles from './Mascot.module.css';

/**
 * Senzor brand mascot — the "sentinel bot".
 *
 * A theme-aware, hand-authored SVG character animated with pure CSS.
 * Every mood has a designed static pose; motion is layered on top and
 * automatically disabled for `prefers-reduced-motion` users (and when
 * `animated` is false), so the mascot always degrades to a clean pose.
 *
 * Moods and their intended use:
 * - idle       calm default (blink + breathing)
 * - thinking   reasoning: scratches its head, status LED beacons
 * - working    executing: types on a laptop, code lines flicker
 * - searching  scanning a log sheet line by line (404, lookups)
 * - lifting    heavy processing: strains under a crate (big jobs)
 * - happy      success/celebration
 * - greeting   welcome surfaces
 * - error      something broke (worried)
 * - annoyed    degraded/slow dependency (impatient)
 * - stressed   overload/saturation (jittery, fast LED)
 * - sleeping   standby/maintenance
 *
 * With `interactive`, the mascot perks up on hover and does a one-shot
 * squash-and-stretch "boop" with a brief happy flash on click/tap.
 *
 * Fully deterministic markup (no ids, no randomness) — safe for SSR.
 */
export type MascotMood =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'searching'
  | 'lifting'
  | 'happy'
  | 'greeting'
  | 'error'
  | 'annoyed'
  | 'stressed'
  | 'sleeping';

export type MascotSize = 'sm' | 'md' | 'lg' | 'xl' | number;

const SIZE_PX: Record<Exclude<MascotSize, number>, number> = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 128,
};

/** Boop animation runs 500ms; hold the class slightly longer for the flash. */
const BOOP_DURATION_MS = 650;

export interface MascotProps {
  /** Expression and motion preset. Defaults to a calm, blinking idle. */
  mood?: MascotMood;
  /** Named preset (sm 32 / md 48 / lg 80 / xl 128) or explicit pixels. */
  size?: MascotSize;
  /**
   * When false the mascot freezes on the mood's designed resting pose.
   * Reduced-motion users get the same pose regardless of this flag.
   */
  animated?: boolean;
  /**
   * Opt-in hover/click micro-interactions (purely cosmetic). Keep off for
   * small avatars and dense UI; enable on hero placements.
   */
  interactive?: boolean;
  className?: string;
  /**
   * Decorative by default (aria-hidden). Provide a label when the mascot
   * is the only visual conveying state, e.g. a loading screen.
   */
  'aria-label'?: string;
}

export function Mascot({
  mood = 'idle',
  size = 'md',
  animated = true,
  interactive = false,
  className,
  'aria-label': ariaLabel,
}: MascotProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];

  const [booped, setBooped] = useState(false);
  const boopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (boopTimer.current) clearTimeout(boopTimer.current);
    },
    [],
  );

  const handleBoop = () => {
    if (booped) return;
    setBooped(true);
    boopTimer.current = setTimeout(() => setBooped(false), BOOP_DURATION_MS);
  };

  return (
    <svg
      viewBox="0 0 120 120"
      width={px}
      height={px}
      data-mood={mood}
      className={cn(
        styles.mascot,
        animated && styles.animated,
        interactive && styles.interactive,
        booped && styles.boop,
        className,
      )}
      onPointerDown={interactive ? handleBoop : undefined}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground shadow */}
      <ellipse className={styles.shadow} cx="60" cy="103" rx="24" ry="4" />

      <g className={styles.bot}>
        {/* Arms */}
        <rect
          className={cn(styles.arm, styles.armL)}
          x="17"
          y="58"
          width="13"
          height="19"
          rx="6.5"
        />
        <rect
          className={cn(styles.arm, styles.armR)}
          x="90"
          y="58"
          width="13"
          height="19"
          rx="6.5"
        />

        {/* Feet (drawn behind the body so they emerge from its lower edge) */}
        <rect
          className={cn(styles.foot, styles.footL)}
          x="42"
          y="84"
          width="12"
          height="12"
          rx="5"
        />
        <rect
          className={cn(styles.foot, styles.footR)}
          x="66"
          y="84"
          width="12"
          height="12"
          rx="5"
        />

        {/* Antenna */}
        <line
          className={styles.antennaStem}
          x1="60"
          y1="34"
          x2="60"
          y2="22"
        />
        <circle className={styles.antennaHalo2} cx="60" cy="17" r="4.5" />
        <circle className={styles.antennaHalo} cx="60" cy="17" r="4.5" />
        <circle className={styles.antennaTip} cx="60" cy="17" r="4.5" />

        {/* Body and visor */}
        <rect
          className={styles.body}
          x="28"
          y="32"
          width="64"
          height="58"
          rx="20"
        />
        <rect
          className={styles.visor}
          x="37"
          y="44"
          width="46"
          height="32"
          rx="13"
        />

        {/* Face */}
        <g className={styles.face}>
          <g className={styles.eyeL}>
            <circle className={styles.eyeDot} cx="49" cy="57.5" r="5" />
            <path className={styles.eyeHappy} d="M 43.5 60 Q 49 53 54.5 60" />
            <path className={styles.eyeClosed} d="M 44 58 Q 49 62 54 58" />
          </g>
          <g className={styles.eyeR}>
            <circle className={styles.eyeDot} cx="71" cy="57.5" r="5" />
            <path className={styles.eyeHappy} d="M 65.5 60 Q 71 53 76.5 60" />
            <path className={styles.eyeClosed} d="M 66 58 Q 71 62 76 58" />
          </g>

          <path
            className={cn(styles.brow, styles.browL)}
            d="M 43 50 L 54 47.5"
          />
          <path
            className={cn(styles.brow, styles.browR)}
            d="M 66 47.5 L 77 50"
          />

          {/* Mouth variants, cross-faded per mood */}
          <path
            className={cn(styles.mouth, styles.mouthIdle)}
            d="M 55 68 Q 60 71 65 68"
          />
          <path
            className={cn(styles.mouth, styles.mouthSmile)}
            d="M 52 66 Q 60 74 68 66"
          />
          <path
            className={cn(styles.mouth, styles.mouthConcern)}
            d="M 55 70.5 Q 60 66.5 65 70.5"
          />
          <path
            className={cn(styles.mouth, styles.mouthFlat)}
            d="M 56 69 L 64 69"
          />
          <circle
            className={cn(styles.mouth, styles.mouthO)}
            cx="60"
            cy="69"
            r="3"
          />
        </g>

        {/* Log sheet (searching): clipboard with a line-by-line scan */}
        <g className={styles.docu}>
          <rect
            className={styles.sheet}
            x="36"
            y="73"
            width="28"
            height="19"
            rx="3"
          />
          <line className={styles.docLine} x1="41" y1="78.5" x2="59" y2="78.5" />
          <line className={styles.docLine} x1="41" y1="83" x2="55" y2="83" />
          <line className={styles.docLine} x1="41" y1="87.5" x2="57" y2="87.5" />
          <line className={styles.scanline} x1="41" y1="78.5" x2="59" y2="78.5" />
        </g>

        {/* Laptop (working): screen with flickering code lines */}
        <g className={styles.laptop}>
          <rect
            className={styles.screen}
            x="46"
            y="66"
            width="28"
            height="18"
            rx="2.5"
          />
          <line
            className={cn(styles.codeLine, styles.codeLine1)}
            x1="50"
            y1="71"
            x2="66"
            y2="71"
          />
          <line
            className={cn(styles.codeLine, styles.codeLine2)}
            x1="50"
            y1="75.5"
            x2="60"
            y2="75.5"
          />
          <line
            className={cn(styles.codeLine, styles.codeLine3)}
            x1="50"
            y1="80"
            x2="63"
            y2="80"
          />
          <rect
            className={styles.lapBase}
            x="42"
            y="86"
            width="36"
            height="4"
            rx="2"
          />
        </g>

        {/* Crate (lifting): heavy payload */}
        <g className={styles.crate}>
          <rect
            className={styles.crateBox}
            x="42"
            y="71"
            width="36"
            height="22"
            rx="3"
          />
          <line className={styles.crateTape} x1="60" y1="71" x2="60" y2="93" />
          <line className={styles.crateTape} x1="42" y1="82" x2="78" y2="82" />
        </g>

        {/* Front arms: drawn above the body and props so hands visibly grip
            what the bot interacts with. Hidden by default; interacting moods
            (thinking, working, searching, lifting) swap the back arms out. */}
        <rect
          className={cn(styles.arm, styles.armFrontL)}
          x="17"
          y="58"
          width="13"
          height="19"
          rx="6.5"
        />
        <rect
          className={cn(styles.arm, styles.armFrontR)}
          x="90"
          y="58"
          width="13"
          height="19"
          rx="6.5"
        />
      </g>

      {/* Sleeping z's */}
      <path className={cn(styles.z, styles.z1)} d="M 84 32 h 6.5 l -6.5 6.5 h 6.5" />
      <path className={cn(styles.z, styles.z2)} d="M 93 21 h 5.5 l -5.5 5.5 h 5.5" />
      <path className={cn(styles.z, styles.z3)} d="M 101 11 h 4.5 l -4.5 4.5 h 4.5" />
    </svg>
  );
}
