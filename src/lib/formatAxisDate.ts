import type { TimeRangeValue } from '@/components/TimeRangePicker';

const RANGE_MS: Record<string, number> = {
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '3h': 3 * 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
  '30d': 30 * 24 * 60 * 60_000,
};

const TWO_HOURS = 2 * 60 * 60_000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60_000;

export function getTimeSpanMs(timeRange: TimeRangeValue): number {
  if (timeRange.type === 'relative') {
    return RANGE_MS[timeRange.range] ?? 24 * 60 * 60_000;
  }
  const span = new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime();
  return Math.max(span, 60_000);
}

export function getDisplayLabel(timeRange: TimeRangeValue): string {
  if (timeRange.type === 'relative') return timeRange.range;
  const s = new Date(timeRange.start);
  const e = new Date(timeRange.end);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} — ${fmt(e)}`;
}

export function formatAxisDate(timestamp: string, spanMs: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;

  const now = new Date();
  const crossYear = date.getFullYear() !== now.getFullYear();

  if (spanMs <= TWO_HOURS) {
    return date.toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (spanMs <= FORTY_EIGHT_HOURS) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...(crossYear && { year: 'numeric' }),
    });
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(crossYear && { year: 'numeric' }),
  });
}

export function getBucketIntervalSeconds(spanMs: number): number {
  if (spanMs <= TWO_HOURS) return 60;
  if (spanMs <= FORTY_EIGHT_HOURS) return 3600;
  return 86400;
}
