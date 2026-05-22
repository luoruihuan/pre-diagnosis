import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemConfigDto {
  oceanEngineBaseUrl: string;
  oceanEngineAppId: string;
  oceanEngineAppSecret: string;
  oceanEngineWebhookSecret: string;
  oceanEngineAccessToken: string;
}

function maskSecret(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '****';
}

@Injectable()
export class SystemConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfig(): SystemConfigDto {
    return {
      oceanEngineBaseUrl:
        this.configService.get<string>('OCEAN_ENGINE_BASE_URL') || '',
      oceanEngineAppId: maskSecret(
        this.configService.get<string>('OCEAN_ENGINE_APP_ID'),
      ),
      oceanEngineAppSecret: maskSecret(
        this.configService.get<string>('OCEAN_ENGINE_APP_SECRET'),
      ),
      oceanEngineWebhookSecret: maskSecret(
        this.configService.get<string>('OCEAN_ENGINE_WEBHOOK_SECRET'),
      ),
      oceanEngineAccessToken: maskSecret(
        this.configService.get<string>('OCEAN_ENGINE_ACCESS_TOKEN'),
      ),
    };
  }

  updateConfig(updates: Partial<SystemConfigDto>): { message: string } {
    // 将更新写入 .env 文件（重启后生效）
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch {
      // .env 不存在时从空内容开始
    }

    const keyMap: Record<keyof SystemConfigDto, string> = {
      oceanEngineBaseUrl: 'OCEAN_ENGINE_BASE_URL',
      oceanEngineAppId: 'OCEAN_ENGINE_APP_ID',
      oceanEngineAppSecret: 'OCEAN_ENGINE_APP_SECRET',
      oceanEngineWebhookSecret: 'OCEAN_ENGINE_WEBHOOK_SECRET',
      oceanEngineAccessToken: 'OCEAN_ENGINE_ACCESS_TOKEN',
    };

    for (const [field, envKey] of Object.entries(keyMap) as [
      keyof SystemConfigDto,
      string,
    ][]) {
      const newValue = updates[field];
      // 跳过脱敏占位值（包含 ****）
      if (newValue === undefined || newValue.includes('****')) continue;

      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKey}=${newValue}`);
      } else {
        envContent += `\n${envKey}=${newValue}`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf-8');
    return { message: '系统配置已更新，重启服务后生效' };
  }
}
