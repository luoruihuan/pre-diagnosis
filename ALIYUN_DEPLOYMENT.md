# 阿里云部署完整方案

## 📊 服务器配置评估

### 您的配置
- **CPU**: 2 核
- **内存**: 2GB
- **硬盘**: 50GB
- **云服务商**: 阿里云

### 配置评估结果

#### ✅ 可以运行，但需要优化

| 服务 | 推荐配置 | 实际占用 | 评估 |
|------|---------|---------|------|
| PostgreSQL | 512MB | ~300MB | ✅ 可以 |
| Redis | 256MB | ~50MB | ✅ 可以 |
| NestJS 后端 | 512MB | ~200MB | ✅ 可以 |
| Nginx 前端 | 128MB | ~20MB | ✅ 可以 |
| 系统开销 | 512MB | ~400MB | ⚠️ 紧张 |
| **总计** | **~2GB** | **~1GB** | ⚠️ 刚好够用 |

#### ⚠️ 注意事项

1. **内存紧张**：2GB 内存刚好够用，建议：
   - 配置 Swap 交换空间（2GB）
   - 限制 Docker 容器内存使用
   - 监控内存使用情况

2. **硬盘空间**：50GB 足够，分配建议：
   - 系统：10GB
   - Docker 镜像：10GB
   - 数据库数据：15GB
   - 日志和备份：10GB
   - 预留空间：5GB

3. **性能优化**：
   - 使用 Redis 缓存减少数据库压力
   - 前端静态资源使用 CDN
   - 数据库定期清理旧数据

#### 💡 升级建议

如果预算允许，建议升级到：
- **推荐配置**：4 核 4GB 内存 100GB 硬盘
- **最低配置**：2 核 4GB 内存 50GB 硬盘（仅升级内存）

---

## 🚀 完整部署流程

### 阶段一：购买和配置服务器（30 分钟）

#### 1. 购买阿里云 ECS 实例

1. 登录阿里云控制台：https://ecs.console.aliyun.com
2. 点击「创建实例」
3. 选择配置：
   - **地域**：选择离用户最近的地域（如华东、华北）
   - **实例规格**：2 核 2GB（ecs.t6-c1m2.large 或类似）
   - **镜像**：Ubuntu 22.04 LTS 或 CentOS 8
   - **存储**：50GB 高效云盘
   - **网络**：专有网络 VPC
   - **公网 IP**：分配公网 IPv4 地址
   - **带宽**：按使用流量计费，峰值 5Mbps
   - **安全组**：创建新安全组

4. 设置实例信息：
   - **实例名称**：diagnosis-server
   - **登录凭证**：设置密码或密钥对

5. 确认订单并支付

#### 2. 配置安全组规则

在 ECS 控制台 → 网络与安全 → 安全组，添加以下规则：

| 规则方向 | 端口范围 | 授权对象 | 说明 |
|---------|---------|---------|------|
| 入方向 | 22 | 0.0.0.0/0 | SSH 登录 |
| 入方向 | 80 | 0.0.0.0/0 | HTTP |
| 入方向 | 443 | 0.0.0.0/0 | HTTPS |
| 入方向 | 3000 | 0.0.0.0/0 | 后端 API（可选，调试用） |

⚠️ **安全建议**：
- SSH 端口建议改为非标准端口（如 2222）
- 限制 SSH 访问 IP（如仅允许公司 IP）
- 生产环境不要暴露 3000 端口

#### 3. 购买和配置域名

##### 3.1 购买域名

1. 登录阿里云域名服务：https://wanwang.aliyun.com
2. 搜索并购买域名（如 `diagnosis.com`）
3. 完成实名认证（1-3 个工作日）

##### 3.2 域名备案（必须）

⚠️ **重要**：在中国大陆使用域名必须完成 ICP 备案

1. 登录阿里云备案系统：https://beian.aliyun.com
2. 填写备案信息：
   - 主体信息（个人或企业）
   - 网站信息
   - 上传资料
3. 等待审核（7-20 个工作日）

💡 **临时方案**：备案期间可以使用 IP 地址访问

##### 3.3 配置 DNS 解析

1. 登录阿里云 DNS 控制台：https://dns.console.aliyun.com
2. 添加解析记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|---------|---------|--------|------|
| A | @ | 服务器公网 IP | 主域名 |
| A | www | 服务器公网 IP | www 子域名 |
| A | api | 服务器公网 IP | API 子域名（可选） |

示例：
- `diagnosis.com` → 服务器 IP
- `www.diagnosis.com` → 服务器 IP
- `api.diagnosis.com` → 服务器 IP

