import React from 'react';
import { Tag } from 'antd';
import { RESULT_LEVEL } from '../../utils/constants';
import type { QualityValue } from '../../types/diagnosis';

// 旧接口：按 level 展示（保持向后兼容）
interface ResultTagByLevel {
  level: keyof typeof RESULT_LEVEL;
  type?: never;
  value?: never;
}

// 新接口：按 type + value 展示
interface ResultTagByType {
  type: 'ad' | 'ecp' | 'first';
  value: QualityValue;
  level?: never;
}

type ResultTagProps = ResultTagByLevel | ResultTagByType;

const TYPE_CONFIG: Record<
  'ad' | 'ecp' | 'first',
  Record<QualityValue, { label: string; color: string }>
> = {
  ad: {
    YES: { label: 'AD优质', color: 'success' },
    NO: { label: 'AD非优质', color: 'error' },
    UNKNOWN: { label: '未知', color: 'default' },
  },
  ecp: {
    YES: { label: '千川优质', color: 'success' },
    NO: { label: '千川非优质', color: 'error' },
    UNKNOWN: { label: '未知', color: 'default' },
  },
  first: {
    YES: { label: '首发', color: 'blue' },
    NO: { label: '非首发', color: 'orange' },
    UNKNOWN: { label: '未知', color: 'default' },
  },
};

const ResultTag: React.FC<ResultTagProps> = (props) => {
  if (props.type !== undefined) {
    const config = TYPE_CONFIG[props.type][props.value];
    return <Tag color={config.color}>{config.label}</Tag>;
  }

  const config = RESULT_LEVEL[props.level];
  return <Tag color={config.color}>{config.label}</Tag>;
};

export default ResultTag;
