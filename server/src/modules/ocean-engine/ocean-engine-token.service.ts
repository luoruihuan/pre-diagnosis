import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios from 'axios';
import * as crypto from 'crypto';
import { OceanConfigService } from '../system-config/ocean-config.service';

interface TokenResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    advertiser_ids?: number[];
  };
}

@Injectable()
export class OceanEngineTokenService {
  private readonly logger = new Logger(OceanEngineTokenService.name);

  /** Redis key 前缀 */
  private readonly REDIS_KEY = 'ocean_engine:oauth';
  private readonly KEY_ACCESS_TOKEN = `${this.REDIS_KEY}:access_token`;
  private readonly KEY_REFRESH_TOKEN = `${this.REDIS_KEY}:refresh_token`;
  private readonly KEY_EXPIRES_AT = `${this.REDIS_KEY}:expires_at`;
  private readonly KEY_STATE_PREFIX = `${this.REDIS_KEY}:state:`;

  /** OAuth 接口 base（注意：不是 api.oceanengine.com）*/
  private readonly OAUTH_BASE = 'https://open.oceanengine.com';

  constructor(
    private readonly oceanConfig: OceanConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ─── 配置读取（从 OceanConfigService 内存缓存读，立即生效）────────────────────

  private get appId(): string { return this.oceanConfig.appId; }
  private get appSecret(): string { return this.oceanConfig.appSecret; }
  private get redirectUri(): string { return this.oceanConfig.redirectUri; }
  get frontendCallback(): string { return this.oceanConfig.frontendCallback; }

  // ─── 授权 URL ────────────────────────────────────────────────────────────────

  /**
   * 生成巨量引擎 OAuth 授权 URL，并将 state 存入 Redis（5 分钟过期，防 CSRF）
   */
  async buildAuthUrl(): Promise<string> {
    const state = crypto.randomUUID();
    // state 存 Redis，5 分钟有效
    await this.redis.setex(`${this.KEY_STATE_PREFIX}${state}`, 300, '1');

    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'ad.material.diagnosis',
    });

