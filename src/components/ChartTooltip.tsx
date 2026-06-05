/**
 * ChartTooltip — Unified Recharts tooltip for all dashboards.
 *
 * Rendered by Recharts inside the chart's tooltip wrapper, which positions it
 * via CSS transform based on the active data point. The tooltip stays bounded
 * within the chart area — standard behavior for enterprise dashboards.
 *
 * When a chart has many series (e.g. stacked status codes), the tooltip shows
 * the top entries sorted by value descending, with a "+ N more" indicator.
 * This keeps the tooltip compact and always readable without scrollbars.
 *
 * Usage:
 *   <Tooltip content={<ChartTooltip labelFormatter={axisFormatter} unit="ms" />} />
 */

interface ChartTooltipProps {
  /** Recharts injected — do not pass manually */
  active?: boolean;
  /** Recharts injected — do not pass manually */
  payload?: Array<{
    name: string;
    value: number | string | null;
    color?: string;
    stroke?: string;
    fill?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  /** Recharts injected — do not pass manually */
  label?: string;

  /** Formats the header label (typically the axis date). If omitted, label renders as-is. */
  labelFormatter?: (label: string) => string;
  /**
   * Formats a series value. Receives the numeric value, series name, and full entry.
   * Return a string. If omitted, falls back to `unit` suffix with smart precision.
   */
  valueFormatter?: (value: number, name: string, entry: any) => string;
  /** Simple unit suffix appended to every value (e.g. "ms", "%", " rps"). Ignored if valueFormatter is provided. */
  unit?: string;
  /** Transforms series names for display (e.g. strip "code_" prefix). */
  nameFormatter?: (name: string) => string;
  /** Max visible series before truncation. Defaults to 8. */
  maxItems?: number;
}

function resolveColor(entry: {
  color?: string;
  stroke?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}): string | null {
  const color =
    entry.color ||
    entry.stroke ||
    entry.fill ||
    (entry.payload?.fill as string) ||
    (entry.payload?.color as string) ||
    null;
  if (!color || color === 'none' || color === 'transparent') return null;
  return color;
}

function defaultFormatValue(value: number | string | null, unit: string): string {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'string') return value;
  if (Number.isInteger(value)) return `${value.toLocaleString()}${unit}`;
  return `${value.toFixed(2)}${unit}`;
}

const DEFAULT_MAX_ITEMS = 8;

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  unit = '',
  nameFormatter,
  maxItems = DEFAULT_MAX_ITEMS,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formattedLabel = label != null
    ? (labelFormatter ? labelFormatter(String(label)) : String(label))
    : null;

  // Sort by value descending so the most significant series appear first.
  // When truncated, the user always sees the highest-impact data.
  const sorted = payload.length > maxItems
    ? [...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    : payload;
  const visible = sorted.slice(0, maxItems);
  const hiddenCount = payload.length - visible.length;

  return (
    <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs min-w-[140px]">
      {formattedLabel && (
        <p className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
          {formattedLabel}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {visible.map((entry, idx) => {
          const color = resolveColor(entry);
          const name = nameFormatter ? nameFormatter(entry.name) : entry.name;
          const formattedValue = valueFormatter
            ? valueFormatter(Number(entry.value ?? 0), entry.name, entry)
            : defaultFormatValue(entry.value, unit);

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {color && (
                  <div
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="capitalize text-muted-foreground truncate">
                  {name}
                </span>
              </div>
              <span className="font-mono font-medium text-foreground whitespace-nowrap">
                {formattedValue}
              </span>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <p className="text-muted-foreground/60 pt-0.5">
            + {hiddenCount} more
          </p>
        )}
      </div>
    </div>
  );
}

export default ChartTooltip;
