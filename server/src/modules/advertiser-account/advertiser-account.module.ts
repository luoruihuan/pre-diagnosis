import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserAccountService } from './advertiser-account.service';
import { AdvertiserAccountController } from './advertiser-account.controller';
import { AdvertiserAccount } from '../../common/entities/advertiser-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdvertiserAccount])],
  controllers: [AdvertiserAccountController],
  providers: [AdvertiserAccountService],
  exports: [AdvertiserAccountService],
})
export class AdvertiserAccountModule {}
