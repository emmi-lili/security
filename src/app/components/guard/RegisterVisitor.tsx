import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Camera,
  User,
  CreditCard,
  Building,
  Users,
  FileText,
  Car,
  CheckCircle,
  Search,
  MapPin,
} from 'lucide-react';
import { Visitor } from '../../types/index';

export default function RegisterVisitor() {
  const { currentUser, locations, addVisitor, findActiveVisit, findVisitorProfile } =
    useApp();

  // Un guardia activo está asignado a un solo condominio (location.guardIds).
  const assignedLocation = useMemo(() => {
    if (!currentUser?.id) return null;
    const assigned = locations.filter(
      (loc) => loc.active && loc.guardIds.includes(currentUser.id)
    );
    return assigned[0] ?? null;
  }, [locations, currentUser?.id]);

  const emptyVisitFields = useCallback(
    () => ({
      name: '',
      documentId: '',
      department: '',
      hostName: '',
      reason: '',
      vehiclePlate: '',
      vehicleType: '',
      locationId: assignedLocation?.id ?? '',
      notes: '',
    }),
    [assignedLocation?.id]
  );

  // States
  const [step, setStep] = useState<'idCard' | 'form'>('idCard');
  const [idCardInput, setIdCardInput] = useState('');
  const [isRecurringVisitor, setIsRecurringVisitor] = useState(false);
  const [existingVisitor, setExistingVisitor] = useState<Visitor | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [formData, setFormData] = useState(emptyVisitFields);

  useEffect(() => {
    if (assignedLocation?.id) {
      setFormData((prev) =>
        prev.locationId === assignedLocation.id
          ? prev
          : { ...prev, locationId: assignedLocation.id }
      );
    }
  }, [assignedLocation?.id]);

  const noAssignedLocation = !assignedLocation;

  // Handle ID Card search
  const handleIdCardSearch = () => {
    if (!idCardInput.trim() || !assignedLocation) return;

    setSearchError('');
    const card = idCardInput.trim();

    // Solo bloquea si ya tiene visita abierta en ESTE condominio (sin salida).
    const activeHere = findActiveVisit(card, assignedLocation.id);
    if (activeHere) {
      setSearchError(
        `Este visitante ya tiene una visita activa en ${assignedLocation.name}. ` +
          'Si ya salió, un administrador debe registrar la salida; si es una nueva entrada, espere a cerrar la visita anterior.'
      );
      return;
    }

    // Perfil desde cualquier condominio anterior (solo autocompleta datos personales).
    const profile = findVisitorProfile(card);

    if (profile) {
      setExistingVisitor(profile);
      setIsRecurringVisitor(true);
      setFormData({
        ...emptyVisitFields(),
        name: profile.name,
        documentId: profile.documentId,
        vehiclePlate: profile.vehiclePlate || '',
        vehicleType: profile.vehicleType || '',
      });
      setPhotoDataUrl(profile.photoUrl || null);
    } else {
      setExistingVisitor(null);
      setIsRecurringVisitor(false);
      setFormData({
        ...emptyVisitFields(),
        documentId: card,
      });
      setPhotoDataUrl(null);
    }

    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedLocation) return;

    const newVisitor: Visitor = {
      id: `vis-${Date.now()}`,
      idCard: idCardInput.trim(),
      name: formData.name,
      documentId: formData.documentId,
      department: formData.department,
      hostName: formData.hostName,
      reason: formData.reason,
      vehiclePlate: formData.vehiclePlate || undefined,
      vehicleType: formData.vehicleType || undefined,
      checkInTime: new Date().toISOString(),
      guardId: currentUser?.id || '',
      locationId: assignedLocation.id,
      notes: formData.notes || undefined,
      photoUrl: photoDataUrl || undefined,
    };

    addVisitor(newVisitor);

    // Show success message
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      // Reset everything
      setStep('idCard');
      setIdCardInput('');
      setIsRecurringVisitor(false);
      setExistingVisitor(null);
      setFormData(emptyVisitFields());
      setPhotoDataUrl(null);
    }, 2000);
  };

  const handleTakePhoto = () => {
    setShowCamera(true);
  };

  const simulatePhotoCapture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Foto del visitante', 100, 100);
      setPhotoDataUrl(canvas.toDataURL());
    }
    setShowCamera(false);
  };

  const handleBackToIdCard = () => {
    setStep('idCard');
    setIdCardInput('');
    setSearchError('');
    setIsRecurringVisitor(false);
    setExistingVisitor(null);
    setFormData(emptyVisitFields());
    setPhotoDataUrl(null);
  };

  const assignedLocationBanner = noAssignedLocation ? (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
      <strong>Sin lugar asignado.</strong> Pide al administrador que te asigne a un
      condominio desde el panel de Lugares → Guardias asignados.
    </div>
  ) : (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
      <div>
        <p className="text-xs font-medium text-blue-800 uppercase tracking-wide">
          Tu lugar de trabajo
        </p>
        <p className="font-semibold text-gray-900">{assignedLocation!.name}</p>
        {assignedLocation!.address ? (
          <p className="text-sm text-gray-600">{assignedLocation!.address}</p>
        ) : null}
      </div>
    </div>
  );

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 p-6 rounded-full mb-4">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Visita Registrada!</h2>
        <p className="text-gray-600">El registro se ha guardado correctamente</p>
      </div>
    );
  }

  // Step 1: ID Card Input
  if (step === 'idCard') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registrar Visitante</h2>
          <p className="text-sm text-gray-600">Ingrese el número de carnet o cédula del visitante</p>
        </div>

        <div className="mb-4">{assignedLocationBanner}</div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Número de Carnet/Cédula</h3>
            <p className="text-sm text-gray-600">
              Si el visitante ya ha ingresado antes, sus datos se cargarán automáticamente
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={idCardInput}
                onChange={(e) => setIdCardInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleIdCardSearch()}
                className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 12345678A"
                autoFocus
              />
            </div>

            <button
              onClick={handleIdCardSearch}
              disabled={!idCardInput.trim() || noAssignedLocation}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Continuar
            </button>

            {searchError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{searchError}</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> El carnet es el identificador único del visitante. Si ya visitó antes, sus datos personales se cargarán automáticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Form (with or without autocomplete)
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {isRecurringVisitor ? 'Visitante Recurrente' : 'Nuevo Visitante'}
            </h2>
            <p className="text-sm text-gray-600">Carnet: {idCardInput}</p>
          </div>
          <button
            onClick={handleBackToIdCard}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Cambiar carnet
          </button>
        </div>
        
        {isRecurringVisitor && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Visitante conocido</p>
              <p className="text-sm text-green-700">
                Datos personales cargados de visitas anteriores. Esta será una{' '}
                <strong>nueva visita</strong> en {assignedLocation?.name}.
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Fotografía {isRecurringVisitor && <span className="text-gray-500">(Opcional - ya existe foto)</span>}
          </label>
          {photoDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={photoDataUrl} alt="Visitor" className="w-32 h-32 rounded-lg object-cover border-2 border-gray-300" />
              <button
                type="button"
                onClick={handleTakePhoto}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Tomar nueva foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleTakePhoto}
              className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Camera className="w-8 h-8 text-gray-400" />
              <span className="text-gray-600">Tomar fotografía</span>
            </button>
          )}
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Información Personal 
            {isRecurringVisitor && <span className="text-sm font-normal text-green-600 ml-2">(Autocompletado)</span>}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base ${
                  isRecurringVisitor ? 'bg-green-50 border-green-300' : ''
                }`}
                placeholder="Nombre del visitante"
                readOnly={isRecurringVisitor}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documento de Identidad *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.documentId}
                onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base ${
                  isRecurringVisitor ? 'bg-green-50 border-green-300' : ''
                }`}
                placeholder="DNI/NIE/Pasaporte"
                readOnly={isRecurringVisitor}
              />
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Detalles de la Visita Actual</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lugar
            </label>
            {assignedLocationBanner}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departamento/Área *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="Ej: Apto 301, Oficina 5B"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Persona que Recibe *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.hostName}
                onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="Nombre del anfitrión"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la Visita *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                rows={2}
                placeholder="Descripción del motivo"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information (Optional) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Vehículo (Opcional)</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placa del Vehículo
            </label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="ABC-1234"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Vehículo
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
            >
              <option value="">Seleccionar tipo</option>
              <option>Automóvil</option>
              <option>Motocicleta</option>
              <option>Camioneta</option>
              <option>Camión</option>
              <option>Bicicleta</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBackToIdCard}
            className="flex-1 bg-gray-200 text-gray-900 py-4 rounded-xl font-semibold text-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={noAssignedLocation}
            className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Registrar Visita
          </button>
        </div>
      </form>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="w-16 h-16 mx-auto mb-4" />
              <p className="mb-2">Cámara activada</p>
              <p className="text-sm text-gray-400">En una app real, aquí aparecería la cámara del dispositivo</p>
            </div>
          </div>
          <div className="bg-white p-4 space-y-2">
            <button
              onClick={simulatePhotoCapture}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold"
            >
              Capturar Foto
            </button>
            <button
              onClick={() => setShowCamera(false)}
              className="w-full bg-gray-200 text-gray-900 py-4 rounded-lg font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
