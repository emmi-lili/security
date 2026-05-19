import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Plus, MapPin, Edit, Users, QrCode, Trash2 } from 'lucide-react';
import { Location } from '../../types/index';

export default function Locations() {
  const { locations, users, addLocation, updateLocation, removeLocation } =
    useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingLocation(null);
    setShowModal(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingLocation) return;
    removeLocation(deletingLocation.id);
    setDeletingLocation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Lugares</h2>
          <p className="text-gray-600 mt-1">Administra los lugares donde prestas servicio</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Lugar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => {
          const assignedGuards = users.filter(u => location.guardIds.includes(u.id));
          return (
            <div key={location.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    <p className="text-sm text-gray-500">{location.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(location)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Editar lugar"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setDeletingLocation(location)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Eliminar lugar"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Dirección:</strong> {location.address}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Código:</strong> {location.accessCode}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{assignedGuards.length} guardias</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  location.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {location.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <LocationModal
          location={editingLocation}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            if (editingLocation) {
              updateLocation(editingLocation.id, data);
            } else {
              const newLocation: Location = {
                id: `loc-${Date.now()}`,
                ...data,
                createdAt: new Date().toISOString(),
              } as Location;
              addLocation(newLocation);
            }
            setShowModal(false);
          }}
        />
      )}

      {deletingLocation && (
        <ConfirmDeleteModal
          location={deletingLocation}
          onCancel={() => setDeletingLocation(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  location,
  onCancel,
  onConfirm,
}: {
  location: Location;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Eliminar lugar</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-700">
            ¿Seguro que quieres eliminar{' '}
            <strong className="text-gray-900">{location.name}</strong>?
          </p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            Esta acción es permanente. También se borrarán los puntos de
            control y residentes asociados a este lugar. Las visitas y rondas
            históricas se conservarán pero quedarán sin lugar asignado.
          </p>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationModal({ location, onClose, onSave }: {
  location: Location | null;
  onClose: () => void;
  onSave: (data: Partial<Location>) => void;
}) {
  const { users, currentUser } = useApp();
  const guards = users.filter(u => u.role === 'guard');
  const supervisors = users.filter(u => u.role === 'admin' || u.role === 'supervisor');

  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    type: location?.type || 'Condominio',
    supervisorId:
      location?.supervisorId ||
      (currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor')
        ? currentUser.id
        : supervisors[0]?.id || ''),
    guardIds: location?.guardIds || [],
    accessCode: location?.accessCode || '',
    notes: location?.notes || '',
    active: location?.active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {location ? 'Editar Lugar' : 'Nuevo Lugar'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Lugar *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Condominio LE BLANC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Dirección completa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Instalación *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option>Condominio</option>
              <option>Centro Comercial</option>
              <option>Edificio Empresarial</option>
              <option>Hospital</option>
              <option>Urbanización</option>
              <option>Industria</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supervisor *
            </label>
            <select
              required
              value={formData.supervisorId}
              onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {supervisors.length === 0 && (
                <option value="">— No hay supervisores disponibles —</option>
              )}
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Acceso *
            </label>
            <input
              type="text"
              required
              value={formData.accessCode}
              onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Código para guardias"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Guardias Asignados
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {guards.map((guard) => (
                <label key={guard.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.guardIds.includes(guard.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, guardIds: [...formData.guardIds, guard.id] });
                      } else {
                        setFormData({ ...formData, guardIds: formData.guardIds.filter(id => id !== guard.id) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{guard.fullName}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional del lugar"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Lugar activo
            </label>
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
