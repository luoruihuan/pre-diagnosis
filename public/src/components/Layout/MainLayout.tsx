import React from 'react';
import { Layout, Menu, Typography, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '数据统计',
  },
  {
    key: '/material',
    icon: <VideoCameraOutlined />,
    label: '素材管理',
    children: [
      { key: '/material/upload', label: '素材上传' },
      { key: '/material/list', label: '素材列表' },
    ],
  },
  {
    key: '/diagnosis',
    icon: <ExperimentOutlined />,
    label: '前测诊断',
    children: [
      { key: '/diagnosis/create', label: '创建任务' },
      { key: '/diagnosis/list', label: '任务列表' },
    ],
  },
  {
    key: '/config',
    icon: <SettingOutlined />,
    label: '配置管理',
    children: [
      { key: '/config/templates', label: '配置模板' },
    ],
  },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const getSelectedKeys = () => {
    const path = location.pathname;
    // 精确匹配子路由
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find((c) => path.startsWith(c.key));
        if (child) return [child.key];
      }
      if (path === item.key) return [item.key];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/material')) return ['/material'];
    if (path.startsWith('/diagnosis')) return ['/diagnosis'];
    if (path.startsWith('/config')) return ['/config'];
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo / 标题 */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 40, flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: token.colorPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              flexShrink: 0,
            }}
          >
            <ExperimentOutlined style={{ color: '#fff', fontSize: 14 }} />
          </div>
          <Title
            level={5}
            style={{ margin: 0, whiteSpace: 'nowrap', color: token.colorText, fontWeight: 600 }}
          >
            前测诊断平台
          </Title>
        </div>

        {/* 顶部导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            lineHeight: '62px',
          }}

        />
      </Header>

      <Content
        style={{
          padding: '24px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            padding: 24,
            minHeight: 'calc(100vh - 64px - 48px)',
          }}
        >
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default MainLayout;
