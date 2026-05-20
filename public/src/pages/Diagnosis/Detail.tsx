import React, { useEffect } from 'react';
import { Card, Descriptions, Space, Button, Table, Tag, Image, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams } from 'react-router-dom';
import diagnosisStore from '../../stores/diagnosisStore';
import TaskStatusBadge from '../../components/TaskStatusBadge';
import ResultTag from '../../components/ResultTag';
import { Radar } from '@ant-design/charts';
import dayjs from 'dayjs';

const DiagnosisDetail: React.FC = observer(() => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      diagnosisStore.fetchTaskDetail(Number(id));
    }
  }, [id]);

  if (diagnosisStore.loading || !diagnosisStore.currentTaskDetail) {
    return (
      <Card>
        <Spin tip="加载中..." />
      </Card>
    );
  }

  const { task, results } = diagnosisStore.currentTaskDetail;

  // 雷达图数据
  const radarData = results.map((result) => ({
    dimension: result.dimensionName,
    score: result.score,
  }));

  const radarConfig = {
    data: radarData,
    xField: 'dimension',
    yField: 'score',
    meta: {
      score: {
        alias: '得分',
        min: 0,
        max: 100,
      },
    },
    xAxis: {
      line: null,
      tickLine: null,
    },
    yAxis: {
      label: false,
      grid: {
        alternateColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
    point: {
      size: 2,
    },
    area: {},
  };

  // 结果详情表格
  const resultColumns = [
    {
      title: '诊断维度',
      dataIndex: 'dimensionName',
      key: 'dimensionName',
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: any) => <ResultTag level={level} />,
    },
    {
      title: '建议',
      dataIndex: 'suggestions',
      key: 'suggestions',
      render: (suggestions: string[]) => (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/diagnosis/list')}>
        返回列表
      </Button>

      {/* 任务基本信息 */}
      <Card title="任务信息">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
          <Descriptions.Item label="任务名称">{task.taskName}</Descriptions.Item>
          <Descriptions.Item label="视频标题">{task.videoTitle}</Descriptions.Item>
          <Descriptions.Item label="视频时长">
            {Math.floor(task.videoDuration / 60)}:{(task.videoDuration % 60).toString().padStart(2, '0')}
          </Descriptions.Item>
          <Descriptions.Item label="视频封面">
            <Image src={task.videoCoverUrl} width={100} />
          </Descriptions.Item>
          <Descriptions.Item label="目标地区">{task.regionName}</Descriptions.Item>
          <Descriptions.Item label="年龄段">{task.ageGroup}</Descriptions.Item>
          <Descriptions.Item label="性别">{task.gender}</Descriptions.Item>
          <Descriptions.Item label="样本量">{task.sampleSize}</Descriptions.Item>
          <Descriptions.Item label="任务状态">
            <TaskStatusBadge status={task.status} />
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {task.completedAt && (
            <Descriptions.Item label="完成时间">
              {dayjs(task.completedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
          {task.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              <Tag color="error">{task.errorMessage}</Tag>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 诊断结果 */}
      {results.length > 0 && (
        <>
          <Card title="诊断结果概览">
            <Radar {...radarConfig} />
          </Card>

          <Card title="详细结果">
            <Table
              columns={resultColumns}
              dataSource={results}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </>
      )}
    </Space>
  );
});

export default DiagnosisDetail;
