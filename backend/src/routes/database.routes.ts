/**
 * 数据库自检路由：/api/database
 * ------------------------------------------------------------
 * 仅用于本地开发 / 部署排障：验证服务端能否正常连接 MySQL。
 * 生产环境如需保留，建议加上鉴权或直接关闭。
 */

import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

// GET /api/database/test —— 执行 SELECT 1，验证连接池可用
router.get('/test', async (_req, res) => {
  try {
    // query 返回 [rows, fields]，这里只需确认查询成功
    const [rows] = await pool.query('SELECT 1 AS result')

    res.json({
      code: 200,
      message: 'MySQL 连接成功',
      data: rows,
    })
  } catch (error) {
    console.error('MySQL 连接失败：', error)

    res.status(500).json({
      code: 500,
      message: 'MySQL 连接失败',
    })
  }
})

export default router
