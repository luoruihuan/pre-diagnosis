import request from '../utils/request';
import type {
  DiagnosisTask,
  DiagnosisCreateParams,
  DiagnosisListParams,
  DiagnosisDetailResponse,
} from '../types/diagnosis';
import type { PaginationResponse } from '../types/common';

// 创建诊断任务
export const createDiagnosisTask = async (params: DiagnosisCreateParams): Promise<DiagnosisTask> => {
  return request.post('/diagnosis/tasks', params);
};

// 获取任务列表
export const getDiagnosisTaskList = async (
  params: DiagnosisListParams
): Promise<PaginationResponse<DiagnosisTask>> => {
  return request.get('/diagnosis/tasks', { params });
};

// 获取任务详情
export const getDiagnosisTaskDetail = async (id: number): Promise<DiagnosisDetailResponse> => {
  return request.get(`/diagnosis/tasks/${id}`);
};

// 取消任务
export const cancelDiagnosisTask = async (id: number): Promise<void> => {
  return request.post(`/diagnosis/tasks/${id}/cancel`);
};

// 重新执行任务
export const retryDiagnosisTask = async (id: number): Promise<DiagnosisTask> => {
  return request.post(`/diagnosis/tasks/${id}/retry`);
};

// 删除任务
export const deleteDiagnosisTask = async (id: number): Promise<void> => {
  return request.delete(`/diagnosis/tasks/${id}`);
};
