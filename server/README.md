# 视频诊断服务

基于 NestJS 的巨量引擎视频诊断服务后端。

## 功能特性

- ✅ 素材管理：视频素材的增删改查
- ✅ 诊断配置：灵活的诊断参数配置
- ✅ 诊断任务：创建任务并自动轮询结果
- ✅ QPS 限流：每个视频每天最多诊断 5 次
- ✅ Webhook 回调：接收巨量引擎异步通知
- ✅ Token 自动刷新：服务端自动管理 Access Token
- ✅ Swagger 文档：完整的 API 接口文档

## 技术栈

- **框架**: NestJS 10.x
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis + ioredis
- **队列**: Bull (基于 Redis)
- **API 文档**: Swagger
- **验证**: class-validator + class-transformer

## 快速开始

### 1. 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

配置说明：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=diagnosis

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 巨量引擎 API 配置
OCEAN_ENGINE_BASE_URL=https://api.oceanengine.com
OCEAN_ENGINE_APP_ID=your_app_id
OCEAN_ENGINE_APP_SECRET=your_app_secret
OCEAN_ENGINE_WEBHOOK_SECRET=your_webhook_secret

# 服务配置
PORT=3000
NODE_ENV=development
```

### 4. 初始化数据库

```bash
# 创建数据库
createdb diagnosis

# 启动服务（自动同步表结构）
pnpm start:dev
```

### 5. 启动服务

```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

### 6. 访问 API 文档

启动后访问：http://localhost:3000/api/docs

## API 接口

### 素材管理

- `POST /api/materials` - 创建素材
- `GET /api/materials` - 获取素材列表
- `GET /api/materials/:id` - 获取素材详情
- `PATCH /api/materials/:id` - 更新素材
- `DELETE /api/materials/:id` - 删除素材

### 诊断配置

- `POST /api/diagnosis-configs` - 创建配置
- `GET /api/diagnosis-configs` - 获取配置列表
- `GET /api/diagnosis-configs/:id` - 获取配置详情
- `PATCH /api/diagnosis-configs/:id` - 更新配置
- `DELETE /api/diagnosis-configs/:id` - 删除配置

### 诊断任务

- `POST /api/diagnosis-tasks` - 创建诊断任务
- `GET /api/diagnosis-tasks` - 获取任务列表
- `GET /api/diagnosis-tasks/:id` - 获取任务详情

### Webhook

- `POST /api/webhook/ocean-engine` - 接收巨量引擎回调

## 核心流程

### 创建诊断任务

```typescript
// 1. 客户端请求
POST /api/diagnosis-tasks
{
  "advertiserId": "123456",
  "videoId": "video_001",
  "configId": "uuid-xxx" // 可选
}

// 2. 服务端处理
// - 检查 QPS 限流（每天最多 5 次）
// - 调用巨量引擎 API 创建任务
// - 保存任务记录到数据库
// - 加入 Bull 队列进行轮询

// 3. 异步轮询
// - 每 5 秒轮询一次
// - 最多轮询 12 次（共 1 分钟）
// - 状态变为 SUCCESS/FAILED 时停止
// - 超时标记为 TIMEOUT

// 4. Webhook 回调（可选）
// - 巨量引擎主动推送结果
// - 验证签名后更新任务状态
```

### QPS 限流机制

```typescript
// Redis Key: qps:diagnosis:{advertiser_id}:{video_id}
// TTL: 86400 秒（24 小时）
// 限制: 每天最多 5 次

// 超限响应
{
  "code": 40029,
  "message": "调用次数超限，每天最多 5 次"
}
```

### Token 管理

```typescript
// Access Token 缓存
// Redis Key: ocean_engine:token:{advertiser_id}
// TTL: expires_in - 300 秒（提前 5 分钟过期）

// Refresh Token 存储
// Redis Key: ocean_engine:refresh_token:{advertiser_id}
// 永久存储，用于自动刷新
```

## 数据库表结构

### materials（素材表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| advertiser_id | VARCHAR(50) | 广告主 ID |
| video_id | VARCHAR(50) | 视频 ID（唯一） |
| video_url | TEXT | 视频 URL |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| duration | INT | 时长（秒） |
| metadata | JSONB | 元数据 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### diagnosis_configs（诊断配置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(100) | 配置名称 |
| description | TEXT | 配置描述 |
| config | JSONB | 配置内容 |
| is_active | BOOLEAN | 是否启用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### diagnosis_tasks（诊断任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| advertiser_id | VARCHAR(50) | 广告主 ID |
| video_id | VARCHAR(50) | 视频 ID |
| config_id | UUID | 配置 ID（外键） |
| ocean_task_id | VARCHAR(100) | 巨量引擎任务 ID |
| status | ENUM | 任务状态 |
| result | JSONB | 诊断结果 |
| error_message | TEXT | 错误信息 |
| retry_count | INT | 重试次数 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| completed_at | TIMESTAMP间 |

### 任务状态枚举

- `PENDING` - 待处理
- `PROCESSING` - 处理中
- `SUCCESS` - 成功
- `FAILED` - 失败
- `TIMEOUT` - 超时

## 项目结构

```
src/
├── common/                 # 通用模块
│   ├── dto/               # 通用 DTO
│   ├── entities/          # 实体类
│   ├── enums/             # 枚举
│   ├── filters/           # 异常过滤器
│   └── interceptors/      # 拦截器
├── config/                # 配置文件
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── ocean-engine.config.ts
├── modules/               # 业务模块
│   ├── material/          # 素材管理
│   ├── diagnosis-config/  # 诊断配置
│   ├── diagnosis-task/    # 诊断任务
│   ├── ocean-engine/      # 巨量引擎 API
│   └── webhook/           # Webhook 回调
├── app.module.ts          # 主模块
└── main.ts                # 入口文件
```

## 开发指南

### 添加新的诊断配置

```typescript
POST /api/diagnosis-configs
{
  "name": "高质量诊断",
  "description": "适用于高质量视频的诊断配置",
  "config": {
    "check_resolution": true,
    "check_duration": true,
    "min_duration": 15,
    "max_duration": 60
  },
  "isActive": true
}
```

### 查询任务列表

```typescript
GET /api/diagnosis-tasks?page=1&pageSize=10&status=SUCCESS&advertiserId=123456
```

### Webhook 签名验证

```typescript
// 算法: HMAC-SHA256
// 内容: timestamp + request_body
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(timestamp + body)
  .digest('hex');
```

## 日志说明

- **INFO**: API 请求/响应、任务状态变更
- **DEBUG**: 巨量引擎 API 调用详情
- **WARN**: QPS 限流触发
- **ERROR**: 错误异常

## 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 是否启动，配置是否正确。

### 2. Redis 连接失败

检查 Redis 是否启动，端口是否正确。

### 3. QPS 限流触发

每个视频每天最多诊断 5 次，等待 24 小时后重试。

### 4. Token 过期

服务端会自动刷新 Token，确保 `refresh_token` 已正确配置。

## 部署建议

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

### 环境变量

生产环境建议使用环境变量或密钥管理服务，不要将敏感信息提交到代码仓库。

### 监控

- 使用 PM2 或 Docker 进行进程管理
- 配置日志收集（如 ELK）
- 监控 Redis 和 PostgreSQL 性能

## License

MIT
