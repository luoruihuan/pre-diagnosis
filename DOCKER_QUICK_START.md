# Docker 部署 - 快速参考

## 🚀 一键部署

```bash
# 1. 配置环境变量（编辑 docker-compose.yml）
# 2. 执行部署脚本
./deploy.sh
```

## 📋 文件清单

### Docker 配置文件
- ✅ `docker-compose.yml` - Docker Compose 配置文件
- ✅ `server/Dockerfile` - 后端 Dockerfile
- ✅ `server/.dockerignore` - 后端 Docker 忽略文件
- ✅ `public/Dockerfile` - 前端 Dockerfile
- ✅ `public/.dockerignore` - 前端 Docker 忽略文件
- ✅ `public/nginx.conf` - Nginx 配置文件

### 数据库文件
- ✅ `init.sql` - 数据库初始化脚本

### 部署脚本
- ✅ `deploy.sh` - 一键部署脚本
- ✅ `start.sh` - 快速启动脚本
- ✅ `backup.sh` - 数据备份脚本
- ✅ `restore.sh` - 数据恢复脚本

### 文档
- ✅ `DOCKER_DEPLOYMENT.md` - 完整部署文档
- ✅ `.gitignore` - Git 忽略文件

## 🎯 快速命令

### 部署相关
```bash
# 首次部署（构建镜像）
./deploy.sh

# 快速启动（使用已有镜像）
./start.sh

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f web
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 数据管理
```bash
# 备份数据
./backup.sh

# 恢复数据
./restore.sh

# 清除所有数据（⚠️ 危险操作）
docker-compose down -v
```

### 服务管理
```bash
# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec server sh
docker-compose exec postgres psql -U postgres -d diagnosis
docker-compose exec redis redis-cli -a redis_password

# 重新构建
docker-compose build
docker-compose build --no-cache
```

## 🔧 配置说明

### 必须配置的环境变量

编辑 `docker-compose.yml` 中的以下变量：

```yaml
server:
  environment:
    # 巨量引擎 API 配置（必须修改）
    OCEAN_ENGINE_APP_ID: your_app_id          # ← 修改这里
    OCEAN_ENGINE_APP_SECRET: your_app_secret  # ← 修改这里
    OCEAN_ENGINE_WEBHOOK_SECRET: your_webhook_secret  # ← 修改这里
```

### 可选配置

```yaml
# 修改数据库密码
postgres:
  environment:
    POSTGRES_PASSWORD: your_strong_password

# 修改 Redis 密码
redis:
  command: redis-server --appendonly yes --requirepass your_strong_password

# 修改端口映射
web:
  ports:
    - "8080:80"  # 将前端端口改为 8080
```

## 📊 服务端口

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| web | 80 | 80 | 前端应用 |
| server | 3000 | 3000 | 后端 API |
| postgres | 5432 | 5432 | PostgreSQL |
| redis | 6379 | 6379 | Redis |

## 🌐 访问地址

- **前端应用**: http://localhost
- **后端 API**: http://localhost:3000
- **Swagger 文档**: http://localhost:3000/api/docs

## 🐛 常见问题

### 1. 端口被占用

```bash
# 修改 docker-compose.yml 中的端口映  ports:
    - "8080:80"  # 改为其他端口
```

### 2. 数据库连接失败

```bash
# 查看数据库日志
docker-compose logs postgres

# 检查数据库是否健康
docker-compose ps
```

### 3. 前端无法访问后端

```bash
# 检查 Nginx 配置
docker-compose exec web cat /etc/nginx/conf.d/default.conf

# 重新加载 Nginx
docker-compose exec web nginx -s reload
```

### 4. 服务无法启动

```bash
# 查看详细日志
docker-compose logs -f

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

## 🔐 生产环境建议

1. **修改所有默认密码**
   - PostgreSQL 密码
   - Redis 密码

2. **配置 HTTPS**
   - 使用 Let's Encrypt 证书
   - 修改 Nginx 配置

3. **限制端口暴露**
   - 只暴露 80/443 端口
   - 不暴露数据库和 Redis 端口

4. **配置资源限制**
   - 设置 CPU 和内存限制
   - 防止资源耗尽

5. **配置自动备份**
   - 使用 cron 定时执行 backup.sh
   - 备份文件存储到远程

## 📈 监控建议

```bash
# 查看资源使用情况
docker stats

# 查看容器日志大小
docker-compose exec server du -sh /var/log

# 查看数据库大小
docker-compose exec postgres psql -U postgres -d diagnosis -c "SELECT pg_size_pretty(pg_database_size('diagnosis'));"
```

## 🔄 更新部署

```bash
# 1. 备份数据
./backup.sh

# 2. 拉取最新代码
git pull

# 3. 重新部署
./deploy.sh
```

## 📞 获取帮助

- 完整文档: `DOCKER_DEPLOYMENT.md`
- 项目文档: `PROJECT_SUMMARY.md`
- 后端文档: `server/README.md`
- 前端文档: `public/README.md`

---

**Docker 部署配置完成，可以直接使用！** 🎉
