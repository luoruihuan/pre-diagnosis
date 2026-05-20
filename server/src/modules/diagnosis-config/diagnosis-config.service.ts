import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagnosisConfig } from '../../common/entities/diagnosis-config.entity';
import { CreateDiagnosisConfigDto } from './dto/create-diagnosis-config.dto';
import { UpdateDiagnosisConfigDto } from './dto/update-diagnosis-config.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class DiagnosisConfigService {
  constructor(
    @InjectRepository(DiagnosisConfig)
    private readonly configRepository: Repository<DiagnosisConfig>,
  ) {}

  async create(createConfigDto: CreateDiagnosisConfigDto): Promise<DiagnosisConfig> {
    const config = this.configRepository.create(createConfigDto);
    return this.configRepository.save(config);
  }

  async findAll(
    paginationDto: PaginationDto,
    isActive?: boolean,
  ): Promise<PaginatedResponse<DiagnosisConfig>> {
    const { page, pageSize } = paginationDto;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.configRepository.createQueryBuilder('config');

    if (isActive !== undefined) {
      queryBuilder.where('config.isActive = :isActive', { isActive });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('config.createdAt', 'DESC')
      .getManyAndCount();

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<DiagnosisConfig> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`配置 ${id} 不存在`);
    }
    return config;
  }

  async update(id: string, updateConfigDto: UpdateDiagnosisConfigDto): Promise<DiagnosisConfig> {
    const config = await this.findOne(id);
    Object.assign(config, updateConfigDto);
    return this.configRepository.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.configRepository.remove(config);
  }
}
