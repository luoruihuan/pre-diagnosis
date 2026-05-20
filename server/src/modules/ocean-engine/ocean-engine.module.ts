import { Module, Global } from '@nestjs/common';
import { OceanEngineService } from './ocean-engine.service';

@Global()
@Module({
  providers: [OceanEngineService],
  exports: [OceanEngineService],
})
export class OceanEngineModule {}
