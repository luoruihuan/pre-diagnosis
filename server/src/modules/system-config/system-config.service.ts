import { Injectable } from '@nestjs/common';
import { OceanConfigService, OCEAN_CONFIG_KEYS } from './ocean-config.service';
import { OceanEngineTokenService } from '../ocean-engine/ocean-engine-token.service';

export interface SystemConfigDto {
  oceanEngineBaseUrl: string;
  oceanEngineAppId: string;
  oceanEngineAppSecret: string;
  oceanEngineWebhookSecret: string;
  oceanEngineRedirectUri: string;
  oceanEngineFrontendCallback: string;
}

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly oceanConfig: OceanConfigService,
    private readonly tokenService: OceanEngineTokenService,
  ) {}

  getConfig(): SystemConfigDto {
    const masked = this.oceanConfig.getAllMasked();
    return {
      oceanEngineBaseUrl: masked[OCEAN_CONFIG_KEYS.BASE_URL],
      oceanEngineAppId: masked[OCEAN_CONFIG_KEYS.APP_ID],
      oceanEngineAppSecret: masked[OCEAN_CONFIG_KEYS.APP_SECRET],
      oceanEngineWebhookSecret: masked[OCEAN_CONFIG_KEYS.WEBHOOK_SECRET],
      oceanEngineRedirectUri: masked[OCEAN_CONFIG_KEYS.REDIRECT_URI],
      oceanEngineFrontendCallback: masked[OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK],
    };
  }

  async updateConfig(updates: Partial<SystemConfigDto>): Promise<{ message: string }> {
    const fieldMap: Record<keyof SystemConfigDto, string> = {
      oceanEngineBaseUrl: OCEAN_CONFIG_KEYS.BASE_URL,
      oceanEngineAppId: OCEAN_CONFIG_KEYS.APP_ID,
      oceanEngineAppSecret: OCEAN_CONFIG_KEYS.APP_SECRET,
      oceanEngineWebhookSecret: OCEAN_CONFIG_KEYS.WEBHOOK_SECRET,
      oceanEngineRedirectUri: OCEAN_CONFIG_KEYS.REDIRECT_URI,
      oceanEngineFrontendCallback: OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK,
    };

    const dbUpdates: Record<string, string> = {};
    for (const [field, dbKey] of Object.entries(fieldMap) as [keyof SystemConfigDto, string][]) {
      const val = updates[field];
      if (val !== undefined && val !== '' && !val.includes('****')) {
        dbUpdates[dbKey] = val;
      }
    }

    const { credentialsChanged } = await this.oceanConfig.updateConfigs(dbUpdates);

    // App ID 或 App Secret 变了，旧 OAuth token 自动失效
    if (credentialsChanged) {
      await this.tokenService.revokeTokens();
      return {
        message: '配置已保存并立即生效。检测到应用凭证变更，OAuth 授权已自动清除，请重新完成授权。',
      };
    }

    return { message: '配置已保存并立即生效' };
  }
}
