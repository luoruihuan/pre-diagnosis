// 诊断任务相关类型定义

export interface DiagnosisTask {
  id: number;
  taskName: string;
  videoId: number;
  videoTitle: string;
  videoCoverUrl: string;
  videoDuration: number;
  regionCode: string;
  regionName: string;
  ageGroup: string;
  gender: string;
  sampleSize: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DiagnosisResult {
  id: number;
  taskId: number;
  dimension: string;
  dimensionName: string;
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  suggestions: string[];
  details: Record<string, any>;
}

export interface DiagnosisCreateParams {
  taskName: string;
  videoId: number;
  regionCode: string;
  ageGroup: string;
  gender: string;
  sampleSize: number;
  dimensions: string[];
  customConfig?: Record<string, any>;
}

export interface DiagnosisListParams {
  page: number;
  pageSize: number;
  taskName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface DiagnosisDetailResponse {
  task: DiagnosisTask;
  results: DiagnosisResult[];
}
