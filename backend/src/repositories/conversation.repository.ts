/**
 * 会话数据仓储（Repository）
 * ------------------------------------------------------------
 * 仓储层只负责"数据存取"，即拼 SQL + 执行 + 返回原始结果；
 * 不包含业务判断（如是否存在、标题默认值等），这些放在 Service 层。
 *
 * 约定：
 * - 所有外部参数一律使用 ? 占位符（预编译语句），防止 SQL 注入；
 * - 查询结果统一以驼峰命名之外的数据库字段原型返回（下划线命名）。
 */

import { pool } from '../config/database.js'

/**
 * 会话表记录结构（与数据库字段一一对应）
 */
export interface Conversation {
  id: string
  title: string
  created_at: Date
  updated_at: Date
}

/**
 * 创建会话
 * @param id 会话 ID（由 Service 层生成，通常是 UUID）
 * @param title 会话标题
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
 * 按 updated_at 倒序，最近有消息往来的会话排在最前面
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
 * 按 ID 查询单个会话
 * @returns 会话记录；不存在时返回 null
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
 * @returns 原始执行结果（可通过 affectedRows 判断是否命中记录）
 *
 * 提示：若 messages 表对 conversation_id 设置了外键 ON DELETE CASCADE，
 * 删除会话时相关消息会被数据库自动清理。
 */
export async function deleteConversation(id: string) {
  const sql = `
    DELETE FROM conversations
    WHERE id = ?
  `

  const [result] = await pool.execute(sql, [id])

  return result
}

/**
 * 更新会话标题
 * 同时刷新 updated_at，使该会话在列表中前置。
 */
export async function updateConversationTitle(id: string, title: string) {
  const [result] = await pool.execute(
    `UPDATE conversations
     SET title = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, id],
  )

  return result
}