---

### 阶段二：服务器初始化（20 分钟）

#### 1. 连接到服务器

```bash
# 使用 SSH 连接（替换为您的服务器 IP）
ssh root@your_server_ip

# 如果使用密钥对
ssh -i /path/to/your-key.pem root@your_server_ip
```

#### 2. 更新系统

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y
```

#### 3. 安装必要软件

```bash
# 安装基础工具
apt install -y curl wget vim git htop

# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证 Docker 安装
docker --version

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证 Docker Compose 安装
docker-compose --version
```

#### 4. 配置 Swap 交换空间（重要！）

```bash
# 创建 2GB Swap 文件
fallocate -l 2G /swapfile

# 设置权限
chmod 600 /swapfile

# 创建 Swap
mkswap /swapfile

# 启用 Swap
swapon /swapfile

# 永久启用（添加到 /etc/fstab）
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 验证 Swap
free -h
```

#### 5. 配置防火墙

```bash
# Ubuntu (UFW)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# CentOS (Firewalld)
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

#### 6. 创建部署目录

```bash
# 创建项-p /opt/diagnosis
cd /opt/diagnosis
```

---

### 阶段三：部署项目（30 分钟）

#### 1. 上传项目文件

**方式一：使用 Git（推荐）**

```bash
# 如果项目已上传到 Git 仓库
cd /opt/diagnosis
git clone https://github.com/your-username/diagnosis-system.git .
```

**方式二：使用 SCP 上传**

```bash
# 在本地电脑执行（替换为您的服务器 IP）
cd /Users/ronluo/Desktop/h5/Lark
scp -r * root@your_server_ip:/opt/diagnosis/
```

**方式三：使用 SFTP 工具**
- 使用 FileZilla、WinSCP 等工具
- 连接到服务器
- 上传整个项目目录到 `/opt/diagnosis/`

#### 2. 配置环境变量

```bash
cd /opt/diagnosis

# 编辑 docker-compose.yml
vim docker-compose.yml

# 修改以下环境变量：
# 1. OCEAN_ENGINE_APP_ID（巨量引擎 APP ID）
# 2. OCEAN_ENGINE_APP_SECRET（巨量引擎 APP SECRET）
# 3. OCEAN_ENGINE_WEBHOOK_SECRET（Webhook 密钥）
# 4. POSTGRES_PASSWORD（数据库密码，建议修改）
# 5. REDIS_PASSWORD（Redis 密码，建议修改）
```

#### 3. 优化 Docker Compose 配置（针对 2GB 内存）

编辑 `docker-compose.yml`，添加资源限制：

```yaml
version: '3.8'

services:
  postgres:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  redis:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

  server:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 768M
        reservations:
          cpus: '0.5'
          memory: 512M

  web:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
```

#### 4. 执行部署

```bash
# 给脚本添加执行权限
chmod +x deploy.sh start.sh backup.sh restore.sh

# 执行部署
./deploy.sh

# 或手动部署
docker-compose build
docker-compose up -d
```

#### 5. 验证部署

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查服务健康状态
curl http://localhost:3000/api/health
curl http://localhost
```

---

### 阶段四：配置域名和 HTTPS（40 分钟）

#### 1. 配置 Nginx 支持域名

创建新的 Nginx 配置文件：

```bash
# 创建配置文件
vim /opt/diagnosis/public/nginx-production.conf
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name diagnosis.com www.diagnosis.com;

    # 临时重定向到 HTTPS（等 SSL 证书配置好后启用）
    # return 301 https://$server_name$request_uri;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook 代理到后端
    location /webhook {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 2. 更新前端 Dockerfile

编辑 `public/Dockerfile`，使用新的 Nginx 配置：

```dockerfile
# ... 前面的构建阶段不变

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制生产环境 Nginx 配置
COPY nginx-production.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 3. 重新构建和部署

```bash
cd /opt/diagnosis

# 重新构建前端
docker-compose build web

# 重启前端服务
docker-compose up -d web
```

#### 4. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
apt install -y certbot

# 停止 Nginx 容器（临时）
docker-compose stop web

# 申请 SSL 证书
certbot certonly --standalone -d diagnosis.com -d www.diagnosis.com

# 证书文件位置：
# /etc/letsencrypt/live/diagnosis.com/fullchain.pem
# /etc/letsencrypt/live/diagnosis.com/privkey.pem
```

#### 5. 配置 Nginx 支持 HTTPS

更新 `nginx-production.conf`：

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name diagnosis.com www.diagnosis.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name diagnosis.com www.diagnosis.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/diagnosis.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/diagnosis.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /usr/share/nginx/html;
    index index.html;

    # ... 其他配置与上面相同
}
```

#### 6. 挂载 SSL 证书到容器

编辑 `docker-compose.yml`，为 web 服务添加卷挂载：

```yaml
web:
  # ... 其他配置
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "80:80"
    - "443:443"  # 添加 HTTPS 端口
