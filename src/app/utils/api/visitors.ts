import { Visitor } from '../../types';
import { requireClient } from './helpers';

function rowToVisitor(r: Record<string, unknown>): Visitor {
  return {
    id: r.id as string,
    idCard: (r.id_card as string) ?? '',
    name: (r.name as string) ?? '',
    documentId: (r.document_id as string) ?? '',
    photoUrl: (r.photo_url as string | null) ?? undefined,
    department: (r.department as string) ?? '',
    tower: (r.tower as string | null) ?? undefined,
    hostName: (r.host_name as string) ?? '',
    residentId: (r.resident_id as string | null) ?? undefined,
    isValidatedDestination: Boolean(r.is_validated_destination),
    reason: (r.reason as string) ?? '',
    vehiclePlate: (r.vehicle_plate as string | null) ?? undefined,
    vehicleType: (r.vehicle_type as string | null) ?? undefined,
    checkInTime: r.check_in_time as string,
    checkOutTime: (r.check_out_time as string | null) ?? undefined,
    guardId: (r.guard_id as string) ?? '',
    locationId: (r.location_id as string) ?? '',
    notes: (r.notes as string | null) ?? undefined,
  };
}

function visitorToRow(v: Visitor): Record<string, unknown> {
  return {
    id: v.id,
    id_card: v.idCard,
    name: v.name,
    document_id: v.documentId,
    photo_url: v.photoUrl ?? null,
    department: v.department,
    tower: v.tower ?? null,
    host_name: v.hostName,
    resident_id: v.residentId ?? null,
    is_validated_destination: v.isValidatedDestination,
    reason: v.reason,
    vehicle_plate: v.vehiclePlate ?? null,
    vehicle_type: v.vehicleType ?? null,
    check_in_time: v.checkInTime,
    check_out_time: v.checkOutTime ?? null,
    guard_id: v.guardId,
    location_id: v.locationId,
    notes: v.notes ?? null,
  };
}

export async function getAll(): Promise<Visitor[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('visitors')
    .select('*')
    .order('check_in_time', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToVisitor(r as Record<string, unknown>));
}

export async function insert(v: Visitor): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('visitors').insert(visitorToRow(v));
  if (error) throw error;
}

export async function update(id: string, u: Partial<Visitor>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (u.idCard !== undefined) payload.id_card = u.idCard;
  if (u.name !== undefined) payload.name = u.name;
  if (u.documentId !== undefined) payload.document_id = u.documentId;
  if (u.photoUrl !== undefined) payload.photo_url = u.photoUrl;
  if (u.department !== undefined) payload.department = u.department;
  if (u.tower !== undefined) payload.tower = u.tower;
  if (u.hostName !== undefined) payload.host_name = u.hostName;
  if (u.residentId !== undefined) payload.resident_id = u.residentId;
  if (u.isValidatedDestination !== undefined)
    payload.is_validated_destination = u.isValidatedDestination;
  if (u.reason !== undefined) payload.reason = u.reason;
  if (u.vehiclePlate !== undefined) payload.vehicle_plate = u.vehiclePlate;
  if (u.vehicleType !== undefined) payload.vehicle_type = u.vehicleType;
  if (u.checkInTime !== undefined) payload.check_in_time = u.checkInTime;
  if (u.checkOutTime !== undefined) payload.check_out_time = u.checkOutTime;
  if (u.guardId !== undefined) payload.guard_id = u.guardId;
  if (u.locationId !== undefined) payload.location_id = u.locationId;
  if (u.notes !== undefined) payload.notes = u.notes;

  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('visitors').update(payload).eq('id', id);
  if (error) throw error;
}

export { rowToVisitor };
