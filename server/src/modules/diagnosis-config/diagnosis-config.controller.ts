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
import { DiagnosisConfigService } from './diagnosis-config.service';
import { CreateDiagnosisConfigDto } from './dto/create-diagnosis-config.dto';
import { UpdateDiagnosisConfigDto } from './dto/update-diagnosis-config.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('诊断配置')
@Controller('diagnosis-configs')
export class DiagnosisConfigController {
  constructor(private readonly configService: DiagnosisConfigService) {}

  @Post()
  @ApiOperation({ summary: '创建诊断配置' })
  @SwaggerResponse({ status: 201, description: '创建成功' })
  create(@Body() createConfigDto: CreateDiagnosisConfigDto) {
    return this.configService.create(createConfigDto);
  }

  @Get()
  @ApiOperation({ summary: '获取配置列表' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.configService.findAll(paginationDto, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取配置详情' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.configService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新配置' })
  @SwaggerResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() updateConfigDto: UpdateDiagnosisConfigDto) {
    return this.configService.update(id, updateConfigDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除配置' })
  @SwaggerResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.configService.remove(id);
  }
}
