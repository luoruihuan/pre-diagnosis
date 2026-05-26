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


class DiagnosisStore {
  tasks: DiagnosisTask[] = [];
  total = 0;
  loading = false;
  currentTask: DiagnosisTask | null = null;
  currentTaskDetail: DiagnosisDetailResponse | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // 获取任务列表
  async fetchTasks(params: DiagnosisListParams) {
    this.loading = true;
    try {
      const response = await getDiagnosisTaskList(params) as any;
      runInAction(() => {
        // 后端返回 items 字段，兼容 list 字段
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
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 创建任务
  async createTask(params: DiagnosisCreateParams) {
    this.loading = true;
    try {
      const task = await createDiagnosisTask(params);
      message.success('任务创建成功');
      return task;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 创建新素材检测任务
  async createNewMaterialTask(params: NewMaterialCreateParams) {
    this.loading = true;
    try {
      const task = await createNewMaterialTask(params);
      message.success('前测任务创建成功');
      return task;
    } catch (error) {
      console.error('创建前测任务失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 获取任务详情
  async fetchTaskDetail(id: number) {
    this.loading = true;
    try {
      const detail = await getDiagnosisTaskDetail(id);
      runInAction(() => {
        this.currentTaskDetail = detail;
        this.currentTask = detail.task;
      });
      return detail;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // 取消任务
  async cancelTask(id: number) {
    try {
      await cancelDiagnosisTask(id);
      message.success('任务已取消');
      // 更新任务状态
      runInAction(() => {
        const task = this.tasks.find((t) => t.id === id);
        if (task) {
          task.status = 'FAILED';
        }
      });
    } catch (error) {
      console.error('取消任务失败:', error);
      throw error;
    }
  }

  // 重试任务
  async retryTask(id: number) {
    try {
      const task = await retryDiagnosisTask(id);
      message.success('任务已重新执行');
      runInAction(() => {
        const index = this.tasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          this.tasks[index] = task;
        }
      });
      return task;
    } catch (error) {
      console.error('重试任务失败:', error);
      throw error;
    }
  }

  // 删除任务
  async deleteTask(id: number) {
    try {
      await deleteDiagnosisTask(id);
      message.success('任务删除成功');
      runInAction(() => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        this.total -= 1;
      });
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }
}

export default new DiagnosisStore();
