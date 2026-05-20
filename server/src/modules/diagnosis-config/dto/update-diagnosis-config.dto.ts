import { PartialType } from '@nestjs/swagger';
import { CreateDiagnosisConfigDto } from './create-diagnosis-config.dto';

export class UpdateDiagnosisConfigDto extends PartialType(CreateDiagnosisConfigDto) {}
