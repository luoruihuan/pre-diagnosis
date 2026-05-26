import request from '../utils/request';
import type {
  DiagnosisTask,
  DiagnosisCreateParams,
  DiagnosisListParams,
  NewMaterialCreateParams,
} from '../types/diagnosis';
import type { PaginationResponse } from '../types/common';

// 创建新素材检测任务
export const createNewMaterialTask = async (params: NewMaterialCreateParams): Promise<DiagnosisTask> => {
  return request.post('/diagnosis-tasks', { ...params, source: 'NEW' });
};

// 创建诊断任务（通用）
export const createDiagnosisTask = async (params: DiagnosisCreateParams): Promise<DiagnosisTask> => {
  return request.post('/diagnosis-tasks', params);
};

// 获取任务列表
export const getDiagnosisTaskList = async (
  params: DiagnosisListParams
): Promise<PaginationResponse<DiagnosisTask>> => {
  return request.get('/diagnosis-tasks', { params });
};

// 获取任务详情
export const getDiagnosisTaskDetail = async (id: string): Promise<DiagnosisTask> => {
  return request.get(`/diagnosis-tasks/${id}`);
};

// 删除任务
export const deleteDiagnosisTask = async (id: string): Promise<void> => {
  return request.delete(`/diagnosis-tasks/${id}`);
};
