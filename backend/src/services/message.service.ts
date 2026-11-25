import { randomUUID } from 'node:crypto'

import * as messageRepository from '../repositories/message.repository'
import * as conversationRepository from '../repositories/conversation.repository'

type MessageRole = 'user' | 'assistant'

interface CreateMessageInput {
  conversationId: string
  role: MessageRole
  content: string
}

/**
 * 保存消息
 */
export async function createMessage(input: CreateMessageInput) {
  const { conversationId, role, content } = input

  // 1. 校验消息内容
  if (!content.trim()) {
    throw new Error('消息内容不能为空')
  }

  // 2. 校验消息角色
  if (!['user', 'assistant'].includes(role)) {
    throw new Error('不支持的消息角色')
  }

  // 3. 检查会话是否存在
  const conversation = await conversationRepository.findConversationById(conversationId)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  // 4. 生成消息 ID
  const message = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    created_at: new Date(),
  }

  // 5. 保存消息
  await messageRepository.createMessage(message)

  return message
}

/**
 * 获取会话消息
 */
export async function getMessages(conversationId: string) {
  // 检查会话是否存在
  const conversation = await conversationRepository.findConversationById(conversationId)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  return messageRepository.findMessagesByConversationId(conversationId)
}

/**
 * 清空会话消息
 */
export async function clearMessages(conversationId: string) {
  // 检查会话是否存在
  const conversation = await conversationRepository.findConversationById(conversationId)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  await messageRepository.deleteMessagesByConversationId(conversationId)

  return true
}
// 获取最近消息
export async function getRecentMessages(conversationId: string, limit: number = 20) {
  const conversation = await conversationRepository.findConversationById(conversationId)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  return messageRepository.findRecentMessages(conversationId, limit)
}
