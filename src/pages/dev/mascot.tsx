import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import { Mascot, type MascotMood, type MascotSize } from '@/components/Mascot';

/**
 * Development-only preview harness for the Senzor mascot.
 * Excluded from production builds entirely (returns 404).
 */
export const getStaticProps: GetStaticProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

const MOODS: MascotMood[] = [
  'idle',
  'thinking',
  'working',
  'searching',
  'lifting',
  'happy',
  'greeting',
  'error',
  'annoyed',
  'stressed',
  'sleeping',
];

const SIZES: Exclude<MascotSize, number>[] = ['sm', 'md', 'lg', 'xl'];

const THEMES = ['dark', 'light', 'nord', 'latte'] as const;

export default function MascotPreview() {
  const [animated, setAnimated] = useState(true);
  const [cycling, setCycling] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    if (!cycling) return;
    const id = setInterval(
      () => setCycleIndex((i) => (i + 1) % MOODS.length),
      2000,
    );
    return () => clearInterval(id);
  }, [cycling]);

  const cycleMood = MOODS[cycleIndex];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-10">
      <Head>
        <title>Mascot Preview (dev)</title>
        <meta name="robots" content="noindex" />
      </Head>

      <header className="flex flex-wrap items-center gap-6">
        <h1 className="text-2xl font-bold">Mascot Preview</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={animated}
            onChange={(e) => setAnimated(e.target.checked)}
          />
          Animated (uncheck to preview reduced-motion poses)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cycling}
            onChange={(e) => setCycling(e.target.checked)}
          />
          Auto-cycle moods
        </label>
        <button
          className="text-sm px-3 py-1 rounded-md border border-border hover:bg-muted"
          onClick={() => setCycleIndex((i) => (i + 1) % MOODS.length)}
        >
          Next mood
        </button>
      </header>

      {/* Mood-transition tester */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Transition tester —{' '}
          <span className="font-mono text-primary">{cycleMood}</span>{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (interactive: hover and click them)
          </span>
        </h2>
        <div className="flex items-end gap-8 p-6 rounded-xl border border-border bg-card w-fit">
          {[...SIZES].reverse().map((size) => (
            <Mascot
              key={size}
              mood={cycleMood}
              size={size}
              animated={animated}
              interactive
            />
          ))}
          <Mascot mood={cycleMood} size={20} animated={animated} interactive />
        </div>
      </section>

      {/* All moods x all themes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Moods × themes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {THEMES.map((theme) => (
            <div
              key={theme}
              data-theme={theme}
              className="bg-background text-foreground rounded-xl border border-border p-5 space-y-4"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {theme}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {MOODS.map((mood) => (
                  <div
                    key={mood}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border/50"
                  >
                    <Mascot mood={mood} size="lg" animated={animated} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {mood}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-instance stress row */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Stress row (20 instances)</h2>
        <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-border bg-card">
          {Array.from({ length: 20 }, (_, i) => (
            <Mascot
              key={i}
              mood={MOODS[i % MOODS.length]}
              size={28}
              animated={animated}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
