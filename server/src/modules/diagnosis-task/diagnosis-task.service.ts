import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DiagnosisTask } from '../../common/entities/diagnosis-task.entity';
import { DiagnosisStatus } from '../../common/enums/diagnosis-status.enum';
import { CreateDiagnosisTaskDto } from './dto/create-diagnosis-task.dto';
import { QueryDiagnosisTaskDto } from './dto/query-diagnosis-task.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { OceanEngineService } from '../ocean-engine/ocean-engine.service';
import { DiagnosisConfigService } from '../diagnosis-config/diagnosis-config.service';

@Injectable()
export class DiagnosisTaskService {
  private readonly logger = new Logger(DiagnosisTaskService.name);

  constructor(
    @InjectRepository(DiagnosisTask)
    private readonly taskRepository: Repository<DiagnosisTask>,
    @InjectQueue('diagnosis-polling')
    private readonly pollingQueue: Queue,
    private readonly oceanEngineService: OceanEngineService,
    private readonly configService: DiagnosisConfigService,
  ) {}

  async create(createTaskDto: CreateDiagnosisTaskDto): Promise<DiagnosisTask> {
    const {
      advertiserId,
      videoId,
      configId,
      agentId,
      refAdId,
      refPromotionId,
      source = 'NEW',
    } = createTaskDto;

    // 检查 QPS 限流
    const canProceed = await this.oceanEngineService.checkQpsLimit(
      advertiserId,
      videoId,
    );

    if (!canProceed) {
      throw new HttpException(
        { code: 40029, message: '调用次数超限，每天最多 5 次' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 调用巨量引擎 API 创建前测任务
    let oceanTaskId: string | null = null;
    try {
      const result = await this.oceanEngineService.createDiagnosisTask({
        agentId,
        advertiserId,
        videoIds: [videoId],
        refAdId,
        refPromotionId,
      });

      // 取第一个成功的 taskId
      if (result.taskIds && result.taskIds.length > 0) {
        oceanTaskId = String(result.taskIds[0]);
      } else {
        // 全部失败
        const failInfo = result.failVideoIds?.[videoId];
        const errMsg = failInfo
          ? `[${failInfo.errCode}] ${failInfo.errMessage}`
          : '巨量引擎未返回任务 ID';
        throw new Error(errMsg);
      }
    } catch (error) {
      this.logger.error(`创建诊断任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(`创建诊断任务失败: ${error.message}`);
    }

    // 保存任务记录（status=PENDING）
    const task = this.taskRepository.create({
      advertiserId,
      videoId,
      configId,
      oceanTaskId,
      source,
      agentId,
      refAdId,
      refPromotionId,
      status: DiagnosisStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    // 加入轮询队列（最多 12 次，每次 10s 间隔）
    await this.pollingQueue.add(
      'poll-task-status',
      { taskId: savedTask.id },
      {
        attempts: 12,
        backoff: {
          type: 'fixed',
          delay: 10000,
        },
      },
    );

    this.logger.log(`创建诊断任务成功: ${savedTask.id} (Ocean: ${oceanTaskId})`);
    return savedTask;
  }

  async findAll(
    queryDto: QueryDiagnosisTaskDto,
  ): Promise<PaginatedResponse<DiagnosisTask>> {
    const { page, pageSize, advertiserId, videoId, status, source } = queryDto;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.material', 'material')
      .leftJoinAndSelect('task.config', 'config');

    if (advertiserId) {
      queryBuilder.andWhere('task.advertiserId = :advertiserId', { advertiserId });
    }

    if (videoId) {
      queryBuilder.andWhere('task.videoId = :videoId', { videoId });
    }

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (source) {
      queryBuilder.andWhere('task.source = :source', { source });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('task.createdAt', 'DESC')
      .getManyAndCount();

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<DiagnosisTask> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['material', 'config'],
    });

    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    return task;
  }

  /**
   * 通过巨量引擎任务 ID 查找任务（用于 Webhook 回调）
   */
  async findByOceanTaskId(oceanTaskId: string): Promise<DiagnosisTask | null> {
    const task = await this.taskRepository.findOne({
      where: { oceanTaskId },
      relations: ['material', 'config'],
    });

    return task;
  }

  async updateStatus(
    id: string,
    status: DiagnosisStatus,
    result?: Record<string, any>,
    errorMessage?: string,
  ): Promise<DiagnosisTask> {
    const task = await this.findOne(id);

    task.status = status;
    if (result) {
      task.result = result;
    }
    if (errorMessage) {
      task.errorMessage = errorMessage;
    }

    if (
      status === DiagnosisStatus.SUCCESS ||
      status === DiagnosisStatus.FAILED ||
      status === DiagnosisStatus.TIMEOUT
    ) {
      task.completedAt = new Date();
    }

    const updated = await this.taskRepository.save(task);
    this.logger.log(`任务状态更新: ${id} -> ${status}`);
    return updated;
  }

  async pollTaskStatus(taskId: string): Promise<void> {
    const task = await this.findOne(taskId);

    // 如果任务已完成，不再轮询
    if (
      task.status === DiagnosisStatus.SUCCESS ||
      task.status === DiagnosisStatus.FAILED ||
      task.status === DiagnosisStatus.TIMEOUT
    ) {
      return;
    }

    if (!task.oceanTaskId || !task.agentId) {
      throw new Error(`任务 ${taskId} 缺少 oceanTaskId 或 agentId，无法轮询`);
    }

    try {
      // 查询巨量引擎任务结果
      const { taskList } = await this.oceanEngineService.getDiagnosisTaskResult(
        task.agentId,
        [Number(task.oceanTaskId)],
      );

      const taskResult = taskList.find(
        (t) => String(t.taskId) === task.oceanTaskId,
      );

      if (!taskResult) {
        // 巨量未返回该任务，继续等待
        task.retryCount += 1;
        await this.taskRepository.save(task);
        throw new Error('巨量引擎暂未返回任务结果，继续轮询');
      }

      if (taskResult.status === 'SUCCESS') {
        await this.updateStatus(taskId, DiagnosisStatus.SUCCESS, {
          isAdHighQuality: taskResult.isAdHighQuality,
          isEcpHighQuality: taskResult.isEcpHighQuality,
          isFirstPublish: taskResult.isFirstPublish,
          notAdHighQualityReason: taskResult.notAdHighQualityReason,
          notEcpHighQualityReason: taskResult.notEcpHighQualityReason,
        });
      } else if (taskResult.status === 'FAILED') {
        await this.updateStatus(
          taskId,
          DiagnosisStatus.FAILED,
          null,
          '巨量引擎前测任务失败',
        );
      } else {
        // PENDING：继续轮询
        await this.updateStatus(taskId, DiagnosisStatus.PROCESSING);
        task.retryCount += 1;
        await this.taskRepository.save(task);
        throw new Error('任务处理中，继续轮询');
      }
    } catch (error) {
      // 如果是最后一次重试，标记为超时
      if (task.retryCount >= 11) {
        await this.updateStatus(
          taskId,
          DiagnosisStatus.TIMEOUT,
          null,
          '任务超时（已轮询 12 次）',
        );
      } else {
        throw error; // 让 Bull 继续重试
      }
    }
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);

    // 只允许删除已完成、失败或超时的任务
    if (task.status === DiagnosisStatus.PROCESSING || task.status === DiagnosisStatus.PENDING) {
      throw new BadRequestException('无法删除进行中或待处理的任务');
    }

    await this.taskRepository.remove(task);
    this.logger.log(`删除诊断任务: ${id}`);
  }
}
