import { makeAutoObservable, runInAction } from 'mobx';
import {
  getRegions,
  getAgeGroups,
  getGenders,
  getDiagnosisDimensions,
  getTaskStatuses,
} from '../services/enum';
import type { EnumItem, Region } from '../types/common';

class EnumStore {
  regions: Region[] = [];
  ageGroups: EnumItem[] = [];
  genders: EnumItem[] = [];
  diagnosisDimensions: EnumItem[] = [];
  taskStatuses: EnumItem[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  // 初始化所有枚举数据
  async initEnums() {
    this.loading = true;
    try {
      const [regions, ageGroups, genders, dimensions, statuses] = await Promise.all([
        getRegions(),
        getAgeGroups(),
        getGenders(),
        getDiagnosisDimensions(),
        getTaskStatuses(),
      ]);

      runInAction(() => {
        this.regions = regions;
        this.ageGroups = ageGroups;
        this.genders = genders;
        this.diagnosisDimensions = dimensions;
        this.taskStatuses = statuses;
      });
    } catch (error) {
      console.error('初始化枚举数据失败:', error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 获取地区名称
  getRegionName(code: string): string {
    const findRegion = (regions: Region[], targetCode: string): string | null => {
      for (const region of regions) {
        if (region.code === targetCode) {
          return region.name;
        }
        if (region.children) {
          const found = findRegion(region.children, targetCode);
          if (found) return found;
        }
      }
      return null;
    };

    return findRegion(this.regions, code) || code;
  }

  // 获取枚举标签
  getEnumLabel(items: EnumItem[], value: string | number): string {
    const item = items.find((i) => i.value === value);
    return item?.label || String(value);
  }
}

export default new EnumStore();
