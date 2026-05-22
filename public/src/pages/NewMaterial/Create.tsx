import React, { useState } from 'react';
import {
  Card,
  Form,
  Button,
  Space,
  InputNumber,
  Input,
  Radio,
  Upload,
  message,
  Progress,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadChangeParam } from 'antd/es/upload';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import diagnosisStore from '../../stores/diagnosisStore';
import { uploadVideoToOcean } from '../../services/material';
import type { NewMaterialCreateParams } from '../../types/diagnosis';

type RefAdType = 'refAdId' | 'refPromotionId';
type VideoSource = 'upload' | 'manual';

const ACCEPTED_MIME = ['video/mp4', 'video/mpeg', 'video/3gpp', 'video/x-msvideo'];
const MAX_SIZE_MB = 1000;

const NewMaterialCreate: React.FC = observer(() => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [refAdType, setRefAdType] = useState<RefAdType>('refAdId');
  const [videoSource, setVideoSource] = useState<VideoSource>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);

  // 本地上传模式提交
  const handleUploadSubmit = async (values: {
    advertiserId: number;
    agentId: number;
    title?: string;
    refAdId?: number;
    refPromotionId?: number;
  }) => {
    if (!uploadFile) {
      message.error('请先选择视频文件');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      // 第一步：上传视频至巨量引擎
      const { videoId, videoUrl } = await uploadVideoToOcean({
        agentId: values.agentId,
        fileName: uploadFileName || uploadFile.name,
        file: uploadFile,
      });

      setUploadProgress(60);

      // 第二步：创建前测任务
      const params: NewMaterialCreateParams = {
        advertiserId: values.advertiserId,
        agentId: values.agentId,
        videoId,
        videoUrl,
        title: values.title,
      };

      if (refAdType === 'refAdId' && values.refAdId) {
        params.refAdId = values.refAdId;
      } else if (refAdType === 'refPromotionId' && values.refPromotionId) {
        params.refPromotionId = values.refPromotionId;
      }

      setUploadProgress(80);
      await diagnosisStore.createNewMaterialTask(params);
      setUploadProgress(100);
      navigate('/new-material/tasks');
    } catch {
      // 错误已在 store / service 中处理
    } finally {
      setUploading(false);
    }
  };

  // 手动输入模式提交
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

  // Upload 组件 beforeUpload：拦截自动上传，做本地校验
  const beforeUpload = (file: File): boolean => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      message.error('仅支持 mp4/mpeg/3gp/avi 格式');
      return false;
    }
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_SIZE_MB) {
      message.error(`文件大小不能超过 ${MAX_SIZE_MB}MB`);
      return false;
    }
    setUploadFile(file);
    setUploadFileName(file.name);
    return false; // 阻止 antd 自动上传
  };

  const handleFileChange = (info: UploadChangeParam<UploadFile>) => {
    // 文件被移除时清空
    if (info.fileList.length === 0) {
      setUploadFile(null);
      setUploadFileName('');
      setUploadProgress(0);
    }
  };

  const isUploadMode = videoSource === 'upload';

  return (
    <Card title="发起前测">
      {/* 视频来源切换 */}
      <Form.Item label="视频来源" style={{ marginBottom: 24 }}>
        <Radio.Group
          value={videoSource}
          onChange={(e) => {
            setVideoSource(e.target.value as VideoSource);
            form.resetFields();
            setUploadFile(null);
            setUploadFileName('');
            setUploadProgress(0);
          }}
        >
          <Radio.Button value="upload">本地上传</Radio.Button>
          <Radio.Button value="manual">输入视频ID</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form
        form={form}
        layout="vertical"
        onFinish={isUploadMode ? handleUploadSubmit : handleManualSubmit}
        style={{ maxWidth: 600 }}
      >
        {/* ===== 本地上传模式 ===== */}
        {isUploadMode && (
          <>
            <Form.Item label="上传视频文件" required>
              <Upload.Dragger
                accept=".mp4,.mpeg,.3gp,.avi"
                maxCount={1}
                beforeUpload={beforeUpload}
                onChange={handleFileChange}
                showUploadList={{ showRemoveIcon: true }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽视频文件到此区域</p>
                <p className="ant-upload-hint">
                  支持 mp4 / mpeg / 3gp / avi，文件大小 &lt; 1000MB，分辨率 ≥ 1280×720
                </p>
              </Upload.Dragger>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress percent={uploadProgress} style={{ marginTop: 8 }} />
              )}
            </Form.Item>

            <Form.Item
              label="广告主ID"
              name="advertiserId"
              rules={[{ required: true, message: '请输入广告主ID' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入广告主ID"
                min={1}
                precision={0}
              />
            </Form.Item>

            <Form.Item
              label="代理商ID"
              name="agentId"
              rules={[{ required: true, message: '请输入代理商ID' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入代理商ID"
                min={1}
                precision={0}
              />
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
                <Button
                  type="primary"
           htmlType="submit"
                  loading={uploading || diagnosisStore.loading}
                  disabled={!uploadFile}
                >
                  上传并发起前测
                </Button>
                <Button onClick={() => navigate('/new-material/tasks')}>取消</Button>
              </Space>
            </Form.Item>
          </>
        )}

        {/* ===== 手动输入模式（原有表单）===== */}
        {!isUploadMode && (
          <>
            <Form.Item
              label="广告主ID"
              name="advertiserId"
              rules={[{ required: true, message: '请输入广告主ID' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入广告主ID"
                min={1}
                precision={0}
              />
            </Form.Item>

            <Form.Item
              label="代理商ID"
              name="agentId"
              rules={[{ required: true, message: '请输入代理商ID' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入代理商ID"
                min={1}
                precision={0}
              />
            </Form.Item>

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
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={diagnosisStore.loading}
                >
                  发起前测
                </Button>
                <Button onClick={() => navigate('/new-material/tasks')}>取消</Button>
              </Space>
            </Form.Item>
          </>
        )}
      </Form>
    </Card>
  );
});

export default NewMaterialCreate;
