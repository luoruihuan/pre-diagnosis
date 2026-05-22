# 巨量引擎接口对接文档

> 整理自飞书文档 + 巨量开放平台，供后端 OceanEngineService 实现参考

---

## 公共说明

### Base URL
```
https://api.oceanengine.com
```

### 公共 Header

| 字段 | 必填 | 说明 |
|------|------|------|
| Access-Token | ✅ | 代理商 OAuth access_token，需缓存到 Redis，过期自动刷新 |
| Content-Type | ✅ | POST 请求传 `application/json`，文件上传传 `multipart/form-data` |

### 公共返回结构

```typescript
{
  code: number       // 0 = 成功，非0 = 失败
  message: string    // 返回信息
  data: object       // 业务数据
  request_id: string // 请求日志ID，报错时提供给巨量排查
}
```

### 限制说明

| 限制项 | 值 |
|--------|-----|
| 创建前测任务：同一素材 | 5次 / 24H |
| 创建前测任务：同一代理商 | 50000素材 / 24H |
| 前测任务执行时间 | 10s ~ 1min（异步） |
| 批量接口单次上限 | 100条 |

---

## 接口一：上传素材至方舟

> 路径一（新素材）使用。将视频上传到巨量方舟素材库，获取 video_id 用于后续前测。

**POST** `/open_api/2/file/video/agent/`

权限点：`工具-图片和视频管理-上传图片和视频`

### 请求参数（multipart/form-data）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | number | ✅ | 代理商ID |
| file_name | string | ✅ | 视频文件名 |
| is_need_auth | bool | ✅ | **仅用于素材前测时传 `false`**；正式保护授权传 `true` |
| upload_type | string | ❌ | 默认 `UPLOAD_BY_FILE`；可选 `UPLOAD_BY_URL`（仅支持连山TOS地址） |
| video_file | file | 条件必填 | upload_type=UPLOAD_BY_FILE 时必填；支持 mp4/mpeg/3gp/avi，<1000M，分辨率≥1280×720 |
| video_url | string | 条件必填 | upload_type=UPLOAD_BY_URL 时必填，仅支持连山TOS地址 |
| video_signature | string | 条件必填 | 视频 MD5，upload_type=UPLOAD_BY_FILE 时必填 |
| is_aigc | bool | ❌ | 是否AIGC生成，默认 false |

### 返回参数

| 字段 | 类型 | 说明 |
|------|------|------|
| data.video_info.video_id | string | **视频ID（用于创建前测任务）** |
| data.video_info.material_id | number | 素材ID（素材报表唯一标识） |
| data.video_info.video_url | string | 视频播放URL |
| data.video_info.size | number | 文件大小 |
| data.video_info.width | number | 视频宽度 |
| data.video_info.height | number | 视频高度 |
| data.video_info.duration | double | 播放时长（秒） |
| data.video_info.video_signature | string | 视频MD5 |

### 业务错误码

| Code | 说明 | 处理 |
|------|------|------|
| 400172 | 解析文件失败 | 检查素材URL/文件是否正确 |
| 400175 | URL上传仅支持连山云TOS | 检查URL格式，区域选华北（北京） |
| 400177 | 文件上传异常 | 同上 |

> **注意**：路径一的主流程是用户直接填写已有的 video_id，本接口为可选的"先上传再前测"场景。

---

## 接口二：创建前测任务（异步）

> 两条路径共用。提交 video_ids 发起前测，返回 task_ids 用于后续查询。

**POST** `/open_api/2/diagnosis_task/agent/create/`

权限点：`工具-审核查询工具-素材前测工具`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | number | ✅ | 代理商ID |
| advertiser_id | number | ✅ | 广告主ID |
| video_ids | string[] | ✅ | 视频ID列表，v开头字符串，≤100条，同请求内自动去重 |
| ref_ad_id | number | 二选一 | 复用1.0广告ID的投放设置，与 ref_promotion_id 二选一 |
| ref_promotion_id | number | 二选一 | 复用2.0广告ID的投放设置，与 ref_ad_id 二选一 |
| diagnose_config | object | 二选一 | 手动配置投放设置，与 ref_ad_id/ref_promotion_id 二选一 |

**diagnose_config 子字段：**

