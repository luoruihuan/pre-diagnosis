import React from 'react';
import { Result } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const Placeholder: React.FC = () => {
  return (
    <Result
      icon={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
      title="功能开发中"
      subTitle="该功能正在建设中，敬请期待"
    />
  );
};

export default Placeholder;
