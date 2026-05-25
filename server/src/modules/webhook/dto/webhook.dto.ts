import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';

/**
 * 巨量引擎 SPI 订阅推送 Body 格式（官方文档）：
 * {
 *   "message_id": "xxx",
 *   "subscribe_task_id": 123,
 *   "advertiser_ids": [123],
 *   "service_label": "status.material.diagnose.agentad",
 *   "publish_time": 1234567890,
 *   "timestamp": 1234567890,
 *   "nonce": 123,
 *   "data": "{...}"   // JSON 字符串
 * }
 */
export class WebhookDto {
  @ApiProperty({ description: '消息唯一ID', required: false })
  @IsString()
  @IsOptional()
  message_id?: string;

  @ApiProperty({ description: '订阅任务ID', required: false })
  @IsNumber()
  @IsOptional()
  subscribe_task_id?: number;

  @ApiProperty({ description: '广告主账号列表', required: false })
  @IsArray()
  @IsOptional()
  advertiser_ids?: number[];

  @ApiProperty({ description: '订阅服务类型，如 status.material.diagnose.agentad', required: false })
  @IsString()
  @IsOptional()
  service_label?: string;

  @ApiProperty({ description: '消息产生时间（毫秒时间戳）', required: false })
  @IsNumber()
  @IsOptional()
  publish_time?: number;

  @ApiProperty({ description: '推送时间（毫秒时间戳）', required: false })
  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @ApiProperty({ description: '随机数，防重放', required: false })
  @IsNumber()
  @IsOptional()
  nonce?: number;

  @ApiProperty({ description: '推送数据，JSON 字符串', required: false })
  @IsOptional()
  data?: any;
}
