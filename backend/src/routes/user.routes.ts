/**
 * 用户模块路由：/api/users
 * ------------------------------------------------------------
 * 路由层只负责"路径 -> 控制器函数"的映射，
 * 并可在中间件链中插入参数校验，不写业务逻辑。
 */

import { Router } from 'express'

import {
  listUsers,
  detailUser,
  addUser,
  editUser,
  removeUser,
} from '../controllers/user.controller.js'

import { validateBody } from '../middlewares/validate.middleware.js'

import { createUserSchema, updateUserSchema } from '../validators/user.schema.js'

const router = Router()

// GET /api/users —— 查询用户列表
router.get('/', listUsers)
// GET /api/users/:id —— 查询用户详情
router.get('/:id', detailUser)

// POST /api/users —— 新增用户（先校验请求体，再进入控制器）
router.post('/', validateBody(createUserSchema), addUser)

// PUT /api/users/:id —— 修改用户（字段全部可选）
router.put('/:id', validateBody(updateUserSchema), editUser)

// DELETE /api/users/:id —— 删除用户
router.delete('/:id', removeUser)

export default router
