# Docker 部署指南

## 📦 项目 Docker 化部署

本项目已完整配置 Docker 部署方案，包括前端、后端、数据库和缓存服务。

---

## 🏗️ 架构说明

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   Web    │  │  Server  │  │ Postgres │  │  Redis  │ │
│  │ (Nginx)  │  │ (NestJS) │  │   (DB)   │  │ (Cache) │ │
│  │  :80     │  │  :3000   │  │  :5432   │  │  :6379  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │              │      │
│       └─────────────┴──────────────┴──────────────┘      │
│                  diagnosis-network                        │
└─────────────────────────────────────────────────────────┘
```

### 服务说明

1. **web (前端)**
   - 基于 Nginx + React 构建
   - 端口：80
   - 自动代理 API 请求到后端

2. **server (后端)**
   - 基于 Node.js + NestJS
   - 端口：3000
   - 提供 RESTful API 和 Swagger 文档

3. **postgres (数据库)**
   - PostgreSQL 14
   - 端口：5432
   - 自动执行初始化脚本

4. **redis (缓存)**
   - Redis 7
   - 端口：6379
   - 用于任务队列和缓存

---

## 🚀 快速开始

### 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

### 1. 配置环境变量

编辑 `docker-compose.yml` 中的环境变量，特别是巨量引擎 API 配置：

```yaml
# 在 server 服务中修改
environment:
  OCEAN_ENGINE_APP_ID: your_app_id          # 替换为实际的 APP ID
  OCEAN_ENGINE_APP_SECRET: your_app_secret  # 替换为实际的 APP SECRET
  OCEAN_ENGINE_WEBHOOK_SECRET: your_webhook_secret  # 替换为实际的 Webhook Secret
```

### 2. 构建并启动所有服务

```bash
# 在项目根目录执行
docker-compose up -d --build
```

### 3. 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f web
```

### 4. 访问应用

- **前端应用**：http://localhost
- **后端 API**：http://localhost:3000
- **Swagger 文档**：http://localhost:3000/api/docs

---

## 📝 常用命令

### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose uver
docker-compose up -d web
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
docker-compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart server
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f postgres
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec server sh

# 进入数据库容器
docker-compose exec postgres psql -U postgres -d diagnosis

# 进入 Redis 容器
docker-compose exec redis redis-cli -a redis_password
```

### 重新构建

```bash
# 重新构建所有服务
docker-compose build

# 重新构建特定服务
docker-compose build server
docker-compose build web

# 强制重新构建（不使用缓存）
docker-compose build --no-cache
```

---

## 🔧 配置说明

### 数据库初始化

数据库初始化脚本位于 `init.sql`，包含：
- 创建数据库表结构
- 创建索引
- 创建触发器（自动更新 updated_at）
- 插入示例配置数据
- 创建统计视图

初始化脚本会在 PostgreSQL 容器首次启动时自动执行。

### 数据持久化

数据通过 Docker Volume 持久化：
- `postgres_data`：PostgreSQL 数据
- `redis_data`：Redis 数据

即使容器删除，数据也会保留。如需完全清除数据：

```bash
docker-compose down -v
```

### 网络配置

所有服务在同一个 Docker 网络 `diagnosis-network` 中访问：
- 后端访问数据库：`postgres:5432`
- 后端访问 Redis：`redis:6379`
- 前端访问后端：`server:3000`

---

## 🐛 故障排查

### 1. 服务无法启动

```bash
# 查看服务状态
docker-compose ps

# 查看详细日志
docker-compose logs server
```

**常见问题**：
- 端口被占用：修改 `docker-compose.yml` 中的端口映射
- 数据库连接失败：检查 PostgreSQL 是否健康启动
- Redis 连接失败：检查 Redis 密码配置

### 2. 数据库初始化失败

```bash
# 查看数据库日志
docker-compose logs postgres

# 手动执行初始化脚本
docker-compose exec postgres psql -U postgres -d diagnosis -f /docker-entrypoint-initdb.d/init.sql
```

### 3. 前端无法访问后端

检查 Nginx 配置：
```bash
# 查看 Nginx 配置
docker-compose exec web cat /etc/nginx/conf.d/default.conf

# 测试 Nginx 配置
docker-compose exec web nginx -t

# 重新加载 Nginx
docker-compose exec web nginx -s reload
```

### 4. 后端 API 报错

```bash
# 查看后端日志
docker-compose logs -f server

