# 本地开发指南

## 🚀 快速开始

### 1. 启动数据库服务（仅 PostgreSQL + Redis）

```bash
cd /Users/ronluo/Desktop/h5/Lark

# 启动数据库和 Redis
docker compose -f docker-compose.dev.yml up -d

# 查看日志
docker compose -f docker-compose.dev.yml logs -f
```

### 2. 启动后端服务

```bash
cd /Users/ronluo/Desktop/h5/Lark/server

# 安装依赖（首次）
pnpm install

# 启动开发服务器
pnpm start:dev

# 后端将运行在 http://localhost:3000
```

### 3. 启动前端服务

```bash
cd /Users/ronluo/Desktop/h5/Lark/public

# 安装依赖（首次）
npm install

# 启动开发服务器
npm run dev

# 前端将运行在 http://localhost:5173
```

### 4. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000/api
- **API 文档**: http://localhost:3000/api/docs

---

## 📊 资源占用

### 预计占用

| 服务 | 内存 | 磁盘 |
|------|------|------|
| PostgreSQL | ~50MB | ~100MB |
| Redis | ~10MB | ~10MB |
| **总计** | **~60MB** | **~110MB** |

**说明**：
- 只运行数据库，不运行应用容器
- 前后端直接在本地运行（Node.js 进程）
- 占用极小，不影响电脑性能

---

## 🛑 停止服务

### 停止数据库（保留数据）

```bash
docker compose -f docker-compose.dev.yml stop
```

### 停止并删除容器（保留数据）

```bash
docker compose -f docker-compose.dev.yml down
```

### 停止并删除所有数据

```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## 🧹 清理 Docker 资源

### 方案 A：使用清理脚本（推荐）

```bash
cd /Users/ronluo/Desktop/h5/Lark

# 运行清理脚本
bash docker-cleanup.sh

# 选择清理选项：
# 1. 快速清理 - 只删除本项目容器和数据
# 2. 深度清理 - 清理所有未使用的 Docker 资源
# 3. 完全清理 - 清理所有 Docker 数据（慎用）
# 4. 查看资源占用
```

### 方案 B：手动清理

```bash
# 1. 停止并删除本项目容器和数据
docker compose -f docker-compose.dev.yml down -v

# 2. 清理未使用的镜像
docker image prune -a -f

# 3. 清理未使用的卷
docker volume prune -f

# 4. 清理未使用的网络
docker network prune -f

# 5. 一键清理所有未使用资源
docker system prune -a -f --volumes
```

---

## 🔍 查看资源占用

```bash
# 查看 Docker 磁盘占用
docker system df

# 查看详细占用
docker system df -v

# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看镜像列表
docker images

# 查看数据卷
docker volume ls
```

---

## 💡 常见问题

### Q1: 端口被占用怎么办？

**5432 端口被占用**：
```bash
# 查看占用进程
lsof -i :5432

# 停止本地 PostgreSQL
brew services stop postgresql
```

**6379 端口被占用**：
```bash
# 查看占用进程
lsof -i :6379

# 停止本地 Redis
brew services stop redis
```

### Q2: 数据库连接失败？

检查数据库是否启动：
```bash
docker compose -f docker-compose.dev.yml ps

# 应该看到 postgres 和 redis 都是 Up 状态
```

查看数据库日志：
```bash
docker compose -f docker-compose.dev.yml logs postgres
```

### Q3: 如何重置数据库？

```bash
# 停止并删除数据卷
docker compose -f docker-compose.dev.yml down -v

# 重新启动（会重新执行 init.sql）
docker compose -f docker-coose.dev.yml up -d
```

### Q4: 如何进入数据库？

```bash
# 进入 PostgreSQL
docker exec -it dev-diagnosis-postgres psql -U postgres -d diagnosis

# 查看所有表
\dt

# 查看表结构
\d materials

# 退出
\q
```

### Q5: 清理后如何恢复？

```bash
# 重新启动即可，Docker 会自动下载镜像
docker compose -f docker-compose.dev.yml up -d
```

---

## 📝 开发流程建议

### 日常开发

1. **启动数据库**：`docker compose -f docker-compose.dev.yml up -d`
2. **启动后端**：`cd server && pnpm start:dev`
3. **启动前端**：`cd public && npm run dev`
4. **开发调试**：修改代码，热更新自动生效
5. **停止服务**：`Ctrl+C` 停止前后端，`docker compose -f docker-compose.dev.yml stop` 停止数据库

### 调试完成后

```bash
# 1. 停止数据库
docker compose -f docker-compose.dev.yml down

# 2. 清理资源（可选）
bash docker-cleanup.sh
# 选择 "1. 快速清理"

# 3. 查看清理效果
docker system df
```

---

## ⚠️ 注意事项

1. **数据持久化**：
   - 数据保存在 Docker 卷中
   - `docker compose down` 不会删除数据
   - `docker compose down -v` 会删除数据

2. **端口冲突**：
   - 确保 5432 和 6379 端口未被占用
   - 如有冲突，修改 `docker-compose.dev.yml` 中的端口映射

3. **内存占用**：
   - 只运行数据库，占用极小（~60MB）
   - 不影响电脑性能
   - 可以长期运行

4. **清理建议**：
   - 日常开发：不需要清理
   - 长期不用快速清理"
   - 完全清理：慎用，会删除所有 Docker 数据

---

## 🎯 最佳实践

### 开发时

```bash
# 启动数据库（后台运行）
docker compose -f docker-compose.dev.yml up -d

# 启动后端（新终端窗口）
cd server && pnpm start:dev

# 启动前端（新终端窗口）
cd public && npm run dev
```

### 调试完成

```bash
# 停止前后端（Ctrl+C）

# 停止数据库（保留数据，下次快速启动）
docker compose -f docker-compose.dev.yml stop
```

### 长期不用

```bash
# 完全清理
bash docker-cleanup.sh
# 选择 "1. 快速清理"
```

---

## 📞 快速命令参考

```bash
# 启动
docker compose -f docker-compose.dev.yml up -d

# 停止
docker compose -f docker-compose.dev.yml stop

# 重启
docker compose -f docker-compose.dev.yml restart

# 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 查看状态
docker compose -f docker-compose.dev.yml ps

# 清理
bash docker-cleanup.sh
```
