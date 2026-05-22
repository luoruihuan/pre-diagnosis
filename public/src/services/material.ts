import request from '../utils/request';
import type { Material, MaterialListParams, MaterialUploadParams } from '../types/material';
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

// 上传视频至巨量引擎方舟（前测专用）
export const uploadVideoToOcean = async (params: {
  agentId: number;
  fileName: string;
  file: File;
}): Promise<{ videoId: string; materialId: number; videoUrl: string }> => {
  const formData = new FormData();
  formData.append('agentId', String(params.agentId));
  formData.append('fileName', params.fileName);
  formData.append('video', params.file);

  return request.post('/materials/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

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
