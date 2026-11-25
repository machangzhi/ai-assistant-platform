import { pool } from '../config/database.js'

export interface Conversation {
  id: string
  title: string
  created_at: Date
  updated_at: Date
}

/**
 * 创建会话
 */
export async function createConversation(id: string, title: string) {
  const sql = `
    INSERT INTO conversations (id, title)
    VALUES (?, ?)
  `

  await pool.execute(sql, [id, title])
}

/**
 * 查询会话列表
 */
export async function findConversations() {
  const sql = `
    SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `

  const [rows] = await pool.execute(sql)

  return rows as Conversation[]
}

/**
 * 查询单个会话
 */
export async function findConversationById(id: string) {
  const sql = `
    SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `

  const [rows] = await pool.execute(sql, [id])

  return (rows as Conversation[])[0] ?? null
}

/**
 * 删除会话
 */
export async function deleteConversation(id: string) {
  const sql = `
    DELETE FROM conversations
    WHERE id = ?
  `

  const [result] = await pool.execute(sql, [id])

  return result
}

// 更新会话标题
export async function updateConversationTitle(id: string, title: string) {
  const [result] = await pool.execute(
    `UPDATE conversations
     SET title = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, id],
  )

  return result
}
