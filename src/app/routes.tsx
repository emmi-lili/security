import { createBrowserRouter, Navigate } from 'react-router';
import Login from './components/Login';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import Locations from './components/admin/Locations';
import Guards from './components/admin/Guards';
import Residents from './components/admin/Residents';
import Visitors from './components/admin/Visitors';
import Rondas from './components/admin/Rondas';
import AdminNovedades from './components/admin/Novedades';
import GuardLayout from './components/guard/GuardLayout';
import RegisterVisitor from './components/guard/RegisterVisitor';
import PatrolRound from './components/guard/PatrolRound';
import RegisterNovedad from './components/guard/RegisterNovedad';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'locations',
        element: <Locations />,
      },
      {
        path: 'guards',
        element: <Guards />,
      },
      {
        path: 'residents',
        element: <Residents />,
      },
      {
        path: 'visitors',
        element: <Visitors />,
      },
      {
        path: 'checkpoints',
        element: <Navigate to="/admin/rondas" replace />,
      },
      {
        path: 'rondas',
        element: <Rondas />,
      },
      {
        path: 'reports',
        element: <Navigate to="/admin/rondas" replace />,
      },
      {
        path: 'novedades',
        element: <AdminNovedades />,
      },
    ],
  },
  {
    path: '/guard',
    element: <GuardLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/guard/home" replace />,
      },
      {
        path: 'home',
        element: <RegisterVisitor />,
      },
      {
        path: 'patrol',
        element: <PatrolRound />,
      },
      {
        path: 'novedades',
        element: <RegisterNovedad />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);