    return `${this.OAUTH_BASE}/audit/oauth.html?${params.toString()}`;
  }

  /**
   * 验证 state 是否合法（防 CSRF），验证后立即删除
   */
  async verifyState(state: string): Promise<boolean> {
    const key = `${this.KEY_STATE_PREFIX}${state}`;
    const val = await this.redis.get(key);
    if (val) {
      await this.redis.del(key);
      return true;
    }
    return false;
  }

  // ─── Token 换取 ──────────────────────────────────────────────────────────────

  /**
   * 用 auth_code 换取 access_token
   * POST https://open.oceanengine.com/open_api/oauth2/access_token/
   */
  async exchangeAuthCode(authCode: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    advertiserIds: number[];
  }> {
    this.logger.log(`exchangeAuthCode: 开始换取 access_token`);

    const response = await axios.post<TokenResponse>(
      `${this.OAUTH_BASE}/open_api/oauth2/access_token/`,
      {
        appid: this.appId,
        secret: this.appSecret,
        grant_type: 'auth_code',
        auth_code: authCode,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎换取 token 失败 [${code}]: ${message}`);
    }

    const result = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      advertiserIds: data.advertiser_ids ?? [],
    };

    await this.saveTokens(result);
    this.logger.log(
      `exchangeAuthCode: 成功，advertiserIds=${result.advertiserIds.join(',')}`,
    );

    return result;
  }

  /**
   * 刷新 access_token
   * POST https://open.oceanengine.com/open_api/oauth2/refresh_token/
   */
  async refreshAccessToken(): Promise<string> {
    const refreshToken = await this.redis.get(this.KEY_REFRESH_TOKEN);
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 40103,
        message: '巨量引擎授权已过期，请重新完成 OAuth 授权',
        type: 'OCEAN_ENGINE_TOKEN_EXPIRED',
      });
    }

    this.logger.log('refreshAccessToken: 开始刷新 access_token');

    const response = await axios.post<TokenResponse>(
      `${this.OAUTH_BASE}/open_api/oauth2/refresh_token/`,
      {
        appid: this.appId,
        secret: this.appSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎刷新 token 失败 [${code}]: ${message}`);
    }

    await this.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });

    this.logger.log('refreshAccessToken: 刷新成功');
    return data.access_token;
  }

  /**
   * 获取有效的 access_token（自动检测过期并刷新）
   */
  async getValidAccessToken(): Promise<string> {
    const expiresAtStr = await this.redis.get(this.KEY_EXPIRES_AT);
    if (!expiresAtStr) {
      throw new UnauthorizedException({
        code: 40102,
        message: '巨量引擎尚未完成 OAuth 授权，请先完成授权',
        type: 'OCEAN_ENGINE_UNAUTHORIZED',
      });
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    const remainSec = expiresAt - nowSec;

    // 距过期不足 30 分钟，自动刷新
    if (remainSec < 30 * 60) {
      this.logger.log(
        `access_token 将在 ${remainSec}s 后过期，自动刷新`,
      );
      return this.refreshAccessToken();
    }

    const token = await this.redis.get(this.KEY_ACCESS_TOKEN);
    if (!token) {
      throw new UnauthorizedException({
        code: 40102,
        message: '巨量引擎尚未完成 OAuth 授权，请先完成授权',
        type: 'OCEAN_ENGINE_UNAUTHORIZED',
      });
    }

    return token;
  }

  // ─── 状态查询 ────────────────────────────────────────────────────────────────

  /**
   * 检查是否已完成 OAuth 授权
   */
  async isAuthorized(): Promise<boolean> {
    const token = await this.redis.get(this.KEY_ACCESS_TOKEN);
    return !!token;
  }

  /**
   * 查询授权状态详情
   */
  async getAuthStatus(): Promise<{
    authorized: boolean;
    expiresAt: number | null;
    remainSeconds: number | null;
  }> {
    const authorized = await this.isAuthorized();
    if (!authorized) {
      return { authorized: false, expiresAt: null, remainSeconds: null };
    }

    const expiresAtStr = await this.redis.get(this.KEY_EXPIRES_AT);
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;
    const remainSeconds = expiresAt
      ? expiresAt - Math.floor(Date.now() / 1000)
      : null;

    return { authorized, expiresAt, remainSeconds };
  }

  /**
   * 撤销授权，清除 Redis 中所有 token
   */
  async revokeTokens(): Promise<void> {
    await this.redis.del(
      this.KEY_ACCESS_TOKEN,
      this.KEY_REFRESH_TOKEN,
      this.KEY_EXPIRES_AT,
    );
    this.logger.log('revokeTokens: 已清除所有 OAuth token');
  }

  // ─── 内部工具 ────────────────────────────────────────────────────────────────

  /**
   * 将 token 保存到 Redis
   * - access_token TTL = expiresIn - 60（提前 60 秒，留缓冲）
   * - refresh_token TTL = 30 天
   * - expires_at = 当前时间 + expiresIn（Unix 秒）
   */
  private async saveTokens(data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): Promise<void> {
    const { accessToken, refreshToken, expiresIn } = data;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + expiresIn;
    const accessTtl = Math.max(expiresIn - 60, 60); // 至少保留 60 秒
    const refreshTtl = 30 * 24 * 60 * 60; // 30 天

    await Promise.all([
      this.redis.setex(this.KEY_ACCESS_TOKEN, accessTtl, accessToken),
      this.redis.setex(this.KEY_REFRESH_TOKEN, refreshTtl, refreshToken),
      // expires_at 与 access_token 同生命周期
      this.redis.setex(this.KEY_EXPIRES_AT, accessTtl, String(expiresAt)),
    ]);

    this.logger.debug(
      `saveTokens: access_token TTL=${accessTtl}s, expiresAt=${expiresAt}`,
    );
  }
}
