import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { DiagnosisTaskService } from './diagnosis-task.service';

@Processor('diagnosis-polling')
export class DiagnosisTaskProcessor {
  private readonly logger = new Logger(DiagnosisTaskProcessor.name);

  constructor(private readonly taskService: DiagnosisTaskService) {}

  @Process('poll-task-status')
  async handlePolling(job: Job<{ taskId: string }>) {
    const { taskId } = job.data;
    this.logger.debug(`轮询任务状态: ${taskId} (尝试 ${job.attemptsMade + 1}/12)`);

    try {
      await this.taskService.pollTaskStatus(taskId);
    } catch (error) {
      this.logger.warn(`轮询失败: ${taskId} - ${error.message}`);
      throw error; // 让 Bull 处理重试
    }
  }
}
