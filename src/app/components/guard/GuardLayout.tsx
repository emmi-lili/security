import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { UserCheck, QrCode, LogOut } from 'lucide-react';
import Logo from '../Logo';

export default function GuardLayout() {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/guard/home', icon: UserCheck, label: 'Registrar Visita' },
    { path: '/guard/patrol', icon: QrCode, label: 'Registrar Ronda' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <header className="bg-blue-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Logo className="h-12 w-auto" />
              <div>
                <p className="text-xs text-blue-100">Panel de Guardia</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
          <div className="bg-blue-700 rounded-lg px-3 py-2">
            <p className="text-sm font-medium">{currentUser?.fullName}</p>
            <p className="text-xs text-blue-200">ID: {currentUser?.id}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-2 gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}