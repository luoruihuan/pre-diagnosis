#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  数据恢复脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查备份目录
BACKUP_DIR="./backups"
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}错误: 备份目录不存在${NC}"
    exit 1
fi

# 列出可用的备份文件
echo -e "${YELLOW}可用的备份文件：${NC}"
ls -lh $BACKUP_DIR/backup_*.tar.gz 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 没有找到备份文件${NC}"
    exit 1
fi

echo ""
read -p "请输入要恢复的备份文件名（例如：backup_20260519_120000.tar.gz）: " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo -e "${RED}错误: 备份文件不存在${NC}"
    exit 1
fi

# 确认恢复操作
echo ""
echo -e "${RED}警告: 此操作将覆盖当前数据库和 Redis 数据！${NC}"
read -p "确定要继续吗？(yes/no) " -r
echo ""
if [[ ! $REPLY == "yes" ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

# 解压备份文件
echo -e "${YELLOW}正在解压备份文件...${NC}"
TEMP_DIR="$BACKUP_DIR/temp_restore"
mkdir -p $TEMP_DIR
tar -xzf "$BACKUP_DIR/$BACKUP_FILE" -C $TEMP_DIR

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 备份文件解压失败${NC}"
    rm -rf $TEMP_DIR
    exit 1
fi

echo -e "${GREEN}✓ 备份文件解压成功${NC}"

# 恢复数据库
echo -e "${YELLOW}正在恢复数据库...${NC}"
DB_FILE=$(ls $TEMP_DIR/database_*.sql 2>/dev/null | head -n 1)

if [ -f "$DB_FILE" ]; then
    docker-compose exec -T postgres psql -U postgres diagnosis < "$DB_FILE"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 数据库恢复成功${NC}"
    else
        echo -e "${RED}✗ 数据库恢复失败${NC}"
    fi
else
    echo -e "${RED}✗ 未找到数据库备份文件${NC}"
fi

# 恢复 Redis
echo -e "${YELLOW}正在恢复 Redis...${NC}"
REDIS_FILE=$(ls $TEMP_DIR/redis_*.rdb 2>/dev/null | head -n 1)

if [ -f "$REDIS_FILE" ]; then
    # 停止 Redis
    docker-compose stop redis

    # 复制备份文件
    docker cp "$REDIS_FILE" diagnosis-redis:/data/dump.rdb

    # 启动 Redis
    docker-compose start redis

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Redis 恢复成功${NC}"
    else
        echo -e "${RED}✗ Redis 恢复失败${NC}"
    fi
else
    echo -e "${RED}✗ 未找到 Redis 备份文件${NC}"
fi

# 清理临时文件
rm -rf $TEMP_DIR

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  恢复完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "请重启服务以确保数据生效："
echo -e "  ${YELLOW}docker-compose restart${NC}"
echo ""
