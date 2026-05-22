// 诊断任务相关类型定义

export type TaskSource = 'NEW' | 'ARK';
export type QualityValue = 'YES' | 'NO' | 'UNKNOWN';

export interface DiagnosisTaskResult {
  isAdHighQuality: QualityValue;
  isEcpHighQuality: QualityValue;
  isFirstPublish: QualityValue;
  nonQualityReasons?: string[];
}

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
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUCCESS' | 'TIMEOUT';
  progress: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  // 新素材检测字段
  source?: TaskSource;
  advertiserId?: number;
  agentId?: number;
  videoStrId?: string;
  videoUrl?: string;
  materialTitle?: string;
  refAdId?: number;
  refPromotionId?: number;
  result?: DiagnosisTaskResult;
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
  source?: TaskSource;
  advertiserId?: number;
}

export interface NewMaterialCreateParams {
  advertiserId: number;
  agentId: number;
  videoId: string;
  videoUrl?: string;
  title?: string;
  refAdId?: number;
  refPromotionId?: number;
}

export interface DiagnosisDetailResponse {
  task: DiagnosisTask;
  results: DiagnosisResult[];
}
