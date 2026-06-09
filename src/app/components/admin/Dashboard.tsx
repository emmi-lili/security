import React, { useMemo } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { isSameLocalDay } from '../../utils/dates';
import { MapPin, Users, UserCheck, QrCode, ClipboardList, ImageIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NovedadTipo } from '../../types';

const TIPO_LABELS: Record<NovedadTipo, string> = {
  incidente: 'Incidente',
  mantenimiento: 'Mantenimiento',
  paquete: 'Paquete',
  emergencia: 'Emergencia',
  acceso: 'Acceso',
  otro: 'Otro',
};

const TIPO_BADGE: Record<NovedadTipo, string> = {
  incidente: 'bg-blue-100 text-blue-700',
  mantenimiento: 'bg-amber-100 text-amber-700',
  paquete: 'bg-gray-100 text-gray-700',
  emergencia: 'bg-red-100 text-red-700',
  acceso: 'bg-purple-100 text-purple-700',
  otro: 'bg-gray-100 text-gray-600',
};

export default function Dashboard() {
  const { locations, users, visitors, patrolRounds, novedades } = useApp();

  const metrics = useMemo(() => {
    const guards = users.filter(u => u.role === 'guard');
    const activeGuards = guards.filter(g => g.active);

    const todayVisitors = visitors.filter((v) => isSameLocalDay(v.checkInTime));
    const todayRounds = patrolRounds.filter((r) => isSameLocalDay(r.timestamp));
    const todayNovedades = novedades.filter((n) => isSameLocalDay(n.createdAt));

    return {
      totalLocations: locations.filter(l => l.active).length,
      totalGuards: guards.length,
      activeGuards: activeGuards.length,
      todayVisitors: todayVisitors.length,
      todayRounds: todayRounds.length,
      todayNovedades: todayNovedades.length,
    };
  }, [locations, users, visitors, patrolRounds, novedades]);

  const visitorsByLocation = useMemo(() => {
    const locationCounts: Record<string, number> = {};
    visitors.forEach(v => {
      const location = locations.find(l => l.id === v.locationId);
      if (location) {
        locationCounts[location.id] = (locationCounts[location.id] || 0) + 1;
      }
    });
    return Object.entries(locationCounts).map(([locationId, count]) => {
      const location = locations.find(l => l.id === locationId);
      return {
        id: locationId,
        name: location?.name || 'Desconocido',
        count,
      };
    });
  }, [visitors, locations]);

  const roundsByGuard = useMemo(() => {
    const guardCounts: Record<string, number> = {};
    patrolRounds.forEach(r => {
      const guard = users.find(u => u.id === r.guardId);
      if (guard) {
        guardCounts[guard.id] = (guardCounts[guard.id] || 0) + 1;
      }
    });
    return Object.entries(guardCounts).map(([guardId, count]) => {
      const guard = users.find(u => u.id === guardId);
      return {
        id: guardId,
        name: guard?.fullName || 'Desconocido',
        count,
      };
    });
  }, [patrolRounds, users]);

  const recentActivity = useMemo(() => {
    const activities: {
      time: string;
      sortKey: string;
      type: string;
      description: string;
      badgeClass: string;
    }[] = [];

    patrolRounds.slice(-5).reverse().forEach(round => {
      const guard = users.find(u => u.id === round.guardId);
      const location = locations.find(l => l.id === round.locationId);
      if (guard && location) {
        activities.push({
          sortKey: round.timestamp,
          time: new Date(round.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: 'Ronda',
          description: `${guard.fullName} — ${location.name}`,
          badgeClass: 'bg-green-100 text-green-700',
        });
      }
    });

    visitors.slice(-5).reverse().forEach(visitor => {
      const location = locations.find(l => l.id === visitor.locationId);
      if (location) {
        activities.push({
          sortKey: visitor.checkInTime,
          time: new Date(visitor.checkInTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: 'Visita',
          description: `${visitor.name} — ${location.name}`,
          badgeClass: 'bg-blue-100 text-blue-700',
        });
      }
    });

    novedades.slice(0, 5).forEach(nov => {
      activities.push({
        sortKey: nov.createdAt,
        time: new Date(nov.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        type: TIPO_LABELS[nov.tipo],
        description: `${nov.guardName} — ${nov.descripcion.slice(0, 60)}${nov.descripcion.length > 60 ? '…' : ''}`,
        badgeClass: TIPO_BADGE[nov.tipo],
      });
    });

    return activities
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, 10);
  }, [visitors, patrolRounds, users, locations, novedades]);

  const recentNovedades = useMemo(() => novedades.slice(0, 5), [novedades]);

  const statCards = [
    { icon: MapPin, label: 'Lugares Activos', value: metrics.totalLocations, color: 'bg-blue-500' },
    { icon: Users, label: 'Guardias Activos', value: `${metrics.activeGuards}/${metrics.totalGuards}`, color: 'bg-green-500' },
    { icon: UserCheck, label: 'Visitas Hoy', value: metrics.todayVisitors, color: 'bg-purple-500' },
    { icon: QrCode, label: 'Rondas Hoy', value: metrics.todayRounds, color: 'bg-orange-500' },
    { icon: ClipboardList, label: 'Novedades Hoy', value: metrics.todayNovedades, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors by Location */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Visitas por Lugar</h3>
          {visitorsByLocation.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitorsByLocation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" key="visitor-count-bar" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Sin datos disponibles
            </div>
          )}
        </div>

        {/* Rounds by Guard */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Rondas por Guardia</h3>
          {roundsByGuard.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roundsByGuard}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" key="rounds-count-bar" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Sin datos disponibles
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Novedades + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Novedades */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Últimas Novedades</h3>
            <Link
              to="/admin/novedades"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas →
            </Link>
          </div>
          {recentNovedades.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentNovedades.map((nov) => (
                <div key={nov.id} className="p-4 flex items-start gap-3">
                  {nov.photoUrls.length > 0 ? (
                    <div className="relative shrink-0">
                      <img
                        src={nov.photoUrls[0]}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                      />
                      {nov.photoUrls.length > 1 && (
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {nov.photoUrls.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_BADGE[nov.tipo]}`}>
                        {TIPO_LABELS[nov.tipo]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 truncate">{nov.descripcion}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {nov.guardName} ·{' '}
                      {new Date(nov.createdAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              No hay novedades registradas hoy
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${activity.badgeClass}`}>
                        {activity.type}
                      </span>
                      <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay actividad reciente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
