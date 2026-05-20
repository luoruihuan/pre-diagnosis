import request from '../utils/request';
import type { EnumItem, Region } from '../types/common';

// 获取地区列表
export const getRegions = async (): Promise<Region[]> => {
  return request.get('/enums/regions');
};

// 获取年龄段选项
export const getAgeGroups = async (): Promise<EnumItem[]> => {
  return request.get('/enums/age-groups');
};

// 获取性别选项
export const getGenders = async (): Promise<EnumItem[]> => {
  return request.get('/enums/genders');
};

// 获取诊断维度
export const getDiagnosisDimensions = async (): Promise<EnumItem[]> => {
  return request.get('/enums/diagnosis-dimensions');
};

// 获取任务状态选项
export const getTaskStatuses = async (): Promise<EnumItem[]> => {
  return request.get('/enums/task-statuses');
};