| 字段 | 类型 | 首发检测 | 优质检测 | 说明 |
|------|------|---------|---------|------|
| platform | string | / | / | 投放平台：`AD` / `QIANCHUAN` |
| external_action | string | / | / | 推广转化目标，见枚举附录 |
| audience_gender | string | / | / | 受众性别：`ALL` / `MALE` / `FEMALE` |
| audience_age | string[] | / | / | 受众年龄：`ALL`,`18-23`,`24-30`,`31-40`,`41-49`,`50` |
| audience_region | number[] | / | / | 受众地区，传二级行政区域code |
| audience_network | string[] | / | / | 网络类型：`ALL`,`5G`,`4G`,`3G`,`2G`,`WIFI` |
| cus_name | string | / | / | 客户主体名称 |
| pricing_type | string | 不适用 | 不适用 | 计费方式（仅AD）：`OCPC`/`CPA`/`OCPM` |
| cost_cap | bool | 不适用 | 不适用 | 是否最优成本出价（仅AD） |
| target_cost | bool | 不适用 | 不适用 | 是否稳定成本出价（仅AD） |
| nobid | bool | 不适用 | 不适用 | 是否最大转化出价（仅AD） |
| cpa_bid | double | 不适用 | 不适用 | 目标转化成本，范围[1,10000]，精确到小数点后2位 |
| cpc_bid | double | 不适用 | 不适用 | 目标点击成本，范围[1,10000] |
| budget | double | 不适用 | 不适用 | 预算金额，范围[1,10000] |

### 返回参数

| 字段 | 类型 | 说明 |
|------|------|------|
| data.task_ids | number[] | **成功创建的前测任务ID列表，一个video对应一个task_id** |
| data.fail_video_ids | dict | 创建失败的视频，key=video_id |
| data.fail_video_ids[video_id].err_code | string | 失败错误码 |
| data.fail_video_ids[video_id].err_message | string | 失败原因 |

### 限制

- 同一 `advertiser_id + video_id` 组合：**每天最多5次**
- 同一代理商：每天最多50000条素材
- 异步接口，执行时间 **10s ~ 1min**，需轮询或等待Webhook

---

## 接口三：查询前测任务结果（By 任务ID）

> 轮询使用。通过 task_ids 查询前测结果，同一任务ID返回结果稳定。

**GET** `/open_api/2/diagnosis_task/agent/get/`

权限点：`工具-审核查询工具-素材前测工具`

关联Webhook事件：`status.material.diagnose.agentad` / `status.material.diagnose.agentqc`

### 请求参数（Query String）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | number | ✅ | 代理商ID |
| task_ids | number[] | ❌ | 任务ID列表，≤100条 |

### 返回参数

| 字段 | 类型 | 说明 |
|------|------|------|
| data.task_list | object[] | 任务列表 |
| data.task_list[].task_id | number | 任务ID |
| data.task_list[].video_id | string | 视频ID |
| data.task_list[].advertiser_id | number | 广告主ID |
| data.task_list[].material_id | number | 素材ID |
| data.task_list[].status | string | 任务状态，见枚举 |
| data.task_list[].is_ad_high_quality_material | string | **AD/本地推优质**，见枚举 |
| data.task_list[].is_ecp_high_quality_material | string | **千川优质**，见枚举 |
| data.task_list[].is_first_publish_material | string | **是否首发**，见枚举 |
| data.task_list[].is_inefficient_material | string | 是否低效素材，见枚举 |
| data.task_list[].not_ad_high_quality_reason | string[] | AD非优质原因列表 |
| data.task_list[].not_ecp_high_quality_reason | string[] | 千川非优质原因列表 |

**status 枚举：**

| 值 | 说明 | 前端展示 |
|----|------|---------|
| PENDING | 待处理/进行中 | 蓝色 Badge "检测中" |
| SUCCESS | 成功 | 绿色 Badge "已完成" |
| FAILED | 失败 | 红色 Badge "失败" |

**质量判断枚举（is_ad / is_ecp / is_first_publish / is_inefficient）：**

| 值 | 说明 | Tag样式 |
|----|------|---------|
| YES | 是 | 绿色实心 Tag |
| NO | 否 | 红色实心 Tag |
| UNKNOWN | 无检测结果 | 灰色 Tag |

**注意：**
- 同一任务ID：返回的前测状态是**稳定的**
- 同一视频ID，多次调用前测任务：返回结果**可能有变化**

---

## 接口四：查询前测任务列表（By Agent + 过滤条件）

> 历史任务查询、数据统计使用。

**GET** `/open_api/2/diagnosis_task/agent/list/`

### 请求参数（Query String）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | number | ✅ | 代理商ID |
| results | string[] | ❌ | 按结果筛选，见枚举 |
| status | string[] | ❌ | 按状态筛选：`PENDING`/`SUCCESS`/`FAILED` |
| start_time | string | ❌ | 任务创建时间起始，格式 `yyyy-mm-dd`，与 end_time 搭配 |
| end_time | string | ❌ | 任务创建时间截止，格式 `yyyy-mm-dd` |
| page | number | ❌ | 页码，默认1 |
| page_size | number | ❌ | 页面大小，默认20 |

**results 枚举：**

