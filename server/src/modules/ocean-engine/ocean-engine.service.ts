import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class OceanEngineService {
  private readonly logger = new Logger(OceanEngineService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.baseUrl = this.configService.get<string>('oceanEngine.baseUrl');
    this.appId = this.configService.get<string>('oceanEngine.appId');
    this.appSecret = this.configService.get<string>('oceanEngine.appSecret');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // 请求拦截器：添加 access_token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const advertiserId = config.params?.advertiser_id;
      if (advertiserId) {
        const token = await this.getAccessToken(advertiserId);
        config.headers['Access-Token'] = token;
      }
      this.logger.debug(`→ ${config.method.toUpperCase()} ${config.url}`);
      return config;
    });

    // 响应拦截器：日志记录
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`← ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(
          `← ERROR ${error.config?.url} - ${error.message}`,
          error.response?.data,
        );
        throw error;
      },
    );
  }

  /**
   * 获取 Access Token（从 Redis 缓存或刷新）
   */
  private async getAccessToken(advertiserId: string): Promise<string> {
    const cacheKey = `ocean_engine:token:${advertiserId}`;
    let token = await this.redis.get(cacheKey);

    if (!token) {
      token = await this.refreshAccessToken(advertiserId);
    }

    return token;
  }

  /**
   * 刷新 Access Token
   */
  private async refreshAccessToken(advertiserId: string): Promise<string> {
    // 这里需要根据实际的 OAuth 流程实现
    // 示例：使用 refresh_token 换取新的 access_token
    const refreshToken = await this.redis.get(
      `ocean_engine:refresh_token:${advertiserId}`,
    );

    if (!refreshToken) {
      throw new Error(`广告主 ${advertiserId} 未授权`);
    }

    const response = await axios.post(`${this.baseUrl}/oauth2/access_token/`, {
      app_id: this.appId,
      secret: this.appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const { access_token, expires_in, refresh_token: newRefreshToken } =
      response.data.data;

    // 缓存 access_token（提前 5 分钟过期）
    const ttl = expires_in - 300;
    await this.redis.setex(
      `ocean_engine:token:${advertiserId}`,
      ttl,
      access_token,
    );

    // 更新 refresh_token
    if (newRefreshToken) {
      await this.redis.set(
        `ocean_engine:refresh_token:${advertiserId}`,
        newRefreshToken,
      );
    }

    this.logger.log(`刷新 Access Token 成功: ${advertiserId}`);
    return access_token;
  }

  /**
   * 创建诊断任务
   */
  async createDiagnosisTask(
    advertiserId: string,
    videoId: string,
    config?: Record<string, any>,
  ): Promise<{ task_id: string }> {
    const response = await this.axiosInstance.post(
      '/open_api/v1.0/creative/diagnosis/create/',
      {
        advertiser_id: advertiserId,
        video_id: videoId,
        ...config,
      },
      {
        params: { advertiser_id: advertiserId },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || '创建诊断任务失败');
    }

    return response.data.data;
  }

  /**
   * 查询诊断任务状态
   */
  async getDiagnosisTaskStatus(
    advertiserId: string,
    taskId: string,
  ): Promise<{
    status: string;
    result?: Record<string, any>;
    error_message?: string;
  }> {
    const response = await this.axiosInstance.get(
      '/open_api/v1.0/creative/diagnosis/get/',
      {
        params: {
          advertiser_id: advertiserId,
          task_id: taskId,
        },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || '查询诊断任务失败');
    }

    return response.data.data;
  }

  /**
   * 检查 QPS 限流
   */
  async checkQpsLimit(advertiserId: string, videoId: string): Promise<boolean> {
    const key = `qps:diagnosis:${advertiserId}:${videoId}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      // 首次调用，设置 24 小时过期
      await this.redis.expire(key, 86400);
    }

    if (count > 5) {
      this.logger.warn(`QPS 限流触发: ${advertiserId}/${videoId} (${count}/5)`);
      return false;
    }

    return true;
  }
}
