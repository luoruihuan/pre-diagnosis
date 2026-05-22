import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import { OceanEngineTokenService } from './ocean-engine-token.service';

/** 巨量引擎前测任务单条结果 */
export interface DiagnosisTaskResultItem {
  taskId: number;
  videoId: string;
  materialId: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  isAdHighQuality: string;        // YES / NO / UNKNOWN
  isEcpHighQuality: string;       // YES / NO / UNKNOWN
  isFirstPublish: string;         // YES / NO / UNKNOWN
  notAdHighQualityReason: string[];
  notEcpHighQualityReason: string[];
}

@Injectable()
export class OceanEngineService {
  private readonly logger = new Logger(OceanEngineService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://api.oceanengine.com';

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly tokenService: OceanEngineTokenService,
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // 响应拦截器：统一日志
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
   * 获取有效的 Access Token
   * 委托给 OceanEngineTokenService，自动处理过期刷新
   */
  async getAccessToken(): Promise<string> {
    return this.tokenService.getValidAccessToken();
  }

  /**
   * 创建前测任务（路径一：新素材）
   * POST https://api.oceanengine.com/open_api/2/diagnosik/agent/create/
   */
  async createDiagnosisTask(params: {
    agentId: number;
    advertiserId: string;
    videoIds: string[];
    refAdId?: number;
    refPromotionId?: number;
  }): Promise<{
    taskIds: number[];
    failVideoIds: Record<string, { errCode: string; errMessage: string }>;
  }> {
    const { agentId, advertiserId, videoIds, refAdId, refPromotionId } = params;
    const token = await this.getAccessToken();

    const body: Record<string, any> = {
      agent_id: agentId,
      advertiser_id: advertiserId,
      video_ids: videoIds,
    };
    if (refAdId !== undefined) {
      body.ref_ad_id = refAdId;
    }
    if (refPromotionId !== undefined) {
      body.ref_promotion_id = refPromotionId;
    }

    this.logger.debug(
      `→ POST /open_api/2/diagnosis_task/agent/create/ body=${JSON.stringify(body)}`,
    );

    const response = await this.axiosInstance.post(
      '/open_api/2/diagnosis_task/agent/create/',
      body,
      { headers: { 'Access-Token': token } },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎创建前测任务失败 [${code}]: ${message}`);
    }

    return {
      taskIds: (data.task_ids ?? []) as number[],
      failVideoIds: (data.fail_video_ids ?? {}) as Record<
        string,
        { errCode: string; errMessage: string }
      >,
    };
  }

  /**
   * 查询前测任务结果（By 任务 ID）
   * GET https://api.oceanengine.com/open_api/2/diagnosis_task/agent/get/
   * task_ids 用重复 key 格式：task_ids=1&task_ids=2
   */
  async getDiagnosisTaskResult(
    agentId: number,
    taskIds: number[],
  ): Promise<{ taskList: DiagnosisTaskResultItem[] }> {
    const token = await this.getAccessToken();

    this.logger.debug(
      `→ GET /open_api/2/diagnosis_task/agent/get/ agentId=${agentId} taskIds=${taskIds.join(',')}`,
    );

    // 手动构造 query string，task_ids 用重复 key 格式
    const qs = [`agent_id=${agentId}`, ...taskIds.map((id) => `task_ids=${id}`)].join('&');

    const response = await this.axiosInstance.get(
      `/open_api/2/diagnosis_task/agent/get/?${qs}`,
      { headers: { 'Access-Token': token } },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎查询前测任务失败 [${code}]: ${message}`);
    }

    const taskList: DiagnosisTaskResultItem[] = (data.task_list ?? []).map(
      (item: any) => ({
        taskId: item.task_id,
        videoId: item.video_id,
        materialId: item.material_id,
        status: item.status as 'PENDING' | 'SUCCESS' | 'FAILED',
        // 文档字段名带 _material 后缀
        isAdHighQuality: item.is_ad_high_quality_material ?? 'UNKNOWN',
        isEcpHighQuality: item.is_ecp_high_quality_material ?? 'UNKNOWN',
        isFirstPublish: item.is_first_publish_material ?? 'UNKNOWN',
        notAdHighQualityReason: item.not_ad_high_quality_reason ?? [],
        notEcpHighQualityReason: item.not_ecp_high_quality_reason ?? [],
      }),
    );

    return { taskList };
  }

