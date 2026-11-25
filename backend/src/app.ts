import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import userRoutes from './routes/user.routes.js'
import chatRoutes from './routes/chat.routes.js'
import databaseRoutes from './routes/database.routes'
import conversationRoutes from './routes/conversation.routes'
import messageRoutes from './routes/message.routes'
import { errorHandler } from './middlewares/error.middleware.js'

const app = express()

// 读取端口配置
const PORT = Number(process.env.PORT) || 3000

// 安全响应头
app.use(helmet())

// 跨域配置
app.use(cors())

// 解析 JSON 请求体
app.use(express.json())

// HTTP 请求日志
app.use(morgan('dev'))

// 健康检查接口
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
// 注册用户路由
app.use('/api/users', userRoutes)
// 注册 AI 对话接口
app.use('/api/chat', chatRoutes)
// 注册数据库路由
app.use('/api/database', databaseRoutes)
// 注册消息路由
app.use('/api/conversations', messageRoutes)
// 注册会话路由
app.use('/api/conversations', conversationRoutes)
// 其他 app.use 和路由注册之后，最后注册错误处理中间件
app.use(errorHandler)
// 启动服务
app.listen(PORT, () => {
  console.log(`服务启动成功：http://localhost:${PORT}`)
  console.log(`健康检查：http://localhost:${PORT}/api/health`)
})
