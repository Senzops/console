import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../Core';
import { useTheme } from '../../lib/theme';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Lock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export type AdvisorySeverity = 'critical' | 'warning' | 'info';

export interface Advisory {
  id: string;
  severity: AdvisorySeverity;
  title: string;
  detail: string;
  remediation: string;
}

export interface HealthReport {
  score: number;
  advisories: Advisory[];
}

export interface CapabilityState {
  available: boolean;
  reason?: string;
  remediation?: string;
}

/**
 * Human labels for the capability keys the backend probes. An entry missing
 * from the response means the capability does not apply to that engine, so it
 * is never rendered — only genuinely blocked capabilities appear here.
 */
const CAPABILITY_LABELS: Record<string, string> = {
  serverStats: 'Server statistics',
  storageStats: 'Storage breakdown',
  collectionStats: 'Collection & table census',
  queryStats: 'Query insights',
  slowLog: 'Slow query capture',
  indexStats: 'Index usage',
  replication: 'Replication & topology',
  currentOps: 'Live operations',
};

const SEVERITY_STYLE: Record<AdvisorySeverity, { icon: typeof AlertTriangle; className: string; label: string }> = {
  critical: { icon: AlertOctagon, className: 'text-destructive', label: 'Critical' },
  warning: { icon: AlertTriangle, className: 'text-yellow-500', label: 'Warning' },
  info: { icon: Info, className: 'text-blue-500', label: 'Info' },
};

const scoreTone = (score: number) => {
  if (score >= 90) return { text: 'text-emerald-500', ring: 'stroke-emerald-500', label: 'Healthy' };
  if (score >= 70) return { text: 'text-yellow-500', ring: 'stroke-yellow-500', label: 'Degraded' };
  if (score >= 40) return { text: 'text-orange-500', ring: 'stroke-orange-500', label: 'At risk' };
  return { text: 'text-destructive', ring: 'stroke-destructive', label: 'Critical' };
};

const ScoreRing = ({ score }: { score: number }) => {
  // The ring is a chart mark, and chart marks follow monochromatic mode
  // across the product. The severity icons and badges below it are status
  // indicators rather than chart marks, so they keep their semantic colour.
  const { isMono } = useTheme();
  const tone = scoreTone(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Health score ${score} out of 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="7" className="stroke-border" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className={`${isMono ? "stroke-[hsl(var(--chart-mono))]" : tone.ring} transition-all duration-700`}
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none ${tone.text}`}>{score}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">score</span>
      </div>
    </div>
  );
};

/**
 * One finding, collapsed to its headline until opened. Critical findings start
 * expanded — if something is on fire, the remediation should not need a click.
 */
export const AdvisoryRow = ({ advisory }: { advisory: Advisory }) => {
  const [open, setOpen] = useState(advisory.severity === 'critical');
  const style = SEVERITY_STYLE[advisory.severity];
  const Icon = style.icon;

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.className}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{advisory.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{advisory.detail}</span>
        </span>
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 pl-11">
          <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-foreground-secondary">
            {advisory.remediation}
          </p>
        </div>
      )}
    </div>
  );
};

export const DatabaseHealthPanel = ({ health }: { health?: HealthReport }) => {
  const counts = useMemo(() => {
    const base = { critical: 0, warning: 0, info: 0 };
    for (const a of health?.advisories || []) base[a.severity] += 1;
    return base;
  }, [health]);

  if (!health) return null;

  const tone = scoreTone(health.score);
  const clean = health.advisories.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Health &amp; Advisories
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {counts.critical > 0 && <Badge variant="destructive">{counts.critical} critical</Badge>}
          {counts.warning > 0 && <Badge variant="warning">{counts.warning} warning</Badge>}
          {counts.info > 0 && <Badge variant="secondary">{counts.info} info</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <ScoreRing score={health.score} />
          <div className="min-w-0">
            <p className={`text-base font-semibold ${tone.text}`}>{tone.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {clean
                ? 'No issues detected in the most recent sample.'
                : `Derived from ${health.advisories.length} finding${health.advisories.length === 1 ? '' : 's'} in the most recent sample. Every finding is advisory — Senzor never changes your database.`}
            </p>
          </div>
        </div>

        {clean ? (
          <div className="flex items-center gap-2 border-t border-border/40 px-5 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            All checks passed.
          </div>
        ) : (
          <div className="border-t border-border/40">
            {health.advisories.map((a) => (
              <AdvisoryRow key={a.id} advisory={a} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Surfaces capabilities the monitoring credentials cannot reach.
 *
 * Without this, a least-privilege monitoring user produces panels full of zeros
 * that are indistinguishable from a genuinely idle database. Showing the exact
 * grant that would unlock each one turns a dead end into an action.
 */
export const DatabaseCapabilityNotice = ({
  capabilities,
  checkedAt,
}: {
  capabilities?: Record<string, CapabilityState>;
  checkedAt?: string | null;
}) => {
  const [open, setOpen] = useState(false);

  const blocked = useMemo(
    () =>
      Object.entries(capabilities || {})
        .filter(([, state]) => state && !state.available)
        .map(([key, state]) => ({ key, ...state })),
    [capabilities]
  );

  if (blocked.length === 0) return null;

  return (
    <Card className="border-yellow-500/25 bg-yellow-500/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4 text-yellow-500" />
          {blocked.length} data source{blocked.length === 1 ? '' : 's'} unavailable
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Hide' : 'Show'} details
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">
          These panels stay empty because the monitoring credentials cannot read the underlying
          statistics — not because the database is idle.
          {checkedAt && (
            <span className="ml-1 opacity-70">
              Last checked {new Date(checkedAt).toLocaleString()}.
            </span>
          )}
        </p>

        {open && (
          <div className="mt-4 space-y-3">
            {blocked.map((cap) => (
              <div key={cap.key} className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-sm font-medium text-foreground">
                  {CAPABILITY_LABELS[cap.key] || cap.key}
                </p>
                {cap.reason && (
                  <p className="mt-1 text-xs text-muted-foreground">{cap.reason}</p>
                )}
                {cap.remediation && (
                  <p className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed text-foreground-secondary">
                    {cap.remediation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * A bare list of findings, for surfaces that supply their own heading and
 * framing (the Indexes tab renders its advisories inside its own card rather
 * than repeating the health score).
 */
export const AdvisoryList = ({ advisories }: { advisories: Advisory[] }) => {
  if (advisories.length === 0) {
    return (
      <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        No recommendations for this database.
      </div>
    );
  }
  return (
    <div>
      {advisories.map((a) => (
        <AdvisoryRow key={a.id} advisory={a} />
      ))}
    </div>
  );
};
