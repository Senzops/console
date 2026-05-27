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
 * A drop-in replacement for `useState<TimeRangeValue>` that persists the
 * selected range to localStorage and restores it on mount.
 *
 * The stored value is automatically clamped to the dashboard's retention
 * limit, so navigating from a 30-day dashboard to a 1-day dashboard
 * gracefully falls back to the largest allowed preset.
 */
export function usePersistedTimeRange(maxRetentionDays: number) {
  const [value, setValueRaw] = useState<TimeRangeValue>(() => {
    const stored = readStored();
    if (!stored) return DEFAULT_RANGE;
    return clampToRetention(stored, maxRetentionDays);
  });

  const setValue = useCallback((next: TimeRangeValue) => {
    persist(next);
    setValueRaw(next);
  }, []);

  return [value, setValue] as const;
}
