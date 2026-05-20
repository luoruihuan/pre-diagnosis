# 安全审查报告 - 广告素材前测系统后端

**审查时间**: 2026-05-19T18:02:33+08:00  
**项目**: 广告素材前测系统后端 (NestJS)  
**审查范围**: src/modules/* 核心业务模块  

---

## 总体安全评分: 6/10

**评分说明**: 
- 代码具备基本的安全防护措施（DTO 验证、Webhook 签名验证）
- 存在多个高危安全问题：重放攻击风险、签名验证时序攻击、敏感信息泄露
- 缺少认证授权机制、HTTPS 强制、速率限制等关键安全措施
- 修复严重和高危问题后可达到 8 分

---

## 严重安全问题 (Critical)

### S-C-001: Webhook 签名验证存在时序攻击风险

**位置**: `src/modules/webhook/webhook.service.ts:38`

**问题描述**:
```typescript
return expectedSignature === signature;
```
使用 `===` 进行字符串比较，攻击者可以通过测量响应时间推断出正确的签名字节。

**安全影响**: 
- 攻击者可以通过时序攻击逐字节破解签名
- 可能导致伪造的 Webhook 请求被接受
- 任务状态可被恶意篡改

**修复建议**:
```typescript
verifySignature(timestamp: string, body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(timestamp + body)
    .digest('hex');

  // 使用时间恒定比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
```

**CVSS 评分**: 8.1 (High)

---

### S-C-002: Webhook 缺少重放攻击防护

**位置**: `src/modules/webhook/webhook.service.ts:28-39`

**问题描述**:
- 只验证签名，不验证时间戳新鲜度
- 没有请求去重机制
- 攻击者可以无限次重放捕获的合法请求

**安全影响**:
- 任务状态可被反复修改
- 可能导致业务逻辑错误
- 无法审计真实的状态变更

**修复建议**:
```typescript
async verifySignature(
  timestamp: string, 
  body: string, 
  signature: string,
  requestId: string
): Promise<boolean> {
  // 1. 验证时间戳（5分钟内有效）
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  if (Math.abs(now - requestTime) > 300000) {
    this.logger.warn(`时间戳过期: ${timestamp}`);
    return false;
  }

  // 2. 检查请求是否已处理（防重放）
  const dedupeKey = `webhook:processed:${requestId}`;
  const exists = await this.redis.exists(dedupeKey);
  if (exists) {
    this.logger.warn(`重复请求: ${requestId}`);
    return false;
  }

  // 3. 验证签名（时间恒定比较）
  const expectedSignature = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(timestamp + body)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );

  // 4. 标记请求已处理（10分钟过期）
  if (isValid) {
    await this.redis.setex(dedupeKey, 600, '1');
  }

  return isValid;
}
```

**CVSS 评分**: 7.5 (High)

---

### S-C-003: 敏感配置信息可能硬编码或泄露

**位置**: `src/modules/ocean-engine/ocean-engine.service.ts:19-21`

**问题描述**:
```typescript
this.baseUrl = this.configService.get<string>('oceanEngine.baseUrl');
this.appId = this.configService.get<string>('oceanEngine.appId');
this.appSecret = this.configService.get<string>('oceanEngine.appSecret');
```
- 没有验证配置是否存在
- 如果配置缺失会返回 undefined，导致运行时错误
- 错误日志可能泄露配置键名

**安全影响**:
- 敏感配置缺失时应用无法正常工作
- 错误信息可能泄露系统架构
- 没有配置验证机制

**修复建议**:
```typescript
constructor(
  private readonly configService: ConfigService,
  @InjectRedis() private readonly redis: Redis,
) {
  // 验证必需配置
  const requiredConfigs = [
    'oceanEngine.baseUrl',
    'oceanEngine.appId',
    'oceanEngine.appSecret',
    'oceanEngine.webhookSecret'
  ];

  for (const key of requiredConfigs) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`缺少必需配置: ${key}`);
    }
  }

  this.baseUrl = this.configService.get<string>('oceanEngine.baseUrl');
  this.appId = this.configService.get<string>('oceanEngine.appId');
  this.appSecret = this.configService.get<string>('oceanEngine.appSecret');

  // 不在日志中输出敏感配置
  this.logger.log('Ocean Engine Service 初始化完成');
}
```

**CVSS 评分**: 6.5 (Medium)

---

## 高危安全问题 (High)

### S-H-001: 错误响应中可能泄露敏感信息

**位置**: `src/modules/ocean-engine/ocean-engine.service.ts:46-50`

**问题描述**:
```typescript
(error) => {
  this.logger.error(
    `← ERROR ${error.config?.url} - ${error.message}`,
    error.response?.data,  // 可能包含 access_token 等敏感信息
  );
  throw error;
}
```

**安全影响**:
- 日志中可能包含 access_token、refresh_token
- 错误响应可能暴露内部 API 结构
- 生产环境日志可能被未授权人员访问

**修复建议**:
```typescript
private sanitizeErrorData(data: any): any {
  if (!data) return null;
  
  const sensitiveKeys = [
    'access_token', 
    'refresh_token', 
    'secret', 
    'password',
    'authorization',
    'cookie'
  ];
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  const redact = (obj: any) => {
    for (const key in obj) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redact(obj[key]);
      }
    }
  };
  
  redact(sanitized);
  return sanitized;
}

// 在拦截器中使用
(error) => {
  const sanitizedData = this.sanitizeErrorData(error.response?.data);
  this.logger.error(
    `← ERROR ${error.config?.url} - ${error.message}`,
    sanitizedData,
  );
  throw error;
}
```

**CVSS 评分**: 7.2 (High)

---

### S-H-002: 缺少 API 认证授权机制

**位置**: 所有 Controller 文件

**问题描述**:
- 所有 API 端点都没有认证装饰器
- 任何人都可以调用创建任务、查询任务等接口
- 没有基于角色的访问控制 (RBAC)

**安全影响**:
- 未授权用户可以创建大量任务，消耗系统资源
- 敏感数据可被任意访问
- 无法追踪操作来源

**修复建议**:
```typescript
// 1. 创建认证守卫
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    // 从配置或数据库验证 API Key
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    return validApiKeys.includes(apiKey);
  }
}

// 2. 在 Controller 中使用
@Controller('diagnosis-tasks')
@UseGuards(ApiKeyGuard)  // 添加认证守卫
export class DiagnosisTaskController {
  // ...
}
```

**CVSS 评分**: 8.5 (High)

---

### S-H-003: SQL 注入风险（TypeORM 使用不当）

**位置**: `src/modules/diagnosis-task/diagnosis-task.service.ts:104-119`

**问题描述**:
虽然使用了 TypeORM，但如果参数处理不当仍可能存在注入风险。当前代码使用了参数化查询，但需要确保所有用户输入都经过验证。

**安全影响**:
- 如果 DTO 验证不完整，可能导致 SQL 注入
- 数据库数据可能被窃取或篡改

**修复建议**:
```typescript
// 确保所有 DTO 都有严格的验证
export class QueryDiagnosisTaskDto extends PaginationDto {
  @ApiProperty({ description: '广告主 ID', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'advertiserId 格式不正确' })
  @MaxLength(50)
  advertiserId?: string;

  @ApiProperty({ description: '视频 ID', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'videoId 格式不正确' })
  @MaxLength(50)
  videoId?: string;

  @ApiProperty({ description: '任务状态', enum: DiagnosisStatus, required: false })
  @IsEnum(DiagnosisStatus)
  @IsOptional()
  status?: DiagnosisStatus;
}
```

**CVSS 评分**: 7.0 (High)

---

### S-H-004: Token 存储在 Redis 中缺少加密

**位置**: `src/modules/ocean-engine/ocean-engine.service.ts:95-107`

**问题描述**:
```typescript
await this.redis.setex(
  `ocean_engine:token:${advertiserId}`,
  ttl,
  access_token,  // 明文存储
);
```

**安全影响**:
- Redis 被入侵时 token 直接泄露
- 内存转储可能暴露 token
- 不符合数据保护最佳实践

**修复建议**:
```typescript
import * as crypto from 'crypto';

class OceanEngineService {
  private readonly encryptionKey: Buffer;

  constructor(...) {
    // 从环境变量读取加密密钥
    const key = this.configService.get<string>('encryption.key');
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async refreshAccessToken(advertiserId: string): Promise<string> {
    // ... 获取 token 的代码 ...

    // 加密后存储
    const encryptedToken = this.encrypt(access_token);
    await this.redis.setex(
      `ocean_engine:token:${advertiserId}`,
      ttl,
      encryptedToken,
    );

    return access_token;
  }

  private async getAccessToken(advertiserId: string): Promise<string> {
    const cacheKey = `ocean_engine:token:${advertiserId}`;
    let encryptedToken = await this.redis.get(cacheKey);

    if (!encryptedToken) {
      return await this.refreshAccessToken(advertiserId);
    }

    // 解密后返回
    return this.decrypt(encryptedToken);
  }
}
```

**CVSS 评分**: 6.8 (Medium)

---

## 中危安全问题 (Medium)

### S-M-001: 缺少请求速率限制

**位置**: 全局

**问题描述**:
- 除了业务层的 QPS 限流，没有全局的速率限制
- 攻击者可以发起大量请求进行 DDoS 攻击
- 没有针对单个 IP 的限流

**修复建议**:
```typescript
// 安装依赖: npm install @nestjs/throttler

// 在 app.module.ts 中配置
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // 时间窗口（秒）
      limit: 100,   // 最大请求数
    }),
    // ...
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**CVSS 评分**: 5.5 (Medium)

---

### S-M-002: 缺少 HTTPS 强制和安全头

**位置**: 全局配置

**问题描述**:
- 没有强制 HTTPS
- 缺少安全相关的 HTTP 头（HSTS、CSP、X-Frame-Options 等）

**修复建议**:
```typescript
// 安装依赖: npm install helmet

// 在 main.ts 中配置
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 使用 Helmet 添加安全头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // 强制 HTTPS（生产环境）
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  await app.listen(3000);
}
```

**CVSS 评分**: 5.0 (Medium)

---

### S-M-003: 日志中可能包含敏感数据

**位置**: 多处

**问题描述**:
- `this.logger.log()` 可能记录包含敏感信息的对象
- 没有统一的日志脱敏机制

**修复建议**:
```typescript
// 创建日志脱敏工具
export class LogSanitizer {
  private static sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'api_key',
    'access_token',
    'refresh_token',
  ];

  static sanitize(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    
    const redact = (obj: any) => {
      for (const key in obj) {
        if (this.sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          obj[key] = '***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key]);
        }
      }
    };
    
    redact(sanitized);
    return sanitized;
  }
}

// 使用示例
this.logger.log(`创建任务: ${LogSanitizer.sanitize(createTaskDto)}`);
```

**CVSS 评分**: 4.5 (Medium)

---

### S-M-004: 缺少输入长度限制

**位置**: 多个 DTO

**问题描述**:
- 某些字符串字段没有最大长度限制
- 可能导致数据库溢出或内存耗尽

**修复建议**:
```typescript
export class CreateDiagnosisTaskDto {
  @ApiProperty({ description: '广告主 ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)  // 添加长度限制
  advertiserId: string;

  @ApiProperty({ description: '视频 ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)  // 添加长度限制
  videoId: string;

  @ApiProperty({ description: '配置 ID', required: false })
  @IsUUID()
  @IsOptional()
  configId?: string;
}
```

**CVSS 评分**: 4.0 (Medium)

---

## 低危安全问题 (Low)

### S-L-001: 缺少 CORS 配置

**位置**: main.ts

**问题描述**:
- 没有明确的 CORS 配置
- 可能允许任意域访问

**修复建议**:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 配置 CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    maxAge: 3600,
  });

  await app.listen(3000);
}
```

**CVSS 评分**: 3.5 (Low)

---

### S-L-002: 缺少请求体大小限制

**位置**: 全局配置

**问题描述**:
- 没有限制请求体大小
- 可能被用于 DoS 攻击

**修复建议**:
```typescript
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 限制请求体大小
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  await app.listen(3000);
}
```

**CVSS 评分**: 3.0 (Low)

---

### S-L-003: 缺少安全审计日志

**位置**: 全局

**问题描述**:
- 没有记录安全相关事件（登录失败、权限拒绝等）
- 无法进行安全审计和事件溯源

**修复建议**:
```typescript
// 创建审计日志服务
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(event: {
    action: string;
    userId?: string;
    ip: string;
    userAgent: string;
    resource?: string;
    result: 'success' | 'failure';
    details?: any;
  }): Promise<void> {
    const log = this.auditLogRepository.create({
      ...event,
      timestamp: new Date(),
    });
    await this.auditLogRepository.save(log);
  }
}

// 在关键操作中使用
await this.auditLogService.log({
  action: 'CREATE_DIAGNOSIS_TASK',
  userId: req.user?.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  resource: `task:${task.id}`,
  result: 'success',
});
```

**CVSS 评分**: 2.5 (Low)

---

## 依赖安全分析

### 已知漏洞检查

运行 `npm audit` 检查依赖漏洞：

```bash
cd /Users/ronluo/Desktop/h5/Lark/server
npm audit
```

**建议**:
1. 定期运行 `npm audit fix` 更新依赖
2. 使用 Snyk 或 Dependabot 自动监控漏洞
3. 锁定依赖版本（使用 package-lock.json）

---

## 安全最佳实践建议

### 1. 认证授权
- [ ] 实现 API Key 或 JWT 认证
- [ ] 添加基于角色的访问控制 (RBAC)
- [ ] 实现 OAuth 2.0 授权流程

### 2. 数据保护
- [ ] 加密存储敏感数据（token、密钥）
- [ ] 使用 HTTPS 传输所有数据
- [ ] 实现数据脱敏机制

### 3. 输入验证
- [ ] 所有 DTO 添加严格的验证规则
- [ ] 添加输入长度限制
- [ ] 验证文件上传类型和大小

### 4. 错误处理
- [ ] 统一错误响应格式
- [ ] 不在响应中暴露内部错误详情
- [ ] 记录详细错误日志但脱敏敏感信息

### 5. 安全头和配置
- [ ] 使用 Helmet 添加安全头
- [ ] 配置 CORS 白名单
- [ ] 强制 HTTPS
- [ ] 添加 HSTS 头

### 6. 速率限制
- [ ] 实现全局速率限制
- [ ] 针对敏感操作添加额外限流
- [ ] 实现 IP 黑名单机制

### 7. 审计和监控
- [ ] 记录所有安全相关事件
- [ ] 实现实时告警机制
- [ ] 定期审查安全日志

### 8. 依赖管理
- [ ] 定期更新依赖
- [ ] 使用自动化工具监控漏洞
- [ ] 锁定依赖版本

---

## 修复优先级

### 立即修复 (P0)
1. S-C-001: 修复签名验证时序攻击
2. S-C-002: 添加 Webhook 重放攻击防护
3. S-H-002: 实现 API 认证授权机制

### 近期修复 (P1)
1. S-H-001: 错误响应脱敏
2. S-H-004: Token 加密存储
3. S-M-001: 添加速率限制
4. S-M-002: 配置安全头和 HTTPS

### 计划修复 (P2)
1. S-M-003: 实现日志脱敏
2. S-M-004: 添加输入长度限制
3. S-L-001: 配置 CORS
4. S-L-003: 实现审计日志

---

## 总结

**当前安全状况**: 
- 具备基本的安全防护（DTO 验证、签名验证）
- 存在多个高危漏洞需要立即修复
- 缺少完整的安全防护体系

**关键风险**:
1. 缺少认证授权，任何人都可以调用 API
2. Webhook 存在重放攻击和时序攻击风险
3. 敏感数据明文存储和传输
4. 缺少全局安全防护措施

**修复后预期**:
修复所有严重和高危问题后，安全评分可提升至 8/10，达到生产环境基本安全要求。

---

**审查人**: Claude (gaia-dev-security-review)  
**报告版本**: 1.0  
