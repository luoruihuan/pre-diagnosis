#!/bin/bash

set -e

echo "=========================================="
echo "  服务器清理脚本"
echo "  ⚠️  将停止所有非必要服务"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}警告: 此脚本将停止以下服务：${NC}"
echo "  - openclaw (Node.js AI 工具)"
echo "  - hermes-gateway (AI Agent)"
echo "  - lighthouse-chromium (Chromium 浏览器)"
echo "  - chrome-devtools-mcp"
echo "  - nginx"
echo "  - PHP 服务"
echo "  - geo-system 相关容器"
echo ""
read -p "确认继续？(yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

echo ""
echo "【1】停止系统服务..."

# 停止 hermes-gateway
if systemctl is-active --quiet hermes-gateway 2>/dev/null; then
    systemctl stop hermes-gateway
    systemctl disable hermes-gateway
    echo -e "${GREEN}✓ 已停止 hermes-gateway${NC}"
fi

# 停止 lighthouse-chromium
if systemctl is-active --quiet lighthouse-chromium 2>/dev/null; then
    systemctl stop lighthouse-chromium
    systemctl disable lighthouse-chromium
    echo -e "${GREEN}✓ 已停止 lighthouse-chromium${NC}"
fi

# 停止 nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl stop nginx
    systemctl disable nginx
    echo -e "${GREEN}✓ 已停止 nginx${NC}"
fi

echo ""
echo "【2】停止进程..."

# 停止 openclaw
if pgrep -f openclaw > /dev/null; then
    pkill -f openclaw
    echo -e "${GREEN}✓ 已停止 openclaw${NC}"
fi

# 停止 chrome-devtools-mcp
if pgrep -f chrome-devtools-mcp > /dev/null; then
    pkill -f chrome-devtools-mcp
    echo -e "${GREEN}✓ 已停止 chrome-devtools-mcp${NC}"
fi

# 停止 chromium 相关进程
if pgrep -f chromium > /dev/null || pgrep -f chrome > /dev/null; then
    pkill -f chromium || true
    pkill -f chrome || true
    echo -e "${GREEN}✓ 已停止 chromium/chrome${NC}"
fi

# 停止 PHP 服务
if pgrep -f "php -S" > /dev/null; then
    pkill -f "php -S"
    echo -e "${GREEN}✓ 已停止 PHP 服务${NC}"
fi

echo ""
echo "【3】停止 Docker 容器..."

# 停止 geo-system 相关容器
if docker ps -q --filter "name=geo-system" | grep -q .; then
    docker stop $(docker ps -q --filter "name=geo-system")
    echo -e "${GREEN}✓ 已停止 geo-system 容器${NC}"
fi

# 可选：删除容器（释放更多资源）
read -p "是否删除 geo-system 容器？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rm -f $(docker ps -aq --filter "name=geo-system") 2>/dev/null || true
    echo -e "${GREEN}✓ 已删除 geo-system 容器${NC}"
fi

echo ""
echo "【4】检查端口占用..."

PORTS=(80 443 3000 5432 6379)
for port in "${PORTS[@]}"; do
    if lsof -i :$port &> /dev/null || netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${YELLOW}⚠ 端口 $port 仍被占用${NC}"
        lsof -i :$port 2>/dev/null | head -n 2 || netstat -tuln | grep ":$port"
    else
        echo -e "${GREEN}✓ 端口 $port 已释放${NC}"
    fi
done

echo ""
echo "【5】清理后的内存状态..."
free -h

echo ""
echo "=========================================="
echo "  清理完成"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 执行部署脚本: bash deploy-production.sh"
echo "  2. 配置域名解析: luoruihuan.top -> $(hostname -I | awk '{print $1}')"
echo ""
