import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MaterialService } from './material.service';
import { MaterialController } from './material.controller';
import { Material } from '../../common/entities/material.entity';
import { VideoUploadProcessor } from './video-upload.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material]),
    BullModule.registerQueue({ name: 'video-upload' }),
  ],
  controllers: [MaterialController],
  providers: [MaterialService, VideoUploadProcessor],
  exports: [MaterialService],
})
export class MaterialModule {}
