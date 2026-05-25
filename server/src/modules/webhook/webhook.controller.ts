import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';
import { WebhookDto } from './dto/webhook.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Get('ocean-engine')
  @ApiOperation({ summary: '巨量引擎 SPI 回调地址 Challenge 验证' })
  verifyWebhook(
    @Query('challenge') challenge: number,
    @Query('event') event: string,
    @Res() res: Response,
  ): void {
    this.logger.log(`收到 Challenge 验证: event=${event}, challenge=${challenge}`);
    // 直接写响应，绕过全局 TransformInterceptor 的包装
    res.status(200).json({
      BaseResp: { StatusCode: 200, StatusMessage: 'ok' },
      challenge,
    });
  }

  @Public()
  @Post('ocean-engine')
  @ApiOperation({ summary: '接收巨量引擎 Webhook 回调' })
  @SwaggerResponse({ status: 200, description: '处理成功' })
  async handleWebhook(
    @Headers('x-open-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() body: WebhookDto,
  ) {
    this.logger.log(`收到 Webhook: event=${body.event}, requestId=${requestId}`);

    // 验证签名：HMAC-SHA256(rawBody, secretKey)，对比 X-Open-Signature 头
    const bodyString = JSON.stringify(body);
    const isValid = await this.webhookService.verifySignature(
      bodyString,
      signature,
      requestId || `${Date.now()}-${Math.random()}`,
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
