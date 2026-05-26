import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Tag,
  Modal,
  Tooltip,
} from 'antd';
import { SearchOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { getArkVideoList } from '../../services/material';
import { getAdvertiserOptions } from '../../services/advertiser';
import type { AdvertiserOption } from '../../services/advertiser';
import type { ArkVideo } from '../../types/material';

const { Text } = Typography;

const ArkMaterial: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // 广告主/代理商选项
  const [advertiserOptions, setAdvertiserOptions] = useState<AdvertiserOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [noAccountsConfigured, setNoAccountsConfigured] = useState(false);

  // 筛选状态
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);

  // 列表状态
  const [list, setList] = useState<ArkVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [queried, setQueried] = useState(false);

  // 预览 Modal 状态
  const [previewVideo, setPreviewVideo] = useState<ArkVideo | null>(null);

  // 加载广告主选项
  useEffect(() => {
    setOptionsLoading(true);
    getAdvertiserOptions()
      .then(data => {
        setAdvertiserOptions(data.advertiserOptions);
        if (data.advertiserOptions.length === 0) {
          setNoAccountsConfigured(true);
        }
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false));
  }, []);

  const fetchList = useCallback(async (agentId: number, p: number, ps: number) => {
    setLoading(true);
    try {
      const res = await getArkVideoList({ agentId, page: p, pageSize: ps });
      setList(res.list);
      setTotal(res.pageInfo.totalNumber);
      setQueried(true);
    } catch {
      // 错误已在 request 拦截器中处理
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdvertiserChange = (value: number) => {
    setSelectedAdvertiserId(value);
    const option = advertiserOptions.find(o => o.value === value);
    if (option) {
      setCurrentAgentId(option.agentId);
    }
    setList([]);
    setQueried(false);
    setPage(1);
  };

  const handleQuery = () => {
    if (!currentAgentId) {
      message.warning('请先选择广告主');
      return;
    }
    setPage(1);
    fetchList(currentAgentId, 1, pageSize);
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    if (currentAgentId) {
      fetchList(currentAgentId, p, ps);
    }
  };

  const handleStartDiagnosis = (video: ArkVideo) => {
    if (!selectedAdvertiserId || !currentAgentId) return;
    navigate(
      `/new-material?videoId=${encodeURIComponent(video.id)}&videoUrl=${encodeURIComponent(video.url)}&agentId=${currentAgentId}&advertiserId=${selectedAdvertiserId}`,
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制');
    });
  };

  const handlePreviewOpen = (video: ArkVideo) => {
    setPreviewVideo(video);
  };

  const handlePreviewClose = () => {
    // 关闭前先暂停，避免后台继续播放
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setPreviewVideo(null);
  };

  const columns: ColumnsType<ArkVideo> = [
    {
      title: '预览',
      key: 'preview',
      width: 70,
      render: (_: unknown, record: ArkVideo) => (
        <Tooltip title="点击预览视频">
          <Button
            type="text"
            icon={<PlayCircleOutlined style={{ fontSize: 28, color: '#1677ff' }} />}
            style={{ padding: 0, height: 'auto' }}
            onClick={() => handlePreviewOpen(record)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Video ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Space size={4}>
          <Text code style={{ fontSize: 12 }}>
            {id}
          </Text>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(id)}
          />
        </Space>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (source: string) => <Tag>{source || '—'}</Tag>,
    },
    {
      title: '上传时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ArkVideo) => (
        <Button type="link" size="small" onClick={() => handleStartDiagnosis(record)}>
          发起前测
        </Button>
      ),
    },
  ];

  return (
    <Card title="方舟素材库">
      {noAccountsConfigured && (
        <Alert
          type="info"
          showIcon
          message="尚未配置广告主账号"
          description={
            <span>
              请先在
              <Button type="link" size="small" onClick={() => navigate('/base/advertisers')}>
                基础数据 → 广告主账号
              </Button>
              中添加账号，再查询素材库。
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="请选择广告主"
          style={{ width: 240 }}
          loading={optionsLoading}
          options={advertiserOptions}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={handleAdvertiserChange}
          value={selectedAdvertiserId}
          notFoundContent={
            <span>
              暂无数据，请先
              <Button type="link" size="small" onClick={() => navigate('/base/advertisers')}>
                配置广告主账号
              </Button>
            </span>
          }
        />
        {currentAgentId && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            代理商 ID：{currentAgentId}
          </Text>
        )}
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleQuery}
          disabled={!currentAgentId}
          loading={loading}
        >
          查询
        </Button>
      </Space>

      {queried && (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: handlePageChange,
          }}
          locale={{ emptyText: '暂无素材，请先在巨量引擎方舟后台上传视频' }}
        />
      )}

      {!queried && !noAccountsConfigured && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
          选择广告主后点击查询，获取方舟素材库列表
        </div>
      )}

      <Modal
        open={!!previewVideo}
        onCancel={handlePreviewClose}
        footer={null}
        title={
          <Space size={8}>
            <Text>视频预览</Text>
            {previewVideo && (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                {previewVideo.id}
              </Text>
            )}
          </Space>
        }
        width={720}
        destroyOnClose
        centered
      >
        {previewVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <video
              ref={videoRef}
              src={previewVideo.url}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: 400, borderRadius: 6, background: '#000' }}
            />
            <Space wrap size={[16, 8]}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                来源：<Tag style={{ marginLeft: 4 }}>{previewVideo.source || '—'}</Tag>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                上传时间：{previewVideo.createTime || '—'}
              </Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(previewVideo.url)}
              >
                复制视频链接
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ArkMaterial;
