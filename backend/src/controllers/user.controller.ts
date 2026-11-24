import type { Request, Response, NextFunction } from 'express'

import * as userService from '../services/user.service.js'

// 查询列表
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.getUserList()

    res.json({
      code: 200,
      message: '查询成功',
      data,
    })
  } catch (error) {
    next(error)
  }
}

// 查询详情
export async function detailUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        code: 400,
        message: '用户 ID 不合法',
      })
      return
    }

    const data = await userService.getUserById(id)

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

// 新增用户
export async function addUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email } = req.body

    const id = await userService.createUser(username, email)

    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: { id, username, email },
    })
  } catch (error) {
    next(error)
  }
}

// 修改用户
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

// 删除用户
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
