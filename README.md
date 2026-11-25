# AI Assistant Platform

一个前后端分离的 AI 聊天助手示例项目：后端基于 Express + TypeScript 对接 DeepSeek API，前端基于 Vue 3 + Element Plus，支持多会话管理、历史消息持久化与 SSE 流式输出。

## 功能特性

- 多会话管理：新建、切换、重命名、删除、清空历史
- 消息持久化：用户消息与 AI 回答落库 MySQL，刷新页面不丢失
- 流式输出：基于 SSE 逐字返回，支持中途"停止生成"
- 会话上下文：服务端自动读取最近 20 条消息构建对话上下文
- Markdown 渲染：代码高亮 + 一键复制，渲染结果经 DOMPurify 清理防 XSS
- 工程规范：Prettier + Husky + lint-staged 提交前自动格式化
- 统一响应体与分层架构：routes → controllers → services → repositories

## 技术栈

后端

- Node.js + Express 5
- TypeScript（ESM）
- MySQL（mysql2 连接池）
- DeepSeek Chat Completions API
- Zod（参数校验）、Helmet、CORS、Morgan

前端

- Vue 3（`<script setup>`）+ TypeScript
- Vite
- Pinia（状态管理）
- Element Plus（UI 组件）
- markdown-it + highlight.js + DOMPurify

## 目录结构

```text
ai-assistant-platform/
├─ backend/
│  ├─ src/
│  │  ├─ ai/models/          # DeepSeek 模型调用（流式 / 非流式）
│  │  ├─ config/             # 环境变量与数据库连接池
│  │  ├─ controllers/        # 控制器：解析入参、组织响应
│  │  ├─ middlewares/        # 错误处理、请求体校验
│  │  ├─ repositories/       # 仓储层：只负责 SQL
│  │  ├─ routes/             # 路由注册
│  │  ├─ services/           # 业务编排与校验
│  │  ├─ validators/         # Zod 校验规则
│  │  └─ app.ts              # 应用入口
│  ├─ .env.example           # 环境变量示例
│  └─ tsconfig.json
├─ frontend/
│  ├─ src/
│  │  ├─ api/                # 接口封装（含 SSE 解析）
│  │  ├─ components/         # 侧边栏、聊天区、输入框、Markdown 渲染
│  │  ├─ stores/             # Pinia 聊天状态
│  │  ├─ types/              # 前端视图模型类型
│  │  ├─ utils/              # Markdown 渲染、本地存储工具
│  │  ├─ App.vue
│  │  └─ main.ts
│  ├─ index.html
│  └─ vite.config.ts
├─ .husky/pre-commit         # 提交前执行 lint-staged
├─ package.json              # 根工程：Prettier / Husky / lint-staged
└─ README.md
```

## 快速开始

### 1. 前置要求

- Node.js ≥ 18（建议 20+，项目使用全局 `fetch` 与 `AbortSignal`）
- MySQL 5.7+ / 8.0
- 一个可用的 DeepSeek API Key

### 2. 初始化数据库

创建数据库（表结构见下方「数据库表结构」）：

```sql
CREATE DATABASE IF NOT EXISTS ai_assistant DEFAULT CHARSET utf8mb4;
```

### 3. 启动后端

```bash
cd backend
npm install

# 复制环境变量示例并按需修改
# Windows PowerShell: Copy-Item .env.example .env
cp .env.example .env

npm run dev
```

后端默认监听 `http://localhost:3000`，健康检查：`GET /api/health`。

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。

> 端口注意：前端 `vite.config.ts` 中 `/api` 的代理目标默认是 `http://localhost:3001`，
> 而后端默认端口是 `3000`。请保持两者一致：要么把后端 `.env` 改为 `PORT=3001`，
> 要么把代理目标改为 `http://localhost:3000`。

## 环境变量

后端通过 `.env` 读取，示例见 `backend/.env.example`：

