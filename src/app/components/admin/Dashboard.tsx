import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { MapPin, Users, UserCheck, QrCode, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const { locations, users, visitors, patrolRounds } = useApp();

  const metrics = useMemo(() => {
    const guards = users.filter(u => u.role === 'guard');
    const activeGuards = guards.filter(g => g.active);
    
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = visitors.filter(v => v.checkInTime.startsWith(today));
    const todayRounds = patrolRounds.filter(r => r.timestamp.startsWith(today));

    return {
      totalLocations: locations.filter(l => l.active).length,
      totalGuards: guards.length,
      activeGuards: activeGuards.length,
      todayVisitors: todayVisitors.length,
      todayRounds: todayRounds.length,
    };
  }, [locations, users, visitors, patrolRounds]);

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
        count 
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
        count 
      };
    });
  }, [patrolRounds, users]);

  const recentActivity = useMemo(() => {
    const activities: { time: string; type: string; description: string }[] = [];
    
    patrolRounds.slice(-5).reverse().forEach(round => {
      const guard = users.find(u => u.id === round.guardId);
      const location = locations.find(l => l.id === round.locationId);
      if (guard && location) {
        activities.push({
          time: new Date(round.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: 'Ronda',
          description: `${guard.fullName} - ${location.name}`,
        });
      }
    });

    visitors.slice(-5).reverse().forEach(visitor => {
      const location = locations.find(l => l.id === visitor.locationId);
      if (location) {
        activities.push({
          time: new Date(visitor.checkInTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: 'Visita',
          description: `${visitor.name} - ${location.name}`,
        });
      }
    });

    return activities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
  }, [visitors, patrolRounds, users, locations]);

  const statCards = [
    { icon: MapPin, label: 'Lugares Activos', value: metrics.totalLocations, color: 'bg-blue-500' },
    { icon: Users, label: 'Guardias Activos', value: `${metrics.activeGuards}/${metrics.totalGuards}`, color: 'bg-green-500' },
    { icon: UserCheck, label: 'Visitas Hoy', value: metrics.todayVisitors, color: 'bg-purple-500' },
    { icon: QrCode, label: 'Rondas Hoy', value: metrics.todayRounds, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
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

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.type === 'Ronda' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.type}
                    </div>
                    <p className="text-sm text-gray-900">{activity.description}</p>
                  </div>
                  <p className="text-sm text-gray-500">{activity.time}</p>
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
  );
}