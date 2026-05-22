import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../common/entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto): Promise<Material> {
    // 检查 videoId 是否已存在
    const existing = await this.materialRepository.findOne({
      where: { videoId: createMaterialDto.videoId },
    });

    if (existing) {
      throw new ConflictException(`视频 ${createMaterialDto.videoId} 已存在`);
    }

    const material = this.materialRepository.create(createMaterialDto);
    return this.materialRepository.save(material);
  }

  async findAll(
    paginationDto: PaginationDto,
    advertiserId?: string,
    status?: string,
  ): Promise<PaginatedResponse<Material>> {
    const { page, pageSize } = paginationDto;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.materialRepository.createQueryBuilder('material');

    if (advertiserId) {
      queryBuilder.andWhere('material.advertiserId = :advertiserId', { advertiserId });
    }

    if (status) {
      queryBuilder.andWhere('material.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('material.createdAt', 'DESC')
      .getManyAndCount();

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException(`素材 ${id} 不存在`);
    }
    return material;
  }

  async findByVideoId(videoId: string): Promise<Material | null> {
    return this.materialRepository.findOne({ where: { videoId } });
  }

  async update(id: string, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);

    // 如果更新 videoId，检查是否冲突
    if (updateMaterialDto.videoId && updateMaterialDto.videoId !== material.videoId) {
      const existing = await this.materialRepository.findOne({
        where: { videoId: updateMaterialDto.videoId },
      });
      if (existing) {
        throw new ConflictException(`视频 ${updateMaterialDto.videoId} 已存在`);
      }
    }

    Object.assign(material, updateMaterialDto);
    return this.materialRepository.save(material);
  }

  async remove(id: string): Promise<void> {
    const material = await this.findOne(id);
    await this.materialRepository.remove(material);
  }
}
