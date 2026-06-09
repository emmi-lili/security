import React, { useState, useMemo } from 'react';
import { Search, Download, FileText } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Novedad, NovedadTipo, NovedadTurno } from '../../types';
import { downloadNovedadPdf } from '../../utils/exportNovedad';

const TIPO_LABELS: Record<NovedadTipo, string> = {
  incidente: 'Incidente',
  mantenimiento: 'Mantenimiento',
  paquete: 'Paquete / Encomienda',
  emergencia: 'Emergencia',
  acceso: 'Acceso',
  otro: 'Otro',
};

const TURNO_LABELS: Record<NovedadTurno, string> = {
  dia: '☀️ Día',
  noche: '🌙 Noche',
};

const TIPO_BADGE: Record<NovedadTipo, string> = {
  incidente: 'bg-blue-100 text-blue-700',
  mantenimiento: 'bg-amber-100 text-amber-700',
  paquete: 'bg-gray-100 text-gray-700',
  emergencia: 'bg-red-100 text-red-700',
  acceso: 'bg-purple-100 text-purple-700',
  otro: 'bg-gray-100 text-gray-600',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function Novedades() {
  const { novedades } = useApp();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<NovedadTipo | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return novedades.filter((n) => {
      const matchSearch =
        !q ||
        n.guardName.toLowerCase().includes(q) ||
        n.descripcion.toLowerCase().includes(q) ||
        TIPO_LABELS[n.tipo].toLowerCase().includes(q);
      const matchTipo = filterTipo === 'todos' || n.tipo === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [novedades, search, filterTipo]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novedades</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial de reportes generados por los guardias
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por guardia, tipo o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as NovedadTipo | 'todos')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option value="todos">Todos los tipos</option>
          {(Object.keys(TIPO_LABELS) as NovedadTipo[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['emergencia', 'incidente', 'mantenimiento', 'paquete'] as NovedadTipo[]).map((t) => {
          const count = novedades.filter((n) => n.tipo === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterTipo(filterTipo === t ? 'todos' : t)}
              className={`rounded-xl p-3 text-left border transition-colors ${
                filterTipo === t
                  ? `${TIPO_BADGE[t]} border-current`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-current opacity-70">{TIPO_LABELS[t]}</p>
            </button>
          );
        })}
      </div>

      {/* Table / cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {novedades.length === 0
              ? 'Aún no hay novedades registradas.'
              : 'No hay novedades que coincidan con el filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((novedad) => (
            <NovedadCard
              key={novedad.id}
              novedad={novedad}
              expanded={expandedId === novedad.id}
              onToggle={() =>
                setExpandedId(expandedId === novedad.id ? null : novedad.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NovedadCard({
  novedad,
  expanded,
  onToggle,
}: {
  novedad: Novedad;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { date, time } = formatDateTime(novedad.createdAt);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TIPO_BADGE[novedad.tipo]}`}
            >
              {TIPO_LABELS[novedad.tipo]}
            </span>
            <span className="text-xs text-gray-500">{TURNO_LABELS[novedad.turno]}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1 truncate">
            {novedad.guardName}
          </p>
          <p className="text-xs text-gray-400">
            {novedad.ubicacion ? `${novedad.ubicacion} · ` : ''}{date} — {time}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          {/* Photos */}
          {novedad.photoUrls.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Fotos adjuntas ({novedad.photoUrls.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {novedad.photoUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={url}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-32 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2">
            {novedad.locationName && (
              <span className="text-xs text-gray-500">🏢 {novedad.locationName}</span>
            )}
            {novedad.ubicacion && (
              <span className="text-xs text-gray-500">📍 {novedad.ubicacion}</span>
            )}
          </div>

          {/* Descripción */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{novedad.descripcion}</p>
          </div>

          {/* Medidas tomadas */}
          {novedad.medidasTomadas && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Medidas tomadas</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{novedad.medidasTomadas}</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-1">
            <button
              onClick={() => void downloadNovedadPdf(novedad)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
