import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { isSameLocalDay } from '../../utils/dates';
import { exportPatrolRoundsToXlsx } from '../../utils/exportPatrolRounds';
import { exportVisitorsToXlsx } from '../../utils/exportVisitors';
import { Download, FileText, Filter, MapPin, QrCode, UserCheck, X } from 'lucide-react';

type ReportKind = 'visitas' | 'rondas';
type SortKey = 'timestamp' | 'guard' | 'location' | 'checkpoint';

export default function Reports() {
  const { patrolRounds, users, locations, checkPoints, visitors } = useApp();
  const [reportKind, setReportKind] = useState<ReportKind>('visitas');

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

  const [visitorLocationFilter, setVisitorLocationFilter] = useState('all');
  const [visitorDateFrom, setVisitorDateFrom] = useState('');
  const [visitorDateTo, setVisitorDateTo] = useState('');

  const visitorRows = useMemo(() => {
    const fromTs = visitorDateFrom
      ? new Date(`${visitorDateFrom}T00:00:00`).getTime()
      : -Infinity;
    const toTs = visitorDateTo
      ? new Date(`${visitorDateTo}T23:59:59.999`).getTime()
      : Infinity;

    return visitors.filter((v) => {
      const t = new Date(v.checkInTime).getTime();
      if (t < fromTs || t > toTs) return false;
      if (visitorLocationFilter !== 'all' && v.locationId !== visitorLocationFilter) {
        return false;
      }
      return true;
    });
  }, [visitors, visitorDateFrom, visitorDateTo, visitorLocationFilter]);

  const exportRondasXlsx = () => {
    exportPatrolRoundsToXlsx(rows, checkPoints);
  };

  const exportVisitasXlsx = () => {
    exportVisitorsToXlsx(visitorRows, locations);
  };

  const isVisitas = reportKind === 'visitas';
  const exportCount = isVisitas ? visitorRows.length : rows.length;
  const handleExport = isVisitas ? exportVisitasXlsx : exportRondasXlsx;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
          <p className="text-gray-600 mt-1">
            {isVisitas
              ? 'Exporta el historial de visitantes en Excel (.xlsx)'
              : 'Historial de escaneos QR en rondas'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportCount === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
        >
          <Download className="w-5 h-5" />
          Exportar XLSX ({exportCount})
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setReportKind('visitas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isVisitas ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Visitas
        </button>
        <button
          type="button"
          onClick={() => setReportKind('rondas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isVisitas ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Rondas
        </button>
      </div>

      {isVisitas ? (
        <VisitasReportPanel
          count={visitorRows.length}
          locationFilter={visitorLocationFilter}
          onLocationFilter={setVisitorLocationFilter}
          dateFrom={visitorDateFrom}
          onDateFrom={setVisitorDateFrom}
          dateTo={visitorDateTo}
          onDateTo={setVisitorDateTo}
          locations={locations}
        />
      ) : null}

      {!isVisitas ? (
        <>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total (filtrado)"
          value={stats.total}
          icon={FileText}
          color="bg-blue-500"
        />
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
        </>
      ) : null}
    </div>
  );
}

function VisitasReportPanel({
  count,
  locationFilter,
  onLocationFilter,
  dateFrom,
  onDateFrom,
  dateTo,
  onDateTo,
  locations,
}: {
  count: number;
  locationFilter: string;
  onLocationFilter: (v: string) => void;
  dateFrom: string;
  onDateFrom: (v: string) => void;
  dateTo: string;
  onDateTo: (v: string) => void;
  locations: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Visitas (filtradas)" value={count} icon={UserCheck} color="bg-purple-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex items-center gap-2 text-gray-700 mb-4">
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filtros del reporte</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lugar</label>
            <select
              value={locationFilter}
              onChange={(e) => onLocationFilter(e.target.value)}
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
        </div>
        <p className="text-sm text-gray-500 mt-4">
          El archivo descargado será <strong>visitas_YYYY-MM-DD.xlsx</strong> (Excel, no CSV).
          También puedes exportar desde el menú <strong>Visitas</strong>.
        </p>
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
