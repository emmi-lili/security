import { CheckPoint, PatrolRound } from '../types';
import { exportRowsToXlsx } from './exportSheet';

const HEADERS = [
  'Fecha',
  'Hora',
  'Guardia',
  'ID Guardia',
  'Lugar',
  'Punto de Control',
  'Código QR',
  'Latitud',
  'Longitud',
  'Dispositivo',
] as const;

export type PatrolRoundExportRow = {
  round: PatrolRound;
  guardName: string;
  locationName: string;
  checkpointName: string;
};

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

export function exportPatrolRoundsToXlsx(
  rows: PatrolRoundExportRow[],
  checkPoints: CheckPoint[]
): void {
  const data = rows.map(({ round, guardName, locationName, checkpointName }) => {
    const checkpoint = checkPoints.find((cp) => cp.id === round.checkPointId);
    return [
      formatFecha(round.timestamp),
      formatHora(round.timestamp),
      guardName,
      round.guardId,
      locationName,
      checkpointName,
      checkpoint?.qrCode ?? '',
      round.latitude,
      round.longitude,
      round.device ?? '',
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  exportRowsToXlsx('Rondas', HEADERS, data, `reporte-rondas_${stamp}.xlsx`);
}
