/**
 * 请求体校验中间件工厂
 * ------------------------------------------------------------
 * 设计思路：中间件是"工厂函数"，接收一个 Zod schema 并返回真正的中间件，
 * 这样可以按路由复用，例如：
 *   router.post('/', validateBody(createUserSchema), addUser)
 *
 * 校验通过后会用「解析后的数据」覆盖 req.body：
 * - schema 中的 .trim() 等转换会生效；
 * - 未在 schema 中声明的字段会被剔除（Zod 默认行为），避免脏数据进入业务层。
 */

import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    // safeParse 不会抛异常，而是返回 { success, data | error }
    const result = schema.safeParse(req.body)

    if (!result.success) {
      // Zod 的 issues 数组包含每个字段的校验失败原因
      // 这里转换为更易读的 { field, message } 结构返回给前端
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        errors: result.error.issues.map((item) => ({
          // path 是字段路径数组，例如 ['user', 'name'] -> 'user.name'
          field: item.path.join('.'),
          message: item.message,
        })),
      })
      return
    }

    // 使用校验后的数据覆盖原始请求体（已完成 trim、类型转换、字段过滤）
    req.body = result.data
    next()
  }
}
