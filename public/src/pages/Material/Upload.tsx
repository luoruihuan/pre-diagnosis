import React, { useState } from 'react';
import { Card, Form, Input, Upload, Button, message, Space, Progress } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import materialStore from '../../stores/materialStore';
import type { UploadFile } from 'antd/es/upload/interface';

const MaterialUpload: React.FC = observer(() => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择视频文件');
      return;
    }

    const videoFile = fileList[0].originFileObj as File;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await materialStore.uploadMaterial({
        title: values.title,
        videoFile,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      message.success('素材上传成功');
      form.resetFields();
      setFileList([]);

      // 跳转到素材列表
      setTimeout(() => {
        navigate('/material/list');
      }, 1000);
    } catch (error) {
      message.error('素材上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      // 检查文件类型
      const isVideo = file.type.startsWith('video/');
      if (!isVideo) {
        message.error('只能上传视频文件');
        return false;
      }

      // 检查文件大小（限制 500MB）
      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('视频文件大小不能超过 500MB');
        return false;
      }

      setFileList([
        {
          uid: `${Date.now()}`,
          name: file.name,
          status: 'done',
          originFileObj: file,
        } as UploadFile,
      ]);

      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
    fileList,
    maxCount: 1,
  };

  return (
    <Card title="素材上传">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="视频标题"
          name="title"
          rules={[
            { required: true, message: '请输入视频标题' },
            { max: 100, message: '标题长度不能超过100个字符' },
          ]}
        >
          <Input placeholder="请输入视频标题" maxLength={100} />
        </Form.Item>

        <Form.Item
          label="视频文件"
          required
          help="支持 MP4、AVI、MOV 等格式，文件大小不超过 500MB"
        >
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 MP4、AVI、MOV 等视频格式，单个文件不超过 500MB
            </p>
          </Upload.Dragger>
        </Form.Item>

        {uploading && uploadProgress > 0 && (
          <Form.Item>
            <Progress percent={uploadProgress} status="active" />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={uploading} icon={<UploadOutlined />}>
              上传素材
            </Button>
            <Button onClick={() => navigate('/material/list')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
});

export default MaterialUpload;
