import { PatrolRound } from '../../types';
import { requireClient } from './helpers';

function rowToRound(r: Record<string, unknown>): PatrolRound {
  return {
    id: r.id as string,
    guardId: (r.guard_id as string) ?? '',
    locationId: (r.location_id as string) ?? '',
    checkPointId: (r.checkpoint_id as string) ?? '',
    timestamp: r.timestamp as string,
    latitude: (r.latitude as number) ?? 0,
    longitude: (r.longitude as number) ?? 0,
    device: (r.device as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
  };
}

export async function getAll(): Promise<PatrolRound[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('patrol_rounds')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToRound(r as Record<string, unknown>));
}

export async function insert(r: PatrolRound): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('patrol_rounds').insert({
    id: r.id,
    guard_id: r.guardId,
    location_id: r.locationId || null,
    checkpoint_id: r.checkPointId || null,
    timestamp: r.timestamp,
    latitude: r.latitude,
    longitude: r.longitude,
    device: r.device ?? null,
    notes: r.notes ?? null,
  });
  if (error) throw error;
}

export { rowToRound };
