import { useState, useCallback } from 'react';
import type { TimeRangeValue } from './index';

const STORAGE_KEY = 'senzor:active-time-range';

/** Ordered presets — largest first for fallback scanning */
const PRESETS_DESC = [
  { value: '7d', hours: 168 },
  { value: '3d', hours: 72 },
  { value: '24h', hours: 24 },
  { value: '12h', hours: 12 },
  { value: '6h', hours: 6 },
  { value: '3h', hours: 3 },
  { value: '1h', hours: 1 },
  { value: '30m', hours: 0.5 },
] as const;

const DEFAULT_RANGE: TimeRangeValue = { type: 'relative', range: '30m' };

function readStored(): TimeRangeValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'relative' && typeof parsed.range === 'string') return parsed;
    if (parsed?.type === 'custom' && typeof parsed.start === 'string' && typeof parsed.end === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist(value: TimeRangeValue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Clamps a stored TimeRangeValue to the dashboard's retention limit.
 *
 * - Relative: if the preset's hours exceed retention, falls back to the largest
 *   preset that fits. If none fit, defaults to 30m.
 * - Custom: if the start date is older than the retention window, falls back to
 *   the largest allowed relative preset.
 */
function clampToRetention(stored: TimeRangeValue, maxRetentionDays: number): TimeRangeValue {
  const retentionHours = maxRetentionDays * 24;

  if (stored.type === 'relative') {
    const preset = PRESETS_DESC.find(p => p.value === stored.range);
    if (preset && preset.hours <= retentionHours) return stored;
    // Stored preset exceeds retention — find largest that fits
    const fallback = PRESETS_DESC.find(p => p.hours <= retentionHours);
    return fallback ? { type: 'relative', range: fallback.value } : DEFAULT_RANGE;
  }

  // Custom range — check if start is within retention window
  const now = new Date();
  const retentionFloor = new Date(now.getTime() - maxRetentionDays * 24 * 60 * 60 * 1000);
  const startDate = new Date(stored.start);
  const endDate = new Date(stored.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
    const fallback = PRESETS_DESC.find(p => p.hours <= retentionHours);
    return fallback ? { type: 'relative', range: fallback.value } : DEFAULT_RANGE;
  }

  if (startDate >= retentionFloor) return stored;

  // Custom range is too old — fall back to largest allowed preset
  const fallback = PRESETS_DESC.find(p => p.hours <= retentionHours);
  return fallback ? { type: 'relative', range: fallback.value } : DEFAULT_RANGE;
}

/**
 * Raises a stored value UP to a per-dashboard minimum window (in hours).
 *
 * Some surfaces — notably Status Boards — are meaningless below a certain
 * window (a sub-day range leaves the bucketed availability stripe mostly
 * empty). When such a dashboard mounts with a shorter range carried over from
 * another dashboard (the stored range is global), we bump it up to the smallest
 * preset that satisfies the minimum without exceeding retention.
 *
 * This only adjusts the value RETURNED to the dashboard; it is deliberately not
 * persisted here, so raising the floor on one dashboard never overwrites the
 * shared preference for dashboards that legitimately allow shorter ranges.
 */
function clampToMin(
  value: TimeRangeValue,
  minRangeHours: number,
  maxRetentionDays: number
): TimeRangeValue {
  const retentionHours = maxRetentionDays * 24;
  // The floor can never exceed what retention allows.
  const effMinHours = Math.min(minRangeHours, retentionHours);
  // Smallest preset that satisfies the floor and fits within retention.
  const floorPreset =
    [...PRESETS_DESC].reverse().find((p) => p.hours >= effMinHours && p.hours <= retentionHours) ||
    PRESETS_DESC.find((p) => p.hours <= retentionHours);

  if (value.type === 'relative') {
    const preset = PRESETS_DESC.find((p) => p.value === value.range);
    if (preset && preset.hours >= effMinHours) return value;
    return floorPreset ? { type: 'relative', range: floorPreset.value } : value;
  }

  // Custom range — bump up only if its span is below the floor.
  const span = new Date(value.end).getTime() - new Date(value.start).getTime();
  if (Number.isFinite(span) && span >= effMinHours * 60 * 60 * 1000) return value;
  return floorPreset ? { type: 'relative', range: floorPreset.value } : value;
}

/**
 * A drop-in replacement for `useState<TimeRangeValue>` that persists the
 * selected range to localStorage and restores it on mount.
 *
 * The stored value is automatically clamped to the dashboard's retention
 * limit, so navigating from a 30-day dashboard to a 1-day dashboard
 * gracefully falls back to the largest allowed preset.
 *
 * `minRangeHours` (optional) raises the value up to a per-dashboard lower bound
 * — see {@link clampToMin}.
 */
export function usePersistedTimeRange(maxRetentionDays: number, minRangeHours?: number) {
  const [value, setValueRaw] = useState<TimeRangeValue>(() => {
    const stored = readStored();
    const base = stored ? clampToRetention(stored, maxRetentionDays) : DEFAULT_RANGE;
    return minRangeHours != null ? clampToMin(base, minRangeHours, maxRetentionDays) : base;
  });

  const setValue = useCallback((next: TimeRangeValue) => {
    persist(next);
    setValueRaw(next);
  }, []);

  return [value, setValue] as const;
}
