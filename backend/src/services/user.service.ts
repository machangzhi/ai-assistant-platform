/**
 * 用户业务服务
 * ------------------------------------------------------------
 * 直接通过连接池执行 SQL，返回业务数据。
 * 说明：用户模块是早期示例模块，未像会话/消息模块那样拆分 Repository 层；
 * 生产项目中建议统一分层风格，便于测试与维护。
 */

import mysql from 'mysql2/promise'
import { pool } from '../config/database.js'

/**
 * 查询用户列表
 * 使用 query 而非 execute：列表查询无外部参数，不涉及预编译语句
 * @returns 用户记录数组
 */
export async function getUserList() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC')

  return rows
}

/**
 * 查询用户详情
 * 使用 execute（预编译语句 + 参数绑定）防止 SQL 注入
 * @param id 用户 ID
 * @returns 用户记录；不存在时返回 null
 */
export async function getUserById(id: number) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])

  // execute 的返回类型较宽泛，这里断言为 RowDataPacket 数组后取第一条
  return (rows as mysql.RowDataPacket[])[0] ?? null
}

/**
 * 新增用户
 * @returns 数据库自增主键 insertId
 */
export async function createUser(username: string, email: string) {
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO users (username, email) VALUES (?, ?)',
    [username, email],
  )

  return result.insertId
}

/**
 * 修改用户（动态拼接 SET 子句）
 * 只更新调用方显式传入的字段，未传字段保持原值。
 *
 * @param id 用户 ID
 * @param data 待更新字段（均可选）
 * @returns 是否真正更新了记录；无字段可更新或用户不存在时返回 false
 */
export async function updateUser(id: number, data: { username?: string; email?: string }) {
  // fields 保存 "列名 = ?" 片段，values 保存对应参数，二者顺序必须一致
  const fields: string[] = []
  const values: (string | number)[] = []

  if (data.username !== undefined) {
    fields.push('username = ?')
    values.push(data.username)
  }

  if (data.email !== undefined) {
    fields.push('email = ?')
    values.push(data.email)
  }

  // 没有任何可更新字段时直接返回，避免生成非法 SQL
  if (fields.length === 0) {
    return false
  }

  // WHERE 条件参数放在最后
  values.push(id)

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values,
  )

  return result.affectedRows > 0
}

/**
 * 删除用户
 * @returns 是否删除成功（affectedRows 为 0 表示记录不存在）
 */
export async function deleteUser(id: number) {
  const [result] = await pool.execute<mysql.ResultSetHeader>('DELETE FROM users WHERE id = ?', [id])

  return result.affectedRows > 0
}
