import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ApiKeyGuard } from './common/guards/api-key.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // 全局前缀
  app.setGlobalPrefix('api');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 全局 API Key 认证（简单成熟的方案）
  const reflector = app.get(Reflector);
  const configService = app.get(ConfigService);
  app.useGlobalGuards(new ApiKeyGuard(configService, reflector));

  // CORS
  app.enableCors();

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('视频诊断服务 API')
    .setDescription('巨量引擎视频诊断服务接口文档')
    .setVersion('1.0')
    .addTag('素材管理', '视频素材的增删改查')
    .addTag('诊断配置', '诊断配置的管理')
    .addTag('诊断任务', '创建和查询诊断任务')
    .addTag('Webhook', '接收巨量引擎回调')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 服务启动成功: http://localhost:${port}`);
  logger.log(`📚 API 文档: http://localhost:${port}/api/docs`);
}

bootstrap();
