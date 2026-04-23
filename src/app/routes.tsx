import { createBrowserRouter, Navigate } from 'react-router';
import Login from './components/Login';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import Locations from './components/admin/Locations';
import Guards from './components/admin/Guards';
import Residents from './components/admin/Residents';
import Visitors from './components/admin/Visitors';
import CheckPoints from './components/admin/CheckPoints';
import Reports from './components/admin/Reports';
import GuardLayout from './components/guard/GuardLayout';
import RegisterVisitor from './components/guard/RegisterVisitor';
import PatrolRound from './components/guard/PatrolRound';

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
        element: <CheckPoints />,
      },
      {
        path: 'reports',
        element: <Reports />,
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
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);