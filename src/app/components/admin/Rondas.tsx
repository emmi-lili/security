import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CheckPoint, PatrolRoute } from '../../types';
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  MapPin,
  Plus,
  QrCode,
  Route,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { exportPatrolRoundsToXlsx } from '../../utils/exportPatrolRounds';

type Tab = 'checkpoints' | 'historial';

export default function Rondas() {
  const { patrolRoutes, locations, checkPoints, patrolRounds, addPatrolRoute } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<PatrolRoute | null>(null);

  const activeRoutes = patrolRoutes.filter((r) => r.active);

  // If a route was selected but got removed/deactivated, reset
  useEffect(() => {
    if (selectedRoute && !activeRoutes.find((r) => r.id === selectedRoute.id)) {
      setSelectedRoute(null);
    }
  }, [activeRoutes, selectedRoute]);

  if (selectedRoute) {
    return (
      <RondasDetalle
        route={selectedRoute}
        onBack={() => setSelectedRoute(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rondas</h2>
          <p className="text-gray-600 mt-1">
            Gestiona las rondas de vigilancia y sus puntos de control
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nueva Ronda
        </button>
      </div>

      {activeRoutes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No hay rondas creadas</h3>
          <p className="text-gray-500 mb-6">
            Crea tu primera ronda para empezar a configurar puntos de control.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Crear primera ronda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRoutes.map((route) => {
            const location = locations.find((l) => l.id === route.locationId);
            const routeCheckpoints = checkPoints.filter(
              (cp) => cp.patrolRouteId === route.id && cp.active
            );
            const checkpointIds = new Set(routeCheckpoints.map((cp) => cp.id));
            const routeScans = patrolRounds.filter((r) =>
              checkpointIds.has(r.checkPointId ?? '')
            );
            const lastScan =
              routeScans.length > 0
                ? routeScans.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
                : null;

            return (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Route className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{route.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {location?.name ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <QrCode className="w-4 h-4 text-orange-500" />
                    <span>{routeCheckpoints.length} puntos</span>
                  </div>
                  <div className="text-gray-400">·</div>
                  <span>{routeScans.length} escaneos</span>
                </div>

                {lastScan && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Último escaneo:{' '}
                      {new Date(lastScan.timestamp).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NuevaRondaModal
          onClose={() => setShowModal(false)}
          onSave={(name, locationId) => {
            const route: PatrolRoute = {
              id: `pr-${Date.now()}`,
              name,
              locationId,
              active: true,
              createdAt: new Date().toISOString(),
            };
            addPatrolRoute(route);
            setShowModal(false);
            setSelectedRoute(route);
          }}
        />
      )}
    </div>
  );
}

// ─── Detalle de una ronda (inline, misma sección) ────────────────────────────

function RondasDetalle({
  route,
  onBack,
}: {
  route: PatrolRoute;
  onBack: () => void;
}) {
  const {
    locations,
    checkPoints,
    patrolRounds,
    users,
    addCheckPoint,
    updateCheckPoint,
  } = useApp();

  const [tab, setTab] = useState<Tab>('checkpoints');
  const [showModal, setShowModal] = useState(false);
  const [editingCP, setEditingCP] = useState<CheckPoint | null>(null);
  const [selectedQR, setSelectedQR] = useState<CheckPoint | null>(null);

  const location = locations.find((l) => l.id === route.locationId);

  const routeCheckpoints = useMemo(
    () =>
      checkPoints
        .filter((cp) => cp.patrolRouteId === route.id && cp.active)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [checkPoints, route.id]
  );

  const checkpointIds = useMemo(
    () => new Set(routeCheckpoints.map((cp) => cp.id)),
    [routeCheckpoints]
  );

  const routeScans = useMemo(
    () =>
      patrolRounds
        .filter((r) => checkpointIds.has(r.checkPointId ?? ''))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [patrolRounds, checkpointIds]
  );

  const handleSaveCP = (data: Partial<CheckPoint>) => {
    if (editingCP) {
      updateCheckPoint(editingCP.id, data);
    } else {
      const newCP: CheckPoint = {
        id: `cp-${Date.now()}`,
        patrolRouteId: route.id,
        locationId: route.locationId,
        qrCode: `QR-${route.locationId}-${Date.now()}`,
        active: true,
        createdAt: new Date().toISOString(),
        name: '',
        ...data,
      };
      addCheckPoint(newCP);
    }
    setShowModal(false);
    setEditingCP(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Volver a Rondas"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{route.name}</h2>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1 ml-9">
            <MapPin className="w-3.5 h-3.5" />
            {location?.name ?? '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('checkpoints')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'checkpoints'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Puntos de Control ({routeCheckpoints.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'historial'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Historial ({routeScans.length})
        </button>
      </div>

      {/* Tab: Checkpoints */}
      {tab === 'checkpoints' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingCP(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nuevo Punto de Control
            </button>
          </div>

          {routeCheckpoints.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No hay puntos de control
              </h3>
              <p className="text-gray-500 mb-6">
                Agrega puntos como "Lobby", "Piscina", "Estacionamiento", etc.
              </p>
              <button
                onClick={() => {
                  setEditingCP(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Agregar punto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routeCheckpoints.map((cp) => {
                const scans = routeScans.filter((r) => r.checkPointId === cp.id);
                const lastScan = scans[0] ?? null;
                const lastGuard = lastScan
                  ? users.find((u) => u.id === lastScan.guardId)
                  : null;

                return (
                  <div
                    key={cp.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                          <QrCode className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{cp.name}</h3>
                          {cp.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{cp.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingCP(cp);
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {lastScan && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-green-900 mb-1">Último escaneo</p>
                        <p className="text-xs text-green-700">
                          {lastGuard?.fullName ?? lastScan.guardId} ·{' '}
                          {new Date(lastScan.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-600">{scans.length} escaneos</span>
                      <button
                        onClick={() => setSelectedQR(cp)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Ver QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportPatrolRoundsToXlsx(
                  routeScans.map((round) => {
                    const guard = users.find((u) => u.id === round.guardId);
                    const loc = locations.find((l) => l.id === round.locationId);
                    const cp = checkPoints.find((c) => c.id === round.checkPointId);
                    return {
                      round,
                      guardName: guard?.fullName ?? round.guardId,
                      locationName: loc?.name ?? '—',
                      checkpointName: cp?.name ?? '—',
                    };
                  }),
                  checkPoints
                )
              }
              disabled={routeScans.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Exportar XLSX ({routeScans.length})
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-medium text-gray-700 px-4 py-3">Fecha / Hora</th>
                    <th className="text-left font-medium text-gray-700 px-4 py-3">Guardia</th>
                    <th className="text-left font-medium text-gray-700 px-4 py-3">Punto de control</th>
                    <th className="text-left font-medium text-gray-700 px-4 py-3">GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {routeScans.length > 0 ? (
                    routeScans.map((round) => {
                      const guard = users.find((u) => u.id === round.guardId);
                      const cp = checkPoints.find((c) => c.id === round.checkPointId);
                      const d = new Date(round.timestamp);
                      const hasGps = round.latitude !== 0 || round.longitude !== 0;
                      return (
                        <tr key={round.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-gray-900">{d.toLocaleDateString('es-ES')}</div>
                            <div className="text-xs text-gray-500">{d.toLocaleTimeString('es-ES')}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {guard?.fullName ?? round.guardId}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{cp?.name ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            {hasGps
                              ? `${round.latitude.toFixed(4)}, ${round.longitude.toFixed(4)}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        No hay escaneos registrados para esta ronda todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint modal */}
      {showModal && (
        <CheckPointModal
          checkPoint={editingCP}
          onClose={() => {
            setShowModal(false);
            setEditingCP(null);
          }}
          onSave={handleSaveCP}
        />
      )}

      {/* QR modal */}
      {selectedQR && (
        <QRCodeModal checkPoint={selectedQR} onClose={() => setSelectedQR(null)} />
      )}
    </div>
  );
}

// ─── Modal: Nueva Ronda ───────────────────────────────────────────────────────

function NuevaRondaModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, locationId: string) => void;
}) {
  const { locations } = useApp();
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name.trim(), locationId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Nueva Ronda</h3>
          <p className="text-sm text-gray-500 mt-1">
            Define el nombre y el condominio de esta ronda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la ronda *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Ronda Nocturna, Ronda Exterior"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condominio *
            </label>
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar condominio</option>
              {locations
                .filter((l) => l.active)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear Ronda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Punto de Control ──────────────────────────────────────────────────

function CheckPointModal({
  checkPoint,
  onClose,
  onSave,
}: {
  checkPoint: CheckPoint | null;
  onClose: () => void;
  onSave: (data: Partial<CheckPoint>) => void;
}) {
  const [formData, setFormData] = useState({
    name: checkPoint?.name ?? '',
    description: checkPoint?.description ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {checkPoint ? 'Editar Punto de Control' : 'Nuevo Punto de Control'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del punto *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Lobby, Piscina, Estacionamiento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Descripción del punto de control"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Ver QR ────────────────────────────────────────────────────────────

function QRCodeModal({
  checkPoint,
  onClose,
}: {
  checkPoint: CheckPoint;
  onClose: () => void;
}) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (qrRef.current && !qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 300,
        height: 300,
        data: checkPoint.qrCode,
        dotsOptions: { color: '#1e40af', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: { crossOrigin: 'anonymous', margin: 10 },
      });
      qrCodeRef.current.append(qrRef.current);
    }
  }, [checkPoint.qrCode]);

  const handleDownload = () => {
    qrCodeRef.current?.download({
      name: `QR_${checkPoint.name.replace(/\s+/g, '_')}`,
      extension: 'png',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{checkPoint.name}</h3>

        <div className="bg-gray-50 rounded-lg p-6 mb-4 flex justify-center">
          <div ref={qrRef} />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-900">
            <strong>Código:</strong> {checkPoint.qrCode}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
}