| 值 | 说明 |
|----|------|
| FIRST_PUBLISH_MATERIAL | 首发素材 |
| NON_FIRST_PUBLISH_MATERIAL | 非首发素材 |
| AD_HIGH_QUALITY_MATERIAL | AD/本地推优质素材 |
| NON_AD_HIGH_QUALITY_MATERIAL | AD/本地推非优质素材 |
| ECP_HIGH_QUALITY_MATERIAL | 千川优质素材 |
| NON_ECP_HIGH_QUALITY_MATERIAL | 千川非优质素材 |

### 返回参数

| 字段 | 类型 | 说明 |
|------|------|------|
| data.task_list | object[] | 任务列表（字段同接口三） |
| data.page.page | number | 当前页码 |
| data.page.page_size | number | 页面大小 |
| data.page.total_page | number | 总页数 |
| data.page.total_number | number | 总数 |

---

## 接口五：获取方舟/即创素材列表

> 路径二（已有素材）使用。拉取代理商方舟素材库中的视频列表。

**GET** `/open_api/2/file/video/agent/get/`

权限点：`工具-图片和视频管理-查询图片和视频信息`

### 请求参数（Query String）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent_id | number | ✅ | 代理商ID |
| filtering.width | number | ❌ | 视频宽度 |
| filtering.height | number | ❌ | 视频高度 |
| filtering.ratio | float[] | ❌ | 视频宽高比，如 [1.7, 2.5]，精度±0.05 |
| filtering.video_ids | string[] | 三选一 | 按视频ID过滤，≤100条；与 material_ids、signatures 三选一 |
| filtering.material_ids | number[] | 三选一 | 按素材ID过滤，≤100条；与 video_ids、signatures 三选一 |
| filtering.signatures | string[] | 三选一 | 按MD5过滤，≤100条；与 video_ids、material_ids 三选一 |
| filtering.start_time | string | ❌ | 上传时间起始，格式 `yyyy-mm-dd` |
| filtering.end_time | string | ❌ | 上传时间截止，格式 `yyyy-mm-dd` |
| filtering.source | string[] | ❌ | 素材来源，见枚举，可多选，枚举值大小写敏感 |
| page | number | ❌ | 页码，默认1 |
| page_size | number | ❌ | 页面大小，默认20 |

**source 素材来源枚举：**

| 值 | 说明 |
|----|------|
| AD_SITE | AD后台本地上传 |
| CREATIVE_CENTER | 巨量创意 |
| OPEN_API | 开放平台 |
| SUPPLIER | 即合视频 |
| VIDEO_CAPTURE | 易拍视频 |
| ACCOUNT_PUSH | 推送视频 |
| STAR | 星图视频 |
| CEWEBRITY_VIDEO | 达人视频（抖音主页视频） |
| BP | 巨量纵横 |
| E_COMMERCE | 巨量千川 |
| DPA_MERSCHANT_CENTER | 行业产品中心 |
| QF_FUWU | 群峰服务市场 |
| AIC | 即创 |

### 返回参数

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | object[] | 视频素材列表 |
| data.list[].id | string | **视频ID（用于创建前测任务）** |
| data.list[].url | string | 视频播放地址（仅同主体预览，**有效期1小时**） |
| data.list[].signature | string | 视频MD5 |
| data.list[].source | string | 素材来源 |
| data.list[].create_time | string | 上传时间，格式 `yyyy-mm-dd HH:MM:SS` |
| data.list[].filename | string | 文件名 |
| data.page_info.page | number | 当前页码 |
| data.page_info.page_size | number | 页面大小 |
| data.page_info.total_page | number | 总页数 |
| data.page_info.total_number | number | 总数 |

---

## Webhook 回调

### 订阅配置

在巨量引擎开放平台「事件订阅」中配置：

| 应用类型 | 事件标识 | 说明 |
|---------|---------|------|
| 巨量广告 | `status.material.diagnose.agentad` | AD前测完成回调 |
| 巨量千川 | `status.material.diagnose.agentqc` | 千川前测完成回调 |

回调地址：`https://luoruihuan.top/api/webhook/ocean-engine`

### 回调消息格式

```typescript
// POST Body
{
  advertiser_id: number   // 广告主ID
  event: 'SUCCESS' | 'FAILED'
  data: {
    video_id: string      // 视频ID
    agent_id: number      // 代理商ID
    task_id: number       // 前测任务ID（对应接口二返回的 task_ids）
    status: 'SUCCESS' | 'FAILED'
  }
}
```

### 回调验签（现有实现保持不变）

请求头：

| Header | 说明 |
|--------|------|
| x-timestamp | 时间戳（Unix秒），5分钟内有效 |
| x-signature | HMAC-SHA256 签名 |
| x-request-id | 请求唯一ID，Redis去重（10分钟） |

