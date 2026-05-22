// 常量定义

// 任务状态
export const TASK_STATUS = {
  PENDING: { label: '待执行', color: 'default' },
  RUNNING: { label: '执行中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
  SUCCESS: { label: '已完成', color: 'success' },
  FAILED: { label: '失败', color: 'error' },
  TIMEOUT: { label: '超时', color: 'warning' },
} as const;

// 结果等级
export const RESULT_LEVEL = {
  EXCELLENT: { label: '优秀', color: 'success' },
  GOOD: { label: '良好', color: 'processing' },
  AVERAGE: { label: '一般', color: 'warning' },
  POOR: { label: '较差', color: 'error' },
} as const;

// 性别选项
export const GENDER_OPTIONS = [
  { value: 'ALL', label: '不限' },
  { value: 'MALE', label: '男性' },
  { value: 'FEMALE', label: '女性' },
];

// 年龄段选项
export const AGE_GROUP_OPTIONS = [
  { value: '0-6', label: '0-6岁' },
  { value: '7-12', label: '7-12岁' },
  { value: '13-18', label: '13-18岁' },
  { value: '19-30', label: '19-30岁' },
  { value: '31-45', label: '31-45岁' },
  { value: '46-60', label: '46-60岁' },
  { value: '60+', label: '60岁以上' },
];

// 诊断维度
export const DIAGNOSIS_DIMENSIONS = [
  { value: 'ATTENTION', label: '注意力' },
  { value: 'EMOTION', label: '情绪反应' },
  { value: 'MEMORY', label: '记忆留存' },
  { value: 'ENGAGEMENT', label: '参与度' },
  { value: 'COMPREHENSION', label: '理解度' },
];

// 分页默认配置
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
