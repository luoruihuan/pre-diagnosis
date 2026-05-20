import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsObject } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ description: '广告主 ID' })
  @IsString()
  @IsNotEmpty()
  advertiserId: string;

  @ApiProperty({ description: '视频 ID' })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({ description: '视频 URL' })
  @IsString()
  @IsNotEmpty()
  videoUrl: string;

  @ApiProperty({ description: '标题', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '时长（秒）', required: false })
  @IsInt()
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: '元数据', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
