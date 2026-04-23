import { Resident } from '../../types';
import { mapArray, requireClient } from './helpers';

export async function getAll(): Promise<Resident[]> {
  const client = requireClient();
  const { data, error } = await client.from('residents').select('*').order('created_at');
  if (error) throw error;
  return mapArray<Resident>(data as never);
}

export async function insert(r: Resident): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('residents').insert({
    id: r.id,
    location_id: r.locationId,
    tower: r.tower ?? null,
    department: r.department,
    resident_type: r.residentType,
    full_name: r.fullName,
    phone: r.phone ?? null,
    email: r.email ?? null,
    document_id: r.documentId ?? null,
    active: r.active,
    notes: r.notes ?? null,
    created_at: r.createdAt,
  });
  if (error) throw error;
}

export async function update(id: string, u: Partial<Resident>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (u.locationId !== undefined) payload.location_id = u.locationId;
  if (u.tower !== undefined) payload.tower = u.tower;
  if (u.department !== undefined) payload.department = u.department;
  if (u.residentType !== undefined) payload.resident_type = u.residentType;
  if (u.fullName !== undefined) payload.full_name = u.fullName;
  if (u.phone !== undefined) payload.phone = u.phone;
  if (u.email !== undefined) payload.email = u.email;
  if (u.documentId !== undefined) payload.document_id = u.documentId;
  if (u.active !== undefined) payload.active = u.active;
  if (u.notes !== undefined) payload.notes = u.notes;

  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('residents').update(payload).eq('id', id);
  if (error) throw error;
}
