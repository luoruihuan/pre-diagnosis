import request from '../utils/request';
import type { Material, MaterialListParams, MaterialUploadParams, ArkVideoListResult } from '../types/material';
import type { PaginationResponse } from '../types/common';

// 上传素材
export const uploadMaterial = async (params: MaterialUploadParams): Promise<Material> => {
  const formData = new FormData();
  formData.append('title', params.title);
  formData.append('video', params.videoFile);

  return request.post('/materials/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 获取方舟素材库列表（含筛选条件）
export const getArkVideoList = async (params: {
  agentId: number;
  advertiserId?: number;
  page?: number;
  pageSize?: number;
  startTime?: string;
  endTime?: string;
  source?: string;
  videoId?: string;
}): Promise<ArkVideoListResult> =>
  request.get('/materials/ark-videos', { params });

// 获取素材列表
export const getMaterialList = async (
  params: MaterialListParams
): Promise<PaginationResponse<Material>> =>
  request.get('/materials', { params });

// 获取素材详情
export const getMaterialDetail = async (id: number): Promise<Material> =>
  request.get(`/materials/${id}`);

// 删除素材
export const deleteMaterial = async (id: number): Promise<void> =>
  request.delete(`/materials/${id}`);
