/**
 * 消息数据仓储（Repository）
 * ------------------------------------------------------------
 * 负责 messages 表的所有 SQL 操作：
 * - 新增消息；
 * - 按会话查询消息；
 * - 清空会话消息；
 * - 查询最近 N 条消息（供 AI 上下文使用）。
 *
 * 与会话表的关系：每条消息通过 conversation_id 归属于某个会话。
 */

import { pool } from '../config/database.js'

/**
 * 消息表记录结构（与数据库字段一一对应）
 */
export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: Date
}

/**
 * 保存消息
 * 写入消息后同步更新所属会话的 updated_at，
 * 这样"最近发过消息的会话"会排在会话列表最前面。
 *
 * @param message 完整消息对象（id 由调用方生成）
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

  // 刷新会话更新时间（用于会话列表排序）
  await pool.execute(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    message.conversation_id,
  ])
}

/**
 * 查询指定会话的全部消息
 * 使用 created_at 升序；当时间精度相同（同一毫秒写入）时，
 * 再用 id 升序保证顺序稳定、可复现。
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
 * 删除指定会话的全部消息
 * @returns 原始执行结果（affectedRows 表示删除条数）
 */
export async function deleteMessagesByConversationId(conversationId: string) {
  const sql = `
    DELETE FROM messages
    WHERE conversation_id = ?
  `

  const [result] = await pool.execute(sql, [conversationId])

  return result
}

/**
 * 查询最近 N 条消息
 * 数据库层先按时间倒序取 N 条（效率最高），
 * 再在内存中 reverse 成正序，方便直接作为对话上下文传给模型。
 *
 * @param conversationId 会话 ID
 * @param limit 取多少条，默认 20
 *
 * 提示：MySQL 预编译语句对 LIMIT ? 的参数类型较敏感，
 * 若遇到 "Incorrect arguments to mysqld_stmt_execute"，
 * 可改为校验后拼接数字，或使用 pool.query。
 */
export async function findRecentMessages(conversationId: string, limit: number = 20) {
  const sql = `
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `

  const [rows] = await pool.execute(sql, [conversationId, limit])

  // 倒序取出后翻转为正序，保持对话的自然时间顺序
  return (rows as Message[]).reverse()
}
