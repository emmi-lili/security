import { CACHE_KEYS, readCache, writeCache } from './storage';
import * as api from './api';
import { uploadVisitorPhoto } from './photoUpload';

// =============================================================
// Offline write queue
// When a write to Supabase fails (typically because the device is
// offline), we push it here so it is retried automatically once
// connectivity comes back.
// =============================================================

export type QueueOp =
  | {
      kind: 'insert' | 'update';
      table: api.EntityName;
      payload: Record<string, unknown>;
      id?: string;
    }
  | {
      kind: 'upload_photo';
      visitorId: string;
      dataUrl: string;
    };

export interface QueueEntry {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  op: QueueOp;
}

type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let flushing = false;

function load(): QueueEntry[] {
  return readCache<QueueEntry[]>(CACHE_KEYS.PENDING_WRITES, []);
}

function save(entries: QueueEntry[]): void {
  writeCache(CACHE_KEYS.PENDING_WRITES, entries);
  for (const cb of listeners) cb(entries.length);
}

function nextId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getPendingCount(): number {
  return load().length;
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  cb(getPendingCount());
  return () => {
    listeners.delete(cb);
  };
}

export function enqueue(op: QueueOp): void {
  const entries = load();
  entries.push({
    id: nextId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    op,
  });
  save(entries);
}

async function runOp(op: QueueOp): Promise<void> {
  if (op.kind === 'upload_photo') {
    const url = await uploadVisitorPhoto(op.visitorId, op.dataUrl);
    await api.visitors.update(op.visitorId, { photoUrl: url });
    return;
  }

  const module = api[op.table];
  if (!module) {
    throw new Error(`Unknown table in queue: ${op.table}`);
  }

  if (op.kind === 'insert') {
    await (module as { insert: (x: unknown) => Promise<void> }).insert(op.payload);
  } else {
    if (!op.id) throw new Error('Update op without id');
    await (module as { update: (id: string, x: unknown) => Promise<void> }).update(
      op.id,
      op.payload
    );
  }
}

export async function flush(): Promise<{ processed: number; remaining: number }> {
  if (flushing) return { processed: 0, remaining: getPendingCount() };
  flushing = true;
  let processed = 0;
  try {
    // Drain one at a time, oldest first. We reload between iterations so
    // concurrent enqueue calls are not lost.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const entries = load();
      if (entries.length === 0) break;
      const entry = entries[0];
      try {
        await runOp(entry.op);
        save(entries.slice(1));
        processed += 1;
      } catch (err) {
        entry.attempts += 1;
        entry.lastError = err instanceof Error ? err.message : String(err);
        if (entry.attempts >= 10) {
          // Give up eventually so a single broken write doesn't block the queue
          // forever. The entry is dropped but we log loudly.
          console.error('[offlineQueue] dropping entry after 10 attempts', entry);
          save(entries.slice(1));
        } else {
          save([entry, ...entries.slice(1)]);
        }
        // Stop the loop on error — no point hammering the network.
        break;
      }
    }
  } finally {
    flushing = false;
  }
  return { processed, remaining: getPendingCount() };
}

export function initOnlineListener(): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    void flush();
  };
  window.addEventListener('online', handler);
  // Attempt an initial flush in case the app mounts already online with a
  // backlog from a previous session.
  if (navigator.onLine) {
    void flush();
  }
  return () => window.removeEventListener('online', handler);
}