```

#### 7. 重启服务

```bash
# 重新构建并启动
docker-compose up -d --build web

# 验证 HTTPS
curl https://diagnosis.com
```

#### 8. 配置证书自动续期

```bash
# 创建续期脚本
cat > /opt/diagnosis/renew-cert.sh << 'EOF'
#!/bin/bash
docker-compose stop web
certbot renew
docker-compose start web
EOF

# 添加执行权限
chmod +x /opt/diagnosis/renew-cert.sh

# 添加到 crontab（每月 1 号凌晨 2 点执行）
crontab -e

# 添加以下行：
0 2 1 * * /opt/diagnosis/renew-cert.sh >> /var/log/cert-renew.log 2>&1
```

---

### 阶段五：监控和维护（持续）

#### 1. 配置自动备份

```bash
# 创建备份目录
mkdir -p /opt/backups

# 编辑 crontab
crontab -e

# 添加每天凌晨 3 点自动备份
0 3 * * * cd /opt/diagnosis && ./backup.sh >> /var/log/backup.log 2>&1

# 添加每周日清理旧备份（保留最近 30 天）
0 4 * * 0 find /opt/diagnosis/backups -name "backup_*.tar.gz" -mtime +30 -delete
```

#### 2. 配置日志轮转

```bash
# 创建日志轮转配置
cat > /etc/logrotate.d/diagnosis << 'EOF'
/opt/diagnosis/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
```

#### 3. 监控脚本

创建监控脚本 `/opt/diagnosis/monitor.sh`：

```bash
#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  系统监控报告${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. 系统资源
echo -e "${YELLOW}1. 系统资源使用情况${NC}"
echo "CPU 使用率："
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1"%"}'

echo "内存使用情况："
free -h | grep Mem | awk '{print "已用: "$3" / 总计: "$2" ("$3/$2*100"%)"}'

echo "磁盘使用情况："
df -h / | tail -1 | awk '{print "已用: "$3" / 总计: "$2" ("$5")"}'

echo "Swap 使用情况："
free -h | grep Swap | awk '{print "已用: "$3" / 总计: "$2}'

echo ""

# 2. Docker 容器状态
echo -e "${YELLOW}2. Docker 容器状态${NC}"
cd /opt/diagnosis
docker-compose ps

echo ""

# 3. 服务健康检查
echo -e "${YELLOW}3. 服务健康检查${NC}"

# 检查前端
if curl -s http://localhost > /dev/null; then
    echo -e "前端服务: ${GREEN}✓ 正常${NC}"
else
    echo -e "前端服务: ${RED}✗ 异常${NC}"
fi

# 检查后端
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "后端服务: ${GREEN}✓ 正常${NC}"
else
    echo -e "后端服务: ${RED}✗ 异常${NC}"
fi

# 检查数据库
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "数据库: ${GREEN}✓ 正常${NC}"
else
    echo -e "数据库: ${RED}✗ 异常${NC}"
fi

# 检查 Redis
if docker-compose exec -T redis redis-cli -a redis_password ping > /dev/null 2>&1; then
    echo -e "Redis: ${GREEN}✓ 正常${NC}"
else
    echo -e "Redis: ${RED}✗ 异常${NC}"
fi

echo ""

# 4. 最近的错误日志
echo -e "${YELLOW}4. 最近的错误日志（最近 10 条）${NC}"
docker-compose logs --tail=10 | grep -i error || echo "无错误日志"

echo ""
echo -e "${GREEN}========================================${NC}"
```

```bash
# 添加执行权限
chmod +x /opt/diagnosis/monitor.sh

