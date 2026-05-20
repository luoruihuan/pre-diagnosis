import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { DiagnosisTaskService } from '../diagnosis-task/diagnosis-task.service';
import { DiagnosisStatus } from '../../common/enums/diagnosis-status.enum';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly taskService: DiagnosisTaskService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'oceanEngine.webhookSecret',
    );
  }

  /**
   * 验证 Webhook 签名（防时序攻击 + 防重放攻击）
   */
  async verifySignature(
    timestamp: string,
    body: string,
    signature: string,
    requestId: string,
  ): Promise<boolean> {
    // 1. 验证时间戳（5分钟内有效）
    const requestTime = pa(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 300000) { // 5分钟 = 300000ms
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

    // 3. 验证签名（使用时间恒定比较防止时序攻击）
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(timestamp + body)
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
   */
  async handleDiagnosisComplete(data: {
    task_id: string;
    advertiser_id: string;
    video_id: string;
    status: string;
    result?: Record<string, any>;
    error_message?: string;
  }): Promise<void> {
    const { task_id, status, result, error_message } = data;

    this.logger.log(`收到 Webhook 事件: task_id=${task_id}, status=${status}`);

    // 直接通过 oceanTaskId 查找任务（修复全表扫描问题）
    const task = await this.taskService.findByOceanTaskId(task_id);

    if (!task) {
      this.logger.warn(`未找到任务: oceanTaskId=${task_id}`);
      return;
    }

    // 更新任务状态
    let diagnosisStatus: DiagnosisStatus;
    if (status === 'SUCCESS') {
      diagnosisStatus = DiagnosisStatus.SUCCESS;
    } else if (status === 'FAILED') {
      diagnosisStatus = DiagnosisStatus.FAILED;
    } else {
      diagnosisStatus = DiagnosisStatus.PROCESSING;
    }

    await this.taskService.updateStatus(
      task.id,
      diagnosisStatus,
      result,
      error_message,
    );

    this.logger.log(`任务状态已更新: ${task.id} -> ${diagnosisStatus}`);
  }
}
