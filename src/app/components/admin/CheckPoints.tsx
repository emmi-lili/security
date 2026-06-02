import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Plus, QrCode, MapPin, Download, Edit } from 'lucide-react';
import { CheckPoint } from '../../types/index';
import QRCodeStyling from 'qr-code-styling';

export default function CheckPoints() {
  const { checkPoints, locations, addCheckPoint, updateCheckPoint, patrolRounds, users } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingCheckPoint, setEditingCheckPoint] = useState<CheckPoint | null>(null);
  const [selectedQR, setSelectedQR] = useState<CheckPoint | null>(null);

  const handleEdit = (checkPoint: CheckPoint) => {
    setEditingCheckPoint(checkPoint);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingCheckPoint(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Puntos de Control</h2>
          <p className="text-gray-600 mt-1">Gestiona los puntos de ronda con códigos QR</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Punto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checkPoints.map((checkpoint) => {
          const location = locations.find(l => l.id === checkpoint.locationId);
          const scans = patrolRounds.filter(r => r.checkPointId === checkpoint.id);
          const lastScan = scans.length > 0 ? scans[scans.length - 1] : null;
          const lastGuard = lastScan ? users.find(u => u.id === lastScan.guardId) : null;

          return (
            <div key={checkpoint.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <QrCode className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{checkpoint.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {location?.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(checkpoint)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Código:</strong> {checkpoint.qrCode}
                </p>
                {checkpoint.description && (
                  <p className="text-sm text-gray-600">{checkpoint.description}</p>
                )}
              </div>

              {lastScan && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-green-900 mb-1">Último escaneo</p>
                  <p className="text-xs text-green-700">
                    {lastGuard?.fullName} - {new Date(lastScan.timestamp).toLocaleString('es-ES')}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">{scans.length} escaneos</span>
                <button
                  onClick={() => setSelectedQR(checkpoint)}
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

      {showModal && (
        <CheckPointModal
          checkPoint={editingCheckPoint}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            if (editingCheckPoint) {
              updateCheckPoint(editingCheckPoint.id, data);
            } else {
              const newCheckPoint: CheckPoint = {
                id: `cp-${Date.now()}`,
                ...data,
                qrCode: `QR-${data.locationId}-${Date.now()}`,
                active: true,
                createdAt: new Date().toISOString(),
              } as CheckPoint;
              addCheckPoint(newCheckPoint);
            }
            setShowModal(false);
          }}
        />
      )}

      {selectedQR && (
        <QRCodeModal
          checkPoint={selectedQR}
          onClose={() => setSelectedQR(null)}
        />
      )}
    </div>
  );
}

function CheckPointModal({ checkPoint, onClose, onSave }: {
  checkPoint: CheckPoint | null;
  onClose: () => void;
  onSave: (data: Partial<CheckPoint>) => void;
}) {
  const { locations } = useApp();

  const [formData, setFormData] = useState({
    name: checkPoint?.name || '',
    locationId: checkPoint?.locationId || '',
    description: checkPoint?.description || '',
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
              Nombre del Punto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Ronda Piscina"
            />
          </div>

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
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

function QRCodeModal({ checkPoint, onClose }: {
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
        dotsOptions: {
          color: '#1e40af',
          type: 'rounded'
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 10
        }
      });
      qrCodeRef.current.append(qrRef.current);
    }
  }, [checkPoint.qrCode]);

  const handleDownload = () => {
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
        name: `QR_${checkPoint.name.replace(/\s+/g, '_')}`,
        extension: 'png'
      });
    }
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
