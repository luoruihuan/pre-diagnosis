// 诊断任务相关类型定义

export type TaskSource = 'NEW' | 'ARK';
export type QualityValue = 'YES' | 'NO' | 'UNKNOWN';

export interface DiagnosisTaskResult {
  isAdHighQuality: QualityValue;
  isEcpHighQuality: QualityValue;
  isFirstPublish: QualityValue;
  notAdHighQualityReason?: string[];
  notEcpHighQualityReason?: string[];
}

export interface DiagnosisTask {
  id: string;
  advertiserId: string;
  agentId: number;
  videoId: string;
  videoUrl?: string;
  title?: string;
  oceanTaskId?: string;
  source: TaskSource;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  result?: DiagnosisTaskResult;
  errorMessage?: string;
  retryCount?: number;
  refAdId?: number;
  refPromotionId?: number;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface DiagnosisCreateParams {
  advertiserId: number;
  agentId: number;
  videoId: string;
  videoUrl?: string;
  title?: string;
  refAdId?: number;
  refPromotionId?: number;
  source?: TaskSource;
}

export interface DiagnosisListParams {
  page: number;
  pageSize: number;
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
