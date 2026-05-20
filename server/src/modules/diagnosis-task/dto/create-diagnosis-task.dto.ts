import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateDiagnosisTaskDto {
  @ApiProperty({ description: '广告主 ID' })
  @IsString()
  @IsNotEmpty()
  advertiserId: string;

  @ApiProperty({ description: '视频 ID' })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({ description: '配置 ID', required: false })
  @IsUUID()
  @IsOptional()
  configId?: string;
}
