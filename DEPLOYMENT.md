# 生产环境部署指南

## 📋 部署概览

**域名**: luoruihuan.top  
**服务器**: 2GB 内存云服务器  
**架构**: Docker Compose + Nginx + NestJS + PostgreSQL + Redis

---

## 🚀 完整部署流程

### **第一步：清理服务器**

在服务器上执行：

```bash
cd /root/Lark
bash cleanup-server.sh
```

这个脚本会停止：
- openclaw (Node.js AI 工具)
- hermes-gateway (AI Agent)
- lighthouse-chromium (Chromium 浏览器)
- chrome-devtools-mcp
- nginx
- PHP 服务
- geo-system 相关容器

**预计释放内存**: ~900MB

---

### **第二步：配置域名解析**

在你的域名服务商（阿里云/腾讯云/Cloudflare）配置 DNS：

```
类型    主机记录    记录值
A       @          你的服务器IP
A       www        你的服务器IP
```

**验证解析是否生效**：

```bash
# 在本地或服务器执行
dig +short luoruihuan.top
ping luoruihuan.top
```

---

### **第三步：配置环境变量**

编辑 `docker-compose.2gb.yml`：

```bash
cd /root/Lark
vi docker-compose.2gb.yml
```

找到第 89-93 行，修改：

```yaml
# 巨量引擎 API 配置
OCEAN_ENGINE_BASE_URL: https://api.oceanengine.com
OCEAN_ENGINE_APP_ID: 你的实际APP_ID
OCEAN_ENGINE_APP_SECRET: 你的实际APP_SECRET
OCEAN_ENGINE_WEBHOOK_SECRET: 你的实际WEBHOOK_SECRET
```

---

### **第四步：部署应用（HTTP 模式）**

```bash
cd /root/Lark
bash deploy-production.sh
```

这个脚本会：
1. 检查环境变量配置
2. 创建必要的文件
3. 停止旧容器
4. 构建并启动服务（HTTP 模式）
5. 等待服务就绪
6. 显示部署状态和内存使用
7. 执行健康检查

**部署完成后，可以通过 IP 访问**：
- 前端: `http://你的服务器IP`
- 后端: `http://你的服务器IP:3000`

---

### **第五步：配置 HTTPS**

**等待 DNS 生效后**（通常 5-10 分钟），执行：

```bash
cd /root/Lark
bash setup-ssl.sh
```

这个脚本会：
1. 检查域名解析
2. 安装 Certbot
3. 申请 Let's Encrypt SSL 证书
4. 切换到 HTTPS 配置
5. 配置证书自动续期（每天凌晨 2 点）

**配置完成后，可以通过域名访问**：
- 前端: `https://luoruihuan.top`
- 后端 API: `https://luoruihuan.top/api`
- Webhook: `https://luoruihuan.top/webhook`

---

## 📁 项目文件说明

| 文件 | 说明 |
|------|------|
| `cleanup-server.sh` | 清理服务器现有服务 |
| `deploy-production.sh` | 部署应用（HTTP 模式） |
| `setup-ssl.sh` | 配置 HTTPS 和 SSL 证书 |
| `docker-compose.2gb.yml` | Docker Compose 配置（2GB 内存优化） |
| `public/nginx.conf` | Nginx 配置（支持 HTTPS） |

---

## 🔍 常用管理命令

### **查看服务状态**
```bash
cd /root/Lark
docker-compose -f docker-compose.2gb.yml ps
```

### **查看日志**
```bash
# 查看所有服务日志
docker-compose -f docker-compose.2gb.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.2gb.yml logs -f server
docker-compose -f docker-compose.2gb.yml logs -f web
```

### **重启服务**
```bash
# 重启所有服务
docker-compose -f docker-compose.2gb.yml restart

# 重启特定服务
docker-compose -f docker-compose.2gb.yml restart server
```

### **停止服务**
```bash
docker-compose -f docker-compose.2gb.yml down
```

### **查看内存使用**
```bash
docker stats --no-stream
free ## **进入容器**
```bash
# 进入后端容器
docker exec -it diagnosis-server sh

# 进入数据库
docker exec -it diagnosis-postgres psql -U postgres -d diagnosis

# 查看数据库表
docker exec -it diagnosis-postgres psql -U postgres -d diagnosis -c "\dt"
```

---

## 🔧 故障排查

### **1. 端口被占用**
```bash
# 查看端口占用
netstat -tulnp | grep :80
netstat -tulnp | grep :443

# 停止占用端口的服务
systemctl stop nginx
```

### **2. 容器启动失败**
```bash
# 查看容器日志
docker-compose -f docker-compose.2gb.yml logs server

# 查看容器状态
docker-compose -f docker-compose.2gb.yml ps
```

### **3. 内存不足**
```bash
# 查看内存使用
free -h
docker stats --no-stream

# 清理 Docker 缓存
docker system prune -a
```

### **4. SSL 证书申请失败**
```bash
# 检查域名解析
dig +short luoruihuan.top

# 检查 80 端口是否可访问
curl http://luoruihuan.top

# 检查防火墙
ufw status
```

### **5. 数据库连接失败**
```bash
# 检查数据库状态
docker exec diagnosis-postgres pg_isready -U postgres

# 查看数据库日志
docker-compose -f docker-compose.2gb.yml logs postgres
```

---

## 📊 内存使用预估

| 服务 | 内存限制 | 预留内存 |
|------|---------|---------|
| PostgreSQL | 512MB | 256MB |
| Redis | 256MB | 128MB |
| 后端 (NestJS) | 768MB | 512MB |
| 前端 (Nginx) | 256MB | 128MB |
| **总计** | **1.8GB** | **1GB** |

**服务器总内存**: 1.9GB  
**清理后可用**: ~970MB  
**结论**: 可以运行，但会比较紧张

---

## ⚠️ 重要提示

1. **定期备份数据库**
   ```bash
   docker exec diagnosis-postgres pg_dump -U postgres diagnosis > backup.sql
   ```

2. **监控内存使用**
   ```bash
   watch -n 5 'free -h && docker stats --no-stream'
   ```

3. **SSL 证书有效期 90 天**，已配置自动续期

4. **建议升级到 4GB 内存**以获得更好的性能和稳定性

---

## 🎯 快速命令参考

```bash
# 一键部署（从头开始）
cd /root/Lark
bash cleanup-server.sh
bash deploy-production.sh
bash setup-ssl.sh

# 重启服务
docker-compose -f docker-compose.2gb.yml restart

# 查看日志
docker-compose -f docker-compose.2gb.yml logs -f

# 查看状态
docker-compose -f docker-compose.2gb.yml ps
docker stats --no-stream

# 停止服务
docker-compose -f docker-compose.2gb.yml down
```

---

## 📞 访问地址

部署完成后：

- **前端**: https://luoruihuan.top
- **API**: https://luoruihuan.top/api
- **Webhook**: https://luoruihuan.top/webhook
- **API 文档**: https://luoruihuan.top/api/docs

---

## 🔄 更新部署

当代码更新后：

```bash
cd /root/Lark

# 拉取最新代码
git pull

# 重新构建并部署
docker-compose -f docker-compose.2gb.yml up -d --build

# 查看日志确认
docker-compose -f docker-compose.2gb.yml logs -f
```
