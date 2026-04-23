import { supabase } from '../../lib/supabase';

export function requireClient() {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
}

export function isNotConfiguredError(err: unknown): boolean {
  return err instanceof Error && err.message === 'SUPABASE_NOT_CONFIGURED';
}

type Row = Record<string, unknown>;

const SNAKE_RE = /_([a-z0-9])/g;
const CAMEL_RE = /([A-Z])/g;

export function toCamel<T extends Row>(row: Row | null | undefined): T | null {
  if (!row) return null;
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(SNAKE_RE, (_, c) => c.toUpperCase())] = v;
  }
  return out as T;
}

export function toSnake(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    out[k.replace(CAMEL_RE, (m) => `_${m.toLowerCase()}`)] = v;
  }
  return out;
}

export function mapArray<T extends Row>(rows: Row[] | null): T[] {
  if (!rows) return [];
  return rows.map((r) => toCamel<T>(r) as T);
}
