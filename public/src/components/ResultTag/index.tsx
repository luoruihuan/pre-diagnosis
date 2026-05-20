import React from 'react';
import { Tag } from 'antd';
import { RESULT_LEVEL } from '../../utils/constants';

interface ResultTagProps {
  level: keyof typeof RESULT_LEVEL;
}

const ResultTag: React.FC<ResultTagProps> = ({ level }) => {
  const config = RESULT_LEVEL[level];

  return <Tag color={config.color}>{config.label}</Tag>;
};

export default ResultTag;
