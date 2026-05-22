import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DiagnosisStatus } from '../../../common/enums/diagnosis-status.enum';

export class QueryDiagnosisTaskDto extends PaginationDto {
  @ApiProperty({ description: '广告主 ID', required: false })
  @IsString()
  @IsOptional()
  advertiserId?: string;

  @ApiProperty({ description: '视频 ID', required: false })
  @IsString()
  @IsOptional()
  videoId?: string;

  @ApiProperty({ description: '任务状态', enum: DiagnosisStatus, required: false })
  @IsEnum(DiagnosisStatus)
  @IsOptional()
  status?: DiagnosisStatus;

  @ApiProperty({ description: '来源：NEW=新素材路径一, ARK=已有素材路径二', required: false })
  @IsString()
  @IsOptional()
  source?: string;
}
