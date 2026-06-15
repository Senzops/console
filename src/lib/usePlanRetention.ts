import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { api } from './auth';

// Conservative default while the real value loads / for unauthenticated states.
const STARTER_FALLBACK = 3;
const LS_KEY = 'senzor:plan-retention';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

function readCached(): number {
  if (typeof window === 'undefined') return STARTER_FALLBACK;
  const v = Number(localStorage.getItem(LS_KEY));
  return Number.isFinite(v) && v > 0 ? v : STARTER_FALLBACK;
}

/**
 * Returns the tenant's plan-based data-retention window in days.
 *
 * Retention is uniform across all telemetry types, so this single value drives
 * every dashboard's time-range picker (max selectable window). Sourced from
 * /dashboard/capabilities and cached in localStorage so returning users get the
 * correct value synchronously on mount — avoiding a first-render clamp to the
 * starter default for higher-plan users.
 */
export function usePlanRetention(): number {
  const { data } = useSWR('/dashboard/capabilities', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });

  const resolved = useMemo<number | null>(() => {
    const services = data?.services as Record<string, number> | undefined;
    if (services) {
      const vals = Object.values(services).filter((v) => typeof v === 'number' && v > 0);
      if (vals.length) return Math.max(...vals);
    }
    return null;
  }, [data]);

  // Persist for synchronous availability on the next mount/navigation.
  useEffect(() => {
    if (resolved != null && typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, String(resolved));
    }
  }, [resolved]);

  return resolved ?? readCached();
}
