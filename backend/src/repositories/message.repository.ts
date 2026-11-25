import { pool } from '../config/database.js'

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: Date
}

/**
 * 保存消息
 */
export async function createMessage(message: Message) {
  const sql = `
    INSERT INTO messages (
      id,
      conversation_id,
      role,
      content
    )
    VALUES (?, ?, ?, ?)
  `

  await pool.execute(sql, [message.id, message.conversation_id, message.role, message.content])
  await pool.execute(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    message.conversation_id,
  ])
}

/**
 * 查询会话消息
 */
export async function findMessagesByConversationId(conversationId: string) {
  const sql = `
    SELECT
      id,
      conversation_id,
      role,
      content,
      created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC, id ASC
  `

  const [rows] = await pool.execute(sql, [conversationId])

  return rows as Message[]
}

/**
 * 删除会话消息
 */
export async function deleteMessagesByConversationId(conversationId: string) {
  const sql = `
    DELETE FROM messages
    WHERE conversation_id = ?
  `

  const [result] = await pool.execute(sql, [conversationId])

  return result
}
// 查询最近消息
export async function findRecentMessages(conversationId: string, limit: number = 20) {
  const sql = `
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `

  const [rows] = await pool.execute(sql, [conversationId, limit])

  return (rows as Message[]).reverse()
}
