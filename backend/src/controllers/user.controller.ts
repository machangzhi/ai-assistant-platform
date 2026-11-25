/**
 * 用户控制器
 * ------------------------------------------------------------
 * 职责边界：
 * - 解析/校验入参（ID 合法性等）；
 * - 调用 Service 层完成业务；
 * - 组织 HTTP 响应（状态码 + 统一响应体）；
 * - 捕获异常并交给全局错误中间件（next(error)）。
 *
 * 统一响应体约定：{ code, message, data? }
 */

import type { Request, Response, NextFunction } from 'express'

import * as userService from '../services/user.service.js'

/**
 * 查询用户列表
 * GET /api/users
 */
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.getUserList()

    res.json({
      code: 200,
      message: '查询成功',
      data,
    })
  } catch (error) {
    // 交给全局错误处理中间件统一返回 500
    next(error)
  }
}

/**
 * 查询用户详情
 * GET /api/users/:id
 */
export async function detailUser(req: Request, res: Response, next: NextFunction) {
  try {
    // 路由参数是字符串，需要转换为数字；非法值（NaN/小数/负数）直接拒绝
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        code: 400,
        message: '用户 ID 不合法',
      })
      return
    }

    const data = await userService.getUserById(id)

    // 查询结果为空说明用户不存在
    if (!data) {
      res.status(404).json({
        code: 404,
        message: '用户不存在',
      })
      return
    }

    res.json({
      code: 200,
      message: '查询成功',
      data,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * 新增用户
 * POST /api/users
 * 说明：请求体已由 validateBody(createUserSchema) 校验并过滤
 */
export async function addUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email } = req.body

    const id = await userService.createUser(username, email)

    // 创建成功使用 201 Created
    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: { id, username, email },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * 修改用户
 * PUT /api/users/:id
 * 说明：请求体已由 validateBody(updateUserSchema) 校验，字段均可选
 */
export async function editUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        code: 400,
        message: '用户 ID 不合法',
      })
      return
    }

    // updateUser 返回 false 有两种可能：用户不存在，或没有任何可更新字段
    const success = await userService.updateUser(id, req.body)

    if (!success) {
      res.status(404).json({
        code: 404,
        message: '用户不存在或没有可更新字段',
      })
      return
    }

    res.json({
      code: 200,
      message: '修改成功',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * 删除用户
 * DELETE /api/users/:id
 */
export async function removeUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        code: 400,
        message: '用户 ID 不合法',
      })
      return
    }

    // affectedRows 为 0 说明目标记录不存在
    const success = await userService.deleteUser(id)

    if (!success) {
      res.status(404).json({
        code: 404,
        message: '用户不存在',
      })
      return
    }

    res.json({
      code: 200,
      message: '删除成功',
    })
  } catch (error) {
    next(error)
  }
}
