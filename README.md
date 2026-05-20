# 视频前测诊断运营平台

基于巨量引擎 API 的视频广告前测诊断系统，支持视频素材管理、多维度诊断任务创建与执行、结果可视化分析。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · TypeScript · Vite · Ant Design · MobX · Less |
| 后端 | NestJS · TypeORM · PostgreSQL · Redis · Bull 队列 |
| 部署 | Docker · Docker Compose · Nginx |

## 项目结构

```
.
├── public/          # 前端（React + Vite）
│   ├── src/
│   │   ├── components/   # 公共组件
│   │   ├── pages/        # 页面
│   │   ├── stores/       # MobX 状态管理
│   │   ├── services/     # API 请求层
│   │   └── types/        # TypeScript 类型定义
│   └── Dockerfile
├── server/          # 后端（NestJS）
│   ├── src/
│   │   ├── modules/
│   │   │   ├── material/          # 素材管理
│   │   │   ├── diagnosis-task/    # 诊断任务
│   │   │   ├── diagnosis-config/  # 配置模板
│   │   │   ├── ocean-engine/      # 巨量引擎 API 集成
│   │   │   └── webhook/           # Webhook 回调
│   │   └── config/       # 配置文件
│   └── Dockerfile
├── docker-compose.yml
├── init.sql         # 数据库初始化脚本
└── start.sh         # 一键启动脚本
```

## 功能模块

- **数据统计**：素材数量、任务总数、完成率等核心指标概览，任务趋势图表
- **素材管理**：视频素材上传（支持 MP4/AVI/MOV，最大 500MB）、列表管理
- **前测诊断**：创建诊断任务（配置地区、年龄段、性别、样本量、诊断维度），任务状态实时轮询，结果雷达图可视化
- **配置管理**：诊断配置模板的增删改查

## 快速启动（Docker）

**前提：已安装 Docker 和 Docker Compose**

```bash
# 1. 克隆项目
git clone git@github.com:luoruihuan/pre-diagnosis.git
cd pre-diagnosis

# 2. 配置巨量引擎 API（必填）
# 编辑 docker-compose.yml，替换以下环境变量：
#   OCEAN_ENGINE_APP_ID
#   OCEAN_ENGINE_APP_SECRET
#   OCEAN_ENGINE_WEBHOOK_SECRET

# 3. 一键启动
bash start.sh
```

启动完成后访问：

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost:3000 |
| Swagger 文档 | http://localhost:3000/api/docs |

## 本地开发

**依赖：Node.js 18+、PostgreSQL 14+、Redis 7+**

```bash
# 后端
cd server
cp .env.example .env   # 按实际情况修改 .env
pnpm install
pnpm start:dev         # 启动在 :3001

# 前端（新开终端）
cd public
npm install
npm run dev            # 启动在 :3000，/api 自动代理到 :3001
```

## 环境变量

后端配置文件：`server/.env`

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=diagnosis

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 巨量引擎 API
OCEAN_ENGINE_BASE_URL=https://api.oceanengine.com
OCEAN_ENGINE_APP_ID=your_app_id
OCEAN_ENGINE_APP_SECRET=your_app_secret
OCEAN_ENGINE_WEBHOOK_SECRET=your_webhook_secret

# 服务
PORT=3000
NODE_ENV=development
```

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 停止服务
docker-compose down

# 备份数据（PostgreSQL + Redis）
bash backup.sh

# 从备份恢复
bash restore.sh
```
