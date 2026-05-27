import { useState, useCallback } from 'react';

const STORAGE_KEY = 'senzor:recent-time-ranges';
const MAX_RECENT = 3;

export interface RecentRange {
  start: string;
  end: string;
  label: string;
  usedAt: number;
}

function loadRecent(): RecentRange[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each entry has required fields
    return parsed
      .filter((r: any) => r && typeof r.start === 'string' && typeof r.end === 'string' && typeof r.label === 'string')
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function persistRecent(ranges: RecentRange[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ranges.slice(0, MAX_RECENT)));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useRecentRanges() {
  const [recentRanges, setRecentRanges] = useState<RecentRange[]>(loadRecent);

  const addRecent = useCallback((start: string, end: string, label: string) => {
    // Read fresh from localStorage to avoid stale closure / race conditions
    const prev = loadRecent();
    const filtered = prev.filter(r => r.start !== start || r.end !== end);
    const next = [{ start, end, label, usedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    // Persist first (synchronous), then update React state
    persistRecent(next);
    setRecentRanges(next);
  }, []);

  return { recentRanges, addRecent };
}
