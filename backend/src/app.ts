/**
 * ============================================================
 * 应用入口（Express 服务）
 * ============================================================
 * 该文件负责：
 * 1. 加载环境变量（.env）；
 * 2. 创建 Express 应用并挂载通用中间件（安全、跨域、JSON 解析、日志）；
 * 3. 注册各业务模块的路由（用户 / AI 对话 / 会话 / 消息 / 数据库自检）；
 * 4. 最后注册统一的错误处理中间件；
 * 5. 启动 HTTP 服务并监听端口。
 *
 * 注意：本项目是 ESM 工程（package.json 中 "type": "module"），
 * 因此相对路径导入必须显式写 `.js` 后缀（即使源码是 .ts）。
 */

// 尽早加载 .env，保证后续模块能读取到 process.env 中的配置
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import userRoutes from './routes/user.routes.js'
import chatRoutes from './routes/chat.routes.js'
import databaseRoutes from './routes/database.routes.js'
import conversationRoutes from './routes/conversation.routes.js'
import messageRoutes from './routes/message.routes.js'
import { errorHandler } from './middlewares/error.middleware.js'

// 创建 Express 应用实例（后续所有中间件与路由都挂载到该实例上）
const app = express()

// 读取端口配置：环境变量优先，缺省或非法时回退到 3000
const PORT = Number(process.env.PORT) || 3000

// 安全响应头：设置一系列 HTTP 安全相关响应头，降低常见 Web 攻击风险
app.use(helmet())

// 跨域配置：这里允许所有来源访问，便于本地前后端分离开发；
// 生产环境建议改为白名单 origins，并限制允许的方法与请求头
app.use(cors())

// 解析 JSON 请求体：将请求体中的 JSON 字符串解析为 req.body 对象
app.use(express.json())

// HTTP 请求日志：dev 模式会输出方法、路径、状态码、耗时等信息，便于调试
app.use(morgan('dev'))

/**
 * 健康检查接口
 * GET /api/health
 * 用途：部署探活、连通性检查，返回服务名、版本与服务器时间
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    code: 200,
    message: '服务运行正常',
    data: {
      name: 'AI Assistant Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  })
})

/**
 * 路由注册区
 * 说明：Express 会按注册顺序匹配请求，同一前缀可以注册多个 router，
 * 只要内部路径不冲突即可。这里的顺序不影响业务正确性。
 */

// 用户模块：/api/users（增删改查示例）
app.use('/api/users', userRoutes)
// AI 对话模块：/api/chat（一次性回答 / 流式回答，无持久化）
app.use('/api/chat', chatRoutes)
// 数据库模块：/api/database（MySQL 连通性自检）
app.use('/api/database', databaseRoutes)
// 消息模块：/api/conversations/:id/messages（会话下消息的增删查）
app.use('/api/conversations', messageRoutes)
// 会话模块：/api/conversations（会话增删改查 + 会话内流式聊天）
app.use('/api/conversations', conversationRoutes)

/**
 * 全局错误处理中间件
 * 必须放在所有路由之后注册，否则无法捕获前面路由抛出的异常。
 * Express 通过"参数个数为 4"来识别错误处理中间件。
 */
app.use(errorHandler)

// 启动服务，监听指定端口
app.listen(PORT, () => {
  console.log(`服务启动成功：http://localhost:${PORT}`)
  console.log(`健康检查：http://localhost:${PORT}/api/health`)
})
