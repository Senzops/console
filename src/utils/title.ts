// lib/title.ts
export function isLikelyId(segment: string): boolean {
  if (!segment) return true;

  // UUID v4 (with/without dashes)
  const uuidRe = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  if (uuidRe.test(segment)) return true;

  // Long hex-like id (mongo ObjectId, etc.) — 8+ hex chars
  const longHex = /^[0-9a-f]{8,}$/i;
  if (longHex.test(segment) && segment.length >= 8) return true;

  // Pure numbers
  if (/^\d+$/.test(segment)) return true;

  // contains digits (and is shortish) — treat most digit-containing tokens as ids
  if (/\d/.test(segment)) return true;

  // very long segments (probably encoded or IDs)
  if (segment.length > 30) return true;

  return false;
}

function toTitleCase(s: string) {
  return s
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Build title from path
 * e.g. "/dashboard/web/693701e98...7a1e943c81" -> "Senzor | Dashboard | Web"
 * appName defaults to "Senzor"
 */
export function buildTitleFromPath(path: string, appName = 'Senzor'): string {
  if (!path) return appName;

  // strip query + hash
  const clean = path.split('?')[0].split('#')[0];

  const rawSegments = clean
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);

  const keep = rawSegments.filter(seg => !isLikelyId(seg));

  // if nothing left, fall back to first non-empty raw segment (or appName)
  const meaningful = keep.length ? keep : rawSegments.length ? [rawSegments[0]] : [];

  const parts = [appName, ...meaningful.map(toTitleCase)];

  return parts.join(' | ');
}
