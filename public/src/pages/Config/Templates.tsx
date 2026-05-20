import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import configStore from '../../stores/configStore';
import type { ConfigTemplate } from '../../services/config';
import dayjs from 'dayjs';

const ConfigTemplates: React.FC = observer(() => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConfigTemplate | null>(null);

  useEffect(() => {
    configStore.fetchTemplates();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ConfigTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      config: JSON.stringify(record.config, null, 2),
    });
    setModalVisible(true);
  };

  const handleDelete = (record: ConfigTemplate) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除配置模板"${record.name}"吗？`,
      onOk: async () => {
        try {
          await configStore.deleteTemplate(record.id);
        } catch (error) {
          // 错误已在 store 中处理
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      // 解析 JSON 配置
      let config;
      try {
        config = JSON.parse(values.config);
      } catch (error) {
        message.error('配置 JSON 格式错误');
        return;
      }

      if (editingTemplate) {
        await configStore.updateTemplate(editingTemplate.id, {
          name: values.name,
          description: values.description,
          config,
        });
      } else {
        await configStore.createTemplate({
          name: values.name,
          description: values.description,
          config,
        });
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ConfigTemplate) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
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
    <>
      <Card
        title="配置模板"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建模板
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={configStore.templates}
          rowKey="id"
          loading={configStore.loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingTemplate ? '编辑配置模板' : '新建配置模板'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={configStore.loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="模板名称"
            name="name"
            rules={[
              { required: true, message: '请输入模板名称' },
              { max: 100, message: '名称长度不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入模板名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[
              { max: 500, message: '描述长度不能超过500个字符' },
            ]}
          >
            <Input.TextArea
              placeholder="请输入模板描述"
              rows={3}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="配置 JSON"
            name="config"
            rules={[
              { required: true, message: '请输入配置 JSON' },
            ]}
            extra="请输入有效的 JSON 格式配置"
          >
            <Input.TextArea
              placeholder='{"key": "value"}'
              rows={10}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});

export default ConfigTemplates;
