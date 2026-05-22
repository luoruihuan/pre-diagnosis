import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('quality-distribution')
  getQualityDistribution() {
    return this.statisticsService.getQualityDistribution();
  }

  @Get('advertiser')
  getAdvertiserStats() {
    return this.statisticsService.getAdvertiserStats();
  }

  @Get('trend')
  getTrend(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.statisticsService.getTrend(daysNum);
  }
}
