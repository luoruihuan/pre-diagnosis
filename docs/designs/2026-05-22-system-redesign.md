# 视频前测诊断平台 — 系统重设计文档

## 背景

原系统模块划分（数据统计、素材管理、前测诊断、配置管理）与实际业务流程不匹配：
- 素材不需要存储视频文件，只需登记 video_id 记录
- 两条前测路径（新素材 vs 已有素材）需要独立入口
- 缺少用户登录鉴权，任何人可访问
- 前测结果展示不够直观，优质/非优质/首发标签不突出

## 目标

1. 重构为四模块：新素材检测、已有素材检测、数据统计、基础数据
2. 接入 JWT 登录鉴权，替换现有 API Key 机制
3. 前测结果用醒目 Tag 展示三个维度
4. 完整对接巨量引擎前测 API（创建任务、查询结果、Webhook 回调）

---

## 一、系统模块规划

### 导航结构

```
视频前测诊断平台
├── 新素材检测        ← 路径一：手动填写 video_id，发起前测
├── 已有素材检测      ← 路径二：从方舟/即创素材库拉取，批量前测
├── 数据统计          ← 任务总览 + 质量分布 + 广告主维度 + 趋势图
└── 基础数据
    ├── 广告主账号管理
    ├── 诊断配置模板
    └── 系统配置
```

---

## 二、各模块详细设计

### 2.1 新素材检测（路径一）

**用户流程：**
1. 填写表单：广告主ID、视频ID（v开头字符串）、视频URL、标题（选填）、ref_ad_id 或 ref_promotion_id
2. 点击"发起前测"→ 系统调用巨量创建前测任务接口
3. 页面轮询或等待 Webhook 回调（10s~1min）
4. 结果以 Tag 形式展示

**表单字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| advertiser_id | number | ✅ | 广告主ID，可从广告主账号管理选择 |
| video_ids | string[] | ✅ | 视频ID列表，v开头，支持批量（≤100） |
| video_url | string | ✅ | 视频地址（用于本地登记） |
| title | string | ❌ | 素材标题 |
| ref_ad_id | number | 二选一 | 复用1.0广告ID的投放设置 |
| ref_promotion_id | number | 二选一 | 复用2.0广告ID的投放设置 |

**本地素材登记：** 提交时同步写入 materials 表（不存文件，只存元数据）

---

### 2.2 已有素材检测（路径二）

**用户流程：**
1. 填写过滤条件，从方舟/即创素材库拉取视频列表
2. 表格展示视频列表，勾选要前测的视频（支持全选，≤100条）
3. 填写 ref_ad_id 或 ref_promotion_id
4. 点击"批量发起前测"
5. 跳转到任务列表查看进度

**过滤条件：**

| 字段 | 类型 | 说明 |
|------|------|------|
| agent_id | number | 代理商ID（必填） |
| video_ids | string[] | 按视频ID过滤（与material_ids/signatures三选一） |
| material_ids | number[] | 按素材ID过滤 |
| signatures | string[] | 按MD5过滤 |
| start_time / end_time | string | 上传时间范围，格式 yyyy-mm-dd |
| source | string[] | 素材来源枚举 |
| page / page_size | number | 分页，默认20 |

**视频列表表格列：**
- 视频ID、视频预览（URL链接）、上传时间、操作（勾选）

---

### 2.3 前测任务列表（两个模块共用）

两个模块都有独立的任务列表页，展示本模块发起的任务。

**列表列：**

| 列 | 说明 |
|---|---|
| 任务ID | ocean_task_id |
| 视频ID | video_id |
| 广告主ID | advertiser_id |
| 任务状态 | PENDING / SUCCESS / FAILED（带颜色） |
| AD优质 | Tag：✅优质 / ❌非优质 / ⚪未知 |
| 千川优质 | Tag：✅优质 / ❌非优质 / ⚪未知 |
| 首发 | Tag：✅首发 / ❌非首发 / ⚪未知 |
| 非优原因 | 展开显示 not_ad/ecp_high_quality_reason |
| 创建时间 | created_at |
| 完成时间 | completed_at |

