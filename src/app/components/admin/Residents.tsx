import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Home, Plus, Search, Edit2, Building2, Phone, Mail, UserCircle, CheckCircle, XCircle } from 'lucide-react';
import { Resident } from '../../types';

export default function Residents() {
  const { locations, residents, addResident, updateResident } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  
  const [formData, setFormData] = useState({
    locationId: '',
    tower: '',
    department: '',
    residentType: 'propietario' as Resident['residentType'],
    fullName: '',
    phone: '',
    email: '',
    documentId: '',
    active: true,
    notes: '',
  });

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = 
      resident.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.tower?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !selectedLocation || resident.locationId === selectedLocation;
    
    return matchesSearch && matchesLocation;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingResident) {
      updateResident(editingResident.id, formData);
    } else {
      const newResident: Resident = {
        id: `res-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      addResident(newResident);
    }
    
    handleCloseModal();
  };

  const handleEdit = (resident: Resident) => {
    setEditingResident(resident);
    setFormData({
      locationId: resident.locationId,
      tower: resident.tower || '',
      department: resident.department,
      residentType: resident.residentType,
      fullName: resident.fullName,
      phone: resident.phone || '',
      email: resident.email || '',
      documentId: resident.documentId || '',
      active: resident.active,
      notes: resident.notes || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResident(null);
    setFormData({
      locationId: '',
      tower: '',
      department: '',
      residentType: 'propietario',
      fullName: '',
      phone: '',
      email: '',
      documentId: '',
      active: true,
      notes: '',
    });
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Desconocido';
  };

  const getResidentTypeLabel = (type: Resident['residentType']) => {
    const labels = {
      propietario: 'Propietario',
      inquilino: 'Inquilino',
      familiar: 'Familiar',
      otro: 'Otro'
    };
    return labels[type];
  };

  const getResidentTypeBadge = (type: Resident['residentType']) => {
    const colors = {
      propietario: 'bg-blue-100 text-blue-800',
      inquilino: 'bg-purple-100 text-purple-800',
      familiar: 'bg-green-100 text-green-800',
      otro: 'bg-gray-100 text-gray-800'
    };
    return colors[type];
  };

  // Group residents by location and tower
  const groupedResidents = filteredResidents.reduce((acc, resident) => {
    const key = `${resident.locationId}-${resident.tower || 'Sin torre'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(resident);
    return acc;
  }, {} as Record<string, Resident[]>);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Residentes y Copropietarios</h1>
        <p className="text-gray-600">Administra los habitantes de cada departamento o unidad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Residentes</p>
              <p className="text-2xl font-bold text-gray-900">{residents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">{residents.filter(r => r.active).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <UserCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Propietarios</p>
              <p className="text-2xl font-bold text-gray-900">
                {residents.filter(r => r.residentType === 'propietario').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <UserCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Inquilinos</p>
              <p className="text-2xl font-bold text-gray-900">
                {residents.filter(r => r.residentType === 'inquilino').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, departamento o torre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los lugares</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Nuevo Residente
          </button>
        </div>
      </div>

      {/* Residents List */}
      <div className="space-y-6">
        {Object.keys(groupedResidents).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay residentes registrados</h3>
            <p className="text-gray-600 mb-4">Comienza agregando residentes a tus lugares</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Agregar Primer Residente
            </button>
          </div>
        ) : (
          Object.entries(groupedResidents).map(([key, residentsList]) => {
            const firstResident = residentsList[0];
            const locationName = getLocationName(firstResident.locationId);
            const towerName = firstResident.tower || 'Sin torre';

            return (
              <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{locationName}</h3>
                    {firstResident.tower && (
                      <span className="text-gray-500">• {towerName}</span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {residentsList.map(resident => (
                    <div key={resident.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{resident.fullName}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResidentTypeBadge(resident.residentType)}`}>
                              {getResidentTypeLabel(resident.residentType)}
                            </span>
                            {resident.active ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              <span>Depto: {resident.department}</span>
                            </div>
                            {resident.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{resident.phone}</span>
                              </div>
                            )}
                            {resident.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{resident.email}</span>
                              </div>
                            )}
                            {resident.documentId && (
                              <div className="flex items-center gap-2">
                                <UserCircle className="w-4 h-4" />
                                <span>Doc: {resident.documentId}</span>
                              </div>
                            )}
                          </div>

                          {resident.notes && (
                            <p className="mt-2 text-sm text-gray-500 italic">{resident.notes}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleEdit(resident)}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingResident ? 'Editar Residente' : 'Nuevo Residente'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Location and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lugar *
                  </label>
                  <select
                    required
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar lugar</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Torre/Bloque
                  </label>
                  <input
                    type="text"
                    value={formData.tower}
                    onChange={(e) => setFormData({ ...formData, tower: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Torre A, Bloque 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento/Unidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 301, Oficina 5B"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Residente *
                  </label>
                  <select
                    required
                    value={formData.residentType}
                    onChange={(e) => setFormData({ ...formData, residentType: e.target.value as Resident['residentType'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="propietario">Propietario</option>
                    <option value="inquilino">Inquilino</option>
                    <option value="familiar">Familiar</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo del residente"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+34 600 123 456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento de Identidad
                </label>
                <input
                  type="text"
                  value={formData.documentId}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="DNI/NIE/Pasaporte"
                />
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
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Residente activo
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingResident ? 'Guardar Cambios' : 'Crear Residente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
