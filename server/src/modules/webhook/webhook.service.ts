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
   * 验证 Webhook 签名
   * 官方算法：HMAC-SHA256(rawBody, secret_key)，对比请求头 X-Open-Signature
   * 必须使用原始请求体字节，不能用 JSON.stringify 后的字符串（字段顺序/空格可能不一致）
   */
  async verifySignature(
    rawBody: Buffer,
    signature: string,
    requestId: string,
  ): Promise<'ok' | 'invalid' | 'duplicate'> {
    this.logger.log(`[签名调试-SVC] 进入verifySignature, requestId=${requestId}, signature=${signature}`);

    // 1. 验证签名：HMAC-SHA256(rawBody, secret_key)
    const secret = this.oceanConfig.webhookSecret;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    this.logger.log(`[签名调试] secretKey长度=${secret?.length}, rawBody长度=${rawBody?.length}`);
    this.logger.log(`[签名调试] rawBody内容=${rawBody?.toString('utf8')}`);
    this.logger.log(`[签名调试] 期望签名=${expectedSignature}`);
    this.logger.log(`[签名调试] 收到签名=${signature}`);

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch (error) {
      this.logger.error(`签名比较异常: ${error.message}`);
      return 'invalid';
    }

    if (!isValid) {
      return 'invalid';
    }

    // 2. 签名验证通过后，再检查是否重复请求（防重放）
    const dedupeKey = `webhook:processed:${requestId}`;
    let exists = 0;
    try {
      exists = await this.redis.exists(dedupeKey);
    } catch (e) {
      this.logger.error(`[签名调试-SVC] Redis exists 异常: ${e.message}`);
    }

    if (exists) {
      this.logger.warn(`重复请求已忽略: ${requestId}`);
      return 'duplicate';
    }

    // 3. 标记请求已处理（10分钟过期）
    try {
      await this.redis.setex(dedupeKey, 600, '1');
    } catch (e) {
      this.logger.error(`Redis setex 异常: ${e.message}`);
    }

    return 'ok';
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
