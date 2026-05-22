import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAdvertiserAccounts,
  createAdvertiserAccount,
  updateAdvertiserAccount,
  deleteAdvertiserAccount,
  type AdvertiserAccount,
} from '../../services/advertiser';

const Advertisers: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<AdvertiserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdvertiserAccount | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await getAdvertiserAccounts(page, pageSize);
      setData(res.items);
      setPagination({ page: res.page, pageSize: res.pageSize, total: res.total });
    } catch {
      // 错误已在 request 拦截器中处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: AdvertiserAccount) => {
    setEditingRecord(record);
    form.setFieldsValue({
      agentId: record.agentId,
      advertiserId: record.advertiserId,
      name: record.name,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdvertiserAccount(id);
      message.success('删除成功');
      fetchData(pagination.page, pagination.pageSize);
    } catch {
      // 错误已在 request 拦截器中处理
    }
  };

  const handleToggleActive = async (record: AdvertiserAccount, checked: boolean) => {
    try {
      await updateAdvertiserAccount(record.id, { isActive: checked });
      message.success(checked ? '已启用' : '已禁用');
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, isActive: checked } : item,
        ),
      );
    } catch {
      // 错误已在 request 拦截器中处理
    }
  };

  const handleSubmit = async (values: {
    agentId: number;
    advertiserId: number;
    name?: string;
    isActive?: boolean;
  }) => {
    try {
      if (editingRecord) {
        await updateAdvertiserAccount(editingRecord.id, values);
        message.success('更新成功');
      } else {
        await createAdvertiserAccount(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchData(pagination.page, pagination.pageSize);
    } catch {
      // 错误已在 request 拦截器中处理
    }
  };

  const columns: ColumnsType<AdvertiserAccount> = [
    {
      title: '代理商 ID',
      dataIndex: 'agentId',
      key: 'agentId',
      width: 140,
    },
    {
      title: '广告主 ID',
      dataIndex: 'advertiserId',
      key: 'advertiserId',
      width: 140,
    },
    {
      title: '备注名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null) => name || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: AdvertiserAccount) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除广告主 ${record.advertiserId} 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="广告主账号管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增账号
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => fetchData(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑广告主账号' : '新增广告主账号'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="代理商 ID"
            name="agentId"
            rules={[{ required: true, message: '请输入代理商 ID' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入代理商 ID"
              min={1}
            />
          </Form.Item>

          <Form.Item
            label="广告主 ID"
            name="advertiserId"
            rules={[{ required: true, message: '请输入广告主 ID' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入广告主 ID"
              min={1}
            />
          </Form.Item>

          <Form.Item label="备注名称" name="name">
            <Input placeholder="请输入备注名称（选填）" maxLength={100} />
          </Form.Item>

          <Form.Item label="状态" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Advertisers;
