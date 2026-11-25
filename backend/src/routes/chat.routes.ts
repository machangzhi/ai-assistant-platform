/**
 * AI 对话路由：/api/chat
 * ------------------------------------------------------------
 * 这是一组"无状态"的对话接口：
 * - 每次请求由前端携带完整 messages 历史；
 * - 服务端不落库，适合演示或轻量场景。
 *
 * 若需要会话持久化，请使用 /api/conversations 下的接口。
 */

import { Router } from 'express'
import { chat, streamChat } from '../controllers/chat.controller.js'

const router = Router()

// POST /api/chat —— 一次性返回完整回答（非流式）
router.post('/', chat)
// POST /api/chat/stream —— SSE 流式返回，逐段推送内容
router.post('/stream', streamChat)

export default router
