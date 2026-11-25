/**
 * 会话模块路由：/api/conversations
 * ------------------------------------------------------------
 * 提供会话的 CRUD、标题更新，以及"会话内流式聊天"接口。
 * 聊天接口会把用户消息与 AI 回答持久化到 messages 表。
 *
 * 注意：该路由与 message.routes 共用 /api/conversations 前缀，
 * 二者在 app.ts 中分别注册，路径不重叠因此不会冲突。
 */

import { Router } from 'express'
import * as conversationController from '../controllers/conversation.controller.js'
import * as chatController from '../controllers/chat.controller.js'

const router = Router()

// POST /api/conversations —— 创建会话
router.post('/', conversationController.create)

// GET /api/conversations —— 获取会话列表（按更新时间倒序）
router.get('/', conversationController.list)

// GET /api/conversations/:id —— 获取会话详情
router.get('/:id', conversationController.detail)

// DELETE /api/conversations/:id —— 删除会话
router.delete('/:id', conversationController.remove)

// POST /api/conversations/:id/chat/stream —— 会话内流式聊天（会落库）
router.post('/:id/chat/stream', chatController.chatWithConversation)

// PATCH /api/conversations/:id/title —— 更新会话标题
router.patch('/:id/title', conversationController.rename)

export default router
