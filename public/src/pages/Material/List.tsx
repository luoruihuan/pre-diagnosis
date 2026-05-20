import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Input, Space, Image, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import materialStore from '../../stores/materialStore';
import type { Material } from '../../types/material';
import dayjs from 'dayjs';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../utils/constants';

const MaterialList: React.FC = observer(() => {
  const navigate = useNavigate();
  const [searchTitle, setSearchTitle] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    loadMaterials();
  }, [page, pageSize, searchTitle]);

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

  const handleDelete = (record: Material) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除素材"${record.title}"吗？`,
      onOk: async () => {
        try {
          await materialStore.deleteMaterial(record.id);
          loadMaterials();
        } catch (error) {
          // 错误已在 store 中处理
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'coverUrl',
      width: 120,
      render: (url: string) => (
        <Image src={url} width={80} height={80} style={{ objectFit: 'cover' }} />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
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
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size: number) => {
        const mb = (size / 1024 / 1024).toFixed(2);
        return `${mb} MB`;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Material) => (
        <Space>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="素材列表"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/material/upload')}
        >
          上传素材
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search
          placeholder="搜索视频标题"
          onSearch={handleSearch}
          allowClear
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
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
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
        />
      </Space>
    </Card>
  );
});

export default MaterialList;
