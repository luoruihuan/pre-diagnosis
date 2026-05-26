import request from '../utils/request';
import type { Material, MaterialListParams, MaterialUploadParams, ArkVideoListResult } from '../types/material';
import type { PaginationResponse } from '../types/common';

// 上传素材
export const uploadMaterial = async (params: MaterialUploadParams): Promise<Material> => {
  const formData = new FormData();
  formData.append('title', params.title);
  formData.append('video', params.videoFile);

  return request.post('/materials/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 异步上传视频至巨量引擎方舟（推荐，解决 Cloudflare 120s 超时）
// 第一步：上传文件到后端，立即返回 taskId
export const uploadVideoAsync = async (params: {
  agentId: number;
  fileName: string;
  file: File;
}): Promise<{ taskId: string }> => {
  const formData = new FormData();
  formData.append('agentId', String(params.agentId));
  formData.append('fileName', params.fileName);
  formData.append('video', params.file);

  return request.post('/materials/upload-video/async', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 文件传到后端最多 2 分钟
  });
};

// 第二步：轮询上传任务状态
export const getUploadStatus = async (taskId: string): Promise<{
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED';
  progress: number;
  result?: { videoId: string; materialId: number; videoUrl: string };
  error?: string;
}> => request.get(`/materials/upload-video/status/${taskId}`);

// 获取方舟素材库列表
export const getArkVideoList = async (params: {
  agentId: number;
  page?: number;
  pageSize?: number;
}): Promise<ArkVideoListResult> =>
  request.get('/materials/ark-videos', { params });

// 获取素材列表
export const getMaterialList = async (
  params: MaterialListParams
): Promise<PaginationResponse<Material>> => {
  return request.get('/materials', { params });
};

// 获取素材详情
export const getMaterialDetail = async (id: number): Promise<Material> => {
  return request.get(`/materials/${id}`);
};

// 删除素材
export const deleteMaterial = async (id: number): Promise<void> => {
  return request.delete(`/materials/${id}`);
};