| 变量                | 说明                     | 默认值                     |
| ------------------- | ------------------------ | -------------------------- |
| `PORT`              | HTTP 服务端口            | `3000`                     |
| `NODE_ENV`          | 运行环境                 | `development`              |
| `DB_HOST`           | MySQL 主机               | `localhost`                |
| `DB_PORT`           | MySQL 端口               | `3306`                     |
| `DB_USER`           | MySQL 用户名             | `root`                     |
| `DB_PASSWORD`       | MySQL 密码               | 空                         |
| `DB_NAME`           | 数据库名                 | `ai_assistant`             |
| `DEEPSEEK_API_KEY`  | DeepSeek API Key（必填） | 空                         |
| `DEEPSEEK_BASE_URL` | 接口基础地址             | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL`    | 模型名称                 | `deepseek-chat`            |

> `.env` 已在 `.gitignore` 中忽略，请勿提交密钥。

## 数据库表结构

项目未自带迁移脚本，需手动建表。以下 SQL 依据代码中的字段推断，字段类型可按实际情况调整：

```sql
-- 用户表（示例模块）
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL DEFAULT '新对话',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_updated_at (updated_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversation_created (conversation_id, created_at),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
```

> `ON DELETE CASCADE` 保证删除会话时其消息自动清理，与 `conversation.service.ts` 中的注释一致。

## API 一览

统一响应体：`{ code, message, data? }`

健康检查与自检

- `GET /api/health` — 服务健康检查
- `GET /api/database/test` — MySQL 连通性检查

用户（示例模块）

- `GET /api/users` — 列表
- `GET /api/users/:id` — 详情
- `POST /api/users` — 新增（Zod 校验）
- `PUT /api/users/:id` — 修改
- `DELETE /api/users/:id` — 删除

无状态 AI 对话（不落库，前端需携带完整 messages）

- `POST /api/chat` — 一次性返回完整回答
- `POST /api/chat/stream` — SSE 流式返回

会话（持久化）

- `POST /api/conversations` — 创建会话
- `GET /api/conversations` — 会话列表（按更新时间倒序）
- `GET /api/conversations/:id` — 会话详情
- `DELETE /api/conversations/:id` — 删除会话
- `PATCH /api/conversations/:id/title` — 更新标题
- `POST /api/conversations/:id/chat/stream` — 会话内流式聊天（消息落库）

消息

- `POST /api/conversations/:id/messages` — 保存消息
- `GET /api/conversations/:id/messages` — 查询会话全部消息
- `DELETE /api/conversations/:id/messages` — 清空会话消息

### SSE 协议说明

流式接口返回 `text/event-stream`，每条数据形如：

```text
data: {"content":"你"}

data: {"content":"好"}

data: [DONE]
```

异常时返回：

```text
event: error
data: {"message":"AI 生成失败"}
```

## 可用脚本

根目录

| 命令                   | 说明                       |
| ---------------------- | -------------------------- |
| `npm run format`       | 使用 Prettier 格式化全仓库 |
| `npm run format:check` | 检查格式是否符合规范       |

后端（`backend/`）

| 命令            | 说明                       |
| --------------- | -------------------------- |
| `npm run dev`   | 使用 tsx 热重载启动        |
| `npm run build` | 编译 TypeScript 到 `dist/` |
| `npm start`     | 运行编译产物 `dist/app.js` |

前端（`frontend/`）

| 命令              | 说明                 |
| ----------------- | -------------------- |
| `npm run dev`     | 启动开发服务器       |
| `npm run build`   | 类型检查并构建生产包 |
| `npm run preview` | 预览生产构建         |

## 常见问题

1. 启动报 `DEEPSEEK_API_KEY 未配置`
   检查 `backend/.env` 是否创建、Key 是否填写，修改后需重启服务。

2. 前端请求 404 或连接被拒绝
   确认前后端端口一致（见「端口注意」），并确认后端已启动。

3. Node 运行 `dist/app.js` 报 `ERR_MODULE_NOT_FOUND`
   项目是 ESM，相对导入必须带 `.js` 后缀；新增文件时请遵循该约定。

4. `Incorrect arguments to mysqld_stmt_execute`
   出现在 `LIMIT ?` 相关查询时，可改用 `pool.query` 或校验后拼接数字。

5. 中文乱码
   确认数据库、数据表字符集为 `utf8mb4`（连接池已显式设置）。

## 开发规范

- 代码风格由 Prettier 统一（无分号、单引号、行宽 100）
- 提交前 Husky 会自动执行 `lint-staged`，对暂存文件运行 Prettier
- 后端分层约定：Controller 不写 SQL，Repository 不做业务判断
- 前端接口调用统一收敛在 `frontend/src/api/`，组件不直接 `fetch`

## License

本项目仅用于学习与演示，可自由修改使用。
