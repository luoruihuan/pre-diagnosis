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
  Spin,
} from 'antd';
import { SearchOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { getArkVideoList } from '../../services/material';
import { getAdvertiserOptions } from '../../services/advertiser';
import type { AdvertiserOption } from '../../services/advertiser';
import type { ArkVideo } from '../../types/material';

const { Text } = Typography;

// ─── 视频缩略图：加载视频第一帧截图 ────────────────────────────────────────────
const VideoThumb: React.FC<{ url: string; onClick: () => void }> = ({ url, onClick }) => {
  const [thumb, setThumb] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 8 秒超时兜底，防止永远 loading
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setCapturing(false);
        cleanup();
      }
    }, 8000);

    const video = document.createElement('video');
    video.muted = true;
    // preload=auto 才会下载帧数据，metadata 模式 drawImage 只会得到黑帧
    video.preload = 'auto';
    video.src = url;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      video.load();
    };

    const doCapture = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 160;
      canvas.height = video.videoHeight || 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          // tainted canvas（CDN 无 CORS 头）会在这里抛 SecurityError，静默降级
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          if (!cancelled) setThumb(dataUrl);
        } catch {
          // 降级：显示播放图标
        }
      }
      if (!cancelled) setCapturing(false);
      cancelled = true;
      window.clearTimeout(timer);
      cleanup();
    };

    const onSeeked = () => {
      if (cancelled) return;
      // seeked 后等一帧，确保解码器已将像素写入，避免黑帧
      requestAnimationFrame(doCapture);
    };

    const onCanPlay = () => {
      if (cancelled) return;
      // canplay 后帧数据已就绪，再 seek 才能拿到真实像素
      const seekTo = video.duration > 0 ? Math.min(1, video.duration * 0.1) : 0;
      video.addEventListener('seeked', onSeeked, { once: true });
      video.currentTime = seekTo;
    };

    const onMeta = () => {
      if (cancelled) return;
      video.addEventListener('canplay', onCanPlay, { once: true });
    };

    const onError = () => {
      if (!cancelled) {
        setCapturing(false);
        cancelled = true;
        window.clearTimeout(timer);
        cleanup();
      }
    };

    video.addEventListener('loadedmetadata', onMeta, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.load();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cleanup();
    };
  }, [url]);

  return (
    <div
      onClick={onClick}
      style={{
        width: 80,
        height: 52,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        background: '#1a1a1a',
        flexShrink: 0,
      }}
    >
      {capturing && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="small" />
        </div>
      )}
      {!capturing && thumb && (
        <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
      {!capturing && !thumb && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlayCircleOutlined style={{ fontSize: 20, color: '#666' }} />
        </div>
      )}
      {/* 悬浮播放图标遮罩 */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        opacity: 0,
        transition: 'opacity 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
      >
        <PlayCircleOutlined style={{ fontSize: 22, color: '#fff' }} />
      </div>
    </div>
  );
};

// ─── 视频预览播放器：每次挂载都是全新实例，彻底避免状态残留 ──────────────────
const VideoPlayer: React.FC<{ url: string; onCopy: () => void; source: string; createTime: string }> = ({
  url, onCopy, source, createTime,
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      // 组件卸载时强制停止，释放网络连接
      if (ref.current) {
        ref.current.pause();
        ref.current.src = '';
        ref.current.load();
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <video
        ref={ref}
        src={url}
        controls
        autoPlay
        style={{ width: '100%', maxHeight: 420, borderRadius: 6, background: '#000' }}
      />
      <Space wrap size={[16, 8]}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          来源：<Tag style={{ marginLeft: 4 }}>{source || '—'}</Tag>
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          上传时间：{createTime || '—'}
        </Text>
        <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
          复制视频链接
        </Button>
      </Space>
    </div>
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

  const [list, setList] = useState<ArkVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [queried, setQueried] = useState(false);

  // previewVideo 变化时 Modal 内的 VideoPlayer 会完全重新挂载
  const [previewVideo, setPreviewVideo] = useState<ArkVideo | null>(null);

  useEffect(() => {
    setOptionsLoading(true);
    getAdvertiserOptions()
      .then(data => {
        setAdvertiserOptions(data.advertiserOptions);
        if (data.advertiserOptions.length === 0) setNoAccountsConfigured(true);
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
    if (option) setCurrentAgentId(option.agentId);
    setList([]);
    setQueried(false);
    setPage(1);
  };

  const handleQuery = () => {
    if (!currentAgentId) { message.warning('请先选择广告主'); return; }
    setPage(1);
    fetchList(currentAgentId, 1, pageSize);
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    if (currentAgentId) fetchList(currentAgentId, p, ps);
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
      title: '预览',
      key: 'preview',
      width: 100,
      render: (_: unknown, record: ArkVideo) => (
        <VideoThumb url={record.url} onClick={() => setPreviewVideo(record)} />
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
          <Text type="secondary" style={{ fontSize: 12 }}>代理商 ID：{currentAgentId}</Text>
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
        width={720}
        destroyOnClose
        centered
      >
        {/* key 绑定 video id，切换视频时强制重新挂载 VideoPlayer */}
        {previewVideo && (
          <VideoPlayer
            key={previewVideo.id}
            url={previewVideo.url}
            source={previewVideo.source}
            createTime={previewVideo.createTime}
            onCopy={() => handleCopy(previewVideo.url)}
          />
        )}
      </Modal>
    </Card>
  );
};

export default ArkMaterial;
