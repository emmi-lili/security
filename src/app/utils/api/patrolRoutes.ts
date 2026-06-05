import { PatrolRoute } from '../../types';
import { requireClient } from './helpers';

function rowToRoute(r: Record<string, unknown>): PatrolRoute {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    locationId: (r.location_id as string) ?? '',
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  };
}

export async function getAll(): Promise<PatrolRoute[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('patrol_routes')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => rowToRoute(r as Record<string, unknown>));
}

export async function insert(route: PatrolRoute): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('patrol_routes').insert({
    id: route.id,
    name: route.name,
    location_id: route.locationId,
    active: route.active,
    created_at: route.createdAt,
  });
  if (error) throw error;
}

export async function update(id: string, u: Partial<PatrolRoute>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (u.name !== undefined) payload.name = u.name;
  if (u.locationId !== undefined) payload.location_id = u.locationId;
  if (u.active !== undefined) payload.active = u.active;

  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('patrol_routes').update(payload).eq('id', id);
  if (error) throw error;
}