**Tag 样式规范：**
```
AD优质    → 绿色实心 Tag "AD优质"
AD非优质  → 红色实心 Tag "AD非优质"
千川优质  → 绿色实心 Tag "千川优质"
千川非优质→ 红色实心 Tag "千川非优质"
首发      → 蓝色实心 Tag "首发"
非首发    → 橙色实心 Tag "非首发"
UNKNOWN   → 灰色 Tag "未知"
```

**筛选条件：** 状态、广告主ID、时间范围、结果类型（优质/非优质/首发/非首发）

---

### 2.4 数据统计

**子模块：**

#### 任务总览（卡片）
- 今日创建任务数
- 本月创建任务数
- 总成功率（SUCCESS / 总数）
- 待处理任务数（PENDING）

#### 素材质量分布（饼图 + 数字）
- AD优质 / AD非优质 / 未知 占比
- 千川优质 / 千川非优质 / 未知 占比
- 首发 / 非首发 / 未知 占比
- 支持时间范围筛选

#### 广告主维度（表格）
- 按 advertiser_id 分组
- 列：广告主ID、总任务数、AD优质数、千川优质数、首发数、优质率

#### 趋势图（折线图）
- X轴：按天/周
- Y轴：任务数量、优质率
- 支持时间范围切换

---

### 2.5 基础数据

#### 广告主账号管理
| 字段 | 说明 |
|------|------|
| agent_id | 代理商ID |
| advertiser_id | 广告主ID |
| name | 备注名称 |
| is_active | 是否启用 |

作用：创建前测任务时，advertiser_id 可从下拉列表选择，无需手填。

#### 诊断配置模板
存储常用的 diagnose_config 配置，字段对应巨量接口：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 模板名称 |
| platform | string | QIANCHUAN / AD |
| external_action | string | 推广转化目标枚举 |
| audience_gender | string | ALL / MALE / FEMALE |
| audience_age | string[] | 年龄段 |
| audience_region | number[] | 地区code |
| pricing_type | string | OCPC / CPA / OCPM |
| cpa_bid | number | 目标转化成本 |
| cus_name | string | 客户主体名称 |

> 注：当前主流程用 ref_ad_id 复用广告设置，此模板作为备用手动配置方式。

#### 系统配置
| 字段 | 说明 |
|------|------|
| OCEAN_ENGINE_APP_ID | 巨量引擎应用ID |
| OCEAN_ENGINE_APP_SECRET | 应用密钥 |
| OCEAN_ENGINE_WEBHOOK_SECRET | Webhook 签名密钥 |
| OCEAN_ENGINE_BASE_URL | API 基础地址 |

前端展示时密钥字段脱敏（只显示前4位+****）。

---

## 三、用户登录鉴权设计

### 3.1 登录流程

```
前端 POST /auth/login { username, password }
  → 后端查 users 表，bcrypt 验证密码
  → 生成 JWT Token（payload: { sub: userId, username }，过期 8h）
  → 返回 { access_token, expires_in }
前端存 localStorage('access_token')
后续请求 Header: Authorization: Bearer <token>
后端 JwtAuthGuard 验证 Token
```

### 3.2 数据库 users 表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- bcrypt hash
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 初始化 seed：admin / Admin@2026
```

### 3.3 后端鉴权改造

- 新增 `AuthModule`（login 接口、JwtStrategy、JwtAuthGuard）
- 新增 `UsersModule`（users 表 CRUD）
- 全局注册 `JwtAuthGuard`，替换现有 `ApiKeyGuard`
- Webhook 端点保持 `@Public()` 装饰器，跳过鉴权
- `/auth/login` 端点标记 `@Public()`

### 3.4 前端鉴权改造

- 新增登录页 `/login`
- 路由守卫：未登录跳转 `/login`
- axios 拦截器：自动带 `Authorization: Bearer <token>`
- 401 响应：清除 token，跳转 `/login`

---

## 四、巨量引擎 API 对接

### 4.1 涉及接口清单

| 接口 | 方法 | 路径 | 用途 |
|------|------|------|------|
| 上传素材库 | POST | `/open_api/2/material/video/ad/upload/` | 路径一：获取 video_id（可选，用户也可直接填） |
| 创建前测任务 | POST | `/open_api/2/diagnosis_task/agent/create/` | 两条路径共用 |
| 查询任务结果（By任务ID） | GET | `/open_api/2/diagnosis_task/agent/get/` | 轮询查询 |
| 查询任务列表（By Agent） | GET | `/open_api/2/diagnosis_task/agent/list/` | 历史任务查询 |
| 获取方舟素材列表 | GET | `/open_api/2/ark/material/video/list/` | 路径二：拉取已有素材 |

### 4.2 创建前测任务关键参数

```typescript
// 必填
agent_id: number          // 代理商ID
video_ids: string[]       // 视频ID列表（≤100，v开头）
advertiser_id: number     // 广告主ID

