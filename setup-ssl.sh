#!/bin/bash

set -e

echo "=========================================="
echo "  配置 HTTPS (Let's Encrypt)"
echo "  域名: luoruihuan.top"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查域名解析
echo "【1】检查域名解析..."
DOMAIN="luoruihuan.top"
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "  服务器 IP: $SERVER_IP"
echo "  正在查询域名解析..."

DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}✗ 域名未解析${NC}"
    echo ""
    echo "请先配置 DNS 记录："
    echo "  A    luoruihuan.top    -> $SERVER_IP"
    echo "  A    www.luoruihuan.top -> $SERVER_IP"
    exit 1
fi

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠ 域名解析不匹配${NC}"
    echo "  域名指向: $DOMAIN_IP"
    echo "  服务器 IP: $SERVER_IP"
    echo ""
    read -p "是否继续？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 域名解析正确${NC}"
fi
echo ""

# 2. 安装 Certbot
echo "【2】安装 Certbot..."
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y certbot
    echo -e "${GREEN}✓ Certbot 已安装${NC}"
else
    echo -e "${GREEN}✓ Certbot 已存在${NC}"
fi
echo ""

# 3. 申请 SSL 证书
echo "【3】申请 SSL 证书..."
echo "  这可能需要几分钟..."

# 使用 webroot 模式申请证书
certbot certonly --webroot \
    -w /var/www/certbot \
    -d luoruihuan.top \
    -d www.luoruihuan.top \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL 证书申请成功${NC}"
else
    echo -e "${RED}✗ SSL 证书申请失败${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. 域名解析未生效"
    echo "  2. 80 端口无法访问"
    echo "  3. 防火墙阻止了访问"
    echo ""
    echo "请检查后重试"
    exit 1
fi
echo ""

# 4. 切换到 HTTPS 配置
echo "【4】切换到 HTTPS 配置..."

cd /root/Lark

# 恢复 HTTPS 配置
if [ -f "public/nginx.conf.https" ]; then
    mv public/nginx.conf public/nginx.conf.http.bak
    mv public/nginx.conf.https public/nginx.conf
    echo -e "${GREEN}✓ 已切换到 HTTPS 配置${NC}"
fi

# 重新构建前端容器
docker-compose -f docker-compose.2gb.yml up -d --build web

echo -e "${GREEN}✓ 配置已更新${NC}"
echo ""

# 5. 配置证书自动续期
echo "【5】配置证书自动续期..."

# 创建续期脚本
cat > /usr/local/bin/renew-cert.sh <<'EOF'
#!/bin/bash
certbot renew --quiet
docker-compose -f /root/Lark/docker-compose.2gb.yml restart web
EOF

chmod +x /usr/local/bin/renew-cert.sh

# 添加 cron 任务（每天凌晨 2 点检查）
if ! crontab -l 2>/dev/null | grep -q "renew-cert.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/renew-cert.sh") | crontab -
    echo -e "${GREEN}✓ 已配置自动续期${NC}"
else
    echo -e "${GREEN}✓ 自动续期已存在${NC}"
fi
echo ""

# 6. 测试 HTTPS
echo "【6】测试 HTTPS..."
sleep 5

if curl -s https://luoruihuan.top > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS 访问正常${NC}"
else
    echo -e "${YELLOW}⚠ HTTPS 访问失败，请检查配置${NC}"
fi
echo ""

echo "=========================================="
echo "  HTTPS 配置完成"
echo "=========================================="
echo ""
echo "访问地址："
echo "  https://luoruihuan.top"
echo "  https://www.luoruihuan.top"
echo ""
echo "API 地址："
echo "  https://luoruihuan.top/api"
echo ""
echo "Webhook 地址："
echo "  https://luop/webhook"
echo ""
echo "证书信息："
certbot certificates
echo ""
