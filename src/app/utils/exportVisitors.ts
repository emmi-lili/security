import * as XLSX from 'xlsx';
import { Location, Visitor } from '../types';
import { downloadXlsxWorkbook } from './downloadXlsx';

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

  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  const colWidths = HEADERS.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((row) => String(row[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  sheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Visitas');

  const date = new Date().toISOString().split('T')[0];
  downloadXlsxWorkbook(workbook, `visitas_${date}.xlsx`);
}
