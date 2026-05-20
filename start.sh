#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  快速启动脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查服务是否已运行
if docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}服务已在运行中${NC}"
    echo ""
    docker-compose ps
    echo ""
    echo -e "如需重启服务，请运行: ${YELLOW}docker-compose restart${NC}"
    exit 0
fi

# 启动服务
echo -e "${YELLOW}正在启动服务...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 服务启动失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 服务启动成功${NC}"
echo ""

# 等待服务健康检查
echo -e "${YELLOW}等待服务健康检查（约 30 秒）...${NC}"
sleep 30

# 检查服务状态
echo ""
echo -e "${YELLOW}服务状态：${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  启动完成！${NC}"
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
echo -e "  备份数据: ${YELLOW}./backup.sh${NC}"
echo ""
