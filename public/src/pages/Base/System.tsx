import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Spin,
  Alert,
  Badge,
  Space,
  Modal,
  Typography,
} from 'antd';
import { getSystemConfig, updateSystemConfig, type SystemConfig } from '../../services/advertiser';
import {
  getOceanAuthStatus,
  startOceanAuthorize,
  revokeOceanAuth,
  type OceanAuthStatus,
} from '../../services/oceanAuth';

const { Text } = Typography;

// 将 Unix 时间戳（秒）格式化为可读字符串
const formatExpiry = (ts: number): string => {
  const d = new Date(ts * 1000);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 距过期是否 < 2 小时
const isExpiringSoon = (ts: number): boolean => {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return ts * 1000 - Date.now() < twoHoursMs;
};

const OceanAuthCard: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<OceanAuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchAuthStatus = async () => {
    setAuthLoading(true);
    try {
      const status = await getOceanAuthStatus();
      setAuthStatus(status);
    } catch {
      // 错误已在 request 拦截器中处理
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const handleRevoke = () => {
    Modal.confirm({
      title: '确认撤销授权',
      content: '撤销后将无法通过 OAuth 访问巨量引擎 API，需要重新授权。确认继续？',
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setRevoking(true);
        try {
          await revokeOceanAuth();
          message.success('授权已撤销');
          await fetchAuthStatus();
        } catch {
          // 错误已在 request 拦截器中处理
        } finally {
          setRevoking(false);
        }
      },
    });
  };

  const isAuthorized = authStatus?.isAuthorized ?? false;
  const expiringSoon =
    isAuthorized && authStatus?.expiresAt ? isExpiringSoon(authStatus.expiresAt) : false;

  return (
    <Card title="巨量引擎 OAuth 授权" style={{ marginBottom: 24 }}>
      <Spin spinning={authLoading}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {/* 授权状态行 */}
          <Space size={8}>
            <Text>授权状态：</Text>
            {isAuthorized ? (
              <Badge status="success" text="已授权" />
            ) : (
              <Badge status="error" text="未授权" />
            )}
          </Space>

          {/* 过期时间（已授权时显示） */}
          {isAuthorized && authStatus?.expiresAt && (
            <Space size={8}>
              <Text>过期时间：</Text>
              <Text>{formatExpiry(authStatus.expiresAt)}</Text>
              {expiringSoon && (
                <Text type="warning" strong>
                  ⚠ 即将过期
                </Text>
              )}
            </Space>
          )}

          {/* 广告主账号（已授权时显示） */}
          {isAuthorized && authStatus?.advertiserIds && authStatus.advertiserIds.length > 0 && (
            <Space size={8}>
              <Text>广告主账号：</Text>
              <Text>{authStatus.advertiserIds.join(', ')}</Text>
            </Space>
          )}

          {/* 操作按钮 */}
          <Space size={8} style={{ marginTop: 4 }}>
            {isAuthorized ? (
              <>
                <Button type="default" onClick={startOceanAuthorize}>
                  重新授权
                </Button>
                <Button danger loading={revoking} onClick={handleRevoke}>
                  撤销授权
                </Button>
              </>
            ) : (
              <Button type="primary" onClick={startOceanAuthorize}>
                发起授权
              </Button>
            )}
          </Space>

          {/* 授权说明 */}
          <Alert
            type="info"
            showIcon={false}
            message={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>需要在巨量引擎开放平台创建应用并获得 App ID</li>
                <li>点击"发起授权"将跳转到巨量引擎授权页面</li>
                <li>授权完成后自动返回本页面</li>
                <li>access_token 有效期 24 小时，系统自动续期</li>
              </ul>
            }
          />
        </Space>
      </Spin>
    </Card>
  );
};

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
    <>
      <OceanAuthCard />

      <Card title="系统配置">
        <Alert
          type="info"
          showIcon
          message="配置说明"
          description="修改 App ID 或 App Secret 后，OAuth 授权会自动清除，需重新授权。敏感字段以脱敏形式展示，若不修改请保持原值不变。配置保存后立即生效，无需重启服务。"
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

            <Form.Item label="App ID" name="oceanEngineAppId">
              <Input placeholder="请输入 App ID（留空则不修改）" />
            </Form.Item>

            <Form.Item label="App Secret" name="oceanEngineAppSecret">
              <Input.Password placeholder="请输入 App Secret（留空则不修改）" />
            </Form.Item>

            <Form.Item label="Webhook Secret" name="oceanEngineWebhookSecret">
              <Input.Password placeholder="请输入 Webhook Secret（留空则不修改）" />
            </Form.Item>

            <Form.Item
              label="OAuth 回调地址"
              name="oceanEngineRedirectUri"
              tooltip="巨量引擎授权完成后回调的后台地址，需与开放平台应用配置一致"
            >
              <Input placeholder="https://yourdomain.com/api/auth/ocean-engine/callback" />
            </Form.Item>

            <Form.Item
              label="授权成功跳转地址"
              name="oceanEngineFrontendCallback"
              tooltip="OAuth 授权完成后前端跳转的页面地址"
            >
              <Input placeholder="https://yourdomain.com/oauth/callback" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存配置
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </>
  );
};

export default SystemConfigPage;
