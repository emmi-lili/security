import { User } from '../types';

// =============================================================
// localStorage cache
// Plain key/value layer used by AppContext to:
//   - hydrate state instantaneously on mount before Supabase responds
//   - keep last-known state when offline
//   - persist the current session user
// All business logic that used to live here now lives in utils/api/ and
// contexts/AppContext.tsx.
// =============================================================

export const CACHE_KEYS = {
  USERS: 'security_app_users',
  LOCATIONS: 'security_app_locations',
  VISITORS: 'security_app_visitors',
  CHECKPOINTS: 'security_app_checkpoints',
  PATROL_ROUNDS: 'security_app_patrol_rounds',
  RESIDENTS: 'security_app_residents',
  CURRENT_USER: 'security_app_current_user',
  PENDING_WRITES: 'security_app_pending_writes',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function readCache<T>(key: CacheKey, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: CacheKey, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode: silently ignore — the source of truth
    // remains Supabase.
  }
}

export function clearCache(key: CacheKey): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

// -------------------------------------------------------------
// Session helpers (kept here because they don't depend on the DB schema
// and multiple components peek at the current user via localStorage).
// -------------------------------------------------------------

export function getCurrentUser(): User | null {
  return readCache<User | null>(CACHE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    writeCache(CACHE_KEYS.CURRENT_USER, user);
  } else {
    clearCache(CACHE_KEYS.CURRENT_USER);
  }
}
