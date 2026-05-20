import React from 'react';
import { Tag } from 'antd';
import { TASK_STATUS } from '../../utils/constants';

interface TaskStatusBadgeProps {
  status: keyof typeof TASK_STATUS;
}

const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status }) => {
  const config = TASK_STATUS[status];

  return <Tag color={config.color}>{config.label}</Tag>;
};

export default TaskStatusBadge;
