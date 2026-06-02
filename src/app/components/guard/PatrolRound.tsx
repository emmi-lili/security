import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  MapPin,
  QrCode,
} from 'lucide-react';
import { PatrolRound as PatrolRoundType } from '../../types/index';
import { isSameLocalDay } from '../../utils/dates';
import {
  formatCoords,
  getCurrentPosition,
  hasValidCoords,
  type GeoCoords,
} from '../../utils/geo';
import QRScanner from './QRScanner';

// Cooldown window: if the same QR is scanned again within this many minutes,
// we flag it as "already verified recently" instead of logging a new visit.
const SCAN_COOLDOWN_MINUTES = 5;

type ScanResult =
  | {
      kind: 'success';
      round: PatrolRoundType;
      checkpointName: string;
      locationName?: string;
      guardName: string;
      coords: GeoCoords;
    }
  | { kind: 'duplicate'; checkpointName: string; minutesAgo: number }
  | { kind: 'unknown'; raw: string };

export default function PatrolRound() {
  const { currentUser, checkPoints, locations, addPatrolRound, patrolRounds } =
    useApp();

  const [showScanner, setShowScanner] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [registering, setRegistering] = useState(false);

  const guardLocations = useMemo(
    () => locations.filter((loc) => loc.guardIds.includes(currentUser?.id || '')),
    [locations, currentUser?.id]
  );

  const guardCheckPoints = useMemo(
    () => checkPoints.filter((cp) => guardLocations.some((loc) => loc.id === cp.locationId)),
    [checkPoints, guardLocations]
  );

  useEffect(() => {
    void getCurrentPosition().then((coords) => setGpsReady(hasValidCoords(coords)));
  }, []);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (!currentUser) return;

      const raw = decodedText.trim();
      const checkpoint = guardCheckPoints.find((cp) => cp.qrCode === raw);

      if (!checkpoint) {
        setShowScanner(false);
        setResult({ kind: 'unknown', raw });
        return;
      }

      const cooldownMs = SCAN_COOLDOWN_MINUTES * 60 * 1000;
      const now = Date.now();
      const recent = patrolRounds
        .filter((r) => r.checkPointId === checkpoint.id)
        .map((r) => ({ r, t: new Date(r.timestamp).getTime() }))
        .filter(({ t }) => now - t < cooldownMs)
        .sort((a, b) => b.t - a.t)[0];

      if (recent) {
        setShowScanner(false);
        setResult({
          kind: 'duplicate',
          checkpointName: checkpoint.name,
          minutesAgo: Math.max(1, Math.round((now - recent.t) / 60_000)),
        });
        return;
      }

      setRegistering(true);
      const coords = await getCurrentPosition();
      const scannedAt = new Date().toISOString();

      const newRound: PatrolRoundType = {
        id: `pr-${Date.now()}`,
        guardId: currentUser.id,
        locationId: checkpoint.locationId,
        checkPointId: checkpoint.id,
        timestamp: scannedAt,
        latitude: coords.latitude,
        longitude: coords.longitude,
        device: navigator.userAgent || 'Mobile Browser',
        notes: `Guardia: ${currentUser.fullName} (${currentUser.username})`,
      };

      addPatrolRound(newRound);

      const locationName = locations.find((l) => l.id === checkpoint.locationId)?.name;

      setShowScanner(false);
      setRegistering(false);
      setResult({
        kind: 'success',
        round: newRound,
        checkpointName: checkpoint.name,
        locationName,
        guardName: currentUser.fullName,
        coords,
      });
    },
    [
      currentUser,
      guardCheckPoints,
      patrolRounds,
      addPatrolRound,
      locations,
    ]
  );

  const handleStartScan = () => {
    setResult(null);
    setShowScanner(true);
  };

  const todayRounds = patrolRounds.filter(
    (r) => r.guardId === currentUser?.id && isSameLocalDay(r.timestamp)
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Registrar Ronda</h2>
        <p className="text-sm text-gray-600">Escanee el código QR del punto de control</p>
        {currentUser && (
          <p className="text-xs text-gray-500 mt-2">
            Guardia: <strong>{currentUser.fullName}</strong>
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          GPS:{' '}
          {gpsReady ? (
            <span className="text-green-600 font-medium">listo para registrar ubicación</span>
          ) : (
            <span className="text-amber-600 font-medium">
              active la ubicación en el navegador antes de escanear
            </span>
          )}
        </p>
      </div>

      <button
        onClick={handleStartScan}
        disabled={registering || !currentUser}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center gap-3">
          <QrCode className="w-16 h-16" />
          <span className="text-xl font-semibold">
            {registering ? 'Registrando ronda…' : 'Escanear Código QR'}
          </span>
        </div>
      </button>

      {result && <ScanResultBanner result={result} onDismiss={() => setResult(null)} />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Rondas de Hoy</h3>
          <p className="text-sm text-gray-600">{todayRounds.length} registradas</p>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {todayRounds.length > 0 ? (
            [...todayRounds].reverse().map((round) => {
              const checkpoint = checkPoints.find((cp) => cp.id === round.checkPointId);
              const location = locations.find((l) => l.id === round.locationId);
              return (
                <div key={round.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{checkpoint?.name}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <MapPin className="w-3 h-3" />
                        {location?.name}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(round.timestamp).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                      {round.latitude !== 0 || round.longitude !== 0 ? (
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                          {formatCoords({
                            latitude: round.latitude,
                            longitude: round.longitude,
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-0.5">Sin GPS en este registro</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No hay rondas registradas hoy</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-3">Puntos de Control Disponibles</h4>
        <div className="space-y-2">
          {guardCheckPoints.map((cp) => {
            const location = locations.find((l) => l.id === cp.locationId);
            return (
              <div key={cp.id} className="flex items-center gap-2 text-sm text-blue-800">
                <QrCode className="w-4 h-4" />
                <span>
                  {cp.name} - {location?.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showScanner && (
        <QRScanner onScan={handleDecoded} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}

function ScanResultBanner({
  result,
  onDismiss,
}: {
  result: ScanResult;
  onDismiss: () => void;
}) {
  if (result.kind === 'success') {
    const scannedAt = new Date(result.round.timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const gpsOk = hasValidCoords(result.coords);
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-900">¡Ronda Registrada!</p>
          <p className="text-sm text-green-800 mt-1">
            {result.checkpointName}
            {result.locationName ? ` · ${result.locationName}` : ''}
          </p>
          <ul className="text-xs text-green-800 mt-2 space-y-1">
            <li>
              <strong>Hora del escaneo:</strong> {scannedAt}
            </li>
            <li>
              <strong>Guardia:</strong> {result.guardName}
            </li>
            <li>
              <strong>Ubicación GPS:</strong>{' '}
              {gpsOk ? formatCoords(result.coords) : 'No disponible — active el GPS del dispositivo'}
            </li>
          </ul>
        </div>
        <button
          onClick={onDismiss}
          className="text-green-700 text-sm font-medium hover:underline"
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (result.kind === 'duplicate') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-yellow-900">Sector ya verificado recientemente</p>
          <p className="text-sm text-yellow-800 mt-1">
            {result.checkpointName} fue escaneado hace {result.minutesAgo}{' '}
            {result.minutesAgo === 1 ? 'minuto' : 'minutos'}.
          </p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Intervalo mínimo entre escaneos: {SCAN_COOLDOWN_MINUTES} min.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-700 text-sm font-medium hover:underline"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-red-900">QR no reconocido</p>
        <p className="text-sm text-red-800 mt-1 break-all">
          El código escaneado no corresponde a ningún punto de control registrado.
        </p>
        <p className="text-xs text-red-700 mt-0.5">Contenido: {result.raw}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-700 text-sm font-medium hover:underline"
      >
        Cerrar
      </button>
    </div>
  );
}
