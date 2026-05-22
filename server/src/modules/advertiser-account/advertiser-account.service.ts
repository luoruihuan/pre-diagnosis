import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvertiserAccount } from '../../common/entities/advertiser-account.entity';
import { CreateAdvertiserAccountDto } from './dto/create-advertiser-account.dto';
import { UpdateAdvertiserAccountDto } from './dto/update-advertiser-account.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class AdvertiserAccountService {
  constructor(
    @InjectRepository(AdvertiserAccount)
    private readonly accountRepository: Repository<AdvertiserAccount>,
  ) {}

  async create(dto: CreateAdvertiserAccountDto): Promise<AdvertiserAccount> {
    const existing = await this.accountRepository.findOne({
      where: { agentId: dto.agentId, advertiserId: dto.advertiserId },
    });
    if (existing) {
      throw new ConflictException(
        `代理商 ${dto.agentId} 下广告主 ${dto.advertiserId} 已存在`,
      );
    }
    const account = this.accountRepository.create(dto);
    return this.accountRepository.save(account);
  }

  async findAll(
    paginationDto: PaginationDto,
    isActive?: boolean,
  ): Promise<PaginatedResponse<AdvertiserAccount>> {
    const { page = 1, pageSize = 10 } = paginationDto;
    const skip = (page - 1) * pageSize;

    const qb = this.accountRepository.createQueryBuilder('account');

    if (isActive !== undefined) {
      qb.where('account.isActive = :isActive', { isActive });
    }

    const [items, total] = await qb
      .skip(skip)
      .take(pageSize)
      .orderBy('account.createdAt', 'DESC')
      .getManyAndCount();

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string): Promise<AdvertiserAccount> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`广告主账号 ${id} 不存在`);
    }
    return account;
  }

  async update(id: string, dto: UpdateAdvertiserAccountDto): Promise<AdvertiserAccount> {
    const account = await this.findOne(id);
    Object.assign(account, dto);
    return this.accountRepository.save(account);
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    await this.accountRepository.remove(account);
  }
}
