import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class WebhookDto {
  @ApiProperty({ description: '时间戳' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ description: '签名' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: '事件类型' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({ description: '事件数据' })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
