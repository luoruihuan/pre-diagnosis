import request from '../utils/request';

// 配置模板相关接口
export interface ConfigTemplate {
  id: number;
  name: string;
  description: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 获取配置模板列表
export const getConfigTemplates = async (): Promise<ConfigTemplate[]> => {
  return request.get('/config/templates');
};

// 获取配置模板详情
export const getConfigTemplate = async (id: number): Promise<ConfigTemplate> => {
  return request.get(`/config/templates/${id}`);
};

// 创建配置模板
export const createConfigTemplate = async (
  params: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ConfigTemplate> => {
  return request.post('/config/templates', params);
};

// 更新配置模板
export const updateConfigTemplate = async (
  id: number,
  params: Partial<Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ConfigTemplate> => {
  return request.put(`/config/templates/${id}`, params);
};

// 删除配置模板
export const deleteConfigTemplate = async (id: number): Promise<void> => {
  return request.delete(`/config/templates/${id}`);
};
