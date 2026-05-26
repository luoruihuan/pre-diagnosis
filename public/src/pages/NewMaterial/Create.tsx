import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Space,
  InputNumber,
  Input,
  Radio,
  Select,
  Alert,
  Empty,
} from 'antd';
import { observer } from 'mobx-react-lite';
import { useNavigate, useSearchParams } from 'react-router-dom';
import diagnosisStore from '../../stores/diagnosisStore';
import type { NewMaterialCreateParams } from '../../types/diagnosis';
import { getAdvertiserOptions } from '../../services/advertiser';
import type { AdvertiserOption, AgentOption } from '../../services/advertiser';

type RefAdType = 'refAdId' | 'refPromotionId';
type VideoSource = 'upload' | 'manual';

const NewMaterialCreate: React.FC = observer(() => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refAdType, setRefAdType] = useState<RefAdType>('refAdId');
  const [videoSource, setVideoSource] = useState<VideoSource>('upload');

  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [advertiserOptions, setAdvertiserOptions] = useState<AdvertiserOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [noAccountsConfigured, setNoAccountsConfigured] = useState(false);

  useEffect(() => {
    setOptionsLoading(true);
    getAdvertiserOptions()
      .then(data => {
        setAgentOptions(data.agentOptions);
        setAdvertiserOptions(data.advertiserOptions);
        if (data.advertiserOptions.length === 0) {
          setNoAccountsConfigured(true);
        }

        // 从方舟素材库跳转过来时，预填参数并切换到手动模式
        const preVideoId = searchParams.get('videoId');
        const preVideoUrl = searchParams.get('videoUrl');
        const preAgentId = searchParams.get('agentId');
        const preAdvertiserId = searchParams.get('advertiserId');

        if (preVideoId) {
          setVideoSource('manual');
          const fields: Record<string, unknown> = { videoId: preVideoId };
          if (preVideoUrl) fields.videoUrl = preVideoUrl;
          if (preAgentId) fields.agentId = Number(preAgentId);
          if (preAdvertiserId) fields.advertiserId = Number(preAdvertiserId);
          form.setFieldsValue(fields);
        }
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false));
  }, [form, searchParams]);

  const handleAdvertiserChange = (value: number) => {
    const option = advertiserOptions.find(o => o.value === value);
    if (option) {
      form.setFieldValue('agentId', option.agentId);
    }
  };

  const handleManualSubmit = async (values: {
    advertiserId: number;
    agentId: number;
    videoId: string;
    videoUrl?: string;
    title?: string;
    refAdId?: number;
    refPromotionId?: number;
  }) => {
    const params: NewMaterialCreateParams = {
      advertiserId: values.advertiserId,
      agentId: values.agentId,
      videoId: values.videoId,
      videoUrl: values.videoUrl,
      title: values.title,
    };

    if (refAdType === 'refAdId' && values.refAdId) {
      params.refAdId = values.refAdId;
    } else if (refAdType === 'refPromotionId' && values.refPromotionId) {
      params.refPromotionId = values.refPromotionId;
    }

    try {
      await diagnosisStore.createNewMaterialTask(params);
      navigate('/new-material/tasks');
    } catch {
      // 错误已在 store 中处理
    }
  };

  const isUploadMode = videoSource === 'upload';

  const renderAccountFields = () => (
    <>
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
              中添加账号，再发起前测。
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item
        label="广告主"
        name="advertiserId"
        rules={[{ required: true, message: '请选择广告主' }]}
      >
        <Select
          placeholder="请选择广告主"
          loading={optionsLoading}
          options={advertiserOptions}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={handleAdvertiserChange}
          notFoundContent={
            <span>
              暂无数据，请先
              <Button type="link" size="small" onClick={() => navigate('/base/advertisers')}>
                配置广告主账号
              </Button>
            </span>
          }
        />
      </Form.Item>
      <Form.Item
        label="代理商"
        name="agentId"
        rules={[{ required: true, message: '请先选择广告主' }]}
      >
        <Select
          placeholder="选择广告主后自动填充"
          loading={optionsLoading}
          options={agentOptions}
          disabled
        />
      </Form.Item>
    </>
  );

  return (
    <Card title="发起前测">
      <Form.Item label="视频来源" style={{ marginBottom: 24 }}>
        <Radio.Group
          value={videoSource}
          onChange={(e) => {
            setVideoSource(e.target.value as VideoSource);
            form.resetFields();
          }}
        >
          <Radio.Button value="upload">本地上传</Radio.Button>
          <Radio.Button value="manual">输入视频ID</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* ===== 本地上传模式：暂不支持 ===== */}
      {isUploadMode && (
        <Empty
          description={
            <span>
              暂不支持本地上传，请前往
              <Button type="link" size="small" onClick={() => navigate('/ark-material')}>
                方舟素材库
              </Button>
              选择视频后发起前测
            </span>
          }
          style={{ margin: '40px 0' }}
        />
      )}

      {/* ===== 手动输入模式 ===== */}
      {!isUploadMode && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManualSubmit}
          style={{ maxWidth: 600 }}
        >
          {renderAccountFields()}

          <Form.Item
            label="视频ID"
            name="videoId"
            rules={[{ required: true, message: '请输入视频ID' }]}
          >
            <Input placeholder="v开头字符串，如 v0392fg10003..." />
          </Form.Item>

          <Form.Item label="视频URL" name="videoUrl">
            <Input placeholder="请输入视频URL（选填）" />
          </Form.Item>

          <Form.Item label="素材标题" name="title">
            <Input placeholder="请输入素材标题（选填）" />
          </Form.Item>

          <Form.Item label="参考广告ID">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Group
                value={refAdType}
                onChange={(e) => setRefAdType(e.target.value as RefAdType)}
              >
                <Radio value="refAdId">1.0广告ID（ref_ad_id）</Radio>
                <Radio value="refPromotionId">2.0广告ID（ref_promotion_id）</Radio>
              </Radio.Group>
              {refAdType === 'refAdId' ? (
                <Form.Item name="refAdId" noStyle>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入1.0广告ID"
                    min={1}
                    precision={0}
                  />
                </Form.Item>
              ) : (
                <Form.Item name="refPromotionId" noStyle>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入2.0广告ID"
                    min={1}
                    precision={0}
                  />
                </Form.Item>
              )}
            </Space>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={diagnosisStore.loading}>
                发起前测
              </Button>
              <Button onClick={() => navigate('/new-material/tasks')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
});

export default NewMaterialCreate;
