import { Router } from 'express'
import * as conversationController from '../controllers/conversation.controller.js'
import * as chatController from '../controllers/chat.controller.js'

const router = Router()

// 创建会话
router.post('/', conversationController.create)

// 获取会话列表
router.get('/', conversationController.list)

// 获取会话详情
router.get('/:id', conversationController.detail)

// 删除会话
router.delete('/:id', conversationController.remove)

// 会话聊天
router.post('/:id/chat/stream', chatController.chatWithConversation)

// 更新会话标题
router.patch('/:id/title', conversationController.rename)

export default router
