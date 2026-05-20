import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DiagnosisTaskService } from './diagnosis-task.service';
import { DiagnosisTaskController } from './diagnosis-task.controller';
import { DiagnosisTaskProcessor } from './diagnosis-task.processor';
import { DiagnosisTask } from '../../common/entities/diagnosis-task.entity';
import { DiagnosisConfigModule } from '../diagnosis-config/diagnosis-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiagnosisTask]),
    BullModule.registerQueue({
      name: 'diagnosis-polling',
    }),
    DiagnosisConfigModule,
  ],
  controllers: [DiagnosisTaskController],
  providers: [DiagnosisTaskService, DiagnosisTaskProcessor],
  exports: [DiagnosisTaskService],
})
export class DiagnosisTaskModule {}
