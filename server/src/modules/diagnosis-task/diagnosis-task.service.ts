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
    const { advertiserId, videoId, configId } = createTaskDto;

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

    // 获取配置
    let config = null;
    if (configId) {
      config = await this.configService.findOne(configId);
    }

    // 调用巨量引擎 API 创建诊断任务
    let oceanTaskId: string;
    try {
      const result = await this.oceanEngineService.createDiagnosisTask(
        advertiserId,
        videoId,
        config?.config,
      );
      oceanTaskId = result.task_id;
    } catch (error) {
      this.logger.error(`创建诊断任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(`创建诊断任务失败: ${error.message}`);
    }

    // 保存任务记录
    const task = this.taskRepository.create({
      advertiserId,
      videoId,
      configId,
      oceanTaskId,
      status: DiagnosisStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    // 加入轮询队列
    await this.pollingQueue.add(
      'poll-task-status',
      { taskId: savedTask.id },
      {
        attempts: 12, // 最多轮询 12 次
        backoff: {
          type: 'fixed',
          delay: 5000, // 每 5 秒轮询一次
        },
      },
    );

    this.logger.log(`创建诊断任务成功: ${savedTask.id} (Ocean: ${oceanTaskId})`);
    return savedTask;
  }

  async findAll(
    queryDto: QueryDiagnosisTaskDto,
  ): Promise<PaginatedResponse<DiagnosisTask>> {
    const { page, pageSize, advertiserId, videoId, status } = queryDto;
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

    try {
      // 查询巨量引擎任务状态
      const result = await this.oceanEngineService.getDiagnosisTaskStatus(
        task.advertiserId,
        task.oceanTaskId,
      );

      if (result.status === 'SUCCESS') {
        await this.updateStatus(
          taskId,
          DiagnosisStatus.SUCCESS,
          result.result,
        );
      } else if (result.status === 'FAILED') {
        await this.updateStatus(
          taskId,
          DiagnosisStatus.FAILED,
          null,
          result.error_message,
        );
      } else if (result.status === 'PROCESSING') {
        await this.updateStatus(taskId, DiagnosisStatus.PROCESSING);
        // 继续轮询（由 Bull 重试机制处理）
        throw new Error('任务处理中，继续轮询');
      }
    } catch (error) {
      // 如果是最后一次重试，标记为超时
      if (task.retryCount >= 11) {
        await this.updateStatus(
          taskId,
          DiagnosisStatus.TIMEOUT,
          null,
          '任务超时',
        );
      } else {
        // 增加重试计数
        task.retryCount += 1;
        await this.taskRepository.save(task);
        throw error; // 继续重试
      }
    }
  }
}
