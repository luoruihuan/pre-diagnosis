import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Space } from 'antd';
import {
  VideoCameraOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import { observer } from 'mobx-react-lite';
import diagnosisStore from '../../stores/diagnosisStore';
import materialStore from '../../stores/materialStore';
import TaskStatusBadge from '../../components/TaskStatusBadge';
import dayjs from 'dayjs';

const Dashboard: React.FC = observer(() => {
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // 加载素材统计
    await materialStore.fetchMaterials({ page: 1, pageSize: 1, status: 'ACTIVE' });

    // 加载任务统计
    await diagnosisStore.fetchTasks({ page: 1, pageSize: 10 });

    // 计算统计数据
    const completedCount = diagnosisStore.tasks.filter((t) => t.status === 'COMPLETED').length;
    const pendingCount = diagnosisStore.tasks.filter(
      (t) => t.status === 'PENDING' || t.status === 'RUNNING'
    ).length;

    setStats({
      totalMaterials: materialStore.total,
      totalTasks: diagnosisStore.total,
      completedTasks: completedCount,
      pendingTasks: pendingCount,
    });
  };

  // 最近任务列表
  const recentTaskColumns = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
    },
    {
      title: '视频标题',
      dataIndex: 'videoTitle',
      key: 'videoTitle',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => <TaskStatusBadge status={status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // TODO: 对接后端月度统计接口
  // 暂时隐藏图表，等待后端提供统计数据
  const chartData: any[] = [];

  const chartConfig = {
    data: chartData,
    xField: 'month',
    yField: 'count',
    label: {
      position: 'top' as const,
      style: {
        fill: '#000000',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      month: {
        alias: '月份',
      },
      count: {
        alias: '任务数',
      },
    },
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="素材总数"
              value={stats.totalMaterials}
              prefix={<VideoCameraOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={stats.totalTasks}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completedTasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待执行"
              value={stats.pendingTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务趋势图 - 暂时隐藏，等待后端统计接口 */}
      {chartData.length > 0 && (
        <Card title="任务趋势">
          <Column {...chartConfig} />
        </Card>
      )}

      {/* 最近任务 */}
      <Card title="最近任务">
        <Table
          columns={recentTaskColumns}
          dataSource={diagnosisStore.tasks.slice(0, 5)}
          rowKey="id"
          pagination={false}
          loading={diagnosisStore.loading}
        />
      </Card>
    </Space>
  );
});

export default Dashboard;
