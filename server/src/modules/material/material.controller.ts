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
