import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Alert } from 'antd';
import { getSystemConfig, updateSystemConfig, type SystemConfig } from '../../services/advertiser';

const SystemConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await getSystemConfig();
        form.setFieldsValue(config);
      } catch {
        // 错误已在 request 拦截器中处理
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form]);

  const handleSave = async (values: SystemConfig) => {
    setSaving(true);
    try {
      const res = await updateSystemConfig(values);
      message.success(res.message || '保存成功');
    } catch {
      // 错误已在 request 拦截器中处理
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="系统配置">
      <Alert
        type="info"
        showIcon
        message="配置说明"
        description="敏感字段（App ID、App Secret 等）当前以脱敏形式展示。若需修改，请直接填写新值；若不修改，保持原值（含 ****）不变即可，系统会自动跳过脱敏占位值。修改后重启服务生效。"
        style={{ marginBottom: 24 }}
      />
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="巨量引擎 Base URL"
            name="oceanEngineBaseUrl"
            rules={[{ required: true, message: '请输入 Base URL' }]}
          >
            <Input placeholder="https://api.oceanengine.com" />
          </Form.Item>

          <Form.Item
            label="App ID"
            name="oceanEngineAppId"
          >
            <Input placeholder="请输入 App ID（留空则不修改）" />
          </Form.Item>

          <Form.Item
            label="App Secret"
            name="oceanEngineAppSecret"
          >
            <Input.Password placeholder="请输入 App Secret（留空则不修改）" />
          </Form.Item>

          <Form.Item
            label="Webhook Secret"
            name="oceanEngineWebhookSecret"
          >
            <Input.Password placeholder="请输入 Webhook Secret（留空则不修改）" />
          </Form.Item>

          <Form.Item
            label="Access Token"
            name="oceanEngineAccessToken"
          >
            <Input.Password placeholder="请输入 Access Token（留空则不修改）" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

export default SystemConfigPage;
