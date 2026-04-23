import { CheckPoint } from '../../types';
import { requireClient } from './helpers';

function rowToCheckpoint(r: Record<string, unknown>): CheckPoint {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    locationId: (r.location_id as string) ?? '',
    qrCode: (r.qr_code as string) ?? '',
    latitude: (r.latitude as number | null) ?? undefined,
    longitude: (r.longitude as number | null) ?? undefined,
    description: (r.description as string | null) ?? undefined,
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  };
}

export async function getAll(): Promise<CheckPoint[]> {
  const client = requireClient();
  const { data, error } = await client.from('checkpoints').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => rowToCheckpoint(r as Record<string, unknown>));
}

export async function insert(cp: CheckPoint): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('checkpoints').insert({
    id: cp.id,
    name: cp.name,
    location_id: cp.locationId,
    qr_code: cp.qrCode,
    latitude: cp.latitude ?? null,
    longitude: cp.longitude ?? null,
    description: cp.description ?? null,
    active: cp.active,
    created_at: cp.createdAt,
  });
  if (error) throw error;
}

export async function update(id: string, u: Partial<CheckPoint>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (u.name !== undefined) payload.name = u.name;
  if (u.locationId !== undefined) payload.location_id = u.locationId;
  if (u.qrCode !== undefined) payload.qr_code = u.qrCode;
  if (u.latitude !== undefined) payload.latitude = u.latitude;
  if (u.longitude !== undefined) payload.longitude = u.longitude;
  if (u.description !== undefined) payload.description = u.description;
  if (u.active !== undefined) payload.active = u.active;

  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('checkpoints').update(payload).eq('id', id);
  if (error) throw error;
}
