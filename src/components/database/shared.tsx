import React from 'react';
import { Card, CardContent, Button, cn } from '../Core';
import { SmartAnimatedValue } from '../Tween';
import { useTheme } from '../../lib/theme';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Shared building blocks for the Database views.
// ----------------------------------------------------------------------------
// Mirrors components/logs/shared.ts: one module per feature area holding the
// pieces its screens have in common, rather than each screen growing its own
// slightly-divergent copy.
//
// Both pieces here exist to keep the new tabs consistent with the Overview tab
// they sit beside — same animated figures, same monochromatic behaviour, same
// empty-state voice.
// ============================================================================

/**
 * Stat card matching the one on the Database Overview tab.
 *
 * Two details are load-bearing and were missing when each tab rolled its own:
 * values animate through SmartAnimatedValue (so a figure that changes on
 * refresh reads as a change rather than a jump), and the icon follows
 * monochromatic mode the way every other stat card in the product does.
 */
export const DbStatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  title: string;
  value: React.ReactNode;
  subtext?: string;
  icon: LucideIcon;
  color: string;
}) => {
  const { isMono } = useTheme();
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={cn('h-4 w-4', isMono ? 'text-[hsl(var(--chart-mono))]' : color)} />
        </div>
        <div className="text-2xl font-bold text-foreground">
          <SmartAnimatedValue value={value as any} />
        </div>
        {subtext && (
          <div className="mt-1 truncate text-xs font-medium text-muted-foreground">
            <SmartAnimatedValue value={subtext} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Full-panel state for "nothing here, and here is why".
 *
 * `warning` is for a capability the credentials cannot reach — something the
 * operator can act on — and picks up the same amber treatment the capability
 * notice uses on the Overview tab.
 */
export const DbPlaceholder = ({
  icon: Icon,
  title,
  tone = 'muted',
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone?: 'muted' | 'warning';
  action?: { label: string; onClick: () => void };
  children?: React.ReactNode;
}) => (
  <Card className={tone === 'warning' ? 'border-yellow-500/25 bg-yellow-500/[0.03]' : undefined}>
    <CardContent className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className={cn(
          'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
          tone === 'warning' ? 'bg-yellow-500/10' : 'bg-muted/50'
        )}
      >
        <Icon
          className={cn('h-6 w-6', tone === 'warning' ? 'text-yellow-500' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>
      {action && (
        <Button variant="default" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);

/** A monochrome-aware chart colour, matching the helper used across the app. */
export const useChartColor = () => {
  const { isMono } = useTheme();
  return (defaultColor: string) => (isMono ? 'hsl(var(--chart-mono))' : defaultColor);
};