  /**
   * 检查 QPS 限流（每个广告主+视频每天最多 5 次）
   */
  async checkQpsLimit(advertiserId: string, videoId: string): Promise<boolean> {
    const key = `qps:diagnosis:${advertiserId}:${videoId}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 86400);
    }

    if (count > 5) {
      this.logger.warn(`QPS 限流触发: ${advertiserId}/${videoId} (${count}/5)`);
      return false;
    }

    return true;
  }

  /**
   * 查询前测任务列表（By Agent + 过滤条件）
   * GET https://api.oceanengine.com/open_api/2/diagnosis_task/agent/list/
   */
  async listDiagnosisTasks(params: {
    agentId: number;
    results?: string[];
    status?: string[];
    startTime?: string;
    endTime?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    taskList: any[];
    page: { page: number; pageSize: number; totalPage: number; totalNumber: number };
  }> {
    const { agentId, results, status, startTime, endTime, page, pageSize } = params;
    const token = await this.getAccessToken();

    const queryParams: Record<string, any> = { agent_id: agentId };
    if (results?.length) queryParams.results = results.join(',');
    if (status?.length) queryParams.status = status.join(',');
    if (startTime) queryParams.start_time = startTime;
    if (endTime) queryParams.end_time = endTime;
    if (page !== undefined) queryParams.page = page;
    if (pageSize !== undefined) queryParams.page_size = pageSize;

    this.logger.debug(
      `→ GET /open_api/2/diagnosis_task/agent/list/ params=${JSON.stringify(queryParams)}`,
    );

    const response = await this.axiosInstance.get(
      '/open_api/2/diagnosis_task/agent/list/',
      {
        headers: { 'Access-Token': token },
        params: queryParams,
      },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎查询任务列表失败 [${code}]: ${message}`);
    }

    const pageInfo = data.page ?? {};
    return {
      taskList: data.task_list ?? [],
      page: {
        page: pageInfo.page ?? 1,
        pageSize: pageInfo.page_size ?? 20,
        totalPage: pageInfo.total_page ?? 0,
        totalNumber: pageInfo.total_number ?? 0,
      },
    };
  }

  /**
   * 获取方舟/即创素材列表
   * GET https://api.oceanengine.com/open_api/2/file/video/agent/get/
   */
  async getArkVideoList(params: {
    agentId: number;
    filtering?: {
      width?: number;
      height?: number;
      ratio?: number[];
      videoIds?: string[];
      materialIds?: number[];
      signatures?: string[];
      startTime?: string;
      endTime?: string;
      source?: string[];
    };
    page?: number;
    pageSize?: number;
  }): Promise<{
    list: Array<{ id: string; url: string; signature: string; source: string; createTime: string; filename: string }>;
    pageInfo: { page: number; pageSize: number; totalPage: number; totalNumber: number };
  }> {
    const { agentId, filtering, page, pageSize } = params;
    const token = await this.getAccessToken();

    const queryParams: Record<string, any> = { agent_id: agentId };
    if (filtering) {
      // 巨量引擎 filtering 参数用 filtering[key] 格式（bracket notation）
      if (filtering.width !== undefined) queryParams['filtering[width]'] = filtering.width;
      if (filtering.height !== undefined) queryParams['filtering[height]'] = filtering.height;
      if (filtering.ratio?.length) queryParams['filtering[ratio]'] = filtering.ratio;
      if (filtering.videoIds?.length) queryParams['filtering[video_ids]'] = filtering.videoIds;
      if (filtering.materialIds?.length) queryParams['filtering[material_ids]'] = filtering.materialIds;
      if (filtering.signatures?.length) queryParams['filtering[signatures]'] = filtering.signatures;
      if (filtering.startTime) queryParams['filtering[start_time]'] = filtering.startTime;
      if (filtering.endTime) queryParams['filtering[end_time]'] = filtering.endTime;
      if (filtering.source?.length) queryParams['filtering[source]'] = filtering.source;
    }
    if (page !== undefined) queryParams.page = page;
    if (pageSize !== undefined) queryParams.page_size = pageSize;

    this.logger.debug(
      `→ GET /open_api/2/file/video/agent/get/ params=${JSON.stringify(queryParams)}`,
    );

    const response = await this.axiosInstance.get(
      '/open_api/2/file/video/agent/get/',
      {
        headers: { 'Access-Token': token },
        params: queryParams,
      },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎获取素材列表失败 [${code}]: ${message}`);
    }

    const pi = data.page_info ?? {};
    const list = (data.list ?? []).map((item: any) => ({
      id: item.id as string,
      url: item.url as string,
      signature: item.signature as string,
      source: item.source as string,
      createTime: item.create_time as string,
      filename: item.filename as string,
    }));

    return {
      list,
      pageInfo: {
        page: pi.page ?? 1,
        pageSize: pi.page_size ?? 20,
        totalPage: pi.total_page ?? 0,
        totalNumber: pi.total_number ?? 0,
      },
    };
  }

  /**
   * 上传视频素材至巨量引擎方舟（前测专用）
   * POST https://api.oceanengine.com/open_api/2/file/video/agent/
   */
  async uploadVideo(params: {
    agentId: number;
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
    isNeedAuth?: boolean;
  }): Promise<{ videoId: string; materialId: number; videoUrl: string }> {
    const { agentId, fileName, fileBuffer, mimeType, isNeedAuth = false } = params;
    const token = await this.getAccessToken();

    // 计算文件 MD5 签名
    const videoSignature = crypto.createHash('md5').update(fileBuffer).digest('hex');

    const form = new FormData();
    form.append('agent_id', String(agentId));
    form.append('file_name', fileName);
    form.append('is_need_auth', String(isNeedAuth));
    form.append('upload_type', 'UPLOAD_BY_FILE');
    form.append('video_signature', videoSignature);
    form.append('video_file', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    this.logger.debug(
      `→ POST /open_api/2/file/viagent/ agentId=${agentId} fileName=${fileName} md5=${videoSignature}`,
    );

    const response = await this.axiosInstance.post(
      '/open_api/2/file/video/agent/',
      form,
      {
        headers: {
          'Access-Token': token,
          ...form.getHeaders(),
        },
        // 视频文件可能较大，超时延长至 5 分钟
        timeout: 300000,
      },
    );

    const { code, message, data } = response.data;
    if (code !== 0) {
      throw new Error(`巨量引擎上传视频失败 [${code}]: ${message}`);
    }

    const videoInfo = data?.video_info;
    if (!videoInfo) {
      throw new Error('巨量引擎上传视频响应缺少 video_info 字段');
    }

    return {
      videoId: videoInfo.video_id as string,
      materialId: videoInfo.material_id as number,
      videoUrl: (videoInfo.video_url ?? '') as string,
    };
  }
}
