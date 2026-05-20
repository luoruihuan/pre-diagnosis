import { makeAutoObservable, runInAction } from 'mobx';
import { message } from 'antd';
import {
  getConfigTemplates,
  getConfigTemplate,
  createConfigTemplate,
  updateConfigTemplate,
  deleteConfigTemplate,
  type ConfigTemplate,
} from '../services/config';

class ConfigStore {
  templates: ConfigTemplate[] = [];
  currentTemplate: ConfigTemplate | null = null;
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  // 获取配置模板列表
  async fetchTemplates() {
    this.loading = true;
    try {
      const templates = await getConfigTemplates();
      runInAction(() => {
        this.templates = templates;
      });
    } catch (error) {
      console.error('获取配置模板列表失败:', error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 获取配置模板详情
  async fetchTemplate(id: number) {
    this.loading = true;
    try {
      const template = await getConfigTemplate(id);
      runInAction(() => {
        this.currentTemplate = template;
      });
      return template;
    } catch (error) {
      console.error('获取配置模板详情失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 创建配置模板
  async createTemplate(params: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    this.loading = true;
    try {
      const template = await createConfigTemplate(params);
      message.success('配置模板创建成功');
      runInAction(() => {
        this.templates.push(template);
      });
      return template;
    } catch (error) {
      console.error('创建配置模板失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 更新配置模板
  async updateTemplate(
    id: number,
    params: Partial<Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    this.loading = true;
    try {
      const template = await updateConfigTemplate(id, params);
      message.success('配置模板更新成功');
      runInAction(() => {
        const index = this.templates.findIndex((t) => t.id === id);
        if (index !== -1) {
          this.templates[index] = template;
        }
      });
      return template;
    } catch (error) {
      console.error('更新配置模板失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 删除配置模板
  async deleteTemplate(id: number) {
    try {
      await deleteConfigTemplate(id);
      message.success('配置模板删除成功');
      runInAction(() => {
      this.templates = this.templates.filter((t) => t.id !== id);
      });
    } catch (error) {
      console.error('删除配置模板失败:', error);
      throw error;
    }
  }
}

export default new ConfigStore();
