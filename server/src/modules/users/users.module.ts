import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  private readonly logger = new Logger(UsersModule.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    const existing = await this.usersService.findByUsername('admin');
    if (!existing) {
      await this.usersService.create('admin', 'Admin@2026');
      this.logger.log('默认管理员账号已创建: admin / Admin@2026');
    }
  }
}
