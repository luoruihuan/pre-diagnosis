import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('素材管理')
@Controller('materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

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
  ) {
    return this.materialService.findAll(paginationDto, advertiserId);
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
