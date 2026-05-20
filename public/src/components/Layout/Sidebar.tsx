import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
        {
          key: '/material/upload',
          label: '素材上传',
        },
        {
          key: '/material/list',
          label: '素材列表',
        },
      ],
    },
    {
      key: '/diagnosis',
      icon: <ExperimentOutlined />,
      label: '前测诊断',
      children: [
        {
          key: '/diagnosis/create',
          label: '创建任务',
        },
        {
          key: '/diagnosis/list',
          label: '任务列表',
        },
      ],
    },
    {
      key: '/config',
      icon: <SettingOutlined />,
      label: '配置管理',
      children: [
        {
          key: '/config/templates',
          label: '配置模板',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    return [path];
  };

  // 获取当前展开的菜单项
  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/material')) return ['/material'];
    if (path.startsWith('/diagnosis')) return ['/diagnosis'];
    if (path.startsWith('/config')) return ['/config'];
    return [];
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={getSelectedKeys()}
      defaultOpenKeys={getOpenKeys()}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
};

export default Sidebar;
