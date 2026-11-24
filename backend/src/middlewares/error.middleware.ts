import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('[Server Error]', error)

  if (res.headersSent) {
    next(error)
    return
  }

  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
  })
}
