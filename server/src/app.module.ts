import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import oceanEngineConfig from './config/ocean-engine.config';
import { MaterialModule } from './modules/material/material.module';
import { DiagnosisConfigModule } from './modules/diagnosis-config/diagnosis-config.module';
import { DiagnosisTaskModule } from './modules/diagnosis-task/diagnosis-task.module';
import { OceanEngineModule } from './modules/ocean-engine/ocean-engine.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { AdvertiserAccountModule } from './modules/advertiser-account/advertiser-account.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, oceanEngineConfig],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
    }),

    // Redis 模块
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: configService.get('redis'),
      }),
    }),

    // Bull 队列模块
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('redis'),
      }),
    }),

    // 认证模块
    AuthModule,
    UsersModule,

    // 业务模块
    MaterialModule,
    DiagnosisConfigModule,
    DiagnosisTaskModule,
    OceanEngineModule,
    WebhookModule,
    StatisticsModule,
    AdvertiserAccountModule,
    SystemConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
