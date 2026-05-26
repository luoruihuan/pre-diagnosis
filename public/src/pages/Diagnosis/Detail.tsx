import React, { useEffect } from 'react';
import {
  Card,
  Descriptions,
  Space,
  Button,
  Tag,
  Spin,
  Alert,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import diagnosisStore from '../../stores/diagnosisStore';

const { Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING:  { color: 'processing', label: '检测中' },
  RUNNING:  { color: 'processing', label: '检测中' },
  SUCCESS:  { color: 'success',    label: '已完成' },
  FAILED:   { color: 'error',      label: '失败'   },
  TIMEOUT:  { color: 'default',    label: '超时'   },
};

const QUALITY_CONFIG: Record<string, { color: string; label: string }> = {
  YES:     { color: 'success', label: '优质' },
  NO:      { color: 'error',   label: '非优质' },
  UNKNOWN: { color: 'default', label: '未知' },
};

const DiagnosisDetail: React.FC = observer(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // 根据当前路径判断返回哪个列表
  const backPath = location.pathname.startsWith('/ark-material')
    ? '/ark-material/tasks'
    : '/new-material/tasks';

  useEffect(() => {
    if (id) {
      diagnosisStore.fetchTaskDetail(id);
    }
  }, [id]);

  if (diagnosisStore.loading && !diagnosisStore.currentTask) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin tip="加载中..." />
        </div>
      </Card>
    );
  }

  const task = diagnosisStore.currentTask;

  if (!task) {
    return (
      <Card>
        <Alert type="error" message="任务不存在或加载失败" />
        <Button style={{ marginTop: 16 }} onClick={() => navigate(backPath)}>
          返回列表
        </Button>
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[task.status] ?? { color: 'default', label: task.status };
  const isPending = task.status === 'PENDING' || task.status === 'RUNNING';
  const isSuccess = task.status === 'SUCCESS';

  const result = task.result;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}>
          返回列表
        </Button>
        <Button
          icon={<ReloadOutlined />}
          loading={diagnosisStore.loading}
          onClick={() => id && diagnosisStore.fetchTaskDetail(id)}
        >
          刷新
        </Button>
      </Space>

      {/* 任务基本信息 */}
      <Card title="任务信息">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="任务ID">
            <Text copyable style={{ fontSize: 12 }}>{task.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="任务状态">
            <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="视频ID">
            <Text copyable style={{ fontSize: 12 }}>{task.videoId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="广告主ID">{task.advertiserId}</Descriptions.Item>
          <Descriptions.Item label="代理商ID">{task.agentId}</Descriptions.Item>
          <Descriptions.Item label="来源">
            <Tag>{task.source === 'NEW' ? '新素材' : '方舟素材'}</Tag>
          </Descriptions.Item>
          {task.oceanTaskId && (
            <Descriptions.Item label="巨量任务ID">{task.oceanTaskId}</Descriptions.Item>
          )}
          {task.refAdId && (
            <Descriptions.Item label="参考广告ID（1.0）">{task.refAdId}</Descriptions.Item>
          )}
          {task.refPromotionId && (
            <Descriptions.Item label="参考广告ID（2.0）">{task.refPromotionId}</Descriptions.Item>
          )}
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

      {/* 检测中提示 */}
      {isPending && (
        <Alert
          type="info"
          showIcon
          message="检测进行中"
          description="巨量引擎正在处理前测任务，通常需要数分钟，完成后将通过 Webhook 回调更新结果。可点击刷新查看最新状态。"
        />
      )}

      {/* 前测结果 */}
      {isSuccess && result && (
        <Card title="前测结果">
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="AD 优质">
              <Tag color={QUALITY_CONFIG[result.isAdHighQuality]?.color}>
                {QUALITY_CONFIG[result.isAdHighQuality]?.label ?? result.isAdHighQuality}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="千川优质">
              <Tag color={QUALITY_CONFIG[result.isEcpHighQuality]?.color}>
                {QUALITY_CONFIG[result.isEcpHighQuality]?.label ?? result.isEcpHighQuality}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="首发">
              <Tag color={QUALITY_CONFIG[result.isFirstPublish]?.color}>
                {QUALITY_CONFIG[result.isFirstPublish]?.label ?? result.isFirstPublish}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {result.notAdHighQualityReason && result.notAdHighQualityReason.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong>AD 非优质原因：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {result.notAdHighQualityReason.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.notEcpHighQualityReason && result.notEcpHighQualityReason.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong>千川非优质原因：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {result.notEcpHighQualityReason.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {isSuccess && !result && (
        <Alert
          type="warning"
          showIcon
          message="结果待同步"
          description="任务已完成，但结果数据尚未同步，请稍后刷新。"
        />
      )}
    </Space>
  );
});

export default DiagnosisDetail;
