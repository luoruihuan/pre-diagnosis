import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { DiagnosisTaskService } from '../diagnosis-task/diagnosis-task.service';
import { OceanEngineService } from '../ocean-engine/ocean-engine.service';
import { OceanConfigService } from '../system-config/ocean-config.service';
import { DiagnosisStatus } from '../../common/enums/diagnosis-status.enum';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly oceanConfig: OceanConfigService,
    private readonly taskService: DiagnosisTaskService,
    private readonly oceanEngineService: OceanEngineService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 验证 Webhook 签名（防时序攻击 + 防重放攻击）
   * 签名算法：HMAC-SHA256(timestamp + "." + body, webhookSecret)
   */
  async verifySignature(
    timestamp: string,
    body: string,
    signature: string,
    requestId: string,
  ): Promise<boolean> {
    // 1. 验证时间戳（5分钟内有效）
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 300000) {
      this.logger.warn(`时间戳过期: ${timestamp}, 时间差: ${timeDiff}ms`);
      return false;
    }

    // 2. 检查请求是否已处理（防重放攻击）
    const dedupeKey = `webhook:processed:${requestId}`;
    const exists = await this.redis.exists(dedupeKey);

    if (exists) {
      this.logger.warn(`重复请求: ${requestId}`);
      return false;
    }

    // 3. 验证签名（文档要求：HMAC-SHA256(timestamp + "." + body, secret)）
    const expectedSignature = crypto
      .createHmac('sha256', this.oceanConfig.webhookSecret)
      .update(timestamp + '.' + body)
      .digest('hex');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );

      // 4. 签名验证通过后，标记请求已处理（10分钟过期）
      if (isValid) {
        await this.redis.setex(dedupeKey, 600, '1');
      }

      return isValid;
    } catch (error) {
      this.logger.error(`签名验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 处理诊断任务完成事件
   * 文档要求：收到回调后调用接口三（/diagnosis_task/agent/get/）��取完整结果，不直接使用回调 body 中的数据
   */
  async handleDiagnosisComplete(data: {
    video_id: string;
    agent_id: number;
    task_id: number;
    status: 'SUCCESS' | 'FAILED';
  }): Promise<void> {
    const { task_id, agent_id, status } = data;

    this.logger.log(`收到前测完成回调: task_id=${task_id}, status=${status}`);

    // 通过 oceanTaskId 查找本地任务
    const task = await this.taskService.findByOceanTaskId(String(task_id));
    if (!task) {
      this.logger.warn(`未找到本地任务: oceanTaskId=${task_id}`);
      return;
    }

    if (status === 'FAILED') {
      await this.taskService.updateStatus(task.id, DiagnosisStatus.FAILED, null, '巨量引擎前测失败');
      this.logger.log(`任务标记为失败: ${task.id}`);
      return;
    }

    // SUCCESS：调用接口三获取完整前测结果
    try {
      const resolvedAgentId = agent_id ?? task.agentId;
      const { taskList } = await this.oceanEngineService.getDiagnosisTaskResult(
        resolvedAgentId,
        [task_id],
      );

      const taskResult = taskList.find((t) => t.taskId === task_id);
      if (!taskResult) {
        this.logger.warn(`接口三未返回 task_id=${task_id} 的结果`);
        await this.taskService.updateStatus(task.id, DiagnosisStatus.SUCCESS, null, null);
        return;
      }

      const result = {
        isAdHighQuality: taskResult.isAdHighQuality,
        isEcpHighQuality: taskResult.isEcpHighQuality,
        isFirstPublish: taskResult.isFirstPublish,
        notAdHighQualityReason: taskResult.notAdHighQualityReason,
        notEcpHighQualityReason: taskResult.notEcpHighQualityReason,
      };

      await this.taskService.updateStatus(task.id, DiagnosisStatus.SUCCESS, result, null);
      this.logger.log(
        `任务结果已更新: ${task.id}, AD优质=${result.isAdHighQuality}, 千川优质=${result.isEcpHighQuality}, 首发=${result.isFirstPublish}`,
      );
    } catch (error) {
      this.logger.error(`查询前测结果失败: ${error.message}`);
      // 查询失败时仍标记成功，结果留空，等待轮询补全
      await this.taskService.updateStatus(task.id, DiagnosisStatus.SUCCESS, null, null);
    }
  }
}
