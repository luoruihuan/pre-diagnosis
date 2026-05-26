import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiagnosisTaskDto {
  @ApiProperty({ description: '广告主 ID' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  advertiserId: number;

  @ApiProperty({ description: '视频 ID' })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({ description: '配置 ID', required: false })
  @IsUUID()
  @IsOptional()
  configId?: string;

  @ApiProperty({ description: '视频 URL（可选，用于本地登记）', required: false })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ description: '素材标题（可选）', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '代理商 ID（用于调用巨量接口）' })
  @IsNumber()
  @IsNotEmpty()
  agentId: number;

  @ApiProperty({ description: '复用广告 ID（1.0），与 refPromotionId 二选一', required: false })
  @IsNumber()
  @IsOptional()
  refAdId?: number;

  @ApiProperty({ description: '复用广告 ID（2.0），与 refAdId 二选一', required: false })
  @IsNumber()
  @IsOptional()
  refPromotionId?: number;

  @ApiProperty({ description: '来源：NEW=新素材路径一, ARK=已有素材路径二', required: false, default: 'NEW' })
  @IsString()
  @IsOptional()
  source?: string;
}
