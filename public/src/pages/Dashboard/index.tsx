import React, { useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Button, Tag, Badge } from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import diagnosisStore from '../../stores/diagnosisStore';
import ResultTag from '../../components/ResultTag';
import type { DiagnosisTask } from '../../types/diagnosis';
import dayjs from 'dayjs';

// 任务状态 Badge 配置
const STATUS_CONFIG: Record<
  string,
  { status: 'processing' | 'success' | 'error' | 'default'; label: string }
> = {
  PENDING: { status: 'processing', label: '检测中' },
  RUNNING: { status: 'processing', label: '检测中' },
  SUCCESS: { status: 'success', label: '已完成' },
  COMPLETED: { status: 'success', label: '已完成' },
  FAILED: { status: 'error', label: '失败' },
  TIMEOUT: { status: 'default', label: '超时' },
};

const Dashboard: React.FC = observer(() => {
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = () => {
    diagnosisStore.fetchTasks({ page: 1, pageSize: 20 });
  };

  useEffect(() => {
    loadData();
  }, []);

  // 自动5s轮询 PENDING/RUNNING 任务
  useEffect(() => {
    const tasks = diagnosisStore.tasks ?? [];
    const hasPending = tasks.some(
      (t) => t.status === 'PENDING' || t.status === 'RUNNING',
    );

    if (hasPending && !pollingTimerRef.current) {
      pollingTimerRef.current = setInterval(loadData, 5000);
    } else if (!hasPending && pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [(diagnosisStore.tasks ?? []).length]);

  const tasks = diagnosisStore.tasks ?? [];

  // 统计卡片数据（从 tasks 数组计算）
  const runningCount = tasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'RUNNING',
  ).length;
  const completedCount = tasks.filter(
    (t) => t.status === 'SUCCESS' || t.status === 'COMPLETED',
  ).length;
  const failedCount = tasks.filter((t) => t.status === 'FAILED').length;

  const columns = [
    {
      title: '视频ID',
      dataIndex: 'videoStrId',
      key: 'videoStrId',
      ellipsis: true,
      render: (v: string, record: DiagnosisTask) => v || String(record.videoId),
    },
    {
      title: '广告主ID',
      dataIndex: 'advertiserId',
      key: 'advertiserId',
      width: 110,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => {
        if (source === 'NEW') return <Tag color="blue">新素材</Tag>;
        if (source === 'ARK') return <Tag color="green">已有素材</Tag>;
        return <Tag color="default">{source ?? '-'}</Tag>;
      },
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] ?? {
          status: 'default' as const,
          label: status,
        };
        return <Badge status={cfg.status} text={cfg.label} />;
      },
    },
    {
      title: 'AD优质',
      key: 'adQuality',
      width: 110,
      render: (_: unknown, record: DiagnosisTask) => (
        <ResultTag type="ad" value={record.result?.isAdHighQuality ?? 'UNKNOWN'} />
      ),
    },
    {
      title: '千川优质',
      key: 'ecpQuality',
      width: 110,
      render: (_: unknown, record: DiagnosisTask) => (
        <ResultTag type="ecp" value={record.result?.isEcpHighQuality ?? 'UNKNOWN'} />
      ),
    },
    {
      title: '首发',
      key: 'firstPublish',
      width: 90,
      render: (_: unknown, record: DiagnosisTask) => (
        <ResultTag type="first" value={record.result?.isFirstPublish ?? 'UNKNOWN'} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={diagnosisStore.total}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="检测中"
              value={runningCount}
              prefix={<SyncOutlined spin={runningCount > 0} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败"
              value={failedCount}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务列表 */}
      <Card
        title="任务进度总览（最近20条）"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={diagnosisStore.loading}
          >
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={diagnosisStore.loading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  );
});

export default Dashboard;
