import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { User, Lock, AlertCircle } from 'lucide-react';
import Logo from './Logo';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setSubmitting(true);
    try {
      const success = await login(username, password);
      if (success) {
        const currentUser = JSON.parse(
          localStorage.getItem('security_app_current_user') || '{}'
        );
        if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
          navigate('/admin/dashboard');
        } else if (currentUser.role === 'guard') {
          navigate('/guard/home');
        }
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <Logo className="h-20 sm:h-24 w-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600 text-center px-2">
              Sistema de Gestión y Supervisión
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base transition-all"
                  placeholder="Ingrese su usuario"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base transition-all"
                  placeholder="Ingrese su contraseña"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start sm:items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Ingresando…' : 'Iniciar Sesión'}
            </button>
          </form>

        </div>

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-blue-100 mt-4 sm:mt-6 px-4">
          © 2026 SEVIGPRO. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}