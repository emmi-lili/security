import { Location, Visitor } from '../types';
import { exportRowsToXlsx } from './exportSheet';

const HEADERS = [
  'Nombre',
  'Documento',
  'Lugar',
  'Departamento',
  'Anfitrión',
  'Fecha',
  'Hora',
] as const;

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function exportVisitorsToXlsx(
  visitors: Visitor[],
  locations: Location[]
): void {
  const rows = visitors.map((v) => {
    const location = locations.find((l) => l.id === v.locationId);
    return [
      v.name,
      v.documentId,
      location?.name ?? '',
      v.department,
      v.hostName,
      formatFecha(v.checkInTime),
      formatHora(v.checkInTime),
    ];
  });

  const date = new Date().toISOString().split('T')[0];
  exportRowsToXlsx('Visitas', HEADERS, rows, `visitas_${date}.xlsx`);
}
