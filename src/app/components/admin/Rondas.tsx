import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { PatrolRoute } from '../../types';
import { Plus, QrCode, MapPin, ChevronRight, Route } from 'lucide-react';

export default function Rondas() {
  const { patrolRoutes, locations, checkPoints, patrolRounds, addPatrolRoute } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const activeRoutes = patrolRoutes.filter((r) => r.active);

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
                ? routeScans.reduce((a, b) =>
                    a.timestamp > b.timestamp ? a : b
                  )
                : null;

            return (
              <div
                key={route.id}
                onClick={() => navigate(`/admin/rondas/${route.id}`)}
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
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
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
            navigate(`/admin/rondas/${route.id}`);
          }}
        />
      )}
    </div>
  );
}

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
