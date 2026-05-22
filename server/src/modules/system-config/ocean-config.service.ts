import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';

/**
 * 巨量引擎配置键名常量
 */
export const OCEAN_CONFIG_KEYS = {
  APP_ID: 'ocean_engine.app_id',
  APP_SECRET: 'ocean_engine.app_secret',
  WEBHOOK_SECRET: 'ocean_engine.webhook_secret',
  REDIRECT_URI: 'ocean_engine.redirect_uri',
  FRONTEND_CALLBACK: 'ocean_engine.frontend_callback',
  BASE_URL: 'ocean_engine.base_url',
} as const;

const DEFAULT_VALUES: Record<string, string> = {
  [OCEAN_CONFIG_KEYS.BASE_URL]: 'https://api.oceanengine.com',
  [OCEAN_CONFIG_KEYS.REDIRECT_URI]: 'http://localhost:3000/api/auth/ocean-engine/callback',
  [OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK]: 'http://localhost:5173/oauth/callback',
};

const DESCRIPTIONS: Record<string, string> = {
  [OCEAN_CONFIG_KEYS.APP_ID]: '巨量引擎应用ID',
  [OCEAN_CONFIG_KEYS.APP_SECRET]: '巨量引擎应用密钥',
  [OCEAN_CONFIG_KEYS.WEBHOOK_SECRET]: 'Webhook 签名密钥',
  [OCEAN_CONFIG_KEYS.REDIRECT_URI]: 'OAuth 回调地址',
  [OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK]: '授权成功后前端跳转地址',
  [OCEAN_CONFIG_KEYS.BASE_URL]: '巨量引擎 API 基础地址',
};

@Injectable()
export class OceanConfigService implements OnModuleInit {
  private readonly logger = new Logger(OceanConfigService.name);
  // 内存缓存，避免每次都查数据库
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  /**
   * 模块启动时从数据库加载配置到内存
   * 数据库没有的 key 用 .env 环境变量兜底（平滑迁移）
   */
  async onModuleInit() {
    await this.loadFromDb();
    this.logger.log('巨量引擎配置已从数据库加载');
  }

  private async loadFromDb() {
    const rows = await this.configRepo.find();
    this.cache.clear();
    for (const row of rows) {
      if (row.value) this.cache.set(row.key, row.value);
    }

    // 用环境变量兜底（首次部署时数据库为空）
    const envFallback: Record<string, string | undefined> = {
      [OCEAN_CONFIG_KEYS.APP_ID]: process.env.OCEAN_ENGINE_APP_ID,
      [OCEAN_CONFIG_KEYS.APP_SECRET]: process.env.OCEAN_ENGINE_APP_SECRET,
      [OCEAN_CONFIG_KEYS.WEBHOOK_SECRET]: process.env.OCEAN_ENGINE_WEBHOOK_SECRET,
      [OCEAN_CONFIG_KEYS.REDIRECT_URI]: process.env.OCEAN_ENGINE_REDIRECT_URI,
      [OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK]: process.env.OCEAN_ENGINE_FRONTEND_CALLBACK,
      [OCEAN_CONFIG_KEYS.BASE_URL]: process.env.OCEAN_ENGINE_BASE_URL,
    };

    for (const [key, envVal] of Object.entries(envFallback)) {
      if (!this.cache.has(key) && envVal) {
        this.cache.set(key, envVal);
      }
    }
  }

  // ─── 读取方法 ────────────────────────────────────────────────────────────────

  get(key: string): string {
    return this.cache.get(key) ?? DEFAULT_VALUES[key] ?? '';
  }

  get appId(): string { return this.get(OCEAN_CONFIG_KEYS.APP_ID); }
  get appSecret(): string { return this.get(OCEAN_CONFIG_KEYS.APP_SECRET); }
  get webhookSecret(): string { return this.get(OCEAN_CONFIG_KEYS.WEBHOOK_SECRET); }
  get redirectUri(): string { return this.get(OCEAN_CONFIG_KEYS.REDIRECT_URI); }
  get frontendCallback(): string { return this.get(OCEAN_CONFIG_KEYS.FRONTEND_CALLBACK); }
  get baseUrl(): string { return this.get(OCEAN_CONFIG_KEYS.BASE_URL); }

  // ─── 写入方法 ────────────────────────────────────────────────────────────────

  /**
   * 批量更新配置，返回哪些敏感 key 发生了变化
   */
  async updateConfigs(updates: Record<string, string>): Promise<{
    credentialsChanged: boolean; // App ID 或 App Secret 是否变化
  }> {
    const sensitiveKeys = [OCEAN_CONFIG_KEYS.APP_ID, OCEAN_CONFIG_KEYS.APP_SECRET];
    let credentialsChanged = false;

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value.includes('****')) continue; // 跳过脱敏占位值

      const oldValue = this.cache.get(key);
      if (sensitiveKeys.includes(key as any) && oldValue && oldValue !== value) {
        credentialsChanged = true;
      }

      // 写入数据库（upsert）
      await this.configRepo.upsert(
        {
          key,
          value,
          description: DESCRIPTIONS[key] ?? key,
        },
        ['key'],
      );

      // 更新内存缓存，立即生效
      this.cache.set(key, value);
    }

    return { credentialsChanged };
  }

  /**
   * 获取所有配置（脱敏）供前端展示
   */
  getAllMasked(): Record<string, string> {
    const mask = (v: string) => v ? (v.length <= 4 ? '****' : v.slice(0, 4) + '****') : '';
    const secretKeys = [
      OCEAN_CONFIG_KEYS.APP_SECRET,
      OCEAN_CONFIG_KEYS.WEBHOOK_SECRET,
    ];

    const result: Record<string, string> = {};
    for (const key of Object.values(OCEAN_CONFIG_KEYS)) {
      const val = this.get(key);
      result[key] = secretKeys.includes(key as any) ? mask(val) : val;
    }
    return result;
  }
}
