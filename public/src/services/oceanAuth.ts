import request from '../utils/request';

export interface OceanAuthStatus {
  authorized: boolean;
  expiresAt?: number | null;   // Unix 时间戳（秒）
  remainSeconds?: number | null;
  advertiserIds?: number[];
}

// 获取授权状态
export const getOceanAuthStatus = async (): Promise<OceanAuthStatus> =>
  request.get('/auth/ocean-engine/status');

// 发起授权（跳转到巨量授权页，不走 axios）
export const startOceanAuthorize = (): void => {
  window.location.href = '/api/auth/ocean-engine/authorize';
};

// 撤销授权
export const revokeOceanAuth = async (): Promise<void> =>
  request.delete('/auth/ocean-engine/revoke');
