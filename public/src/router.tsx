import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import AuthGuard from './components/AuthGuard';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import MaterialUpload from './pages/Material/Upload';
import MaterialList from './pages/Material/List';
import DiagnosisCreate from './pages/Diagnosis/Create';
import DiagnosisList from './pages/Diagnosis/List';
import DiagnosisDetail from './pages/Diagnosis/Detail';
import ConfigTemplates from './pages/Config/Templates';
import NewMaterialCreate from './pages/NewMaterial/Create';
import NewMaterialList from './pages/NewMaterial/List';
import Placeholder from './pages/Placeholder';
import Statistics from './pages/Statistics';
import Advertisers from './pages/Base/Advertisers';
import BaseConfigs from './pages/Base/Configs';
import SystemConfig from './pages/Base/System';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/oauth/callback',
    element: <OAuthCallback />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/new-material" replace />,
      },
      // ── 新素材检测 ──────────────────────────────────────
      {
        path: 'new-material',
        children: [
          {
            index: true,
            element: <NewMaterialCreate />,
          },
          {
            path: 'tasks',
            element: <NewMaterialList source="NEW" />,
          },
          {
            path: 'tasks/:id',
            element: <DiagnosisDetail />,
          },
        ],
      },
      // ── 已有素材检测 ────────────────────────────────────
      {
        path: 'ark-material',
        children: [
          {
            index: true,
            element: <Placeholder />,
          },
          {
            path: 'tasks',
            element: <NewMaterialList source="ARK" />,
          },
        ],
      },
      // ── 数据统计 ────────────────────────────────────────
      {
        path: 'statistics',
        element: <Statistics />,
      },
      // ── 基础数据 ────────────────────────────────────────
      {
        path: 'base',
        children: [
          {
            path: 'advertisers',
            element: <Advertisers />,
          },
          {
            path: 'configs',
            element: <BaseConfigs />,
          },
          {
            path: 'system',
            element: <SystemConfig />,
          },
        ],
      },
      // ── Dashboard（保留）────────────────────────────────
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      // ── 旧路由（保留兼容，侧边栏不显示）────────────────
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
