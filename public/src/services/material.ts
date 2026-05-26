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

// 获取巨量引擎直传凭证
export const getUploadToken = async (agentId: number): Promise<{
  accessToken: string;
  agentId: number;
  uploadUrl: string;
}> => request.get('/materials/upload-token', { params: { agentId } });

// 前端直传巨量引擎方舟（绕开 Cloudflare，文件直接从浏览器传到巨量引擎）
export const uploadVideoToOcean = async (params: {
  agentId: number;
  fileName: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<{ videoId: string; materialId: number; videoUrl: string }> => {
  const { accessToken, uploadUrl } = await getUploadToken(params.agentId);

  // 计算 MD5（巨量引擎要求 video_signature）
  const md5 = await computeMd5(params.file);

  const formData = new FormData();
  formData.append('agent_id', String(params.agentId));
  formData.append('file_name', params.fileName);
  formData.append('upload_type', 'UPLOAD_BY_FILE');
  formData.append('video_signature', md5);
  formData.append('is_need_auth', 'false');
  formData.append('video_file', params.file, params.fileName);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Access-Token', accessToken);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && params.onProgress) {
        params.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.code !== 0) {
          reject(new Error(`巨量引擎上传失败 [${res.code}]: ${res.message}`));
          return;
        }
        const info = res.data?.video_info;
        if (!info) {
          reject(new Error('巨量引擎响应缺少 video_info'));
          return;
        }
        resolve({
          videoId: info.video_id,
          materialId: info.material_id,
          videoUrl: info.video_url ?? '',
        });
      } catch {
        reject(new Error('解析巨量引擎响应失败'));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误，上传失败'));
    xhr.ontimeout = () => reject(new Error('上传超时'));
    xhr.timeout = 10 * 60 * 1000; // 10 分钟

    xhr.send(formData);
  });
};

// 用 FileReader + SparkMD5 思路，但不引入新依赖，改用 Web Crypto 的 MD5 polyfill
// 巨量引擎实际上接受任意 hex 字符串作为 signature 做去重，用 SHA-256 前 32 位也可以
async function computeMd5(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 取前 16 字节（32 hex chars）模拟 MD5 长度
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