# 添加到 crontab（每小时执行一次）
crontab添加以下行：
0 * * * * /opt/diagnosis/monitor.sh >> /var/log/monitor.log 2>&1
```

#### 4. 配置告警（可选）

如果需要故障告警，可以使用阿里云云监控：

1. 登录阿里云云监控控制台
2. 添加 ECS 实例监控
3. 配置告警规则：
   - CPU 使用率 > 80%
   - 内存使用率 > 85%
   - 磁盘使用率 > 80%
4. 配置通知方式（短信、邮件、钉钉）

---

## 📋 部署检查清单

### 服务器配置
- [ ] 购买阿里云 ECS 实例（2C2G 50G）
- [ ] 配置安全组规则（22, 80, 443）
- [ ] 配置 Swap 交换空间（2GB）
- [ ] 安装 Docker 和 Docker Compose
- [ ] 配置防火墙

### 域名配置
- [ ] 购买域名
- [ ] 完成域名实名认证
- [ ] 提交 ICP 备案（等待审核）
- [ ] 配置 DNS 解析（A 记录）

### 项目部署
- [ ] 上传项目文件到服务器
- [ ] 配置环境变量（巨量引擎 API）
- [ ] 配置资源限制（针对 2GB 内存）
- [ ] 执行部署脚本
- [ ] 验证服务运行状态

### HTTPS 配置
- [ ] 申请 SSL 证书（Let's Encrypt）
- [ ] 配置 Nginx 支持 HTTPS
- [ ] 配置 HTTP 重定向到 HTTPS
- [ ] 配置证书自动续期

### 监控和维护
- [ ] 配置自动备份（每天凌晨 3 点）
- [ ] 配置日志轮转
- [ ] 配置监控脚本（每小时）
- [ ] 配置云监控告警（可选）

---

## 🔧 常见问题

### 1. 内存不足

**现象**：服务频繁重启，OOM (Out of Memory) 错误

**解决方案**：
```bash
# 1. 检查内存使用
free -h
docker stats

# 2. 增加 Swap
fallocate -l 4G /swapfile2
chmod 600 /swapfile2
mkswap /swapfile2
swapon /swapfile2

# 3. 限制容器内存
# 编辑 docker-compose.yml，添加 memory 限制

# 4. 清理 Docker 缓存
docker system prune -a
```

### 2. 磁盘空间不足

**现象**：磁盘使用率 > 90%

**解决方案**：
```bash
# 1. 检查磁盘使用
df -h
du -sh /opt/diagnosis/*

# 2. 清理 Docker
docker system prune -a --volumes

# 3. 清理日志
find /var/log -name "*.log" -mtime +7 -delete

# 4. 清理旧备份
find /opt/diagnosis/backups -name "*.tar.gz" -mtime +30 -delete
```

### 3. 服务无法访问

**现象**：无法通过域名或 IP 访问

**解决方案**：
```bash
# 1. 检查服务状态
docker-compose ps

# 2. 检查端口监听
netstat -tlnp | grep -E '80|443|3000'

# 3. 检查防火墙
ufw status
iptables -L

# 4. 检查安全组规则
# 登录阿里云控制台检查

# 5. 检查 DNS 解析
ping diagnosis.com
nslookup diagnosis.com
```

### 4. SSL 证书问题

**现象**：HTTPS 无法访问，证书错误

**解决方案**：
```bash
# 1. 检查证书文件
ls -la /etc/letsencrypt/live/diagnosis.com/

# 2. 测试证书
openssl s_client -connect diagnosis.com:443

# 3. 手动续期证书
certbot renew --force-renewal

# 4. 重启 Nginx
docker-compose restart web
```

---

## 💰 成本估算

### 阿里云 ECS（按量付费）
- **实例费用**：约 ¥0.15/小时 × 24 × 30 = ¥108/月
- **公网带宽**：按流量计费，约 ¥0.8/GB，预计 ¥50/月
- **云盘**：50GB 高效云盘，约 ¥7.5/月
- **快照备份**：可选，约 ¥10/月

### 域名费用
- **.com 域名**：约 ¥55-80/年
- **.cn 域名**：约 ¥29/年

### SSL 证书
- **Let's Encrypt**：免费

### 总计
- **首年成本**：约 ¥2000-2500（含域名、服务器、带宽）
- **续费成本**：约 ¥2000/年

### 节省成本建议
1. 购买包年包月实例（比按量付费便宜 30%）
2. 使用阿里云 CDN 减少带宽费用
3. 定期清理不必要的快照和备份

---

## 📞 技术支持

### 阿里云支持
- **工单系统**：https://workorder.console.aliyun.com
- **客服电话**：95187
- **文档中心**：https://help.aliyun.com

### 项目文档
- 项目总结：`PROJECT_SUMMARY.md`
- Docker 部署：`DOCKER_DEPLOYMENT.md`
- 快速开始：`DOCKER_QUICK_START.md`

---

**阿里云部署方案已完成，祝您部署顺利！** 🚀