// 二选一（投放设置来源）
ref_ad_id?: number        // 复用1.0广告ID设置
ref_promotion_id?: number // 复用2.0广告ID设置

// QPS限制：同一 advertiser_id + video_id 每天 ≤5 次
// 异步接口：执行时间 10s ~ 1min
```

### 4.3 前测结果字段映射

```typescript
// 查询结果 task_list 每条记录
{
  task_id: string
  video_id: string
  material_id: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  
  // 三个核心判断维度
  is_ad_high_quality_material: 'YES' | 'NO' | 'UNKNOWN'   // AD/本地推优质
  is_ecp_high_quality_material: 'YES' | 'NO' | 'UNKNOWN'  // 千川优质
  is_first_publish_material: 'YES' | 'NO' | 'UNKNOWN'     // 首发
  
  // 非优原因（status=SUCCESS 且 is_*=NO 时有值）
  not_ad_high_quality_reason: string[]
  not_ecp_high_quality_reason: string[]
}
```

### 4.4 轮询策略

- 创建任务后立即轮询一次
- 状态为 PENDING 时，每 10s 轮询一次
- 最多轮询 12 次（共 2min），超时标记 TIMEOUT
- 收到 Webhook 回调时停止轮询

---

## 五、Webhook 对接设计

### 5.1 巨量回调事件

| 事件标识 | 应用类型 | 说明 |
|---------|---------|------|
| `status.material.diagnose.agentad` | 巨量广告 | 前测完成回调 |
| `status.material.diagnose.agentqc` | 巨量千川 | 前测完成回调 |

### 5.2 回调消息格式

```typescript
{
  advertiser_id: number   // 广告主ID
  event: 'SUCCESS' | 'FAILED'
  data: {
    video_id: string      // 视频ID
    agent_id: number      // 代理商ID
    task_id: number       // 前测任务ID
    status: 'SUCCESS' | 'FAILED'
  }
}
```

### 5.3 Webhook 接收端点

- 路径：`POST /webhook/ocean-engine`（现有，保持不变）
- 验证：时间戳（5min内有效）+ HMAC-SHA256 签名 + requestId 去重（Redis 10min）
- 处理：通过 task_id 查本地任务 → 调用 `/diagnosis_task/agent/get/` 获取完整结果 → 更新本地任务状态和结果

### 5.4 Webhook 配置步骤（运维操作）

1. 登录巨量引擎开放平台开发者后台
2. 进入「事件订阅」→ 添加订阅
3. 事件选择：`status.material.diagnose.agentad`（巨量广告）或 `status.material.diagnose.agentqc`（千川）
4. 回调地址填：`https://luoruihuan.top/api/webhook/ocean-engine`
5. 记录平台生成的 Webhook Secret，填入系统配置

---

## 六、数据库改造

### 新增表

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 广告主账号表
CREATE TABLE advertiser_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id BIGINT NOT NULL,
  advertiser_id BIGINT NOT NULL,
  name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, advertiser_id)
);
```

### 现有表改造

**diagnosis_tasks 表新增字段：**
```sql
ALTER TABLE diagnosis_tasks ADD COLUMN source VARCHAR(20) DEFAULT 'NEW';
-- source: 'NEW'=新素材路径一, 'ARK'=已有素材路径二

