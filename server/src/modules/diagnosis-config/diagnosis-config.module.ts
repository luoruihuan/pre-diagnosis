import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisConfigService } from './diagnosis-config.service';
import { DiagnosisConfigController } from './diagnosis-config.controller';
import { DiagnosisConfig } from '../../common/entities/diagnosis-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiagnosisConfig])],
  controllers: [DiagnosisConfigController],
  providers: [DiagnosisConfigService],
  exports: [DiagnosisConfigService],
})
export class DiagnosisConfigModule {}
