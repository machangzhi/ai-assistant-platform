/**
 * 消息模块路由：/api/conversations/:id/messages
 * ------------------------------------------------------------
 * 以"会话 ID"为父资源，提供该会话下消息的增、查、清。
 * 对应控制器函数内部会先校验会话是否存在，再操作 messages 表。
 */

import { Router } from 'express'
import * as messageController from '../controllers/message.controller.js'

const router = Router()

// POST /api/conversations/:id/messages —— 新增一条消息
router.post('/:id/messages', messageController.create)

// GET /api/conversations/:id/messages —— 查询该会话的全部消息
router.get('/:id/messages', messageController.list)

// DELETE /api/conversations/:id/messages —— 清空该会话的消息
router.delete('/:id/messages', messageController.clear)

export default router
