import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { DiagnosisTask } from '../../common/entities/diagnosis-task.entity';
import { DiagnosisStatus } from '../../common/enums/diagnosis-status.enum';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(DiagnosisTask)
    private readonly taskRepository: Repository<DiagnosisTask>,
  ) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, todayCount, monthCount, successCount, failedCount, pendingCount] =
      await Promise.all([
        this.taskRepository.count(),
        this.taskRepository.count({ where: { createdAt: MoreThanOrEqual(today) } }),
        this.taskRepository.count({ where: { createdAt: MoreThanOrEqual(monthStart) } }),
        this.taskRepository.count({ where: { status: DiagnosisStatus.SUCCESS } }),
        this.taskRepository.count({ where: { status: DiagnosisStatus.FAILED } }),
        this.taskRepository.count({
          where: {
            status: In([DiagnosisStatus.PENDING, DiagnosisStatus.PROCESSING]),
          },
        }),
      ]);

    return {
      total,
      todayCount,
      monthCount,
      successCount,
      failedCount,
      pendingCount,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    };
  }

  async getQualityDistribution() {
    const tasks = await this.taskRepository.find({
      where: { status: DiagnosisStatus.SUCCESS },
      select: ['result'],
    });

    const total = tasks.length;

    let adHighQualityYes = 0;
    let ecpHighQualityYes = 0;
    let firstPublishYes = 0;

    for (const task of tasks) {
      if (!task.result) continue;
      if (task.result['isAdHighQuality'] === 'YES') adHighQualityYes++;
      if (task.result['isEcpHighQuality'] === 'YES') ecpHighQualityYes++;
      if (task.result['isFirstPublish'] === 'YES') firstPublishYes++;
    }

    return {
      total,
      adHighQuality: {
        count: adHighQualityYes,
        rate: total > 0 ? Math.round((adHighQualityYes / total) * 100) : 0,
      },
      ecpHighQuality: {
        count: ecpHighQualityYes,
        rate: total > 0 ? Math.round((ecpHighQualityYes / total) * 100) : 0,
      },
      firstPublish: {
        count: firstPublishYes,
        rate: total > 0 ? Math.round((firstPublishYes / total) * 100) : 0,
      },
    };
  }

  async getAdvertiserStats() {
    const rows = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.advertiser_id', 'advertiserId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.result->>'isAdHighQuality' = 'YES' THEN 1 ELSE 0 END)",
        'adQualityCount',
      )
      .addSelect(
        "SUM(CASE WHEN t.result->>'isEcpHighQuality' = 'YES' THEN 1 ELSE 0 END)",
        'ecpQualityCount',
      )
      .addSelect(
        "SUM(CASE WHEN t.result->>'isFirstPublish' = 'YES' THEN 1 ELSE 0 END)",
        'firstPublishCount',
      )
      .addSelect(
        "SUM(CASE WHEN t.status = 'SUCCESS' THEN 1 ELSE 0 END)",
        'successCount',
      )
      .groupBy('t.advertiser_id')
      .orderBy('total', 'DESC')
      .limit(20)
      .getRawMany();

    return rows.map((row) => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      return {
        advertiserId: row.advertiserId,
        total,
        adQualityCount: Number(row.adQualityCount),
        ecpQualityCount: Number(row.ecpQualityCount),
        firstPublishCount: Number(row.firstPublishCount),
        successCount,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      };
    });
  }

  async getTrend(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await this.taskRepository
      .createQueryBuilder('t')
      .select('DATE(t.created_at)', 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN t.status = 'SUCCESS' THEN 1 ELSE 0 END)",
        'successCount',
      )
      .where('t.created_at >= :since', { since })
      .groupBy('DATE(t.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map((row) => {
      const total = Number(row.total);
      const successCount = Number(row.successCount);
      return {
        date: row.date,
        total,
        successCount,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      };
    });
  }
}
