import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // 从环境变量读取 API Key，如果未配置则使用默认值（开发环境）
    this.apiKey = this.configService.get<string>('API_KEY') || 'dev-api-key-12345';
  }

  canActivate(context: ExecutionContext): boolean {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query.apiKey;

    if (!apiKey) {
      throw new UnauthorizedException('缺少 API Key');
    }

    if (apiKey !== this.apiKey) {
      throw new UnauthorizedException('API Key 无效');
    }

    return true;
  }
}
