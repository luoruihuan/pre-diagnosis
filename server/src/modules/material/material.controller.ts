import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { MaterialService } from './material.service';
import { OceanEngineService } from '../ocean-engine/ocean-engine.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { VideoUploadJobData } from './video-upload.processor';

const REDIS_KEY = (taskId: string) => `video_upload:${taskId}`;

@ApiTags('素材管理')
@Controller('materials')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService,
    private readonly oceanEngineService: OceanEngineService,
    @InjectQueue('video-upload') private readonly uploadQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * POST /materials/upload-video/async
   * 接收文件写临时目录，立即返回 taskId，异步转发巨量引擎
   * 解决 Cloudflare 120s proxy timeout 问题
   */
  @Post('upload-video/async')
  @ApiOperation({ summary: '异步上传视频至巨量引擎方舟（推荐）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['agentId', 'video'],
      properties: {
        agentId: { type: 'number', description: '代理商ID' },
        fileName: { type: 'string', description: '文件名（可选）' },
        video: { type: 'string', format: 'binary', description: '视频文件' },
      },
    },
  })
  @SwaggerResponse({ status: 201, description: '已接收，返回 taskId 供轮询' })
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: os.tmpdir(),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 },
  }))
  async uploadVideoAsync(
    @UploadedFile() file: Express.Multer.File,
    @Body('agentId') agentIdStr: string,
    @Body('fileName') fileName: string,
  ) {
    if (!file) throw new BadRequestException('请上传视频文件');
    const agentId = Number(agentIdStr);
    if (!agentId || isNaN(agentId)) throw new BadRequestException('agentId 必须为有效数字');

    const taskId = crypto.randomUUID();
    const resolvedFileName = fileName || file.originalname;

    // 立即写入 PENDING 状态
    await this.redis.setex(
      REDIS_KEY(taskId),
      3600,
      JSON.stringify({ status: 'PENDING', progress: 5 }),
    );

    // 入队，异步处理
    const jobData: VideoUploadJobData = {
      taskId,
      agentId,
      fileName: resolvedFileName,
      mimeType: file.mimetype,
      tmpPath: file.path,
    };
    await this.uploadQueue.add('upload', jobData, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return { taskId };
  }

  /**
   * GET /materials/upload-video/status/:taskId
   * 查询异步上传任务状态
   */
  @Get('upload-video/status/:taskId')
  @ApiOperation({ summary: '查询异步上传任务状态' })
  @SwaggerResponse({ status: 200, description: '返回任务状态' })
  async getUploadStatus(@Param('taskId') taskId: string) {
    const raw = await this.redis.get(REDIS_KEY(taskId));
    if (!raw) {
      throw new BadRequestException('任务不存在或已过期');
    }
    return JSON.parse(raw) as {
      status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED';
      progress: number;
      result?: { videoId: string; materialId: number; videoUrl: string };
      error?: string;
    };
  }

  @Get('ark-videos')
  @ApiOperation({ summary: '获取巨量引擎方舟素材库列表' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  async getArkVideos(
    @Query('agentId') agentIdStr: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const agentId = Number(agentIdStr);
    if (!agentId || isNaN(agentId)) {
      throw new BadRequestException('agentId 必须为有效数字');
    }
    return this.oceanEngineService.getArkVideoList({
      agentId,
      page: pageStr ? Number(pageStr) : 1,
      pageSize: pageSizeStr ? Number(pageSizeStr) : 20,
    });
  }

  @SwaggerResponse({ status: 201, description: '创建成功' })
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialService.create(createMaterialDto);
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('advertiserId') advertiserId?: string,
    @Query('status') status?: string,
  ) {
    return this.materialService.findAll(paginationDto, advertiserId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.materialService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新素材' })
  @SwaggerResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  @SwaggerResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.materialService.remove(id);
  }
}
