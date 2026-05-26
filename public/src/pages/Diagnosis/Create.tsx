import React, { useState } from 'react';
import { Card, Form, Button, Space, message, Image, Row, Col } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import diagnosisStore from '../../stores/diagnosisStore';
import VideoSelector from '../../components/VideoSelector';
import DiagnosisConfigForm from '../../components/DiagnosisConfigForm';
import type { Material } from '../../types/material';

const DiagnosisCreate: React.FC = observer(() => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [videoSelectorVisible, setVideoSelectorVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Material | null>(null);

  const handleVideoSelect = (video: Material) => {
    setSelectedVideo(video);
    form.setFieldValue('videoId', video.id);
  };

  const handleSubmit = async (values: any) => {
    if (!selectedVideo) {
      message.error('请选择视频素材');
      return;
    }

    try {
      await diagnosisStore.createTask({
        advertiserId: values.advertiserId,
        agentId: values.agentId,
        videoId: String(selectedVideo.id),
        videoUrl: selectedVideo.coverUrl,
        title: selectedVideo.title,
      });

      message.success('任务创建成功');
      navigate('/diagnosis/list');
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  return (
    <Card title="创建前测任务">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gender: 'ALL',
          sampleSize: 1000,
        }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label="选择视频"
              name="videoId"
              rules={[{ required: true, message: '请选择视频素材' }]}
            >
              <div>
                {selectedVideo ? (
                  <Card
                    size="small"
                    style={{ marginBottom: 16 }}
                    cover={
                      <Image
                        src={selectedVideo.coverUrl}
                        alt={selectedVideo.title}
                        style={{ height: 200, objectFit: 'cover' }}
                      />
                    }
                  >
                    <Card.Meta
                      title={selectedVideo.title}
                      description={`时长: ${Math.floor(selectedVideo.duration / 60)}:${(
                        selectedVideo.duration % 60
                      )
                        .toString()
                        .padStart(2, '0')}`}
                    />
                  </Card>
                ) : (
                  <Button
                    type="dashed"
                    icon={<VideoCameraOutlined />}
                    onClick={() => setVideoSelectorVisible(true)}
                    block
                    style={{ height: 100 }}
                  >
                    点击选择视频素材
                  </Button>
                )}

                {selectedVideo && (
                  <Button
                    type="link"
                    onClick={() => setVideoSelectorVisible(true)}
                  >
                    重新选择
                  </Button>
                )}
              </div>
            </Form.Item>
          </Col>

          <Col span={12}>
            <DiagnosisConfigForm form={form} />
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={diagnosisStore.loading}>
              创建任务
            </Button>
            <Button onClick={() => navigate('/diagnosis/list')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>

      <VideoSelector
        visible={videoSelectorVisible}
        onCancel={() => setVideoSelectorVisible(false)}
        onSelect={handleVideoSelect}
      />
    </Card>
  );
});

export default DiagnosisCreate;
