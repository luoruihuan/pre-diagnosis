import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

async function bootstrap() {
  // 禁用内置 body parser，改用自定义中间件以捕获原始请求体
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');

  // 注册自定义 JSON body parser，将原始字节存入 req.rawBody
  // 必须在 setGlobalPrefix 之前注册，确保所有路由都能获取到 rawBody
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // 全局前缀
  app.setGlobalPrefix('api');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // 自动过滤非白名单字段
      transform: true,              // 自动类型转换
      forbidNonWhitelisted: false,  // 允许前端多传参数（忽略而不报错）
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

  // 全局 JWT 认证
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

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
