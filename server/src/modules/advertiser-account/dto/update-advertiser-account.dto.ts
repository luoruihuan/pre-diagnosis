import { PartialType } from '@nestjs/swagger';
import { CreateAdvertiserAccountDto } from './create-advertiser-account.dto';

export class UpdateAdvertiserAccountDto extends PartialType(CreateAdvertiserAccountDto) {}
