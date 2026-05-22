import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Progress,
  Typography,
  Spin,
  Alert,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  getStatisticsOverview,
  getQualityDistribution,
  getAdvertiserStats,
  getStatisticsTrend,
} from '../../services/statistics';
import type {
  OverviewData,
  QualityDistributionData,
  AdvertiserStatItem,
  TrendItem,
} from '../../services/statistics';

const { Title } = Typography;

const Statistics: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [quality, setQuality] = useState<QualityDistributionData | null>(null);
  const [advertiserList, setAdvertiserList] = useState<AdvertiserStatItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, qualityRes, advertiserRes, trendRes] = await Promise.all([
          getStatisticsOverview(),
          getQualityDistribution(),
          getAdvertiserStats(),
          getStatisticsTrend(30),
        ]);
        setOverview(overviewRes);
        setQuality(qualityRes);
        setAdvertiserList(advertiserRes);
        setTrend(trendRes);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
        console.error('统计数据加载失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const trendColumns: ColumnsType<TrendItem> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '任务数',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right',
    },
    {
      title: '成功数',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 100,
      align: 'right',
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 160,
      render: (rate: number) => (
        <Space>
          <Progress percent={rate} size="small" style={{ width: 100 }} showInfo={false} />
          <span>{rate}%</span>
        </Space>
      ),
    },
  ];

  const advertiserColumns: ColumnsType<AdvertiserStatItem> = [
    {
      title: '广告主 ID',
      dataIndex: 'advertiserId',
      key: 'advertiserId',
    },
    {
      title: '总任务数',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: 'AD 优质数',
      dataIndex: 'adQualityCount',
      key: 'adQualityCount',
      align: 'right',
    },
    {
      title: '千川优质数',
      dataIndex: 'ecpQualityCount',
      key: 'ecpQualityCount',
      align: 'right',
    },
    {
      title: '首发数',
      dataIndex: 'firstPublishCount',
      key: 'firstPublishCount',
      align: 'right',
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      align: 'right',
      render: (rate: number) => `${rate}%`,
      sorter: (a, b) => a.successRate - b.successRate,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="加载统计数据中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        数据统计
      </Title>

      {/* 总览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="总任务数" value={overview?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="今日新增" value={overview?.todayCount ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="本月新增" value={overview?.monthCount ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="整体成功率"
              value={overview?.successRate ?? 0}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="检测中"
              value={overview?.pendingCount ?? 0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={overview?.successCount ?? 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="失败"
              value={overview?.failedCount ?? 0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 质量分布 + 趋势 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card title="素材质量分布" style={{ height: '100%' }}>
            {quality && quality.total > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size={20}>
                <div>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>AD 优质率</span>
                    <span>
                      {quality.adHighQuality.count} / {quality.total} ({quality.adHighQuality.rate}%)
                    </span>
                  </div>
                  <Progress percent={quality.adHighQuality.rate} strokeColor="#1677ff" />
                </div>
                <div>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>千川优质率</span>
                    <span>
                      {quality.ecpHighQuality.count} / {quality.total} ({quality.ecpHighQuality.rate}%)
                    </span>
                  </div>
                  <Progress percent={quality.ecpHighQuality.rate} strokeColor="#52c41a" />
                </div>
                <div>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>首发率</span>
                    <span>
                      {quality.firstPublish.count} / {quality.total} ({quality.firstPublish.rate}%)
                    </span>
                  </div>
                  <Progress percent={quality.firstPublish.rate} strokeColor="#fa8c16" />
                </div>
              </Space>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
                暂无已完成的检测数据
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card title="趋势（最近 30 天）">
            <Table<TrendItem>
              dataSource={trend}
              columns={trendColumns}
              rowKey="date"
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              locale={{ emptyText: '暂无趋势数据' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 广告主维度 */}
      <Card title="广告主维度汇总（Top 20）">
        <Table<AdvertiserStatItem>
          dataSource={advertiserList}
          columns={advertiserColumns}
          rowKey="advertiserId"
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          locale={{ emptyText: '暂无广告主数据' }}
        />
      </Card>
    </div>
  );
};

export default Statistics;