签名算法：`HMAC-SHA256(timestamp + "." + body, webhook_secret)`

### 回调处理逻辑

```
收到回调
  → 验签（时间戳 + 签名 + requestId去重）
  → 通过 task_id 查本地 diagnosis_tasks 表
  → 调用接口三（/diagnosis_task/agent/get/）获取完整结果
  → 更新本地任务：status / result / completed_at
  → 停止该任务的轮询
```

---

## 推广转化目标枚举（external_action）

### AD 平台

| 值 | 说明 |
|----|------|
| AD_APP_ACTIVATE | 应用-激活 |
| AD_APP_BUY | 应用-APP内付费 |
| AD_APP_DOWNLOADED | 应用-下载完成 |
| AD_APP_INSTALLED | 应用-安装完成 |
| AD_APP_PAY | 应用-付费 |
| AD_APP_REGISTER | 应用-注册 |
| AD_CLUE_FORM | 销售线索-表单提交 |
| AD_CLUE_TEL | 销售线索-智能电话确认接通 |
| AD_CLUE_CONSULT | 销售线索-有效咨询 |
| AD_CLUE_CUSTOMER | 销售线索-有效获客 |
| AD_CLUE_WX_ADD | 销售线索-添加企业微信 |
| AD_CLUE_MSG | 销售线索-私信留资 |
| AD_CLUE_PAY | 销售线索-付费 |
| AD_ECP_APP_BUY | 电商-app内下单 |
| AD_ECP_SHOP | 电商-调起店铺 |
| AD_NATIVE_FOLLOW | 原声互动-账号关注 |
| AD_NATIVE_LIVE_VIEW | 原声互动-直播间观看 |
| AD_NATIVE_PAY | 原声互动-付费 |
| AD_NATIVE_LIVE_STAY | 原声互动-直播间停留 |
| AD_MINIAPP_PAY | 快应用-付费 |
| AD_MINIAPP_ACTIVATE | 快应用-激活 |

### 千川平台

| 值 | 说明 |
|----|------|
| QC_LIVE_BUY | 直播间下单 |
| QC_LIVE_DEAL | 直播间成交 |
| QC_LIVE_ENTRY | 进入直播间 |
| QC_LIVE_ROI_DEAL | 支付ROI-直播间成交 |
| QC_LIVE_STAY | 直播间停留 |
| QC_LIVE_FOLLOW | 直播间关注 |
| QC_PRODUCT_BUY | 商品购买 |
| QC_PRODUCT_ROI | 商品支付ROI |
| QC_PRODUCT_QC | 千川直接+间接订单 |

---

## 后端 OceanEngineService 方法映射

```typescript
// 对应接口一
uploadVideo(agentId, file, fileName): Promise<{ videoId, materialId, videoUrl }>

// 对应接口二
createDiagnosisTask(params: {
  agentId: number
  advertiserId: number
  videoIds: string[]
  refAdId?: number
  refPromotionId?: number
  diagnoseConfig?: DiagnoseConfig
}): Promise<{ taskIds: number[], failVideoIds: Record<string, FailReason> }>

// 对应接口三
getDiagnosisTaskByIds(agentId, taskIds): Promise<TaskResult[]>

// 对应接口四
listDiagnosisTasks(agentId, filters): Promise<{ taskList: TaskResult[], page: PageInfo }>

// 对应接口五
getArkVideoList(agentId, filtering, page, pageSize): Promise<{ list: VideoItem[], pageInfo: PageInfo }>
```

---

## 本地数据库字段与巨量字段映射

| 本地字段 | 巨量字段 | 说明 |
|---------|---------|------|
| diagnosis_tasks.ocean_task_id | task_id | 巨量前测任务ID |
| diagnosis_tasks.video_id | video_id | 视频ID |
| diagnosis_tasks.advertiser_id | advertiser_id | 广告主ID |
| diagnosis_tasks.status | status | PENDING/SUCCESS/FAILED |
| diagnosis_tasks.result.is_ad_quality | is_ad_high_quality_material | AD优质 YES/NO/UNKNOWN |
| diagnosis_tasks.result.is_ecp_quality | is_ecp_high_quality_material | 千川优质 YES/NO/UNKNOWN |
| diagnosis_tasks.result.is_first_publish | is_first_publish_material | 首发 YES/NO/UNKNOWN |
| diagnosis_tasks.result.is_inefficient | is_inefficient_material | 低效素材 YES/NO/UNKNOWN |
| diagnosis_tasks.result.not_ad_reasons | not_ad_high_quality_reason | AD非优质原因 |
| diagnosis_tasks.result.not_ecp_reasons | not_ecp_high_quality_reason | 千川非优质原因 |
