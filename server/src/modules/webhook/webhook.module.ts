import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { DiagnosisTaskModule } from '../diagnosis-task/diagnosis-task.module';
import { OceanEngineModule } from '../ocean-engine/ocean-engine.module';

@Module({
  imports: [DiagnosisTaskModule, OceanEngineModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
