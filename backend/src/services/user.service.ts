import mysql from 'mysql2/promise'
import { pool } from '../config/database.js'

// 查询用户列表
export async function getUserList() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC')

  return rows
}

// 查询用户详情
export async function getUserById(id: number) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])

  return (rows as mysql.RowDataPacket[])[0] ?? null
}

// 新增用户
export async function createUser(username: string, email: string) {
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO users (username, email) VALUES (?, ?)',
    [username, email],
  )

  return result.insertId
}

// 修改用户
export async function updateUser(id: number, data: { username?: string; email?: string }) {
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

  if (fields.length === 0) {
    return false
  }

  values.push(id)

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values,
  )

  return result.affectedRows > 0
}

// 删除用户
export async function deleteUser(id: number) {
  const [result] = await pool.execute<mysql.ResultSetHeader>('DELETE FROM users WHERE id = ?', [id])

  return result.affectedRows > 0
}
