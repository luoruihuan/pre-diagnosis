import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  ExperimentOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      label: '已有素材检测',
      children: [
        { key: '/ark-material/tasks', label: '任务列表' },
      ],
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
        { key: '/base/configs', label: '诊断配置模板' },
        { key: '/base/system', label: '系统配置' },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    // 精确匹配：/new-material 首页（发起前测）
    if (path === '/new-material') return ['/new-material'];
    // 子路径匹配
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find((c) => path.startsWith(c.key) && c.key !== item.key);
        if (child) return [child.key];
        // 匹配父级 index（如 /new-material 本身）
        const indexChild = item.children.find((c) => c.key === item.key && path === item.key);
        if (indexChild) return [indexChild.key];
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
