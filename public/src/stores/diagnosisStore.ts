import { makeAutoObservable, runInAction } from 'mobx';
import { message } from 'antd';
import {
  getDiagnosisTaskList,
  createDiagnosisTask,
  createNewMaterialTask,
  getDiagnosisTaskDetail,
  deleteDiagnosisTask,
} from '../services/diagnosis';
import type {
  DiagnosisTask,
  DiagnosisCreateParams,
  DiagnosisListParams,
  NewMaterialCreateParams,
} from '../types/diagnosis';

class DiagnosisStore {
  tasks: DiagnosisTask[] = [];
  total = 0;
  loading = false;
  currentTask: DiagnosisTask | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchTasks(params: DiagnosisListParams) {
    this.loading = true;
    try {
      const response = await getDiagnosisTaskList(params) as any;
      runInAction(() => {
        this.tasks = response?.items ?? response?.list ?? [];
        this.total = response?.total ?? 0;
      });
    } catch (error) {
      console.error('获取任务列表失败:', error);
      runInAction(() => {
        this.tasks = [];
        this.total = 0;
      });
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async createTask(params: DiagnosisCreateParams) {
    this.loading = true;
    try {
      const task = await createDiagnosisTask(params);
      message.success('任务创建成功');
      return task;
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async createNewMaterialTask(params: NewMaterialCreateParams) {
    this.loading = true;
    try {
      const task = await createNewMaterialTask(params);
      message.success('前测任务创建成功');
      return task;
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async fetchTaskDetail(id: string) {
    this.loading = true;
    try {
      const task = await getDiagnosisTaskDetail(id);
      runInAction(() => { this.currentTask = task; });
      return task;
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async deleteTask(id: string) {
    try {
      await deleteDiagnosisTask(id);
      message.success('任务删除成功');
      runInAction(() => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        this.total -= 1;
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new DiagnosisStore();
