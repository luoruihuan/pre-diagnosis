import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
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

  /**
   * GET /materials/ark-videos
   * 获取方舟素材列表，并用广告主接口补全封面图/尺寸/时长等元数据
   */
  @Get('ark-videos')
  @ApiOperation({ summary: '获取巨量引擎方舟素材库列表（含元数据补全）' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  async getArkVideos(
    @Query('agentId') agentIdStr: string,
    @Query('advertiserId') advertiserIdStr?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('source') source?: string,
    @Query('videoId') videoId?: string,
  ) {
    const agentId = Number(agentIdStr);
    if (!agentId || isNaN(agentId)) {
      throw new BadRequestException('agentId 必须为有效数字');
    }

    const filtering: Record<string, any> = {};
    if (startTime) filtering.startTime = startTime;
    if (endTime) filtering.endTime = endTime;
    if (source) filtering.source = source.split(',').filter(Boolean);
    if (videoId) filtering.videoIds = [videoId.trim()];

    const arkResult = await this.oceanEngineService.getArkVideoList({
      agentId,
      filtering: Object.keys(filtering).length ? filtering : undefined,
      page: pageStr ? Number(pageStr) : 1,
      pageSize: pageSizeStr ? Number(pageSizeStr) : 20,
    });

    // 有 advertiserId 时，批量补全封面图/元数据
    const advertiserId = advertiserIdStr ? Number(advertiserIdStr) : null;
    if (advertiserId && arkResult.list.length > 0) {
      const videoIds = arkResult.list.map(v => v.id);
      const detailMap = await this.oceanEngineService.getVideoDetails({
        advertiserId,
        videoIds,
      });

      const enrichedList = arkResult.list.map(v => {
        const detail = detailMap.get(v.id);
        return {
          ...v,
          coverUrl: detail?.coverUrl ?? '',
          materialName: detail?.materialName ?? v.filename,
          width: detail?.width ?? 0,
          height: detail?.height ?? 0,
          duration: detail?.duration ?? 0,
          size: detail?.size ?? 0,
          format: detail?.format ?? '',
        };
      });

      return { list: enrichedList, pageInfo: arkResult.pageInfo };
    }

    // 无 advertiserId 时直接返回基础字段
    return {
      list: arkResult.list.map(v => ({
        ...v,
        coverUrl: '',
        materialName: v.filename,
        width: 0,
        height: 0,
        duration: 0,
        size: 0,
        format: '',
      })),
      pageInfo: arkResult.pageInfo,
    };
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