ALTER TABLE diagnosis_tasks ADD COLUMN ocean_task_ids JSONB;
-- 批量提交时存多个 task_id 的映射 {video_id: task_id}

ALTER TABLE diagnosis_tasks ADD COLUMN ref_ad_id BIGINT;
ALTER TABLE diagnosis_tasks ADD COLUMN ref_promotion_id BIGINT;
```

**diagnosis_configs 表 config 字段结构规范化：**
```json
{
  "platform": "AD",
  "external_action": "DOWNLOAD",
  "audience_gender": "ALL",
  "audience_age": ["18-23", "24-30"],
  "audience_region": [],
  "pricing_type": "OCPM",
  "cpa_bid": 50,
  "cus_name": "客户名称"
}
```

---

## 七、前端路由重构

### 新路由结构

```
/login                          登录页（Public）
/                               → 重定向 /new-material
/new-material                   新素材检测 - 发起前测表单
/new-material/tasks             新素材检测 - 任务列表
/new-material/tasks/:id         新素材检测 - 任务详情
/ark-material                   已有素材检测 - 素材选择
/ark-material/tasks             已有素材检测 - 任务列表
/ark-material/tasks/:id         已有素材检测 - 任务详情
/statistics                     数据统计
/base/advertisers               基础数据 - 广告主账号
/base/configs                   基础数据 - 诊断配置模板
/base/system                    基础数据 - 系统配置
```

### 侧边栏菜单

```
📊 新素材检测
📦 已有素材检测
📈 数据统计
⚙️  基础数据
    ├── 广告主账号
    ├── 诊断配置模板
    └── 系统配置
```

---

## 八、后端模块改造清单

### 新增模块
- `AuthModule`：login 接口、JwtStrategy、JwtAuthGuard、UsersService
- `AdvertiserAccountModule`：广告主账号 CRUD
- `StatisticsModule`：数据统计聚合查询接口

### 改造模块
- `MaterialModule`：去掉 upload 接口，保留登记（POST）和列表查询
- `DiagnosisTaskModule`：新增 source 字段区分路径，新增批量创建支持
- `OceanEngineModule`：新增方舟素材列表接口调用
- `WebhookModule`：对齐巨量回调消息格式（task_id 字段）
- `AppModule`：全局 Guard 从 ApiKeyGuard 改为 JwtAuthGuard

### 删除
- `ApiKeyGuard`（替换为 JWT）
- 素材上传相关代码（`uploadMaterial` service/dto）

---

## 九、实施计划

### Phase 1：登录鉴权（优先，其他功能依赖）
1. 后端：users 表 + AuthModule（JWT）+ 替换 ApiKeyGuard
2. 前端：登录页 + 路由守卫 + axios 拦截器

### Phase 2：新素材检测（路径一核心流程）
1. 后端：改造 DiagnosisTaskModule，支持 ref_ad_id 参数
2. 前端：新素材检测表单页 + 任务列表页（带结果 Tag）

### Phase 3：已有素材检测（路径二）
1. 后端：OceanEngineModule 新增方舟素材列表接口
2. 前端：素材选择页（过滤 + 表格 + 批量勾选）+ 任务列表页

### Phase 4：基础数据
1. 后端：AdvertiserAccountModule + 系统配置接口
2. 前端：三个基础数据管理页

### Phase 5：数据统计
1. 后端：StatisticsModule 聚合查询
2. 前端：统计页（卡片 + 饼图 + 表格 + 折线图）

---

## 十、风险与注意事项

1. **QPS 限制**：同一 advertiser_id + video_id 每天最多 5 次前测，前端需提示用户
2. **巨量 Access Token**：有效期有限，需 Redis 缓存并自动刷新
3. **Webhook 公网可达**：需确保 `https://luoruihuan.top/api/webhook/ocean-engine` 可被巨量服务器访问
4. **批量任务**：路径二批量提交时，一个请求可能返回部分成功（fail_video_ids），需逐条处理
5. **测试环境**：巨量无沙箱，测试需用真实账号，注意每天 5 次限制
