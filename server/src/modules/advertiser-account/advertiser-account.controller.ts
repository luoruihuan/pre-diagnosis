import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AdvertiserAccountService } from './advertiser-account.service';
import { CreateAdvertiserAccountDto } from './dto/create-advertiser-account.dto';
import { UpdateAdvertiserAccountDto } from './dto/update-advertiser-account.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('广告主账号')
@Controller('advertiser-accounts')
export class AdvertiserAccountController {
  constructor(private readonly accountService: AdvertiserAccountService) {}

  @Post()
  @ApiOperation({ summary: '创建广告主账号' })
  @SwaggerResponse({ status: 201, description: '创建成功' })
  create(@Body() dto: CreateAdvertiserAccountDto) {
    return this.accountService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取广告主账号列表' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.accountService.findAll(paginationDto, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取广告主账号详情' })
  @SwaggerResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新广告主账号' })
  @SwaggerResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() dto: UpdateAdvertiserAccountDto) {
    return this.accountService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除广告主账号' })
  @SwaggerResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }
}
