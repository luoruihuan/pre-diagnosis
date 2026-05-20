import { makeAutoObservable, runInAction } from 'mobx';
import { message } from 'antd';
import {
  getMaterialList,
  uploadMaterial,
  deleteMaterial,
  getMaterialDetail,
} from '../services/material';
import type { Material, MaterialListParams, MaterialUploadParams } from '../types/material';
import type { PaginationResponse } from '../types/common';

class MaterialStore {
  materials: Material[] = [];
  total = 0;
  loading = false;
  currentMaterial: Material | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // 获取素材列表
  async fetchMaterials(params: MaterialListParams) {
    this.loading = true;
    try {
      const response: PaginationResponse<Material> = await getMaterialList(params);
      runInAction(() => {
        this.materials = response.list;
        this.total = response.total;
      });
    } catch (error) {
      console.error('获取素材列表失败:', error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 上传素材
  async uploadMaterial(params: MaterialUploadParams) {
    this.loading = true;
    try {
      const material = await uploadMaterial(params);
      message.success('素材上传成功');
      return material;
    } catch (error) {
      console.error('上传素材失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 删除素材
  async deleteMaterial(id: number) {
    try {
      await deleteMaterial(id);
      message.success('素材删除成功');
      runInAction(() => {
        this.materials = this.materials.filter((m) => m.id !== id);
        this.total -= 1;
      });
    } catch (error) {
      console.error('删除素材失败:', error);
      throw error;
    }
  }

  // 获取素材详情
  async fetchMaterialDetail(id: number) {
    this.loading = true;
    try {
      const material = await getMaterialDetail(id);
      runInAction(() => {
        this.currentMaterial = material;
      });
      return material;
    } catch (error) {
      console.error('获取素材详情失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }
}

export default new MaterialStore();
