/**
 * 全局错误处理中间件
 * ------------------------------------------------------------
 * Express 依靠"函数形参个数为 4"来识别错误处理中间件：
 * (error, req, res, next)。
 *
 * 使用方式：
 * - 控制器中捕获到异常后调用 next(error)，即可交给这里统一处理；
 * - 必须在所有路由之后注册（见 app.ts），否则捕获不到前面的异常。
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 打印完整错误堆栈，便于本地/线上排查
  console.error('[Server Error]', error)

  // 如果响应头已经发送（例如 SSE 已开始推送），说明无法再改写状态码，
  // 此时只能把错误继续交给 Express 默认处理器（通常会直接断开连接）
  if (res.headersSent) {
    next(error)
    return
  }

  // 统一返回 500，且不向前端暴露内部错误细节（避免泄漏实现信息）
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
  })
}
