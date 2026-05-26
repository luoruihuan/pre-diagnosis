import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as fs from 'fs';
import { OceanEngineService } from '../ocean-engine/ocean-engine.service';

export interface VideoUploadJobData {
  taskId: string;
  agentId: number;
  fileName: string;
  mimeType: string;
  tmpPath: string;
}

const REDIS_KEY = (taskId: string) => `video_upload:${taskId}`;

@Processor('video-upload')
export class VideoUploadProcessor {
  private readonly logger = new Logger(VideoUploadProcessor.name);

  constructor(
    private readonly oceanEngineService: OceanEngineService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Process('upload')
  async handleUpload(job: Job<VideoUploadJobData>) {
    const { taskId, agentId, fileName, mimeType, tmpPath } = job.data;
    this.logger.log(`开始上传视频 taskId=${taskId} fileName=${fileName}`);

    try {
      await this.redis.setex(
        REDIS_KEY(taskId),
        3600,
        JSON.stringify({ status: 'UPLOADING', progress: 20 }),
      );

      const fileBuffer = fs.readFileSync(tmpPath);

      await this.redis.setex(
        REDIS_KEY(taskId),
        3600,
        JSON.stringify({ status: 'UPLOADING', progress: 50 }),
      );

      const result = await this.oceanEngineService.uploadVideo({
        agentId,
        fileName,
        fileBuffer,
        mimeType,
      });

      await this.redis.setex(
        REDIS_KEY(taskId),
        3600,
        JSON.stringify({ status: 'SUCCESS', progress: 100, result }),
      );

      this.logger.log(`上传成功 taskId=${taskId} videoId=${result.videoId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`上传失败 taskId=${taskId}: ${msg}`);
      await this.redis.setex(
        REDIS_KEY(taskId),
        3600,
        JSON.stringify({ status: 'FAILED', progress: 0, error: msg }),
      );
    } finally {
      // 清理临时文件
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}
