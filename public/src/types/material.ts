// 素材相关类型定义

export interface Material {
  id: number;
  title: string;
  videoUrl: string;
  coverUrl: string;
  duration: number;
  fileSize: number;
  uploadTime: string;
  status: 'ACTIVE' | 'DELETED';
}

export interface MaterialUploadParams {
  title: string;
  videoFile: File;
}

export interface MaterialListParams {
  page: number;
  pageSize: number;
  title?: string;
  status?: string;
}

export interface ArkVideo {
  id: string;
  url: string;
  signature: string;
  source: string;
  createTime: string;
  filename: string;
  // 由 /file/video/get/ 补全的元数据
  coverUrl: string;
  materialName: string;
  width: number;
  height: number;
  duration: number;
  size: number;
  format: string;
}

export interface ArkVideoPageInfo {
  page: number;
  pageSize: number;
  totalPage: number;
  totalNumber: number;
}

export interface ArkVideoListResult {
  list: ArkVideo[];
  pageInfo: ArkVideoPageInfo;
}
