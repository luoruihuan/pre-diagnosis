import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import MaterialUpload from './pages/Material/Upload';
import MaterialList from './pages/Material/List';
import DiagnosisCreate from './pages/Diagnosis/Create';
import DiagnosisList from './pages/Diagnosis/List';
import DiagnosisDetail from './pages/Diagnosis/Detail';
import ConfigTemplates from './pages/Config/Templates';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'material',
        children: [
          {
            index: true,
            element: <Navigate to="/material/list" replace />,
          },
          {
            path: 'upload',
            element: <MaterialUpload />,
          },
          {
            path: 'list',
            element: <MaterialList />,
          },
        ],
      },
      {
        path: 'diagnosis',
        children: [
          {
            index: true,
            element: <Navigate to="/diagnosis/list" replace />,
          },
          {
            path: 'create',
            element: <DiagnosisCreate />,
          },
          {
            path: 'list',
            element: <DiagnosisList />,
          },
          {
            path: 'detail/:id',
            element: <DiagnosisDetail />,
          },
        ],
      },
      {
        path: 'config',
        children: [
          {
            index: true,
            element: <Navigate to="/config/templates" replace />,
          },
          {
            path: 'templates',
            element: <ConfigTemplates />,
          },
        ],
      },
    ],
  },
]);

export default router;
