import request from '../utils/request';

export interface AdvertiserAccount {
  id: string;
  agentId: number;
  advertiserId: number;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateAdvertiserAccountParams {
  agentId: number;
  advertiserId: number;
  name?: string;
  isActive?: boolean;
}

export interface UpdateAdvertiserAccountParams {
  agentId?: number;
  advertiserId?: number;
  name?: string;
  isActive?: boolean;
}

// 获取广告主账号列表（分页）
export const getAdvertiserAccounts = async (
  page = 1,
  pageSize = 10,
  isActive?: boolean,
): Promise<PaginatedResponse<AdvertiserAccount>> => {
  const params: Record<string, unknown> = { page, pageSize };
  if (isActive !== undefined) params.isActive = isActive;
  return request.get('/advertiser-accounts', { params });
};

// 创建广告主账号
export const createAdvertiserAccount = async (
  params: CreateAdvertiserAccountParams,
): Promise<AdvertiserAccount> => {
  return request.post('/advertiser-accounts', params);
};

// 更新广告主账号
export const updateAdvertiserAccount = async (
  id: string,
  params: UpdateAdvertiserAccountParams,
): Promise<AdvertiserAccount> => {
  return request.patch(`/advertiser-accounts/${id}`, params);
};

// 删除广告主账号
export const deleteAdvertiserAccount = async (id: string): Promise<void> => {
  return request.delete(`/advertiser-accounts/${id}`);
};

// 系统配置相关
export interface SystemConfig {
  oceanEngineBaseUrl: string;
  oceanEngineAppId: string;
  oceanEngineAppSecret: string;
  oceanEngineWebhookSecret: string;
  oceanEngineAccessToken: string;
}

// 获取系统配置
export const getSystemConfig = async (): Promise<SystemConfig> => {
  return request.get('/system-config');
};

// 更新系统配置
export const updateSystemConfig = async (
  params: Partial<SystemConfig>,
): Promise<{ message: string }> => {
  return request.put('/system-config', params);
};
