import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import {
  LayoutDashboard,
  MapPin,
  Users,
  UserCheck,
  QrCode,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';
import Logo from '../Logo';
import { APP_BUILD_ID } from '../../buildInfo';

export default function AdminLayout() {
  const {
    currentUser,
    logout,
    syncStatus,
    lastSyncAt,
    pendingWrites,
    syncError,
    refreshData,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/locations', icon: MapPin, label: 'Lugares' },
    { path: '/admin/guards', icon: Users, label: 'Guardias' },
    { path: '/admin/residents', icon: Home, label: 'Residentes' },
    { path: '/admin/visitors', icon: UserCheck, label: 'Visitas' },
    { path: '/admin/checkpoints', icon: QrCode, label: 'Puntos de Control' },
    { path: '/admin/rondas', icon: FileText, label: 'Rondas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-3">
              <Logo className="h-12 w-auto" />
              <div>
                <p className="text-xs text-gray-500">Panel Administrativo</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <SyncBadge
              status={syncStatus}
              lastSyncAt={lastSyncAt}
              pendingWrites={pendingWrites}
              syncError={syncError}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{currentUser?.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[61px] left-0 h-[calc(100vh-61px)] bg-white border-r border-gray-200 w-64 transition-transform duration-300 z-30 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-4 pb-4 text-[10px] text-gray-400" title="Versión desplegada">
            Build {APP_BUILD_ID}
          </p>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SyncBadge({
  status,
  lastSyncAt,
  pendingWrites,
  syncError,
  refreshing,
  onRefresh,
}: {
  status: 'disabled' | 'loading' | 'ready' | 'error';
  lastSyncAt: Date | null;
  pendingWrites: number;
  syncError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const effective = refreshing && status !== 'disabled' ? 'loading' : status;

  const config = {
    disabled: {
      icon: CloudOff,
      label: 'Sin base de datos',
      cls: 'bg-red-50 text-red-700 border-red-200',
      tooltip:
        'Este dispositivo no tiene configuradas VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
        'Los datos que crees aquí se guardan SOLO en este navegador y no se verán en otros dispositivos.',
    },
    loading: {
      icon: RefreshCw,
      label: 'Sincronizando…',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      tooltip: 'Descargando la información más reciente desde Supabase.',
    },
    ready: {
      icon: Cloud,
      label: 'Sincronizado',
      cls: 'bg-green-50 text-green-700 border-green-200',
      tooltip: lastSyncAt
        ? `Última sincronización: ${lastSyncAt.toLocaleTimeString()}`
        : 'Datos sincronizados con Supabase.',
    },
    error: {
      icon: AlertTriangle,
      label: 'Error de sync',
      cls: 'bg-red-50 text-red-700 border-red-200',
      tooltip: syncError
        ? `Falló la sincronización: ${syncError}`
        : 'Falló la sincronización con Supabase. Revisa la consola del navegador.',
    },
  }[effective];

  const Icon = config.icon;
  const animate = effective === 'loading' ? 'animate-spin' : '';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing || status === 'disabled'}
        title={config.tooltip}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${config.cls} disabled:opacity-70 disabled:cursor-not-allowed hover:brightness-95`}
      >
        <Icon className={`w-3.5 h-3.5 ${animate}`} />
        <span className="hidden sm:inline">{config.label}</span>
        {pendingWrites > 0 && (
          <span className="ml-1 px-1.5 rounded-full bg-white/70 text-[10px] font-semibold">
            {pendingWrites}
          </span>
        )}
      </button>
    </div>
  );
}