import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';
import { WebhookDto } from './dto/webhook.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Public() // Webhook 接口标记为公开，不需要 API Key
  @Post('ocean-engine')
  @ApiOperation({ summary: '接收巨量引擎 Webhook 回调' })
  @SwaggerResponse({ status: 200, description: '处理成功' })
  async handleWebhook(
    @Headers('x-timestamp') timestamp: string,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() body: WebhookDto,
  ) {
    this.logger.log(`收到 Webhook: event=${body.event}, requestId=${requestId}`);

    // 验证签名（防时序攻击 + 防重放攻击）
    const bodyString = JSON.stringify(body);
    const isValid = await this.webhookService.verifySignature(
      timestamp,
      bodyString,
      signature,
      requestId || `${Date.now()}-${Math.random()}`, // 如果没有 requestId，生成一个
    );

    if (!isValid) {
      this.logger.warn('Webhook 签名验证失败');
      throw new UnauthorizedException('签名验证失败');
    }

    // 处理不同类型的事件（巨量引擎事件标识）
    if (
      body.event === 'status.material.diagnose.agentad' ||
      body.event === 'status.material.diagnose.agentqc' ||
      body.event === 'diagnosis.complete' // 兼容旧格式
    ) {
      await this.webhookService.handleDiagnosisComplete(body.data as any);
    }

    return { code: 0, message: 'success' };
  }
}
