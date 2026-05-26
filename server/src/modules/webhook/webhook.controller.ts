import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Req,
  Res,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
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
  @HttpCode(200)
  @ApiOperation({ summary: '接收巨量引擎 Webhook 回调' })
  @SwaggerResponse({ status: 200, description: '处理成功' })
  async handleWebhook(
    @Headers('x-open-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() body: WebhookDto,
    @Req() req: Request,
  ) {
    this.logger.log(`收到 Webhook: service_label=${body.service_label}, message_id=${body.message_id}`);
    this.logger.log(`[签名调试] X-Open-Signature 原始值="${signature}"`);
    this.logger.log(`[签名调试] 所有请求头=${JSON.stringify(req.headers)}`);

    // 使用原始请求体字节做签名，避免 JSON 序列化导致字段顺序/空格不一致
    const rawBody: Buffer = (req as any).rawBody;
    if (!rawBody) {
      this.logger.error('rawBody 未捕获，请检查 main.ts 中的 body parser 配置');
      throw new UnauthorizedException('签名验证失败');
    }
    this.logger.log(`[签名调试] rawBody 已捕获，长度=${rawBody.length}`);

    // 去掉可能的前缀（如 "sha256="）
    const cleanSignature = signature?.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    const result = await this.webhookService.verifySignature(
      rawBody,
      cleanSignature,
      body.message_id || `${Date.now()}-${Math.random()}`,
    );

    if (result === 'invalid') {
      this.logger.warn('Webhook 签名验证失败');
      throw new UnauthorizedException('签名验证失败');
    }

    if (result === 'duplicate') {
      this.logger.log('重复请求，直接返回成功');
      return { code: 0, message: 'success' };
    }

    // 处理前测完成事件，service_label 对应前测类型
    if (
      body.service_label === 'status.material.diagnose.agentad' ||
      body.service_label === 'status.material.diagnose.agentqc'
    ) {
      // data 是 JSON 字符串，需要先解析
      const data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
      await this.webhookService.handleDiagnosisComplete(data);
    }

    return { code: 0, message: 'success' };
  }
}
