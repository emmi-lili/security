import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Visitor } from '../../types';
import { UserCheck, Search, Download, MapPin, User, Clock, Edit } from 'lucide-react';
import { exportVisitorsToXlsx } from '../../utils/exportVisitors';

export default function Visitors() {
  const { visitors, locations, currentUser, updateVisitor } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);

  const filteredVisitors = useMemo(() => {
    return visitors.filter(visitor => {
      const matchesSearch = 
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.hostName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = filterLocation === 'all' || visitor.locationId === filterLocation;

      return matchesSearch && matchesLocation;
    });
  }, [visitors, searchTerm, filterLocation]);

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const exportToXlsx = () => {
    exportVisitorsToXlsx(filteredVisitors, locations);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registro de Visitas</h2>
          <p className="text-gray-600 mt-1">Historial completo de visitantes</p>
        </div>
        <button
          type="button"
          onClick={exportToXlsx}
          disabled={filteredVisitors.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Exportar XLSX ({filteredVisitors.length})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, documento o anfitrión..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los lugares</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Visitante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lugar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Anfitrión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hora
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVisitors.length > 0 ? (
                filteredVisitors.map((visitor) => {
                  const location = locations.find(l => l.id === visitor.locationId);
                  return (
                    <tr key={visitor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <UserCheck className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{visitor.name}</p>
                            <p className="text-sm text-gray-500">{visitor.documentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{location?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {visitor.department}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{visitor.hostName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatFecha(visitor.checkInTime)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatHora(visitor.checkInTime)}
                          </span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setEditingVisitor(visitor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Corregir nombre del visitante"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No se encontraron visitas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Total de visitas mostradas:</strong> {filteredVisitors.length}
        </p>
      </div>

      {editingVisitor && (
        <EditVisitorNameModal
          visitor={editingVisitor}
          onClose={() => setEditingVisitor(null)}
          onSave={(name) => {
            updateVisitor(editingVisitor.id, { name: name.trim() });
            setEditingVisitor(null);
          }}
        />
      )}
    </div>
  );
}

function EditVisitorNameModal({
  visitor,
  onClose,
  onSave,
}: {
  visitor: Visitor;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(visitor.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Corregir nombre</h3>
          <p className="text-sm text-gray-600 mt-1">
            Documento: {visitor.documentId} · {new Date(visitor.checkInTime).toLocaleString('es-ES')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del visitante *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
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
