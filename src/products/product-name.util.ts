export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

const MAX_SEARCH_TERMS = 50;
const MAX_TERM_LENGTH = 100;

/** Trim, drop empties, dedupe case-insensitively, cap count/length; null if none left */
export function normalizeSearchTerms(
  terms: string[] | null | undefined,
): string[] | null {
  if (!terms?.length) {
    return null;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms.slice(0, MAX_SEARCH_TERMS)) {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (!t || t.length > MAX_TERM_LENGTH) {
      continue;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(t);
  }
  return out.length ? out : null;
}
