#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 备份目录
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  数据备份脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
echo -e "${YELLOW}正在备份数据库...${NC}"
docker-compose exec -T postgres pg_dump -U postgres diagnosis > "$BACKUP_DIR/database_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库备份成功: $BACKUP_DIR/database_$TIMESTAMP.sql${NC}"
else
    echo -e "${RED}✗ 数据库备份失败${NC}"
fi

# 备份 Redis
echo -e "${YELLOW}正在备份 Redis...${NC}"
docker-compose exec redis redis-cli -a redis_password SAVE > /dev/null 2>&1
docker cp diagnosis-redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis 备份成功: $BACKUP_DIR/redis_$TIMESTAMP.rdb${NC}"
else
    echo -e "${RED}✗ Redis 备份失败${NC}"
fi

# 压缩备份文件
echo -e "${YELLOW}正在压缩备份文件...${NC}"
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "database_$TIMESTAMP.sql" "redis_$TIMESTAMP.rdb" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 备份文件压缩成功: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
    # 删除原始文件
    rm -f "$BACKUP_DIR/database_$TIMESTAMP.sql" "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
else
    echo -e "${RED}✗ 备份文件压缩失败${NC}"
fi

# 清理旧备份（保留最近 7 天）
echo -e "${YELLOW}正在清理旧备份...${NC}"
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
echo -e "${GREEN}✓ 旧备份清理完成${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  备份完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "备份文件: ${GREEN}$BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
echo ""
