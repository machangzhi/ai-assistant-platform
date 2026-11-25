/**
 * 会话业务服务
 * ------------------------------------------------------------
 * 负责会话相关的业务规则：
 * - 生成会话 ID；
 * - 处理标题默认值与长度限制；
 * - 在查询/删除/改名之前校验会话是否存在；
 * - 把仓储层返回的原始数据直接交给上层（控制器）。
 *
 * 分层说明：Service 不关心 HTTP 状态码，只用 Error 表达业务异常。
 */

import * as conversationRepository from '../repositories/conversation.repository.js'

/**
 * 创建会话
 * @param title 可选标题；为空时使用默认标题"新对话"
 * @returns 新建后的完整会话记录（从数据库中重新查询，保证字段一致）
 */
export async function createConversation(title?: string) {
  // 使用 UUID 作为主键，避免自增 ID 在分布式/多端场景下的可预测性与冲突问题
  const id = crypto.randomUUID()

  // 标题做去空格 + 截断，避免超长内容写入数据库
  const conversationTitle = title?.trim().slice(0, 100) || '新对话'

  await conversationRepository.createConversation(id, conversationTitle)

  // 重新查询以返回包含 created_at / updated_at 的完整记录
  return conversationRepository.findConversationById(id)
}

/**
 * 获取会话列表
 * 排序由仓储层负责（按 updated_at 倒序，最近活跃的会话靠前）
 */
export async function getConversations() {
  return conversationRepository.findConversations()
}

/**
 * 获取会话详情
 * @throws 会话不存在时抛出错误，供控制器映射为 404
 */
export async function getConversationById(id: string) {
  const conversation = await conversationRepository.findConversationById(id)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  return conversation
}

/**
 * 删除会话
 * 先确认存在再删除，避免"删除成功"但实际什么都没删的歧义响应。
 *
 * 注意：messages 表若设置了 ON DELETE CASCADE，
 * 删除会话时其消息会自动级联删除；否则需要在此显式清理消息。
 */
export async function removeConversation(id: string) {
  const conversation = await conversationRepository.findConversationById(id)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  await conversationRepository.deleteConversation(id)

  return true
}

/**
 * 更新会话标题
 * @param id 会话 ID
 * @param title 新标题（会去除首尾空格）
 * @returns 更新后的会话记录
 */
export async function renameConversation(id: string, title: string) {
  if (!title.trim()) {
    throw new Error('会话标题不能为空')
  }

  const conversation = await conversationRepository.findConversationById(id)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  await conversationRepository.updateConversationTitle(id, title.trim())

  // 返回最新数据，便于前端直接同步状态
  return conversationRepository.findConversationById(id)
}
