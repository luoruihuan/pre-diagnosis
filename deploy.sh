#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  广告素材前测系统 - Docker 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
echo ""

# 提示用户配置环境变量
echo -e "${YELLOW}请确保已配置以下环境变量：${NC}"
echo "1. 巨量引擎 APP_ID"
echo "2. 巨量引擎 APP_SECRET"
echo "3. 巨量引擎 WEBHOOK_SECRET"
echo ""
read -p "是否已配置完成？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}请编辑 docker-compose.yml 文件配置环境变量后再运行此脚本${NC}"
    exit 1
fi

# 停止并删除旧容器
echo -e "${YELLOW}正在停止旧容器...${NC}"
docker-compose down

# 构建镜像
echo -e "${YELLOW}正在构建 Docker 镜像...${NC}"
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 镜像构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 镜像构建成功${NC}"
echo ""

# 启动服务
echo -e "${YELLOW}正在启动服务...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 服务��动失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 服务启动成功${NC}"
echo ""

# 等待服务健康检查
echo -e "${YELLOW}等待服务健康检查...${NC}"
sleep 10

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址："
echo -e "  前端应用: ${GREEN}http://localhost${NC}"
echo -e "  后端 API: ${GREEN}http://localhost:3000${NC}"
echo -e "  Swagger 文档: ${GREEN}http://localhost:3000/api/docs${NC}"
echo ""
echo -e "常用命令："
echo -e "  查看日志: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  停止服务: ${YELLOW}docker-compose down${NC}"
echo -e "  重启服务: ${YELLOW}docker-compose restart${NC}"
echo ""
