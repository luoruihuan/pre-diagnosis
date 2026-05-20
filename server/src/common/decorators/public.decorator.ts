import { SetMetadata } from '@nestjs/common';

/**
 * 标记接口为公开接口，不需要 API Key 认证
 * 用于 Webhook 等外部回调接口
 */
export const Public = () => SetMetadata('isPublic', true);
