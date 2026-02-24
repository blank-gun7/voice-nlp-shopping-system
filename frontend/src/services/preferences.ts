/**
 * preferences.ts
 *
 * localStorage-backed user preference engine.
 * Tracks which items the user orders most frequently.
 */

import type { ListItem } from "../types";

const PREFS_KEY = "vsa_prefs";

interface PrefEntry {
  count: number;
  category: string;
  lastOrdered: number;
}

type PrefsMap = Record<string, PrefEntry>;

export function getPrefs(): PrefsMap {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as PrefsMap) : {};
  } catch {
    return {};
  }
}

/** Increment purchase count for every item in the list. */
export function recordPurchase(items: ListItem[]): void {
  const prefs = getPrefs();
  const now = Date.now();
  for (const item of items) {
    const key = item.item_name.toLowerCase();
    const existing = prefs[key];
    prefs[key] = {
      count: (existing?.count ?? 0) + 1,
      category: item.category,
      lastOrdered: now,
    };
  }
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** Return item names sorted by purchase frequency (most frequent first). */
export function getFrequentItems(limit = 8): string[] {
  const prefs = getPrefs();
  return Object.entries(prefs)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name]) => name);
}
