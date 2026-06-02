import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { isSameLocalDay } from '../../utils/dates';
import { Download, FileText, Filter, MapPin, QrCode, X } from 'lucide-react';

type SortKey = 'timestamp' | 'guard' | 'location' | 'checkpoint';

export default function Reports() {
  const { patrolRounds, users, locations, checkPoints } = useApp();

  const [guardFilter, setGuardFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [checkpointFilter, setCheckpointFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const rows = useMemo(() => {
    const enriched = patrolRounds.map((round) => {
      const guard = users.find((u) => u.id === round.guardId);
      const location = locations.find((l) => l.id === round.locationId);
      const checkpoint = checkPoints.find((cp) => cp.id === round.checkPointId);
      return {
        round,
        guardName: guard?.fullName ?? round.guardId,
        locationName: location?.name ?? '—',
        checkpointName: checkpoint?.name ?? '—',
      };
    });

    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;

    const filtered = enriched.filter(({ round }) => {
      const t = new Date(round.timestamp).getTime();
      if (t < fromTs || t > toTs) return false;
      if (guardFilter !== 'all' && round.guardId !== guardFilter) return false;
      if (locationFilter !== 'all' && round.locationId !== locationFilter) return false;
      if (checkpointFilter !== 'all' && round.checkPointId !== checkpointFilter) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'timestamp':
          cmp =
            new Date(a.round.timestamp).getTime() - new Date(b.round.timestamp).getTime();
          break;
        case 'guard':
          cmp = a.guardName.localeCompare(b.guardName);
          break;
        case 'location':
          cmp = a.locationName.localeCompare(b.locationName);
          break;
        case 'checkpoint':
          cmp = a.checkpointName.localeCompare(b.checkpointName);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [
    patrolRounds,
    users,
    locations,
    checkPoints,
    dateFrom,
    dateTo,
    guardFilter,
    locationFilter,
    checkpointFilter,
    sortKey,
    sortAsc,
  ]);

  const stats = useMemo(() => {
    const uniqueGuards = new Set(rows.map((r) => r.round.guardId)).size;
    const uniqueCheckpoints = new Set(rows.map((r) => r.round.checkPointId)).size;
    const todayCount = rows.filter((r) => isSameLocalDay(r.round.timestamp)).length;
    return { total: rows.length, uniqueGuards, uniqueCheckpoints, todayCount };
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key !== 'timestamp');
    }
  };

  const clearFilters = () => {
    setGuardFilter('all');
    setLocationFilter('all');
    setCheckpointFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    guardFilter !== 'all' ||
    locationFilter !== 'all' ||
    checkpointFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const exportCsv = () => {
    const headers = [
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
    ];

    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? '' : String(value);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = rows.map(({ round, guardName, locationName, checkpointName }) => {
      const date = new Date(round.timestamp);
      const checkpoint = checkPoints.find((cp) => cp.id === round.checkPointId);
      return [
        date.toLocaleDateString('es-ES'),
        date.toLocaleTimeString('es-ES'),
        guardName,
        round.guardId,
        locationName,
        checkpointName,
        checkpoint?.qrCode ?? '',
        round.latitude,
        round.longitude,
        round.device ?? '',
      ]
        .map(escape)
        .join(',');
    });

    // Prepend BOM so Excel opens UTF-8 with accents correctly.
    const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `reporte-rondas-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes de Rondas</h2>
          <p className="text-gray-600 mt-1">
            Historial completo de escaneos de QR registrados
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Exportar CSV ({rows.length})
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total (filtrado)" value={stats.total} icon={FileText} color="bg-blue-500" />
        <StatCard label="Hoy" value={stats.todayCount} icon={QrCode} color="bg-orange-500" />
        <StatCard
          label="Guardias distintos"
          value={stats.uniqueGuards}
          icon={FileText}
          color="bg-purple-500"
        />
        <StatCard
          label="Puntos distintos"
          value={stats.uniqueCheckpoints}
          icon={MapPin}
          color="bg-green-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Guardia</label>
            <select
              value={guardFilter}
              onChange={(e) => setGuardFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {users
                .filter((u) => u.role === 'guard')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lugar</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Punto de control
            </label>
            <select
              value={checkpointFilter}
              onChange={(e) => setCheckpointFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {checkPoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th label="Fecha / Hora" active={sortKey === 'timestamp'} asc={sortAsc} onClick={() => toggleSort('timestamp')} />
                <Th label="Guardia" active={sortKey === 'guard'} asc={sortAsc} onClick={() => toggleSort('guard')} />
                <Th label="Lugar" active={sortKey === 'location'} asc={sortAsc} onClick={() => toggleSort('location')} />
                <Th label="Punto de control" active={sortKey === 'checkpoint'} asc={sortAsc} onClick={() => toggleSort('checkpoint')} />
                <th className="text-left font-medium text-gray-700 px-4 py-3">GPS</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length > 0 ? (
                rows.map(({ round, guardName, locationName, checkpointName }) => {
                  const d = new Date(round.timestamp);
                  const hasGps = round.latitude !== 0 || round.longitude !== 0;
                  return (
                    <tr key={round.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-gray-900">{d.toLocaleDateString('es-ES')}</div>
                        <div className="text-xs text-gray-500">{d.toLocaleTimeString('es-ES')}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{guardName}</td>
                      <td className="px-4 py-3 text-gray-900">{locationName}</td>
                      <td className="px-4 py-3 text-gray-900">{checkpointName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {hasGps
                          ? `${round.latitude.toFixed(4)}, ${round.longitude.toFixed(4)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={round.device}>
                        {round.device ?? '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    {hasActiveFilters
                      ? 'No hay rondas que coincidan con los filtros.'
                      : 'No hay rondas registradas todavía.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <th
      className="text-left font-medium text-gray-700 px-4 py-3 cursor-pointer select-none hover:bg-gray-100"
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <span className="text-blue-600 text-xs">{asc ? '▲' : '▼'}</span>}
      </span>
    </th>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} p-2.5 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
