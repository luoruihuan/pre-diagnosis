#!/bin/bash

echo "=========================================="
echo "  Docker 资源清理工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 显示当前 Docker 资源占用
echo "【当前 Docker 资源占用】"
docker system df
echo ""

# 菜单选择
echo "请选择清理选项："
echo "  1. 快速清理（停止并删除本项目容器和卷）"
echo "  2. 深度清理（清理所有未使用的 Docker 资源）"
echo "  3. 完全清理（清理所有 Docker 数据，包括镜像）"
echo "  4. 仅查看资源占用"
echo "  5. 退出"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
  1)
    echo -e "${YELLOW}执行快速清理...${NC}"

    # 停止并删除本项目容器
    echo "停止容器..."
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true

    # 删除本项目数据卷
    echo "删除数据卷..."
    docker volume rm lark_dev_postgres_data 2>/dev/null || true
    docker volume rm lark_dev_redis_data 2>/dev/null || true

    echo -e "${GREEN}✓ 快速清理完成${NC}"
    ;;

  2)
    echo -e "${YELLOW}执行深度清理...${NC}"

    # 停止本项目容器
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true

    # 清理未使用的容器
    echo "清理停止的容器..."
    docker container prune -f

    # 清理未使用的卷
    echo "清理未使用的数据卷..."
    docker volume prune -f

    # 清理未使用的网络
    echo "清理未使用的网络..."
    docker network prune -f

    # 清理悬空镜像
    echo "清理悬空镜像..."
    docker image prune -f

    echo -e "${GREEN}✓ 深度清理完成${NC}"
    ;;

  3)
    echo -e "${RED}⚠️  警告：这将删除所有 Docker 数据！${NC}"
    read -p "确认执行完全清理？(yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
      echo -e "${YELLOW}执行完全清理...${NC}"

      # 停止所有容器
      echo "停止所有容器..."
      docker stop $(docker ps -aq) 2>/dev/null || true

      # 删除所有容器
      echo "删除所有容器..."
      docker rm $(docker ps -aq) 2>/dev/null || true

      # 删除所有镜像
      echo "删除所有镜像..."
      docker rmi $(docker images -q) 2>/dev/null || true

      # 删除所有卷
      echo "删除所有数据卷..."
      docker volume rm $(docker volume ls -q) 2>/dev/null || true

      # 删除所有网络
      echo "删除所有自定义网络..."
      docker network prune -f

      # 系统清理
      echo "执行系统清理..."
      docker system prune -a -f --volumes

      echo -e "${GREEN}✓ 完全清理完成${NC}"
    else
      echo "已取消"
    fi
    ;;

  4)
    echo "【详细资源占用】"
    echo ""
    echo "=== 镜像 ==="
    docker images
    echo ""
    echo "=== 容器 ==="
    docker ps -a
    echo ""
    echo "=== 数据卷 ==="
    docker volume ls
    echo ""
    echo "=== 网络 ==="
    docker network ls
    echo ""
    echo "=== 磁盘占用 ==="
    docker system df -v
    ;;

  5)
    echo "退出"
    exit 0
    ;;

  *)
    echo -e "${RED}无效选项${NC}"
    exit 1
    ;;
esac

echo ""
echo "【清理后资源占用】"
docker system df
echo ""
echo -e "${GREEN}完成！${NC}"
