/**
 * 消息业务服务
 * ------------------------------------------------------------
 * 负责消息相关的业务校验与编排：
 * - 内容非空；
 * - 角色仅允许 user / assistant；
 * - 会话必须存在；
 * - 为消息生成唯一 ID 并落库。
 */

import { randomUUID } from 'node:crypto'

import * as messageRepository from '../repositories/message.repository.js'
import * as conversationRepository from '../repositories/conversation.repository.js'

/** 允许写入数据库的消息角色 */
type MessageRole = 'user' | 'assistant'

/** 创建消息的入参结构 */
interface CreateMessageInput {
  conversationId: string
  role: MessageRole
  content: string
}

/**
 * 保存消息
 * @returns 已保存的消息对象（含生成的 id 与 created_at）
 * @throws 内容为空 / 角色非法 / 会话不存在
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

  // 3. 检查会话是否存在（防止向不存在的会话写入孤儿消息）
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

  // 5. 保存消息（仓储层会同时刷新所属会话的 updated_at）
  await messageRepository.createMessage(message)

  return message
}

/**
 * 获取会话消息（全量，按时间正序）
 * @throws 会话不存在
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
 * @returns true 表示执行完成（即使原本没有消息）
 * @throws 会话不存在
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

/**
 * 获取最近 N 条消息（用于构建 AI 上下文）
 * @param conversationId 会话 ID
 * @param limit 默认 20 条，避免上下文过长导致 token 费用与延迟上升
 * @returns 按时间正序排列的消息数组
 * @throws 会话不存在
 */
export async function getRecentMessages(conversationId: string, limit: number = 20) {
  const conversation = await conversationRepository.findConversationById(conversationId)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  return messageRepository.findRecentMessages(conversationId, limit)
}
