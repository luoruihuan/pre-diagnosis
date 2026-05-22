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
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { OceanEngineService } from '../ocean-engine/ocean-engine.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('素材管理')
@Controller('materials')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService,
    private readonly oceanEngineService: OceanEngineService,
  ) {}

  @Post('upload-video')
  @ApiOperation({ summary: '上传视频至巨量引擎方舟（前测专用）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['agentId', 'fileName', 'video'],
      properties: {
        agentId: { type: 'number', description: '代理商ID' },
        fileName: { type: 'string', description: '文件名' },
        video: { type: 'string', format: 'binary', description: '视频文件' },
      },
    },
  })
  @SwaggerResponse({ status: 201, description: '上传成功，返回 videoId/materialId/videoUrl' })
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('agentId') agentIdStr: string,
    @Body('fileName') fileName: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传视频文件');
    }
    const agentId = Number(agentIdStr);
    if (!agentId || isNaN(agentId)) {
      throw new BadRequestException('agentId 必须为有效数字');
    }
    const resolvedFileName = fileName || file.originalname;

    return this.oceanEngineService.uploadVideo({
      agentId,
      fileName: resolvedFileName,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      isNeedAuth: false,
    });
  }

  @Post()
  @ApiOperation({ summary: '创建素材' })
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
