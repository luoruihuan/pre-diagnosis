import { Module, Global } from '@nestjs/common';
import { OceanEngineService } from './ocean-engine.service';
import { OceanEngineTokenService } from './ocean-engine-token.service';

@Global()
@Module({
  providers: [OceanEngineService, OceanEngineTokenService],
  exports: [OceanEngineService, OceanEngineTokenService],
})
export class OceanEngineModule {}
