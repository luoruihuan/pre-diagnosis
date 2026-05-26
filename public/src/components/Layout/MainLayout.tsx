import React from 'react';
import { Layout, Menu, Typography, theme, Dropdown, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  ExperimentOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: '/dashboard',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: '/new-material',
    icon: <ExperimentOutlined />,
    label: '新素材检测',
    children: [
      { key: '/new-material', label: '发起前测' },
      { key: '/new-material/tasks', label: '任务列表' },
    ],
  },
  {
    key: '/ark-material',
    icon: <InboxOutlined />,
    label: '方舟素材库',
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: '数据统计',
  },
  {
    key: '/base',
    icon: <SettingOutlined />,
    label: '基础数据',
    children: [
      { key: '/base/advertisers', label: '广告主账号' },
      { key: '/base/system', label: '系统配置' },
    ],
  },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/dashboard') return ['/dashboard'];
    if (path === '/new-material') return ['/new-material'];
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(
          (c) => path.startsWith(c.key) && c.key !== item.key,
        );
        if (child) return [child.key];
      }
      if (path === item.key) return [item.key];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/new-material')) return ['/new-material'];
    if (path.startsWith('/ark-material')) return ['/ark-material'];
    if (path.startsWith('/base')) return ['/base'];
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

        {/* 右上角用户信息 + 退出登录 */}
        <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') {
                  // 只清除 JWT token，不清除巨量 OAuth（Redis 里的）
                  localStorage.removeItem('access_token');
                  window.location.href = '/login';
                }
              },
            }}
            placement="bottomRight"
          >
            <Button type="text" icon={<UserOutlined />} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              admin
            </Button>
          </Dropdown>
        </div>
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
