import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { SystemConfigService, SystemConfigDto } from './system-config.service';

@ApiTags('系统配置')
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取系统配置（脱敏）' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  getConfig(): SystemConfigDto {
    return this.systemConfigService.getConfig();
  }

  @Put()
  @ApiOperation({ summary: '更新系统配置' })
  @SwaggerResponse({ status: 200, description: '更新成功，重启后生效' })
  updateConfig(@Body() updates: Partial<SystemConfigDto>) {
    return this.systemConfigService.updateConfig(updates);
  }
}
