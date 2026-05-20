import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { DiagnosisTaskModule } from '../diagnosis-task/diagnosis-task.module';

@Module({
  imports: [DiagnosisTaskModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
