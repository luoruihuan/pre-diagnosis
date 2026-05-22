import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisTask } from '../../common/entities/diagnosis-task.entity';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiagnosisTask])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
