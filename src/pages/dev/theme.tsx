import React, { useSyncExternalStore } from 'react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import { useTheme } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/Core';
import { Check } from 'lucide-react';

/**
 * Development-only preview harness for the position-aware theme ripple.
 * Excluded from production builds entirely (returns 404).
 *
 * Exercises the real ThemeProvider and the real palette tokens, so the reveal
 * seen here is the reveal shipped in Global Settings. Press a swatch near a
 * corner to confirm the circle originates under the pointer and still covers
 * the far edge of the viewport.
 */
export const getStaticProps: GetStaticProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

const THEMES: { id: 'dark' | 'light' | 'nord' | 'latte'; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'nord', label: 'Nord' },
  { id: 'latte', label: 'Latte' },
];

export default function ThemeRippleHarness() {
  const { theme, setTheme } = useTheme();

  // The server has no `document`, so reading it during render would bake the
  // server's answer into the hydrated markup and the label would report the
  // wrong path forever. useSyncExternalStore takes a distinct server snapshot,
  // so React reconciles the real capability in without a mismatch.
  const supportsViewTransitions = useSyncExternalStore(
    () => () => {},
    () => typeof (document as any).startViewTransition === 'function',
    () => false
  );

  return (
    <>
      <Head><title>Dev — Theme Ripple</title></Head>
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Theme Ripple Harness</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Active: <span className="font-mono text-foreground">{theme}</span> · Path:{' '}
              <span className="font-mono text-foreground">
                {supportsViewTransitions ? 'View Transitions' : 'overlay fallback'}
              </span>
            </p>
          </div>

          {/* Corner triggers: the clearest test that the origin is honoured and
              that the radius still reaches the opposite corner. */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Switch from anywhere</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={(e) => setTheme(t.id, e)}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                      theme === t.id ? 'border-primary bg-secondary/60' : 'border-border hover:bg-secondary/30'
                    }`}
                  >
                    <span
                      data-theme={t.id}
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border"
                    >
                      <span className="w-1/2 bg-background" />
                      <span className="flex w-1/2 flex-col">
                        <span className="h-1/2 bg-card" />
                        <span className="h-1/2 bg-primary" />
                      </span>
                    </span>
                    <span className="text-sm font-medium">{t.label}</span>
                    {theme === t.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={(e) => setTheme('light', e)}>Light here</Button>
                <Button variant="outline" size="sm" onClick={(e) => setTheme('dark', e)}>Dark here</Button>
                <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'latte' : 'dark')}>
                  No origin (centre)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Surface sampler — confirms every token repaints inside one wipe. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Surfaces</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="h-8 rounded bg-background border border-border" />
                <div className="h-8 rounded bg-card border border-border" />
                <div className="h-8 rounded bg-secondary" />
                <div className="h-8 rounded bg-muted" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Accents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="h-8 rounded bg-primary" />
                <div className="h-8 rounded bg-accent" />
                <div className="h-8 rounded bg-destructive" />
                <div className="h-8 rounded border-2 border-ring" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Type & badges</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-foreground">Primary text</p>
                <p className="text-sm text-muted-foreground">Muted text</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Error</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
