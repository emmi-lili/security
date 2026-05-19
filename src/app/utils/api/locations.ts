import { Location } from '../../types';
import { requireClient } from './helpers';

// Location.guardIds is a string[] in TS but lives in the pivot table
// `location_guards`. We hide that on read (join + group) and on write
// (insert + diff the pivot).

export async function getAll(): Promise<Location[]> {
  const client = requireClient();
  const [locRes, pivotRes] = await Promise.all([
    client.from('locations').select('*').order('created_at'),
    client.from('location_guards').select('location_id, guard_id'),
  ]);
  if (locRes.error) throw locRes.error;
  if (pivotRes.error) throw pivotRes.error;

  const byLocation = new Map<string, string[]>();
  for (const row of pivotRes.data ?? []) {
    const locId = (row as { location_id: string }).location_id;
    const guardId = (row as { guard_id: string }).guard_id;
    const list = byLocation.get(locId) ?? [];
    list.push(guardId);
    byLocation.set(locId, list);
  }

  return (locRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (row.name as string) ?? '',
      address: (row.address as string) ?? '',
      type: (row.type as string) ?? '',
      supervisorId: (row.supervisor_id as string) ?? '',
      guardIds: byLocation.get(row.id as string) ?? [],
      accessCode: (row.access_code as string) ?? '',
      notes: (row.notes as string | null) ?? undefined,
      active: Boolean(row.active),
      createdAt: row.created_at as string,
    };
  });
}

export async function insert(loc: Location): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('locations').insert({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    type: loc.type,
    supervisor_id: loc.supervisorId || null,
    access_code: loc.accessCode,
    notes: loc.notes ?? null,
    active: loc.active,
    created_at: loc.createdAt,
  });
  if (error) throw error;

  if (loc.guardIds.length > 0) {
    const rows = loc.guardIds.map((gid) => ({ location_id: loc.id, guard_id: gid }));
    const pivotErr = (await client.from('location_guards').insert(rows)).error;
    if (pivotErr) throw pivotErr;
  }
}

export async function update(
  locationId: string,
  updates: Partial<Location>
): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.supervisorId !== undefined) payload.supervisor_id = updates.supervisorId || null;
  if (updates.accessCode !== undefined) payload.access_code = updates.accessCode;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.active !== undefined) payload.active = updates.active;

  if (Object.keys(payload).length > 0) {
    const { error } = await client.from('locations').update(payload).eq('id', locationId);
    if (error) throw error;
  }

  // Full replace of the guard pivot when guardIds is provided. Simpler than
  // diffing and the list is always tiny.
  if (updates.guardIds !== undefined) {
    const delErr = (
      await client.from('location_guards').delete().eq('location_id', locationId)
    ).error;
    if (delErr) throw delErr;

    if (updates.guardIds.length > 0) {
      const rows = updates.guardIds.map((gid) => ({
        location_id: locationId,
        guard_id: gid,
      }));
      const insErr = (await client.from('location_guards').insert(rows)).error;
      if (insErr) throw insErr;
    }
  }
}

export async function remove(locationId: string): Promise<void> {
  const client = requireClient();
  // The pivot has `on delete cascade` so we don't need to touch it explicitly,
  // but residents / checkpoints / visitors reference location_id and would
  // either cascade or null out depending on the schema (see migration 0001).
  const { error } = await client.from('locations').delete().eq('id', locationId);
  if (error) throw error;
}
