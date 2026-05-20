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
