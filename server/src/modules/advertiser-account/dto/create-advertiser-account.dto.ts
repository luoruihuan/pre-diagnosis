import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateAdvertiserAccountDto {
  @ApiProperty({ description: '代理商 ID' })
  @IsNumber()
  @IsNotEmpty()
  agentId: number;

  @ApiProperty({ description: '广告主 ID' })
  @IsNumber()
  @IsNotEmpty()
  advertiserId: number;

  @ApiProperty({ description: '广告主名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