# 进入后端容器检查
docker-compose exec server sh
```

### 5. 清除所有数据重新开始

```bash
# 停止并删除所有容器和数据卷
docker-compose down -v

# 删除镜像（可选）
docker-compose down --rmi all

# 重新构建并启动
docker-compose up -d --build
```

---

## 📊 健康检查

所有服务都配置了健康检查：

```bash
# 查看服务健康状态
docker-compose ps

# 健康的服务会显示 "healthy"
# 不健康的服务会显示 "unhealthy"
```

健康检查配置：
- **PostgreSQL**：每 10 秒检查一次，使用 `pg_isready`
- **Redis**：每 10 秒检查一次，使用 `redis-cli ping`
- **Server**：每 30 秒检查一次，访问 `/api/health` 端点
- **Web**：每 30 秒检查一次，访问首页

---

## 🔐 安全建议

### 生产环境配置

1. **修改默认密码**

编辑 `docker-compose.yml`：
```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: your_strong_password  # 修改数据库密码

redis:
  command: redis-server --appendonly yes --requirepass your_strong_password  # 修改 Redis 密码

server:
  environment:
    DB_PASSWORD: your_strong_password  # 与数据库密码一致
    REDIS_PASSWORD: your_strong_password  # 与 Redis 密码一致
```

2. **使用环境变量文件**

创建 `.env` 文件：
```env
POSTGRES_PASSWORD=your_strong_password
REDIS_PASSWORD=your_strong_password
OCEAN_ENGINE_APP_ID=your_app_id
OCEAN_ENGINE_APP_SECRET=your_app_secret
OCEAN_ENGINE_WEBHOOK_SECRET=your_webhook_secret
```

修改 `docker-compose.yml` 使用环境变量：
```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

3. **限制端口暴露**

生产环境建议只暴露必要的端口（80/443），不暴露数据库和 Redis 端口：
```yaml
postgres:
  # ports:
  #   - "5432:5432"  # 注释掉，不对外暴露

redis:
  # ports:
  #   - "6379:6379"  # 注释掉，不对外暴露
```

4. **使用 HTTPS**

配置 SSL 证书，修改 Nginx 配置支持 HTTPS。

---

## 📈 性能优化

### 1. 资源限制

为容器设置资源限制：
```yaml
server:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### 2. 数据库优化

调整 PostgreSQL 配置：
```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### 3. Redis 优化

调整 Redis 配置：
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 🔄 更新部署

### 更新代码

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose build

# 3. 重启服务
docker-compose up -d
```

### 滚动更新（零停机）

```bash
# 1. 构建新镜像
docker-compose build server

# 2. 启动新容器
docker-compose up -d --no-deps --scale server=2 server

# 3. 等待新容器健康
sleep 30

# 4. 停止旧容器
docker-compose up -d --no-deps --scale server=1 server
```

---

## 📦 备份与恢复

### 数据库备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres dis > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用 docker cp
docker-compose exec postgres pg_dump -U postgres diagnosis > /tmp/backup.sql
docker cp diagnosis-postgres:/tmp/backup.sql ./backup.sql
```

### 数据库恢复

```bash
# 恢复数据库
docker-compose exec -T postgres psql -U postgres diagnosis < backup.sql

# 或使用 docker cp
docker cp backup.sql diagnosis-postgres:/tmp/backup.sql
docker-compose exec postgres psql -U postgres diagnosis -f /tmp/backup.sql
```

### Redis 备份

```bash
# Redis 会自动持久化到 redis_data volume
# 手动触发保存
docker-compose exec redis redis-cli -a redis_password SAVE

# 备份 RDB 文件
docker cp diagnosis-redis:/data/dump.rdb ./redis_backup.rdb
```

---

## 🎯 生产环境部署清单

- [ ] 修改所有默认密码
- [ ] 配置环境变量文件（.env）
- [ ] 配置 HTTPS（SSL 证书）
- [ ] 限制端口暴露
- [ ] 设置资源限制
- [ ] 配置日志收集
- [ ] 配置监控告警
- [ ] 配置自动备份
- [ ] 配置防火墙规则
- [ ] 测试健康检查
- [ ] 测试故障恢复
- [ ] 准备回滚方案

---

## 📞 技术支持

如有问题，请查看：
- 项目文档：`PROJECT_SUMMARY.md`
- 后端文档：`server/README.md`
- 前端文档：`public/README.md`
- Docker 日志：`docker-compose logs`

---

**Docker 部署配置已完成，可以直接使用！** 🚀
