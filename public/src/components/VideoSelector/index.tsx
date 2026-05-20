import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Image, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import materialStore from '../../stores/materialStore';
import type { Material } from '../../types/material';
import dayjs from 'dayjs';

interface VideoSelectorProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (video: Material) => void;
}

const VideoSelector: React.FC<VideoSelectorProps> = observer(({ visible, onCancel, onSelect }) => {
  const [searchTitle, setSearchTitle] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (visible) {
      loadMaterials();
    }
  }, [visible, page, pageSize, searchTitle]);

  const loadMaterials = () => {
    materialStore.fetchMaterials({
      page,
      pageSize,
      title: searchTitle || undefined,
      status: 'ACTIVE',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTitle(value);
    setPage(1);
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'coverUrl',
      width: 100,
      render: (url: string) => <Image src={url} width={60} height={60} style={{ objectFit: 'cover' }} />,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <Modal
      title="选择视频素材"
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={null}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search
          placeholder="搜索视频标题"
          onSearch={handleSearch}
          allowClear
          style={{ width: 300 }}
        />

        <Table
          columns={columns}
          dataSource={materialStore.materials}
          rowKey="id"
          loading={materialStore.loading}
          pagination={{
            current: page,
            pageSize,
            total: materialStore.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          onRow={(record) => ({
            onClick: () => {
              onSelect(record);
              onCancel();
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Space>
    </Modal>
  );
});

export default VideoSelector;
