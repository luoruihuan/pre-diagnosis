# 视频前测诊断运营平台

基于 React + TypeScript + Ant Design + MobX 的视频前测诊断运营管理系统。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design (PC 版)
- **状态管理**: MobX
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **图表**: @ant-design/charts
- **日期处理**: dayjs
- **样式**: Less

## 功能模块

### 1. 数据统计 (Dashboard)
- 素材总数、任务总数、已完成、待执行统计
- 任务趋势图表
- 最近任务列表

### 2. 素材管理
- **素材上传**: 支持视频文件上传（MP4、AVI、MOV 等格式，最大 500MB）
- **素材列表**: 查看、搜索、删除素材

### 3. 前测诊断
- **创建任务**: 选择视频、配置目标人群（地区、年龄段、性别）、设置样本量、选择诊断维度
- **任务列表**: 查看任务状态、进度，支持搜索、筛选、重试、删除
- **任务详情**: 查看任务信息、诊断结果（雷达图、详细结果表格）

### 4. 配置管理
- **配置模板**: 创建、编辑、删除配置模板（JSON 格式）

## 项目结构

```
public/
├── src/
│   ├── pages/              # 页面组件
│   │   ├── Dashboard/      # 数据统计
│   │   ├── Material/       # 素材管理
│   │   ├── Diagnosis/      # 前测诊断
│   │   └── Config/         # 配置管理
│   ├── components/         # 通用组件
│   │   ├── Layout/         # 布局组件
│   │   ├── VideoSelector/  # 视频选择器
│   │   ├── RegionCascader/ # 地区选择器
│   │   ├── DiagnosisConfigForm/ # 诊断配置表单
│   │   ├── TaskStatusBadge/ # 状态徽章
│   │   └── ResultTag/      # 结果标签
│   ├── stores/             # MobX 状态管理
│   │   ├── materialStore.ts
│   │   ├── diagnosisStore.ts
│   │   ├── configStore.ts
│   │   └── enumStore.ts
│   ├── services/           # API 服务
│   │   ├── material.ts
│   │   ├── diagnosis.ts
│   │   ├── config.ts
│   │   └── enum.ts
│   ├── types/              # TypeScript 类型定义
│   │   ├── material.ts
│   │   ├── diagnosis.ts
│   │   └── common.ts
│   ├── utils/              # 工具函数
│   │   ├── request.ts      # Axios 封装
│   │   └── constants.ts    # 常量定义
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 安装依赖

```bash
npm install
```

## 开发

```bash
npm run dev
```

访问 http://localhost:3000

## 构建

```bash
npm run build
```

## 预览生产构建

```bash
npm run preview
```

## API 配置

前端通过 Vite 代理转发 API 请求到后端服务：

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## 环境要求

- Node.js >= 16
- npm >= 8

## 浏览器兼容性

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

## 主要特性

### 1. 自动刷新
- 任务列表中 PENDIN状态的任务每 5 秒自动刷新

### 2. 错误处理
- 全局 Axios 拦截器统一处理错误
- 友好的错误提示信息

### 3. 响应式设计
- 主要适配 PC 端（1920x1080、1440x900）
- 最小宽度 1280px

### 4. 数据可视化
- 使用 @ant-design/charts 展示任务趋势和诊断结果
- 雷达图展示多维度诊断结果

## 开发规范

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 状态管理使用 MobX

### 命名规范
- 组件文件：PascalCase (如 `MaterialList.tsx`)
- 工具函数：camelCase (如 `formatDate`)
- 常量：UPPER_SNAKE_CASE (如 `DEFAULT_PAGE_SIZE`)
- 类型定义：PascalCase (如 `Material`)

### Git 提交规范
- feat: 新功能
- fix: 修复 Bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具链相关

## 常见问题

### 1. 端口冲突
如果 3000 端口被占用，可以修改 `vite.config.ts` 中的 `server.port`

### 2. API 请求失败
检查后端服务是否启动在 `http://localhost:3001`

### 3. 样式问题
确保已正确导入 Ant Design 样式：`import 'antd/dist/reset.css'`

## License

MIT
