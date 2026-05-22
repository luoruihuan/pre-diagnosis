#!/bin/bash

set -e

echo "=========================================="
echo "  视频前测诊断平台 - 生产环境部署"
echo "  域名: luoruihuan.top"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否在项目目录
if [ ! -f "docker-compose.2gb.yml" ]; then
    echo -e "${RED}错误: 请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
echo ""

# 1. 检查环境变量配置
echo "【1】检查环境变量配置..."
if grep -q "your_app_id" docker-compose.2gb.yml; then
    echo -e "${YELLOW}⚠ 检测到未配置的环境变量${NC}"
    echo ""
    echo "请先配置以下环境变量（编辑 docker-compose.2gb.yml）："
    echo "  - OCEAN_ENGINE_APP_ID"
    echo "  - OCEAN_ENGINE_APP_SECRET"
    echo "  - OCEAN_ENGINE_WEBHOOK_SECRET"
    echo ""
    read -p "是否已配置完成？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}部署已取消${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 环境变量检查通过${NC}"
echo ""

# 2. 创建必要的文件
echo "【2】创建必要的文件..."

# 创建 init.sql（如果不存在）
if [ ! -f "init.sql" ]; then
    touch init.sql
    echo -e "${GREEN}✓ 已创建 init.sql${NC}"
fi

# 创建 certbot 目录
mkdir -p /etc/letsencrypt
mkdir -p /var/www/certbot

echo -e "${GREEN}✓ 文件准备完成${NC}"
echo ""

# 3. 停止旧容器
echo "【3】停止旧容器..."
docker-compose -f docker-compose.2gb.yml down 2>/dev/null || true
echo -e "${GREEN}✓ 已停止旧容器${NC}"
echo ""

# 4. 构建并启动服务（HTTP 模式）
echo "【4】启动服务（HTTP 模式）..."
echo "  这可能需要几分钟时间..."

# 临时使用 HTTP 配置
if [ -f "public/nginx.conf.https" ]; then
    mv public/nginx.conf public/nginx.conf.https.bak
fi

cat > public/nginx.conf.http <<'EOF'
server {
    listen 80;
    server_name luoruihuan.top www.luoruihuan.top;

    root /usr/share/nginx/html;
    index index.html;

    # ACME 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://diagnosis-server:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook 代理
    location /webhook {
        proxy_pass http://diagnosis-server:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 备份原配置，使用 HTTP 配置
if [ -f "public/nginx.conf" ]; then
    mv public/nginx.conf public/nginx.conf.https
fi
mv public/nginx.conf.http public/nginx.conf

docker-compose -f docker-compose.2gb.yml up -d --build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 服务启动成功${NC}"
else
    echo -e "${RED}✗ 服务启动失败${NC}"
    exit 1
fi
echo ""

# 5. 等待服务就绪
echo "【5】等待服务就绪..."
sleep 15

MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:80 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
echo ""

# 6. 显示部署状态
echo "【6】部署状态"
echo ""
docker-compose -f docker-compose.2gb.yml ps
echo ""

# 7. 显示内存使用
echo "【7】内存使用情况"
echo ""
docker stats --no-stream
echo ""

# 8. 健康检查】健康检查"
echo ""

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务正常${NC}"
else
    echo -e "${YELLOW}⚠ 后端服务未响应${NC}"
fi

if curl -s http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服务正常${NC}"
else
    echo -e "${YELLOW}⚠ 前端服务未响应${NC}"
fi

if docker exec diagnosis-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库服务正常${NC}"
else
    echo -e "${YELLOW}⚠ 数据库服务未响应${NC}"
fi

if docker exec diagnosis-redis redis-cli -a redis_password ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis 服务正常${NC}"
else
    echo -e "${YELLOW}⚠ Redis 服务未响应${NC}"
fi

echo ""
echo "=========================================="
echo "  HTTP 部署完成"
echo "=========================================="
echo ""
echo -e "${YELLOW}下一步：配置 HTTPS${NC}"
echo ""
echo "1. 确保域名 luoruihuan.top 已解析到本服务器"
echo "   DNS 记录："
echo "   A    luoruihuan.top    -> $(hostname -I | awk '{print $1}')"
echo "   A    www.luoruihuan.top -> $(hostname -I | awk '{print $1}')"
echo ""
echo "2. 等待 DNS 生效后（通常 5-10 分钟），执行："
echo "   bash setup-ssl.sh"
echo ""
echo "临时访问地址："
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
