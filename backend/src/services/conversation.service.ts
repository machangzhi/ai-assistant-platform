import * as conversationRepository from '../repositories/conversation.repository'

/**
 * 创建会话
 */
export async function createConversation(title?: string) {
  const id = crypto.randomUUID()

  const conversationTitle = title?.trim().slice(0, 100) || '新对话'

  await conversationRepository.createConversation(id, conversationTitle)

  return conversationRepository.findConversationById(id)
}

/**
 * 获取会话列表
 */
export async function getConversations() {
  return conversationRepository.findConversations()
}

/**
 * 获取会话详情
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
 */
export async function removeConversation(id: string) {
  const conversation = await conversationRepository.findConversationById(id)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  await conversationRepository.deleteConversation(id)

  return true
}
// 更新会话标题
export async function renameConversation(id: string, title: string) {
  if (!title.trim()) {
    throw new Error('会话标题不能为空')
  }

  const conversation = await conversationRepository.findConversationById(id)

  if (!conversation) {
    throw new Error('会话不存在')
  }

  await conversationRepository.updateConversationTitle(id, title.trim())

  return conversationRepository.findConversationById(id)
}
