import request from '../utils/request';

export interface OverviewData {
  total: number;
  todayCount: number;
  monthCount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
}

export interface QualityItem {
  count: number;
  rate: number;
}

export interface QualityDistributionData {
  total: number;
  adHighQuality: QualityItem;
  ecpHighQuality: QualityItem;
  firstPublish: QualityItem;
}

export interface AdvertiserStatItem {
  advertiserId: string;
  total: number;
  adQualityCount: number;
  ecpQualityCount: number;
  firstPublishCount: number;
  successCount: number;
  successRate: number;
}

export interface TrendItem {
  date: string;
  total: number;
  successCount: number;
  successRate: number;
}

export const getStatisticsOverview = (): Promise<OverviewData> => {
  return request.get('/statistics/overview');
};

export const getQualityDistribution = (): Promise<QualityDistributionData> => {
  return request.get('/statistics/quality-distribution');
};

export const getAdvertiserStats = (): Promise<AdvertiserStatItem[]> => {
  return request.get('/statistics/advertiser');
};

export const getStatisticsTrend = (days = 30): Promise<TrendItem[]> => {
  return request.get('/statistics/trend', { params: { days } });
};
