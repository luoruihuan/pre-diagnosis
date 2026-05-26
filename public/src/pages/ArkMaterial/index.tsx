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
  DatePicker,
  Input,
  Row,
  Col,
} from 'antd';
import { SearchOutlined, CopyOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getArkVideoList } from '../../services/material';
import { getAdvertiserOptions } from '../../services/advertiser';
import type { AdvertiserOption } from '../../services/advertiser';
import type { ArkVideo } from '../../types/material';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const SOURCE_OPTIONS = [
  { label: '即创 (AIC)', value: 'AIC' },
  { label: '星图 (STAR)', value: 'STAR' },
  { label: '巨量创意', value: 'CREATIVE_CENTER' },
  { label: '开放平台', value: 'OPEN_API' },
  { label: '后台上传', value: 'AD_SITE' },
  { label: '即合视频', value: 'SUPPLIER' },
  { label: '达人视频', value: 'CEWEBRITY_VIDEO' },
  { label: '巨量千川', value: 'E_COMMERCE' },
];

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.value, o.label]),
);

// ─── 视频播放器 ───────────────────────────────────────────────────────────────
const VideoPlayer: React.FC<{ url: string }> = ({ url }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (ref.current) {
        ref.current.pause();
        ref.current.src = '';
        ref.current.load();
      }
    };
  }, []);

  return (
    <video
      ref={ref}
      src={url}
      controls
      autoPlay
      style={{ width: '100%', maxHeight: 420, borderRadius: 6, background: '#000', display: 'block' }}
      onError={() => message.error('视频加载失败，链接可能已过期')}
    />
  );
};

// ─── 主页面 ──────────────────────────────────────────────────────────────────
const ArkMaterial: React.FC = () => {
  const navigate = useNavigate();

  const [advertiserOptions, setAdvertiserOptions] = useState<AdvertiserOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [noAccountsConfigured, setNoAccountsConfigured] = useState(false);

  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);

  // 筛选条件
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [videoIdInput, setVideoIdInput] = useState('');

  const [list, setList] = useState<ArkVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [queried, setQueried] = useState(false);

  const [previewVideo, setPreviewVideo] = useState<ArkVideo | null>(null);

  useEffect(() => {
    setOptionsLoading(true);
    getAdvertiserOptions()
      .then(data => {
        setAdvertiserOptions(data.advertiserOptions);
        if (data.advertiserOptions.length === 0) setNoAccountsConfigured(true);
        // 自动选第一个广告主，取其 agentId 用于查询
        if (data.advertiserOptions.length > 0) {
          const first = data.advertiserOptions[0];
          setSelectedAdvertiserId(first.value);
          setCurrentAgentId(first.agentId);
        }
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false));
  }, []);

  const fetchList = useCallback(async (
    agentId: number,
    p: number,
    ps: number,
    filters: { dateRange: [string, string] | null; sources: string[]; videoId: string },
  ) => {
    setLoading(true);
    try {
      const res = await getArkVideoList({
        agentId,
        page: p,
        pageSize: ps,
        startTime: filters.dateRange?.[0],
        endTime: filters.dateRange?.[1],
        source: filters.sources.length ? filters.sources.join(',') : undefined,
        videoId: filters.videoId.trim() || undefined,
      });
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
    if (option) setCurrentAgentId(option.agentId);
    // 广告主切换不影响列表（都是同一个代理商），只影响发起前测时的 advertiserId
  };

  const handleQuery = () => {
    if (!currentAgentId) { message.warning('请先选择广告主'); return; }
    setPage(1);
    fetchList(currentAgentId, 1, pageSize, { dateRange, sources: selectedSources, videoId: videoIdInput });
  };

  const handleReset = () => {
    setDateRange(null);
    setSelectedSources([]);
    setVideoIdInput('');
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    if (currentAgentId) {
      fetchList(currentAgentId, p, ps, { dateRange, sources: selectedSources, videoId: videoIdInput });
    }
  };

  const handleStartDiagnosis = (video: ArkVideo) => {
    if (!selectedAdvertiserId || !currentAgentId) return;
    navigate(
      `/new-material?videoId=${encodeURIComponent(video.id)}&videoUrl=${encodeURIComponent(video.url)}&agentId=${currentAgentId}&advertiserId=${selectedAdvertiserId}`,
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制'));
  };

  const columns: ColumnsType<ArkVideo> = [
    {
      title: '预��',
      key: 'preview',
      width: 80,
      render: (_: unknown, record: ArkVideo) => (
        <Tooltip title="点击播放">
          <Button
    type="text"
            icon={<PlayCircleOutlined style={{ fontSize: 28, color: '#1677ff' }} />}
            style={{ padding: 0, height: 'auto' }}
            onClick={() => setPreviewVideo(record)}
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
          <Text code style={{ fontSize: 12 }}>{id}</Text>
          <Tooltip title="复制 ID">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(id)} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Signature (MD5)',
      dataIndex: 'signature',
      key: 'signature',
      width: 140,
      render: (sig: string) => sig ? (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 11 }}>{sig.slice(0, 8)}…</Text>
          <Tooltip title="复制完整 MD5">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(sig)} />
          </Tooltip>
        </Space>
      ) : '—',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 130,
      render: (source: string) => <Tag>{SOURCE_LABEL[source] ?? source ?? '—'}</Tag>,
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

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            placeholder="选择广告主（用于发起前测）"
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
        </Col>
        <Col>
          <RangePicker
            style={{ width: 240 }}
            value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
              } else {
                setDateRange(null);
              }
            }}
          />
        </Col>
        <Col>
          <Select
            mode="multiple"
            placeholder="素材来源"
            style={{ width: 200 }}
            options={SOURCE_OPTIONS}
            value={selectedSources}
            onChange={setSelectedSources}
            maxTagCount={2}
            allowClear
          />
        </Col>
        <Col>
          <Input
            placeholder="Video ID 精确查找"
            style={{ width: 200 }}
            value={videoIdInput}
            onChange={e => setVideoIdInput(e.target.value)}
            onPressEnter={handleQuery}
            allowClear
          />
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleQuery}
              disabled={!currentAgentId}
              loading={loading}
            >
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
          </Space>
        </Col>
      </Row>

      {queried && (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 900 }}
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
          点击查询，获取方舟素材库列表
        </div>
      )}

      <Modal
        open={!!previewVideo}
        onCancel={() => setPreviewVideo(null)}
        footer={null}
        title={
          previewVideo && (
            <Space size={8}>
              <Text>视频预览</Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                {previewVideo.id}
              </Text>
            </Space>
          )
        }
        width={760}
        destroyOnClose
        centered
      >
        {previewVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <VideoPlayer key={previewVideo.id} url={previewVideo.url} />
            <Space wrap size={[16, 8]}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                来源：<Tag style={{ marginLeft: 4 }}>{SOURCE_LABEL[previewVideo.source] ?? previewVideo.source ?? '—'}</Tag>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                上传时间：{previewVideo.createTime || '—'}
              </Text>
              <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(previewVideo.url)}>
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
