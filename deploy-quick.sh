#!/bin/bash

set -e

echo "=========================================="
echo "  快速部署脚本（使用现有 SSL 证书）"
echo "  域名: luoruihuan.top"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}错误: 未找到 docker-compose 或 docker compose 命令${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 使用命令: $DOCKER_COMPOSE${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "docker-compose.2gb.yml" ]; then
    echo -e "${RED}错误: 请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 1. 检查 SSL 证书
echo "【1】检查 SSL 证书..."
if [ ! -f "/etc/letsencrypt/live/luoruihuan.top/fullchain.pem" ]; then
    echo -e "${RED}✗ SSL 证书不存在${NC}"
    echo "请先运行: bash setup-ssl.sh"
    exit 1
fi

echo -e "${GREEN}✓ SSL 证书存在${NC}"
certbot certificates | grep "luoruihuan.top" -A 5
echo ""

# 2. 检查环境变量配置
echo "【2】检查环境变量配置..."
if grep -q "your_app_id" docker-compose.2gb.yml; then
    echo -e "${YELLOW}⚠ 检测到未配置的环境变量${NC}"
    echo ""
    echo "以下环境变量未配置（不影响部署，但会影响巨量引擎 API 功能）："
    echo "  - OCEAN_ENGINE_APP_ID"
    echo "  - OCEAN_ENGINE_APP_SECRET"
    echo "  - OCEAN_ENGINE_WEBHOOK_SECRET"
    echo ""
    echo -e "${YELLOW}提示: 可以先部署，后续再配置环境变量${NC}"
    echo ""
else
    echo -e "${GREEN}✓ 环境变量已配置${NC}"
fi
echo ""

# 3. 创建必要的文件
echo "【3】创建必要的文件..."
if [ ! -f "init.sql" ]; then
    touch init.sql
    echo -e "${GREEN}✓ 已创建 init.sql${NC}"
fi
echo ""

# 4. 停止旧容器
echo "【4】停止旧容器..."
$DOCKER_COMPOSE -f docker-compose.2gb.yml down 2>/dev/null || true
echo -e "${GREEN}✓ 已停止旧容器${NC}"
echo ""

# 5. 构建并启动服务
echo "【5】构建并启动服务（HTTPS 模式）..."
echo "  这可能需要几分钟时间..."

$DOCKER_COMPOSE -f docker-compose.2gb.yml up -d --build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 服务启动成功${NC}"
else
    echo -e "${RED}✗ 服务启动失败${NC}"
    exit 1
fi
echo ""

# 6. 等待服务就绪
echo "【6】等待服务就绪..."
sleep 15

MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -k -s https://localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
echo ""

# 7. 显示部署状态
echo "【7】部署状态"
echo ""
$DOCKER_COMPOSE -f docker-compose.2gb.yml ps
echo ""

# 8. 显示内存使用
echo "【8】内存使用情况"
echo ""
docker stats --no-stream
echo ""

# 9. 健康检查
echo "【9】健康检查"
echo ""

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务正常${NC}"
else
    echo -e "${YELLOW}⚠ 后端服务未响应${NC}"
fi

if curl -k -s https://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服务正常 (HTTPS)${NC}"
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
echo "  部署完成"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端: ${GREEN}https://luoruihuan.top${NC}"
echo "  后端 API: ${GREEN}https://luoruihuan.top/api${NC}"
echo "  Webhook: ${GREEN}https://luoruihuan.top/webhook${NC}"
echo ""
echo "常用命令："
echo "  查看日志: $DOCKER_COMPOSE -f docker-compose.2gb.yml logs -f"
echo "  重启服务: $DOCKER_COMPOSE -f docker-compose.2gb.yml restart"
echo "  停止服务: $DOCKER_COMPOSE -f docker-compose.2gb.yml down"
echo "  查看状态: $DOCKER_COMPOSE -f docker-compose.2gb.yml ps"
echo ""
