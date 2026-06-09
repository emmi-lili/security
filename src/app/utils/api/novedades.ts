import { Novedad } from '../../types';
import { requireClient } from './helpers';

function rowToNovedad(r: Record<string, unknown>): Novedad {
  return {
    id: r.id as string,
    guardName: (r.guard_name as string) ?? '',
    turno: (r.turno as Novedad['turno']) ?? 'dia',
    tipo: (r.tipo as Novedad['tipo']) ?? 'otro',
    ubicacion: (r.ubicacion as string) ?? '',
    descripcion: (r.descripcion as string) ?? '',
    medidasTomadas: (r.medidas_tomadas as string) ?? '',
    photoUrls: Array.isArray(r.photo_urls)
      ? (r.photo_urls as string[])
      : r.photo_url
        ? [r.photo_url as string]
        : [],
    guardId: (r.guard_id as string) ?? '',
    locationId: (r.location_id as string | null) ?? undefined,
    locationName: (r.location_name as string | null) ?? undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function novedadToRow(n: Novedad): Record<string, unknown> {
  return {
    id: n.id,
    guard_name: n.guardName,
    turno: n.turno,
    tipo: n.tipo,
    ubicacion: n.ubicacion,
    descripcion: n.descripcion,
    medidas_tomadas: n.medidasTomadas,
    photo_urls: n.photoUrls.length > 0 ? n.photoUrls : [],
    guard_id: n.guardId,
    location_id: n.locationId ?? null,
    location_name: n.locationName ?? null,
    created_at: n.createdAt,
  };
}

export async function getAll(): Promise<Novedad[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('novedades')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToNovedad(r as Record<string, unknown>));
}

export async function insert(n: Novedad): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('novedades').insert(novedadToRow(n));
  if (error) throw error;
}

export async function update(id: string, u: Partial<Novedad>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (u.photoUrls !== undefined) payload.photo_urls = u.photoUrls;
  if (u.descripcion !== undefined) payload.descripcion = u.descripcion;
  if (u.medidasTomadas !== undefined) payload.medidas_tomadas = u.medidasTomadas;
  if (u.ubicacion !== undefined) payload.ubicacion = u.ubicacion;
  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('novedades').update(payload).eq('id', id);
  if (error) throw error;
}
