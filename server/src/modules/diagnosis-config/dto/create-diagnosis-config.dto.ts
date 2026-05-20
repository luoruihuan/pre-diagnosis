import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateDiagnosisConfigDto {
  @ApiProperty({ description: '配置名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '配置描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '配置内容（JSON 对象）' })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
