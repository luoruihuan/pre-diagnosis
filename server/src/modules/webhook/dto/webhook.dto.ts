import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional, IsNumber } from 'class-validator';

/**
 * 巨量引擎 Webhook 回调 Body 格式（文档定义）：
 * {
 *   "advertiser_id": 123,
 *   "event": "SUCCESS",
 *   "data": { "video_id": "...", "agent_id": 123, "task_id": 456, "status": "SUCCESS" }
 * }
 * timestamp / signature / request-id 在 Header 中，不在 Body 里
 */
export class WebhookDto {
  @ApiProperty({ description: '广告主ID', required: false })
  @IsNumber()
  @IsOptional()
  advertiser_id?: number;

  @ApiProperty({ description: '事件类型，如 status.material.diagnose.agentad' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({ description: '事件数据' })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
